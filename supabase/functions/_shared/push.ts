/**
 * Regras das notificações push, usadas no app (admin e demonstração), nos
 * testes (Node) e na função send-notification (Deno). Sem dependências.
 *
 * Envio pelo serviço de push da Expo:
 * - até 100 mensagens por chamada;
 * - até 600 notificações por segundo por projeto;
 * - token com erro DeviceNotRegistered deve sair da base;
 * - 429 e 5xx: tentar de novo com espera crescente.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */

export type NotificationKind = 'lesson' | 'course' | 'low_ticket' | 'announcement' | 'launch';
export type NotificationCategory = 'new_lessons' | 'announcements' | 'launches';

export interface PushSettings {
  pushEnabled: boolean;
  newLessons: boolean;
  announcements: boolean;
  /** Lançamentos e ofertas: só com aceite (Apple 4.5.4). */
  launches: boolean;
  mutedTracks: string[];
}

export const DEFAULT_PUSH_SETTINGS: PushSettings = {
  pushEnabled: true,
  newLessons: true,
  announcements: true,
  launches: false,
  mutedTracks: [],
};

export const TITLE_MAX = 65;
export const BODY_MAX = 178;

export function categoryOf(kind: NotificationKind): NotificationCategory {
  if (kind === 'lesson' || kind === 'course') return 'new_lessons';
  if (kind === 'low_ticket' || kind === 'launch') return 'launches';
  return 'announcements';
}

/** Mesma regra da função wants_push do banco. */
export function wantsPush(s: PushSettings | null | undefined, kind: NotificationKind, trackId: string | null): boolean {
  const v = { ...DEFAULT_PUSH_SETTINGS, ...(s ?? {}) };
  if (!v.pushEnabled) return false;
  const cat = categoryOf(kind);
  const on = cat === 'new_lessons' ? v.newLessons : cat === 'launches' ? v.launches : v.announcements;
  return on && !(trackId && v.mutedTracks.includes(trackId));
}

/**
 * Palavras de preço e compra. Nos apps da Apple e do Google, conteúdo digital
 * (aulas, cursos, low tickets) não pode ser vendido nem anunciado com preço
 * ou chamada para comprar fora da loja.
 */
// Mira chamadas de venda, não o assunto: "comprar melhor no mercado" (Nutre) e
// "pagamento das dívidas" (Prospera) são conteúdo de aula e passam.
const SALES_WORDS = /(r\$|\d+\s?%|\bpre[çc]os?(?![\wÀ-ú])|\bcompr(e|ar|a)\s+(j[áa]|agora|aqui|hoje|o seu|a sua)(?![\wÀ-ú])|\badquira|\bgaranta\s+(j[áa]|o seu|a sua|sua|seu)(?![\wÀ-ú])|\bpor apenas\b|\bdesconto|\bpromo[çc][ãa]o|\bcupom|\bcheckout|\bhotmart|\bfrete gr[áa]tis|black\s?friday)/i;

export interface CopyIssue {
  field: 'title' | 'body';
  message: string;
  /** true = impede o envio; false = só alerta. */
  blocking: boolean;
}

/** Confere o texto antes de enviar. */
export function pushCopyIssues(kind: NotificationKind, title: string, body: string): CopyIssue[] {
  const issues: CopyIssue[] = [];
  const t = title.trim();
  const b = body.trim();
  if (t.length < 3) issues.push({ field: 'title', message: 'Escreva um título.', blocking: true });
  if (t.length > TITLE_MAX) issues.push({ field: 'title', message: `Título com no máximo ${TITLE_MAX} letras.`, blocking: true });
  if (b.length < 3) issues.push({ field: 'body', message: 'Escreva a mensagem.', blocking: true });
  if (b.length > BODY_MAX) issues.push({ field: 'body', message: `Mensagem com no máximo ${BODY_MAX} letras.`, blocking: true });
  const sales = SALES_WORDS.exec(`${t} ${b}`);
  if (sales) {
    const digital = kind !== 'announcement';
    issues.push({
      field: SALES_WORDS.test(t) ? 'title' : 'body',
      message: digital
        ? `Tire "${sales[0]}": nos apps do iPhone e Android não se fala de preço ou compra de aula e curso.`
        : `"${sales[0]}" só pode se for de produto físico da Loja. Para aula ou curso, tire.`,
      blocking: digital,
    });
  }
  // Mais de um "!" ou tudo em maiúsculas parece spam e derruba a abertura.
  if (/!{2,}/.test(`${t}${b}`) || (t.length > 8 && t === t.toUpperCase() && /[A-Z]/.test(t))) {
    issues.push({ field: 'title', message: 'Sem letras maiúsculas em tudo nem "!!": parece spam.', blocking: false });
  }
  return issues;
}

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: 'default';
  channelId: string;
  priority: 'default' | 'high';
}

