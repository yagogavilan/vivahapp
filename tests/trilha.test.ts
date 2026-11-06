import { describe, expect, it } from 'vitest';

import { courses, tracks } from '../src/data/catalog';
import { questionsFor, readCheckin } from '../src/domain/checkin-protocol';
import { EXERCISES, exerciseById, SOS_BY_TRACK } from '../src/domain/exercises';
import { buildJourney } from '../src/domain/journey';
import { computeKindness, KINDNESS_LEVELS, KINDNESS_REWARDS, levelFor, progressToNext } from '../src/domain/kindness';
import { AQUECIMENTO, spaceAccess, spaceFor, trackCourses } from '../src/domain/spaces';

const t = (giverId: string, iso: string, points = 10) => ({ giverId, receiverId: 'eu', points, createdAt: iso });

describe('bondade', () => {
  it('nível exige pontos e pessoas diferentes', () => {
    expect(levelFor(0, 0).name).toBe('Semente');
    expect(levelFor(60, 4).name).toBe('Semente');
    expect(levelFor(60, 5).name).toBe('Mão Amiga');
    expect(levelFor(3000, 119).name).toBe('Ponte');
    expect(levelFor(3000, 120).name).toBe('Farol');
  });

  it('limita 3 agradecimentos da mesma pessoa por mês e ignora o próprio', () => {
    const list = [
      t('ana', '2026-11-02T12:00:00Z'), t('ana', '2026-11-03T12:00:00Z'), t('ana', '2026-11-04T12:00:00Z'),
      t('ana', '2026-11-05T12:00:00Z'),
      t('ana', '2026-12-02T12:00:00Z'),
      t('bia', '2026-11-02T12:00:00Z', 20),
      { giverId: 'eu', receiverId: 'eu', points: 10, createdAt: '2026-11-02T12:00:00Z' },
    ];
    expect(computeKindness(list, 'eu')).toEqual({ points: 60, givers: 2 });
  });

  it('progresso segue o requisito mais atrasado', () => {
    const p = progressToNext(50, 1);
    expect(p.level.name).toBe('Semente');
    expect(p.next?.name).toBe('Mão Amiga');
    expect(p.pointsLeft).toBe(0);
    expect(p.giversLeft).toBe(4);
    expect(p.ratio).toBeCloseTo(0.2);
  });

  it('níveis crescem e prêmios de conteúdo apontam para cursos exclusivos', () => {
    for (let i = 1; i < KINDNESS_LEVELS.length; i++) {
      expect(KINDNESS_LEVELS[i].minPoints).toBeGreaterThan(KINDNESS_LEVELS[i - 1].minPoints);
      expect(KINDNESS_LEVELS[i].minGivers).toBeGreaterThan(KINDNESS_LEVELS[i - 1].minGivers);
    }
    for (const r of KINDNESS_REWARDS.filter((x) => x.kind === 'conteudo')) {
      const course = courses.find((c) => c.id === r.courseId);
      expect(course?.minKindnessLevel).toBe(r.level);
    }
  });
});

describe('check-in por trilha', () => {
  const base = { mood: 3, feeling: 'ansiedade', energy: 3, sleepQuality: 3, sleepHours: 3 };

  it('cada trilha tem as perguntas comuns e as suas', () => {
    expect(questionsFor('respira').map((q) => q.id)).toContain('anxiety');
    expect(questionsFor('ritmo').map((q) => q.id)).toContain('overload');
    expect(questionsFor('aquecimento').map((q) => q.id)).toContain('feeling');
  });

  it('ansiedade alta vira socorro na hora com respiração e aterramento', () => {
    const r = readCheckin('respira', { ...base, anxiety: 9, racing: 2, body: [0] });
    expect(r.level).toBe('critico');
    expect(r.intervention).toEqual(['respiracao', 'aterramento']);
    expect(r.alerts.some((a) => a.emergency)).toBe(true);
  });

  it('aperto no peito sempre mostra o alerta do 192', () => {
    const r = readCheckin('respira', { ...base, anxiety: 4, racing: 0, body: [2] });
    expect(r.alerts.find((a) => a.title.includes('peito'))?.text).toContain('192');
  });

  it('dia tranquilo não pede socorro', () => {
    const r = readCheckin('respira', { ...base, mood: 4, anxiety: 2, racing: 0, body: [5] });
    expect(r.level).toBe('bem');
    expect(r.intervention).toEqual([]);
  });

  it('dor forte no Move orienta procurar profissional, sem exercício', () => {
    const r = readCheckin('move', { ...base, pain: 8, moved: 0 });
    expect(r.level).toBe('atencao');
    expect(r.intervention).toEqual([]);
  });

  it('humor no fundo do poço pede socorro em qualquer trilha', () => {
    const r = readCheckin('prospera', { ...base, mood: 1, moneyWorry: 3, impulse: 0 });
    expect(r.level).toBe('critico');
    expect(r.intervention.length).toBeGreaterThan(0);
  });

  it('todo exercício indicado existe', () => {
    for (const ids of Object.values(SOS_BY_TRACK)) for (const id of ids) expect(exerciseById(id)).toBeDefined();
    expect(EXERCISES.every((e) => (e.kind === 'breath' ? e.phases?.length : e.steps?.length))).toBeTruthy();
  });
});

describe('espaços e jornada', () => {
  it('Aquecimento sempre abre; trilha só com compra', () => {
    expect(spaceAccess(AQUECIMENTO, tracks, courses, new Set())).toBe('open');
    expect(spaceAccess('respira', tracks, courses, new Set())).toBe('locked');
    expect(spaceAccess('respira', tracks, courses, new Set(['protocolo-desligando-a-mente']))).toBe('open');
    expect(spaceAccess('ritmo', tracks, courses, new Set(['semana-organizada']))).toBe('soon');
  });

  it('curso exclusivo de bondade não abre a trilha nem aparece na lista de cursos', () => {
    expect(spaceAccess('respira', tracks, courses, new Set(['escuta-que-acolhe']))).toBe('locked');
    expect(trackCourses('respira', courses).some((c) => c.minKindnessLevel != null)).toBe(false);
    expect(spaceFor('respira', tracks)?.channel).toBe('respira');
  });

  it('jornada marca o que já foi feito e aponta o próximo passo', () => {
    const j = buildJourney({
      today: '2026-11-05',
      activity: [{ day: '2026-11-05', kind: 'escudo', ref: 'e1', minutes: 5 }],
      checkinDone: true,
      escudo: { id: 'e1', publishDate: '2026-11-05', title: 'Hoje', summary: '', audioUrl: null, durationMin: 5 },
      lesson: { id: 'l1', moduleId: 'm', courseId: 'c', title: 'Aula', summary: '', kind: 'video', durationMin: 10, sort: 1, isPreview: false },
    });
    expect(j.steps.map((s) => s.id)).toEqual(['checkin', 'escudo', 'aula', 'comunidade']);
    expect(j.doneCount).toBe(2);
    expect(j.next?.id).toBe('aula');
  });
});
