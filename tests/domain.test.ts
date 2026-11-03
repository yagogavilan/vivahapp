import { describe, expect, it } from 'vitest';

import { courses, diagnosticQuestions, lessons, products, tracks } from '../src/data/catalog';
import { checkoutLink, completion, courseState, lessonOpen, nextLesson, productForCourse, trackState } from '../src/domain/access';
import { addDays, dayKey, formatCountdown, formatDayLabel, formatTime, nextWeekday, spDateTime } from '../src/domain/dates';
import { recommendTrack, scoreDiagnostic } from '../src/domain/diagnostic';
import { agendaDays, buildLives, liveStatus, nextLive, todaysEscudo, buildEscudo } from '../src/domain/schedule';

const track = (id: string) => tracks.find((t) => t.id === id)!;
const course = (id: string) => courses.find((c) => c.id === id)!;

describe('datas em Brasília', () => {
  it('converte 20h de Brasília para 23h UTC', () => {
    expect(spDateTime('2026-12-02', '20:00')).toBe('2026-12-02T23:00:00.000Z');
    expect(formatTime('2026-12-02T23:00:00.000Z')).toBe('20:00');
  });
  it('usa o dia de Brasília, não o UTC', () => {
    expect(dayKey('2026-12-03T01:30:00.000Z')).toBe('2026-12-02');
  });
  it('acha a próxima quarta', () => {
    expect(nextWeekday('2026-12-01', 3)).toBe('2026-12-02');
    expect(nextWeekday('2026-12-02', 3)).toBe('2026-12-02');
    expect(nextWeekday('2026-12-03', 3)).toBe('2026-12-09');
  });
  it('escreve rótulos de dia e contagem', () => {
    expect(formatDayLabel('2026-12-02', '2026-12-02')).toBe('Hoje');
    expect(formatDayLabel('2026-12-03', '2026-12-02')).toBe('Amanhã');
    expect(formatDayLabel('2026-12-09', '2026-12-02')).toBe('quarta, 9 dez');
    const now = new Date('2026-12-02T22:00:00.000Z');
    expect(formatCountdown('2026-12-02T23:00:00.000Z', now)).toBe('em 1 h');
    expect(formatCountdown('2026-12-02T22:20:00.000Z', now)).toBe('em 20 min');
  });
});

describe('acesso aos cursos', () => {
  const none = new Set<string>();
  it('trilha em breve fica em breve, mesmo com acesso', () => {
    expect(courseState(course('semana-organizada'), track('ritmo'), new Set(['semana-organizada']))).toBe('soon');
  });
  it('curso pago sem compra fica bloqueado; com compra, aberto', () => {
    expect(courseState(course('protocolo-desligando-a-mente'), track('respira'), none)).toBe('locked');
    expect(courseState(course('protocolo-desligando-a-mente'), track('respira'), new Set(['protocolo-desligando-a-mente']))).toBe('open');
  });
  it('a aula de amostra abre na vitrine; as outras não', () => {
    const protocolo = lessons.filter((l) => l.courseId === 'protocolo-desligando-a-mente');
    const preview = protocolo.filter((l) => l.isPreview);
    expect(preview).toHaveLength(1);
    expect(lessonOpen(preview[0], 'locked')).toBe(true);
    expect(lessonOpen(protocolo[1], 'locked')).toBe(false);
    expect(lessonOpen(preview[0], 'soon')).toBe(false);
  });
  it('trilha aberta quando tem ao menos um curso liberado', () => {
    const respira = courses.filter((c) => c.trackId === 'respira');
    expect(trackState(track('respira'), respira, none)).toBe('locked');
    expect(trackState(track('respira'), respira, new Set(['calma-em-5-minutos']))).toBe('open');
  });
  it('calcula conclusão e próxima aula', () => {
    const ls = lessons.filter((l) => l.courseId === 'kit-descarrega-a-mente');
    const progress = [{ lessonId: ls[0].id, positionSec: 0, completedAt: '2026-12-01T10:00:00Z' }];
    expect(completion(ls, progress)).toBe(33);
    expect(nextLesson(ls, progress)?.id).toBe(ls[1].id);
  });
  it('acha o produto do curso e monta o checkout com o e-mail', () => {
    expect(productForCourse('mente-silenciosa', products)?.id).toBe('mente-silenciosa');
    const sub = products.find((p) => p.id === 'assinatura-vivah')!;
    expect(sub.courseIds).toContain('protocolo-desligando-a-mente');
    expect(sub.courseIds).not.toContain('mente-silenciosa');
    expect(checkoutLink('https://pay.hotmart.com/ABC123', 'ana@exemplo.com', 'Ana Souza')).toBe(
      'https://pay.hotmart.com/ABC123?email=ana%40exemplo.com&name=Ana+Souza',
    );
  });
  it('nenhum produto passa de R$ 6 mil', () => {
    for (const c of courses) {
      const n = Number((c.priceLabel ?? '0').replace(/[^\d,]/g, '').split(',')[0]);
      expect(n).toBeLessThan(6000);
    }
  });
});