export const ANDROID_CHANNEL = 'avisos';

export function buildMessages(
  tokens: string[],
  n: { id: string; kind: NotificationKind; title: string; body: string; url: string | null },
): ExpoMessage[] {
  const unique = [...new Set(tokens)];
  return unique.map((to) => ({
    to,
    title: n.title,
    body: n.body,
    data: { url: n.url ?? '/avisos', notificationId: n.id, kind: n.kind },
    sound: 'default',
    channelId: ANDROID_CHANNEL,
    priority: 'default',
  }));
}

export function chunk<T>(items: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface Ticket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface SendResult {
  ok: number;
  failed: number;
  /** Tokens que não existem mais (app apagado, login em outro aparelho). */
  deadTokens: string[];
  /** Ids para conferir os recibos depois de ~15 minutos. */
  receiptIds: string[];
  errors: string[];
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const SEND_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Envia todas as mensagens respeitando o limite da Expo (no máximo
 * `perSecond` notificações por segundo, `parallel` chamadas ao mesmo tempo).
 */
export async function sendAll(
  messages: ExpoMessage[],
  opts: {
    fetch: FetchLike;
    accessToken?: string | null;
    perSecond?: number;
    parallel?: number;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
    retries?: number;
  },
): Promise<SendResult> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.now ?? (() => Date.now());
  const perSecond = opts.perSecond ?? 500;
  const parallel = opts.parallel ?? 5;
  const retries = opts.retries ?? 3;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
    'accept-encoding': 'gzip, deflate',
  };
  if (opts.accessToken) headers.authorization = `Bearer ${opts.accessToken}`;

  const result: SendResult = { ok: 0, failed: 0, deadTokens: [], receiptIds: [], errors: [] };
  const batches = chunk(messages, 100);

  async function sendBatch(batch: ExpoMessage[]) {
    for (let attempt = 0; ; attempt++) {
      let res: Awaited<ReturnType<FetchLike>> | null = null;
      try {
        res = await opts.fetch(SEND_URL, { method: 'POST', headers, body: JSON.stringify(batch) });
      } catch (e) {
        if (attempt < retries) { await sleep(500 * 2 ** attempt); continue; }
        result.failed += batch.length;
        result.errors.push(`rede: ${(e as Error).message}`);
        return;
      }
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      const payload = (await res.json().catch(() => ({}))) as { data?: Ticket[]; errors?: { code?: string; message?: string }[] };
      if (!res.ok || !Array.isArray(payload.data)) {
        result.failed += batch.length;
        result.errors.push(payload.errors?.map((e) => e.code ?? e.message).join(', ') || `HTTP ${res.status}`);
        return;
      }
      payload.data.forEach((t, i) => {
        if (t.status === 'ok') {
          result.ok += 1;
          if (t.id) result.receiptIds.push(t.id);
        } else {
          result.failed += 1;
          if (t.details?.error === 'DeviceNotRegistered') result.deadTokens.push(batch[i].to);
          else if (t.details?.error) result.errors.push(t.details.error);
        }
      });
      return;
    }
  }

  // Janelas de 1 segundo com no máximo `perSecond` mensagens.
  const perWindow = Math.max(1, Math.min(parallel, Math.floor(perSecond / 100)));
  for (let i = 0; i < batches.length; i += perWindow) {
    const started = now();
    await Promise.all(batches.slice(i, i + perWindow).map(sendBatch));
    const elapsed = now() - started;
    if (i + perWindow < batches.length && elapsed < 1000) await sleep(1000 - elapsed);
  }
  result.errors = [...new Set(result.errors)].slice(0, 5);
  return result;
}
