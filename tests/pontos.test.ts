import { describe, expect, it } from 'vitest';

import { judgeContribution } from '../supabase/functions/_shared/contribution';
import { courses, lessons, products } from '../src/data/catalog';
import { award, type LedgerEvent, statsOf } from '../src/data/demo-points';
import { trackBadge } from '../src/domain/badges';
import { KINDNESS_LEVELS, levelFor, progressToNext } from '../src/domain/kindness';
import { DAILY_CAP, MAX_POINTS_PER_DAY, ONE_MONTH, POINTS } from '../src/domain/points';
import { PROGRAMS, programFor } from '../src/domain/programs';
import { rewardsOf, TRACK_REWARDS } from '../src/domain/rewards';

const NOW = '2026-11-06T15:00:00.000Z';
const DAY = '2026-11-06';
const give = (ledger: LedgerEvent[], kind: LedgerEvent['kind'], actor: string, user = 'eu', track = 'ritmo') => {
  const ev = award(ledger, { userId: user, actorId: actor, actorName: actor, trackId: track, kind, status: 'valido', day: DAY, now: NOW });
  if (ev) ledger.push(ev);
  return ev;
};

describe('pontos', () => {
  it('valem de 1 a 5 e o máximo do dia é 38', () => {
    expect(POINTS).toEqual({ curtida: 1, agradecimento: 2, ajuda: 3, conselho: 4, apoio: 5 });
    expect(MAX_POINTS_PER_DAY).toBe(38);
    expect(ONE_MONTH).toBe(1140);
  });

  it('limite diário por atividade', () => {
    const ledger: LedgerEvent[] = [];
    for (let i = 0; i < 15; i++) give(ledger, 'curtida', `p${i}`);
    expect(statsOf(ledger, 'eu', 'ritmo').earned).toBe(DAILY_CAP.curtida);
    expect(ledger.filter((e) => e.status === 'recusado')).toHaveLength(5);
    expect(ledger.find((e) => e.status === 'recusado')?.reason).toContain('Limite diário');
  });

  it('limites da mesma pessoa e pontos por trilha', () => {
    const ledger: LedgerEvent[] = [];
    for (let i = 0; i < 4; i++) {
      ledger.push({ id: `old${i}`, userId: 'eu', actorId: 'ana', actorName: 'Ana', trackId: 'ritmo', kind: 'agradecimento', points: 2, status: 'valido', reason: null, day: `2026-11-0${i + 1}`, createdAt: `2026-11-0${i + 1}T12:00:00Z` });
    }
    const ev = give(ledger, 'agradecimento', 'ana');
    expect(ev?.status).toBe('recusado');
    expect(give(ledger, 'apoio', 'bia')?.status).toBe('valido');
    expect(give(ledger, 'apoio', 'bia')?.status).toBe('recusado');
    expect(give(ledger, 'curtida', 'eu')).toBeNull();
    give(ledger, 'curtida', 'carla', 'eu', 'prospera');
    expect(statsOf(ledger, 'eu', 'prospera').earned).toBe(1);
  });

  it('níveis pedem pontos e pessoas diferentes, e Farol leva meses', () => {
    expect(levelFor(1140, 29).name).toBe('Mão Amiga');
    expect(levelFor(1140, 30).name).toBe('Ombro Amigo');
    const farol = KINDNESS_LEVELS.find((l) => l.name === 'Farol')!;
    expect(farol.minPoints / MAX_POINTS_PER_DAY).toBeGreaterThan(150);
    expect(progressToNext(0, 0).next?.name).toBe('Mão Amiga');
  });
});

describe('recompensas', () => {
  it('a mais barata de cada trilha custa um mês fazendo tudo todos os dias', () => {
    for (const track of Object.keys(PROGRAMS)) {
      const paid = rewardsOf(track).filter((r) => r.kind !== 'acesso');
      expect(paid.length).toBeGreaterThanOrEqual(3);
      expect(Math.min(...paid.map((r) => r.cost))).toBe(ONE_MONTH);
    }
  });

  it('conteúdo de recompensa existe como curso e não é vendido', () => {
    for (const r of TRACK_REWARDS.filter((x) => x.courseId)) {
      const c = courses.find((x) => x.id === r.courseId);
      expect(c?.rewardOnly).toBe(true);
      expect(products.some((p) => p.courseIds.includes(r.courseId!))).toBe(false);
    }
  });
});