describe('diagnóstico', () => {
  it('recomenda a área com mais atenção', () => {
    const answers = Object.fromEntries(diagnosticQuestions.map((q) => [q.id, q.area === 'financas' ? 3 : 1]));
    const scores = scoreDiagnostic(diagnosticQuestions, answers);
    expect(scores.financas).toBe(100);
    expect(scores.mente).toBe(33);
    expect(recommendTrack(scores)).toBe('prospera');
  });
  it('em empate, começa pela mente', () => {
    const answers = Object.fromEntries(diagnosticQuestions.map((q) => [q.id, 2]));
    expect(recommendTrack(scoreDiagnostic(diagnosticQuestions, answers))).toBe('respira');
  });
});

describe('lives, Escudo e agenda', () => {
  const lives = buildLives('2026-12-01', 3);
  it('lives toda quarta às 20h', () => {
    expect(lives.map((l) => l.startsAt)).toEqual([
      '2026-12-02T23:00:00.000Z',
      '2026-12-09T23:00:00.000Z',
      '2026-12-16T23:00:00.000Z',
    ]);
  });
  it('status da live: antes, ao vivo, replay e encerrada', () => {
    const l = lives[0];
    expect(liveStatus(l, new Date('2026-12-02T22:00:00Z'))).toBe('upcoming');
    expect(liveStatus(l, new Date('2026-12-02T23:30:00Z'))).toBe('live');
    expect(liveStatus(l, new Date('2026-12-03T12:00:00Z'))).toBe('replay');
    expect(liveStatus(l, new Date('2026-12-05T12:00:00Z'))).toBe('ended');
    expect(nextLive(lives, new Date('2026-12-03T12:00:00Z'))?.id).toBe(lives[1].id);
  });
  it('Escudo de hoje e, se não houver, o mais recente', () => {
    const audios = buildEscudo('2026-12-01', 3);
    expect(todaysEscudo(audios, new Date('2026-12-02T12:00:00Z'))?.publishDate).toBe('2026-12-02');
    expect(todaysEscudo(audios, new Date('2026-12-10T12:00:00Z'))?.publishDate).toBe('2026-12-03');
    expect(todaysEscudo(audios, new Date('2026-11-30T12:00:00Z'))).toBeUndefined();
  });
  it('agenda junta lives e compromissos, sem duplicar live salva', () => {
    const now = new Date('2026-12-02T12:00:00Z');
    const events = [
      { id: 'e1', title: 'Live salva', kind: 'live' as const, startsAt: lives[0].startsAt, endsAt: lives[0].endsAt, liveId: lives[0].id, notes: null },
      { id: 'e2', title: 'Treino', kind: 'treino' as const, startsAt: spDateTime('2026-12-02', '07:00'), endsAt: spDateTime('2026-12-02', '07:30'), liveId: null, notes: null },
    ];
    const days = agendaDays(lives, events, now, 14);
    expect(days[0].day).toBe('2026-12-02');
    expect(days[0].items.map((i) => i.title)).toEqual(['Treino', 'Live salva']);
    expect(days.flatMap((d) => d.items).filter((i) => i.liveId === lives[0].id)).toHaveLength(1);
    expect(days.map((d) => d.day)).toEqual(['2026-12-02', '2026-12-09', '2026-12-16'].filter((d) => d <= addDays('2026-12-02', 13)));
  });
});
