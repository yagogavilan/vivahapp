import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/config', () => ({ DEMO_CODE: '123456' }));

import {
  buildMessages,
  chunk,
  DEFAULT_PUSH_SETTINGS,
  pushCopyIssues,
  sendAll,
  wantsPush,
  type ExpoMessage,
} from '../supabase/functions/_shared/push';
import { courses, lessons, tracks } from '../src/data/catalog';
import { demoApi } from '../src/data/demo-api';
import { clip, draftForCourse, draftForLesson, isQuietHour, openRate, relativeTime } from '../src/domain/notifications';

describe('quem recebe push', () => {
  it('padrão: aulas e avisos ligados, lançamentos só com aceite', () => {
    expect(wantsPush(null, 'lesson', 'respira')).toBe(true);
    expect(wantsPush(null, 'announcement', null)).toBe(true);
    expect(wantsPush(null, 'launch', null)).toBe(false);
    expect(wantsPush(null, 'low_ticket', 'move')).toBe(false);
    expect(wantsPush({ ...DEFAULT_PUSH_SETTINGS, launches: true }, 'low_ticket', 'move')).toBe(true);
  });

  it('desligar tudo, uma categoria ou uma trilha', () => {
    expect(wantsPush({ ...DEFAULT_PUSH_SETTINGS, pushEnabled: false }, 'lesson', 'respira')).toBe(false);
    expect(wantsPush({ ...DEFAULT_PUSH_SETTINGS, newLessons: false }, 'course', 'respira')).toBe(false);
    expect(wantsPush({ ...DEFAULT_PUSH_SETTINGS, mutedTracks: ['move'] }, 'lesson', 'move')).toBe(false);
    expect(wantsPush({ ...DEFAULT_PUSH_SETTINGS, mutedTracks: ['move'] }, 'lesson', 'respira')).toBe(true);
    // Aviso geral (sem trilha) chega mesmo com trilhas silenciadas.
    expect(wantsPush({ ...DEFAULT_PUSH_SETTINGS, mutedTracks: ['move'] }, 'announcement', null)).toBe(true);
  });
});

describe('texto do aviso', () => {
  it('bloqueia preço e compra em aula, curso e low ticket (regra das lojas)', () => {
    for (const text of ['Só R$ 27 hoje', 'Compre agora', '50% de desconto', 'Preço especial', 'Link do checkout', 'Garanta já o seu', 'Por apenas 3x']) {
      const issues = pushCopyIssues('low_ticket', 'Planilha nova', text);
      expect(issues.some((i) => i.blocking), text).toBe(true);
    }
    expect(pushCopyIssues('lesson', 'Aula nova: Compromisso com você', 'Toque para assistir.')).toEqual([]);
    expect(pushCopyIssues('lesson', 'Aula nova: Lista de compras', 'Comprar melhor e pagamento das contas em dia.')).toEqual([]);
  });

  it('em aviso livre, palavra de venda só alerta (pode ser produto físico da Loja)', () => {
    const issues = pushCopyIssues('announcement', 'Garrafa Vivah chegou', 'Por R$ 59 na Loja');
    expect(issues).toHaveLength(1);
    expect(issues[0].blocking).toBe(false);
  });

  it('limites de tamanho e cara de spam', () => {
    expect(pushCopyIssues('announcement', 'Oi', 'Texto').some((i) => i.field === 'title' && i.blocking)).toBe(true);
    expect(pushCopyIssues('announcement', 'a'.repeat(66), 'Texto').some((i) => i.blocking)).toBe(true);
    expect(pushCopyIssues('announcement', 'Título ok', 'b'.repeat(179)).some((i) => i.blocking)).toBe(true);
    const spam = pushCopyIssues('announcement', 'NOVIDADE IMPERDÍVEL', 'Veja!!');
    expect(spam.some((i) => !i.blocking)).toBe(true);
  });

  it('textos prontos cabem nos limites e não falam de preço', () => {
    const respira = tracks.find((t) => t.id === 'respira')!;
    for (const l of lessons.slice(0, 80)) {
      const c = courses.find((x) => x.id === l.courseId)!;
      const d = draftForLesson(l, c, respira);
      expect(pushCopyIssues(d.kind, d.title, d.body).filter((i) => i.blocking), l.id).toEqual([]);
      expect(d.url).toBe(`/aula/${l.id}`);
      expect(d.audience).toBe('course');
    }
    for (const c of courses) {
      const d = draftForCourse(c, tracks.find((t) => t.id === c.trackId));
      expect(d.kind).toBe(c.lowTicket ? 'low_ticket' : 'course');
      expect(d.audience).toBe(c.lowTicket ? 'all' : 'track');
      expect(pushCopyIssues(d.kind, d.title, d.body).filter((i) => i.blocking), c.id).toEqual([]);
    }
  });

  it('corta no espaço, com reticências', () => {
    expect(clip('Uma frase bem longa para cortar no lugar certo', 20)).toBe('Uma frase bem longa…');
    expect(clip('curta', 20)).toBe('curta');
  });
});