describe('validação das mensagens', () => {
  it('aceita ajuda de verdade e recusa o resto, com motivo', () => {
    expect(judgeContribution('ajuda', 'Força, Bea! Tenta a respiração 4-6 deitada e anota o que está girando. Estou com você.').ok).toBe(true);
    expect(judgeContribution('ajuda', 'kkkkkkk').ok).toBe(false);
    expect(judgeContribution('ajuda', 'Me chama no zap 11 98888-7777 que eu te explico tudo direitinho, combinado?').flag).toBe('contato');
    expect(judgeContribution('ajuda', 'Você é um idiota, para de reclamar e vai trabalhar que passa logo isso aí').flag).toBe('ofensa');
    expect(judgeContribution('conselho', 'Hoje eu só queria dizer que estou cansada e que não sei mais o que fazer com tudo isso.').ok).toBe(false);
    expect(judgeContribution('conselho', 'Dica que mudou minha semana: defina 3 prioridades na noite anterior e reserve o primeiro bloco de foco de 45 minutos para a mais difícil.').ok).toBe(true);
  });

  it('sinal de risco vai para a equipe', () => {
    expect(judgeContribution('ajuda', 'Eu também já pensei em me matar, mas hoje estou melhor, procura ajuda por favor').flag).toBe('risco');
  });

  it('mensagem repetida não pontua de novo', () => {
    const txt = 'Calma, um dia de cada vez. Tente respirar fundo e conte comigo aqui na comunidade.';
    expect(judgeContribution('ajuda', txt, [txt]).ok).toBe(false);
  });
});

describe('programa de cada trilha', () => {
  it('Ritmo valida a programação do dia', () => {
    const v = programFor('ritmo').validate({ prioridades: ['a', 'b', 'c', 'd'], disponivel: 8, blocos: 2, reunioes: 1, inicio: '09:00' });
    expect(v.valid).toBe(false);
    expect(v.checks.some((c) => c.text.includes('Escolha no máximo 3'))).toBe(true);
    const ok = programFor('ritmo').validate({ prioridades: ['Enviar a proposta da Acme'], disponivel: 8, blocos: 2, reunioes: 2, inicio: '09:00' });
    expect(ok.valid).toBe(true);
    const cheio = programFor('ritmo').validate({ prioridades: ['Enviar a proposta da Acme'], disponivel: 4, blocos: 4, reunioes: 2, inicio: '09:00' });
    expect(cheio.valid).toBe(false);
  });

  it('Ritmo mede a produtividade do fim do dia', () => {
    const plan = { prioridades: ['Enviar a proposta', 'Revisar o contrato'], blocos: 2 };
    const s = programFor('ritmo').score({ feitas: [0, 1], blocosFeitos: 2, interrupcoes: 'Quase nenhuma', procrastinacao: 'Não', energia: 5 }, plan);
    expect(s.score).toBe(100);
    expect(programFor('ritmo').score({ feitas: [], blocosFeitos: 0, interrupcoes: 'Muitas', procrastinacao: 'Muito', energia: 1 }, plan).score).toBe(0);
  });

  it('Prospera confere o orçamento e o Move respeita a dor do check-in', () => {
    expect(programFor('prospera').validate({ limite: 50, previstos: 80, guardar: 10 }).valid).toBe(false);
    const m = programFor('move').validate({ tipo: 'Força', duracao: 30, horario: '07:00', passos: 6000 }, { pain: 8 });
    expect(m.checks.some((c) => c.text.includes('dor forte'))).toBe(true);
  });

  it('todas as trilhas têm plano, fechamento e apoio', () => {
    for (const p of Object.values(PROGRAMS)) {
      expect(p.plan.fields.length).toBeGreaterThan(0);
      expect(p.review.fields.length).toBeGreaterThan(0);
      expect(p.community.apoio.label).toBeTruthy();
      expect(p.score({}).score).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('selo de aulas', () => {
  it('um pedaço por curso, completo quando todas as aulas acabam', () => {
    const empty = trackBadge('respira', courses, lessons, []);
    expect(empty.pieces.length).toBeGreaterThan(1);
    expect(empty.complete).toBe(false);
    const protocolo = lessons.filter((l) => l.courseId === 'protocolo-desligando-a-mente').map((l) => ({ lessonId: l.id, positionSec: 0, completedAt: NOW }));
    const one = trackBadge('respira', courses, lessons, protocolo);
    expect(one.piecesComplete).toBe(1);
    const all = trackBadge('respira', courses, lessons, lessons.map((l) => ({ lessonId: l.id, positionSec: 0, completedAt: NOW })));
    expect(all.complete).toBe(true);
  });
});
