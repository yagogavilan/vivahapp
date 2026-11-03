/**
 * Leitura dos webhooks da Hotmart (versão 2.0.0), sem dependências de
 * Deno ou Node, para ser testada com o Vitest e usada pela Edge Function.
 *
 * A Hotmart manda o hottok no cabeçalho `X-HOTMART-HOTTOK`. Versões antigas
 * mandavam no corpo (`hottok`); aceitamos os dois.
 */

/** Eventos que liberam o acesso. */
export const GRANT_EVENTS = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'] as const;

/** Eventos que tiram o acesso. */
export const REVOKE_EVENTS = [
  'PURCHASE_CANCELED',
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_PROTEST',
  'PURCHASE_EXPIRED',
  'SUBSCRIPTION_CANCELLATION',
] as const;

export type HotmartAction = 'grant' | 'revoke' | 'ignore';

export interface HotmartEvent {
  /** Id do evento na Hotmart (para não processar duas vezes). */
  eventId: string | null;
  event: string;
  action: HotmartAction;
  email: string | null;
  buyerName: string | null;
  hotmartProductId: string | null;
  transaction: string | null;
  subscriberCode: string | null;
  hottok: string | null;
}

type Json = Record<string, unknown>;

const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null;

export function actionFor(event: string): HotmartAction {
  if ((GRANT_EVENTS as readonly string[]).includes(event)) return 'grant';
  if ((REVOKE_EVENTS as readonly string[]).includes(event)) return 'revoke';
  return 'ignore';
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase();
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/** Converte o corpo do webhook em um evento normalizado. Lança erro se não for um webhook da Hotmart. */
export function parseHotmartWebhook(body: unknown, headerHottok?: string | null): HotmartEvent {
  const root = obj(body);
  const event = str(root.event);
  if (!event) throw new Error('Corpo sem o campo "event": não parece um webhook da Hotmart.');
  const data = obj(root.data);
  const buyer = obj(data.buyer);
  const subscriber = obj(data.subscriber);
  const subscription = obj(data.subscription);
  const product = obj(data.product);
  const purchase = obj(data.purchase);

  return {
    eventId: str(root.id),
    event,
    action: actionFor(event),
    email: normalizeEmail(str(buyer.email) ?? str(subscriber.email)),
    buyerName: str(buyer.name) ?? str(subscriber.name),
    hotmartProductId: str(product.id),
    transaction: str(purchase.transaction),
    subscriberCode: str(obj(subscription.subscriber).code) ?? str(subscriber.code),
    hottok: str(headerHottok) ?? str(root.hottok),
  };
}

/** Comparação em tempo constante, para o hottok não vazar por tempo de resposta. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isAuthentic(evt: HotmartEvent, expectedHottok: string | undefined): boolean {
  return Boolean(expectedHottok && evt.hottok && safeEqual(evt.hottok, expectedHottok));
}

/** Por que um evento não pode ser aplicado (ou null se pode). */
export function missingFields(evt: HotmartEvent): string | null {
  if (evt.action === 'ignore') return null;
  if (!evt.email) return 'e-mail do comprador ausente';
  if (!evt.hotmartProductId) return 'id do produto ausente';
  return null;
}