describe('envio pela Expo', () => {
  const n = { id: 'n1', kind: 'lesson' as const, title: 'Aula nova', body: 'Toque para assistir', url: '/aula/x' };
  const tokens = Array.from({ length: 250 }, (_, i) => `ExponentPushToken[t${i}]`);

  it('mensagens únicas, no canal do Android, com o link e o id do aviso', () => {
    const msgs = buildMessages([...tokens, tokens[0]], n);
    expect(msgs).toHaveLength(250);
    expect(msgs[0]).toMatchObject({ channelId: 'avisos', data: { url: '/aula/x', notificationId: 'n1' } });
    expect(chunk(msgs, 100).map((c) => c.length)).toEqual([100, 100, 50]);
  });

  it('lotes de 100, respeita o limite por segundo, tira tokens mortos e tenta de novo no 429', async () => {
    const calls: number[] = [];
    let first = true;
    const sleeps: number[] = [];
    let clock = 0;
    const fakeFetch = vi.fn(async (_url: string, init: { body: string }) => {
      const batch = JSON.parse(init.body) as ExpoMessage[];
      calls.push(batch.length);
      if (first) {
        first = false;
        return { ok: false, status: 429, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: batch.map((m) =>
            m.to === 'ExponentPushToken[t7]'
              ? { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }
              : { status: 'ok', id: `r-${m.to}` },
          ),
        }),
      };
    });
    const result = await sendAll(buildMessages(tokens, n), {
      fetch: fakeFetch,
      perSecond: 200,
      sleep: async (ms) => { sleeps.push(ms); clock += ms; },
      now: () => clock,
    });
    expect(result.ok).toBe(249);
    expect(result.failed).toBe(1);
    expect(result.deadTokens).toEqual(['ExponentPushToken[t7]']);
    expect(result.receiptIds).toHaveLength(249);
    expect(Math.max(...calls)).toBeLessThanOrEqual(100);
    // 200/s = 2 lotes por janela: houve espera entre as janelas e o recuo do 429.
    expect(sleeps).toContain(1000);
  });

  it('erro geral da Expo conta tudo como falha e guarda o motivo', async () => {
    const r = await sendAll(buildMessages(tokens.slice(0, 3), n), {
      fetch: async () => ({ ok: false, status: 400, json: async () => ({ errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }] }) }),
      sleep: async () => undefined,
    });
    expect(r).toMatchObject({ ok: 0, failed: 3, errors: ['PUSH_TOO_MANY_EXPERIENCE_IDS'] });
  });
});

describe('demonstração: admin envia, aluna recebe no sino', () => {
  it('fluxo completo com preferências', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await demoApi.signIn('admin@vivah.com.br', 'vivah1234');
    const reach = await demoApi.adminNotificationReach({
      kind: 'launch', title: 'x', body: 'y', url: null, audience: 'all', trackId: null, courseId: null, lessonId: null,
    });
    expect(reach.pushTargets).toBeLessThan(reach.recipients);
    await expect(demoApi.adminSendNotification({
      kind: 'low_ticket', title: 'Planilha nova', body: 'Só R$ 19', url: '/curso/x', audience: 'all', trackId: 'prospera', courseId: null, lessonId: null,
    })).rejects.toThrow('preço');
    const id = await demoApi.adminSendNotification({
      kind: 'announcement', title: 'Live amanhã às 20h', body: 'Respiração para dormir melhor.', url: '/agenda', audience: 'all', trackId: null, courseId: null, lessonId: null,
    });
    expect((await demoApi.adminListNotifications())[0]).toMatchObject({ id, status: 'sending' });
    await vi.advanceTimersByTimeAsync(1600);
    expect((await demoApi.adminListNotifications())[0]).toMatchObject({ id, status: 'sent' });
    await demoApi.signOut();

    await demoApi.signIn('ana@exemplo.com', 'vivah1234');
    const inbox = await demoApi.getInbox();
    expect(inbox[0]).toMatchObject({ id, title: 'Live amanhã às 20h', readAt: null });
    await demoApi.markInboxRead([id]);
    expect((await demoApi.getInbox()).find((x) => x.id === id)?.readAt).not.toBeNull();

    const s = await demoApi.getPushSettings();
    expect(s).toEqual(DEFAULT_PUSH_SETTINGS);
    await demoApi.savePushSettings({ ...s, launches: true, mutedTracks: ['move', 'move'] });
    expect(await demoApi.getPushSettings()).toMatchObject({ launches: true, mutedTracks: ['move'] });
    await expect(demoApi.adminListNotifications()).rejects.toThrow();
    await demoApi.signOut();
    vi.useRealTimers();
  });
});

describe('detalhes de exibição', () => {
  it('taxa de abertura, tempo relativo e horário de silêncio', () => {
    expect(openRate({ recipients: 200, opened: 54 })).toBe(27);
    expect(openRate({ recipients: 0, opened: 0 })).toBe(0);
    const now = Date.parse('2026-11-06T15:00:00Z');
    expect(relativeTime('2026-11-06T14:30:00Z', now)).toBe('há 30 min');
    expect(relativeTime('2026-11-06T10:00:00Z', now)).toBe('há 5 h');
    expect(relativeTime('2026-11-05T14:00:00Z', now)).toBe('ontem');
    expect(isQuietHour(new Date('2026-11-07T01:00:00Z'))).toBe(true); // 22h em Brasília
    expect(isQuietHour(new Date('2026-11-06T15:00:00Z'))).toBe(false); // 12h
  });
});
