import { describe, expect, it } from 'vitest';

import { actionFor, isAuthentic, missingFields, normalizeEmail, parseHotmartWebhook } from '../supabase/functions/_shared/hotmart';

const purchase = (event: string, extra: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  creation_date: 1767225600000,
  event,
  version: '2.0.0',
  data: {
    product: { id: 4774438, ucode: 'abc', name: 'Protocolo Desligando a Mente em 7 Dias' },
    buyer: { email: ' Ana@Exemplo.com ', name: 'Ana Souza' },
    purchase: { transaction: 'HP17715690036014', status: 'APPROVED' },
    ...extra,
  },
});

describe('webhook da Hotmart', () => {
  it('libera acesso em compra aprovada e completa', () => {
    expect(actionFor('PURCHASE_APPROVED')).toBe('grant');
    expect(actionFor('PURCHASE_COMPLETE')).toBe('grant');
  });

  it('tira o acesso em reembolso, chargeback, cancelamento e fim de assinatura', () => {
    for (const e of ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED', 'PURCHASE_PROTEST', 'SUBSCRIPTION_CANCELLATION']) {
      expect(actionFor(e)).toBe('revoke');
    }
  });

  it('ignora boleto impresso, carrinho abandonado e afins', () => {
    expect(actionFor('PURCHASE_BILLET_PRINTED')).toBe('ignore');
    expect(actionFor('PURCHASE_OUT_OF_SHOPPING_CART')).toBe('ignore');
  });

  it('lê e-mail (normalizado), produto e transação', () => {
    const evt = parseHotmartWebhook(purchase('PURCHASE_APPROVED'), 'segredo');
    expect(evt).toMatchObject({
      eventId: 'evt-1',
      action: 'grant',
      email: 'ana@exemplo.com',
      buyerName: 'Ana Souza',
      hotmartProductId: '4774438',
      transaction: 'HP17715690036014',
      hottok: 'segredo',
    });
    expect(missingFields(evt)).toBeNull();
  });

  it('lê o e-mail do assinante no cancelamento de assinatura', () => {
    const evt = parseHotmartWebhook({
      id: 'evt-2',
      event: 'SUBSCRIPTION_CANCELLATION',
      data: { product: { id: 99 }, subscriber: { code: 'SUB1', email: 'bia@exemplo.com', name: 'Bia' } },
    });
    expect(evt.email).toBe('bia@exemplo.com');
    expect(evt.subscriberCode).toBe('SUB1');
    expect(evt.action).toBe('revoke');
  });

  it('aceita o hottok no corpo (versões antigas)', () => {
    const evt = parseHotmartWebhook({ ...purchase('PURCHASE_APPROVED'), hottok: 'antigo' });
    expect(evt.hottok).toBe('antigo');
  });

  it('recusa hottok errado ou ausente', () => {
    const evt = parseHotmartWebhook(purchase('PURCHASE_APPROVED'), 'errado');
    expect(isAuthentic(evt, 'segredo')).toBe(false);
    expect(isAuthentic({ ...evt, hottok: null }, 'segredo')).toBe(false);
    expect(isAuthentic({ ...evt, hottok: 'segredo' }, undefined)).toBe(false);
    expect(isAuthentic({ ...evt, hottok: 'segredo' }, 'segredo')).toBe(true);
  });

  it('aponta dados faltando', () => {
    const evt = parseHotmartWebhook(purchase('PURCHASE_APPROVED', { buyer: {} }));
    expect(missingFields(evt)).toMatch(/e-mail/);
  });

  it('rejeita corpo que não é da Hotmart', () => {
    expect(() => parseHotmartWebhook({ foo: 1 })).toThrow();
    expect(normalizeEmail('sem-arroba')).toBeNull();
  });
});
