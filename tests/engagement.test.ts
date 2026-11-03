import { describe, expect, it } from 'vitest';

import { courses, lessons, tracks } from '../src/data/catalog';
import type { Activity } from '../src/data/types';
import { completedCourses, computeAchievements } from '../src/domain/achievements';
import { addDays } from '../src/domain/dates';
import { buildDayPlan, isEvening } from '../src/domain/day-plan';
import { normalize, searchCatalog } from '../src/domain/search';
import { computeStreak, weekStart } from '../src/domain/streak';

// Quinta-feira, 10/12/2026, 10h em Brasília.
const NOW = new Date('2026-12-10T13:00:00Z');
const TODAY = '2026-12-10';
const act = (...days: string[]): Activity[] => days.map((day) => ({ day, kind: 'escudo', ref: day, minutes: 5 }));

describe('sequência de dias', () => {
  it('semana começa na segunda', () => {
    expect(weekStart('2026-12-10')).toBe('2026-12-07');
    expect(weekStart('2026-12-13')).toBe('2026-12-07');
    expect(weekStart('2026-12-14')).toBe('2026-12-14');
  });

  it('hoje em aberto não quebra a sequência', () => {
    const s = computeStreak(act('2026-12-07', '2026-12-08', '2026-12-09'), NOW);
    expect(s.current).toBe(3);
    expect(s.todayDone).toBe(false);
    expect(s.week.find((d) => d.day === TODAY)?.status).toBe('today');
  });

  it('conta hoje quando já houve atividade', () => {
    const s = computeStreak(act('2026-12-08', '2026-12-09', TODAY), NOW);
    expect(s.current).toBe(3);
    expect(s.todayDone).toBe(true);
  });

  it('um dia de folga por semana não zera', () => {
    // Faltou terça (08); segunda e quarta contam.
    const s = computeStreak(act('2026-12-07', '2026-12-09', TODAY), NOW);
    expect(s.current).toBe(3);
    expect(s.restUsedThisWeek).toBe(true);
    expect(s.week.find((d) => d.day === '2026-12-08')?.status).toBe('rest');
  });

  it('a segunda falta na mesma semana encerra', () => {
    const s = computeStreak(act('2026-12-02', '2026-12-03', '2026-12-04', '2026-12-07', TODAY), NOW);
    // 08 e 09 sem nada (dois dias seguidos): só hoje conta.
    expect(s.current).toBe(1);
    // 05 e 06 também sem nada: a maior sequência é 02–04.
    expect(s.best).toBe(3);
  });

  it('sem atividade recente, sequência zero', () => {
    const s = computeStreak(act('2026-11-01'), NOW);
    expect(s.current).toBe(0);
    expect(s.week.filter((d) => d.status === 'rest')).toHaveLength(0);
  });
});

describe('plano do dia', () => {
  const lesson = lessons.find((l) => l.courseId === 'protocolo-desligando-a-mente')!;
  it('manhã: Escudo, aula e check-in', () => {
    const p = buildDayPlan({ now: NOW, activity: act(TODAY), nextLesson: lesson, checkinEnabled: true });
    expect(p.evening).toBe(false);
    expect(p.steps.map((s) => s.id)).toEqual(['escudo', 'aula', 'checkin']);
    expect(p.doneCount).toBe(1);
  });
  it('sem curso aberto, sugere um bloco de foco; sem check-in, não repete o foco', () => {
    const p = buildDayPlan({ now: NOW, activity: [], checkinEnabled: false });
    expect(p.steps.map((s) => s.id)).toEqual(['escudo', 'foco']);
  });
  it('noite começa às 18h de Brasília', () => {
    expect(isEvening(new Date('2026-12-10T20:59:00Z'))).toBe(false);
    expect(isEvening(new Date('2026-12-10T21:00:00Z'))).toBe(true);
  });
});

describe('conquistas', () => {
  it('curso concluído quando todas as aulas estão feitas', () => {
    const kit = lessons.filter((l) => l.courseId === 'kit-descarrega-a-mente');
    const progress = kit.map((l) => ({ lessonId: l.id, positionSec: 0, completedAt: '2026-12-01T10:00:00Z' }));
    expect(completedCourses(lessons, progress)).toEqual(['kit-descarrega-a-mente']);
    const list = computeAchievements({
      activity: act(...Array.from({ length: 7 }, (_, i) => addDays(TODAY, -i))),
      progress,
      lessons,
      checkins: [],
      diagnosticDone: false,
      streak: computeStreak(act(...Array.from({ length: 7 }, (_, i) => addDays(TODAY, -i))), NOW),
    });
    const get = (id: string) => list.find((a) => a.id === id)!;
    expect(get('curso-concluido').earned).toBe(true);
    expect(get('sequencia-7').earned).toBe(true);
    expect(get('escudo-7').earned).toBe(true);
    expect(get('sequencia-30').progress).toBeCloseTo(7 / 30);
    expect(get('diagnostico').earned).toBe(false);
  });
});

describe('busca', () => {
  const catalog = { tracks, courses, lessons };
  it('ignora acentos e maiúsculas', () => {
    expect(normalize('Ruminação ÚTIL')).toBe('ruminacao util');
    expect(searchCatalog(catalog, 'ruminacao').lessons.map((l) => l.title)).toContain('Ruminação ou preocupação útil?');
  });
  it('acha trilha pela área e curso pelo tema', () => {
    expect(searchCatalog(catalog, 'financeira').tracks.map((t) => t.id)).toEqual(['prospera']);
    expect(searchCatalog(catalog, 'clientes').courses.map((c) => c.id)).toContain('maquina-de-clientes');
  });
  it('busca curta demais não traz nada', () => {
    expect(searchCatalog(catalog, 'a').lessons).toHaveLength(0);
  });
});
