import { describe, expect, it } from 'vitest';

import { courses, tracks } from '../src/data/catalog';
import { questionsFor, readCheckin } from '../src/domain/checkin-protocol';
import { EXERCISES, exerciseById, SOS_BY_TRACK } from '../src/domain/exercises';
import { buildJourney } from '../src/domain/journey';
import { AQUECIMENTO, spaceAccess, spaceFor, trackCourses } from '../src/domain/spaces';

const t = (giverId: string, iso: string, points = 10) => ({ giverId, receiverId: 'eu', points, createdAt: iso });

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

  it('curso de recompensa não abre a trilha nem aparece na lista de cursos', () => {
    expect(spaceAccess('respira', tracks, courses, new Set(['premio-respira-r2']))).toBe('locked');
    expect(trackCourses('respira', courses).some((c) => c.minKindnessLevel != null || c.rewardOnly)).toBe(false);
    expect(spaceFor('respira', tracks)?.channel).toBe('respira');
  });

  it('jornada marca o que já foi feito e aponta o próximo passo', () => {
    const j = buildJourney({
      today: '2026-11-05',
      activity: [{ day: '2026-11-05', kind: 'escudo', ref: 'e1', minutes: 5 }],
      checkinDone: true,
      planDone: true,
      reviewDone: false,
      planTitle: 'Plano',
      reviewTitle: 'Fechamento',
      escudo: { id: 'e1', publishDate: '2026-11-05', title: 'Hoje', summary: '', audioUrl: null, durationMin: 5 },
      lesson: { id: 'l1', moduleId: 'm', courseId: 'c', title: 'Aula', summary: '', kind: 'video', durationMin: 10, sort: 1, isPreview: false },
    });
    expect(j.steps.map((s) => s.id)).toEqual(['checkin', 'plano', 'pratica', 'fechamento', 'comunidade']);
    expect(j.doneCount).toBe(2);
    expect(j.next?.id).toBe('pratica');
  });
});
