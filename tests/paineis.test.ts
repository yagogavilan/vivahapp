import { describe, expect, it } from 'vitest';

import { addDays } from '../src/domain/dates';
import {
  bmi,
  bmiClass,
  counterGoal,
  daysLeftInMonth,
  debtOrder,
  debtsOf,
  describeEntry,
  type Entry,
  gad7Band,
  gad7Score,
  mealBalance,
  metricOf,
  missingFields,
  monthBudget,
  PANELS,
  panelStores,
  parseExercise,
  sleepStats,
  trainingVolume,
  valueFor,
  waistRisk,
  waterGoalMl,
  weekActivity,
  weekStart,
  weightTrend,
  whrRisk,
} from '../src/domain/panels';

const TODAY = '2026-11-12'; // quinta-feira
let n = 0;
const e = (metric: string, day: string, data: Record<string, unknown> = {}, value: number | null = null, trackId = 'move'): Entry => ({
  id: `e${++n}`, trackId, metric, day, key: String(n), value, data: data as Entry['data'], createdAt: `${day}T10:00:00Z`,
});

describe('Move: corpo', () => {
  it('meta de água: 35 ml por kg, entre 1,5 e 4 litros', () => {
    expect(waterGoalMl(70)).toBe(2450);
    expect(waterGoalMl(null)).toBe(2000);
    expect(waterGoalMl(30)).toBe(1500);
    expect(waterGoalMl(150)).toBe(4000);
  });

  it('IMC e faixas da OMS', () => {
    expect(bmi(80, 180)).toBeCloseTo(24.7, 1);
    expect(bmiClass(24.7).label).toBe('peso adequado');
    expect(bmiClass(27).label).toBe('sobrepeso');
    expect(bmiClass(31).tone).toBe('alerta');
  });

  it('cintura e relação cintura-quadril com faixas diferentes para homens e mulheres', () => {
    expect(waistRisk(85, 'F').label).toBe('risco aumentado');
    expect(waistRisk(85, 'M').label).toBe('dentro da faixa');
    expect(waistRisk(103, 'M').tone).toBe('alerta');
    expect(whrRisk(0.88, 'F')).toBe('aviso');
    expect(whrRisk(0.88, 'M')).toBe('ok');
  });

  it('lê os exercícios no formato séries x repetições e carga', () => {
    expect(parseExercise('Agachamento 4x10 40kg')).toEqual({ sets: 4, reps: 10, load: 40 });
    expect(parseExercise('Supino 3 x 12 @ 22,5')).toEqual({ sets: 3, reps: 12, load: 22.5 });
    expect(parseExercise('Prancha 3x30')).toEqual({ sets: 3, reps: 30, load: 0 });
    expect(trainingVolume(['Agachamento 4x10 40kg', 'Remada 3x12 20kg', 'Alongamento'])).toBe(1600 + 720);
  });

  it('minutos da semana no padrão da OMS: vigorosa vale o dobro e força conta por dia', () => {
    const ws = weekStart(TODAY);
    expect(ws).toBe('2026-11-09');
    const treinos = [
      e('treino', ws, { modalidade: 'Musculação (academia)', duracao: 50, intensidade: 'Moderada' }),
      e('treino', addDays(ws, 1), { modalidade: 'Corrida', duracao: 30, intensidade: 'Vigorosa' }),
      e('treino', addDays(ws, 2), { modalidade: 'Funcional', duracao: 40, intensidade: 'Moderada' }),
      e('treino', addDays(ws, 2), { modalidade: 'Caminhada', duracao: 20, intensidade: 'Leve' }),
      e('treino', addDays(ws, -1), { modalidade: 'Corrida', duracao: 60, intensidade: 'Vigorosa' }),
    ];
    expect(weekActivity(treinos, TODAY)).toEqual({ minutes: 50 + 60 + 40, strengthDays: 2, sessions: 4 });
  });

  it('tendência do peso e alerta de mudança rápida (mais de 1% por semana)', () => {
    const pesos = [e('peso', addDays(TODAY, -30), {}, 84), e('peso', addDays(TODAY, -7), {}, 82.5), e('peso', TODAY, {}, 81.2)];
    const t = weightTrend(pesos, TODAY)!;
    expect(t.current).toBe(81.2);
    expect(t.d30).toBeCloseTo(-2.8, 5);
    expect(t.fast).toBe(true);
    expect(weightTrend([e('peso', TODAY, {}, 80), e('peso', addDays(TODAY, -8), {}, 80.4)], TODAY)!.fast).toBe(false);
  });

  it('painel no Hoje: água, treino, peso, passos e cintura', () => {
    const entries = [
      e('corpo', '2026-10-01', { altura: 175, sexo: 'Masculino', metaPassos: 9000 }),
      e('peso', TODAY, {}, 82),
      e('agua', TODAY, {}, 1500),
      e('medidas', TODAY, { cintura: 96, quadril: 100 }, 96),
    ];
    const tiles = PANELS.move.tiles({ today: TODAY, entries });
    expect(tiles.map((t) => t.metric)).toEqual(['agua', 'treino', 'peso', 'passos', 'medidas']);
    expect(tiles[0].detail).toContain('2,85 L');
    expect(tiles[2].detail).toContain('IMC 26,8');
    expect(tiles[3].detail).toBe('meta 9.000');
    expect(tiles[4].detail).toBe('risco aumentado');
    const insights = PANELS.move.insights({ today: TODAY, entries }).map((i) => i.text).join(' ');
    expect(insights).toContain('Faltam 150 minutos');
    expect(insights).toContain('Relação cintura-quadril 0,96');
    expect(counterGoal('move', 'passos', entries, TODAY)).toBe(9000);
  });
});

describe('Nutre: alimentação', () => {
  it('fome antes e saciedade depois', () => {
    expect(mealBalance(e('refeicao', TODAY, { fome: 5, saciedade: 6 }))).toBe('ok');
    expect(mealBalance(e('refeicao', TODAY, { fome: 9, saciedade: 7 }))).toBe('muita-fome');
    expect(mealBalance(e('refeicao', TODAY, { fome: 4, saciedade: 10 }))).toBe('passou');
  });

  it('lê a água do Move (a mesma meta nas duas trilhas)', () => {
    expect(panelStores('nutre')).toEqual(['nutre', 'move']);
    expect(metricOf('nutre', 'agua')?.store).toBe('move');
    const tiles = PANELS.nutre.tiles({ today: TODAY, entries: [e('agua', TODAY, {}, 1000, 'move'), e('porcoes', TODAY, {}, 3, 'nutre')] });
    expect(tiles.find((t) => t.metric === 'agua')?.value).toBe('1,00 L');
    expect(tiles.find((t) => t.metric === 'porcoes')?.value).toBe('3 de 5');
  });

  it('padrões da semana sem contar calorias', () => {
    const meals = Array.from({ length: 4 }, (_, i) =>
      e('refeicao', addDays(TODAY, -i), { tipo: 'Jantar', prato: ['Arroz, feijão ou outro grão'], casa: false, motivo: 'Ansiedade', como: ['Com pressa'], fome: 5, saciedade: 6 }, null, 'nutre'));
    const text = PANELS.nutre.insights({ today: TODAY, entries: meals }).map((i) => i.text).join(' ');
    expect(text).toContain('0% das refeições');
    expect(text).toContain('Verduras e legumes em 0 de 4');
    expect(text).toContain('veio de uma emoção');
    expect(text).not.toMatch(/caloria/i);
  });
});

describe('Respira: mente', () => {
  it('GAD-7: pontuação de 0 a 21 e faixas', () => {
    const all = (opt: string) => Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`q${i + 1}`, opt]));
    expect(gad7Score(all('Vários dias'))).toBe(7);
    expect(gad7Score(all('Quase todos os dias'))).toBe(21);
    expect(gad7Score({ q1: 'Vários dias' })).toBeNull();
    expect(gad7Band(4).label).toBe('ansiedade mínima');
    expect(gad7Band(9).label).toBe('ansiedade leve');
    expect(gad7Band(10).tone).toBe('alerta');
    expect(gad7Band(15).label).toBe('ansiedade grave');
  });

  it('diário do sono: eficiência = tempo dormindo ÷ tempo na cama, passando da meia-noite', () => {
    const s = sleepStats({ deitou: '23:00', levantou: '07:00', latencia: 30, acordado: 30 })!;
    expect(s.inBed).toBe(480);
    expect(s.asleep).toBe(420);
    expect(s.efficiency).toBe(88);
    expect(valueFor(metricOf('respira', 'sono')!, { deitou: '00:30', levantou: '06:30', latencia: 60, acordado: 60 })).toBe(67);
  });

  it('pede ajuda profissional a partir de 10 pontos', () => {
    const text = PANELS.respira.insights({ today: TODAY, entries: [e('gad7', TODAY, {}, 12, 'respira')] }).map((i) => i.text).join(' ');
    expect(text).toContain('profissional de saúde mental');
  });
});

describe('Ritmo e Eleva', () => {
  it('revisão semanal vira porcentagem e habilidades, média', () => {
    const rev = metricOf('ritmo', 'revisao')!;
    expect(valueFor(rev, { r1: true, r2: true, r3: false, r4: true, r5: true, r6: false, r7: true })).toBe(71);
    const hab = metricOf('eleva', 'habilidades')!;
    expect(valueFor(hab, { h1: 4, h2: 2 })).toBe(3);
  });

  it('auditoria do tempo aponta reuniões e mensagens demais', () => {
    const entries = [
      e('tempo', TODAY, { categoria: 'Reuniões', minutos: 180 }, 180, 'ritmo'),
      e('tempo', TODAY, { categoria: 'E-mail e mensagens', minutos: 120 }, 120, 'ritmo'),
      e('tempo', TODAY, { categoria: 'Trabalho focado', minutos: 60 }, 60, 'ritmo'),
    ];
    const text = PANELS.ritmo.insights({ today: TODAY, entries }).map((i) => i.text).join(' ');
    expect(text).toContain('83% do seu tempo');
    expect(text).toContain('17% do tempo registrado foi trabalho focado');
  });
});

describe('Prospera: dinheiro', () => {
  it('regra 50-30-20 do mês e quanto dá para gastar por dia', () => {
    const entries = [
      e('financas', '2026-10-01', { renda: 5000, essencial: 2800, meses: '6 meses' }, null, 'prospera'),
      e('gasto', '2026-11-02', { tipo: 'Saída', valor: 1800, categoria: 'Moradia', pagamento: 'Boleto' }, 1800, 'prospera'),
      e('gasto', '2026-11-05', { tipo: 'Saída', valor: 700, categoria: 'Restaurante e delivery', pagamento: 'Cartão de crédito' }, 700, 'prospera'),
      e('gasto', '2026-11-06', { tipo: 'Saída', valor: 500, categoria: 'Reserva e investimento', pagamento: 'Pix ou débito' }, 500, 'prospera'),
      e('gasto', '2026-10-30', { tipo: 'Saída', valor: 999, categoria: 'Compras' }, 999, 'prospera'),
    ];
    const b = monthBudget(entries, TODAY);
    expect(b).toMatchObject({ essencial: 1800, desejo: 700, futuro: 500, saidas: 3000, credito: 700 });
    expect(daysLeftInMonth(TODAY)).toBe(19);
    const tiles = PANELS.prospera.tiles({ today: TODAY, entries });
    expect(tiles[0].detail).toBe('60% da renda');
    expect(tiles[1].value).toBe('R$ 105');
    expect(PANELS.prospera.insights({ today: TODAY, entries }).map((i) => i.text).join(' ')).toContain('36% em essenciais (até 50%), 14% em desejos (até 30%) e 10% no futuro');
  });

  it('dívidas: avalanche pelo maior juro, bola de neve pelo menor saldo', () => {
    const entries = [
      e('divida', TODAY, { nome: 'Cartão', saldo: 3000, juros: 14 }, 3000, 'prospera'),
      e('divida', TODAY, { nome: 'Empréstimo', saldo: 8000, juros: 2.5 }, 8000, 'prospera'),
      e('divida', TODAY, { nome: 'Loja', saldo: 600, juros: 5 }, 600, 'prospera'),
    ];
    const debts = debtsOf(entries);
    expect(debtOrder(debts, 'avalanche').map((d) => d.nome)).toEqual(['Cartão', 'Loja', 'Empréstimo']);
    expect(debtOrder(debts, 'bola-de-neve').map((d) => d.nome)).toEqual(['Loja', 'Cartão', 'Empréstimo']);
    const text = PANELS.prospera.insights({ today: TODAY, entries }).map((i) => i.text).join(' ');
    expect(text).toContain('Cartão: juro de rotativo');
  });
});

describe('formulários do painel', () => {
  it('confere os campos obrigatórios e descreve o registro numa linha', () => {
    const treino = metricOf('move', 'treino')!;
    expect(missingFields(treino, { modalidade: 'Funcional' })).toEqual(['Duração', 'Intensidade', 'Esforço percebido (0 a 10)']);
    const line = describeEntry(treino, e('treino', TODAY, { modalidade: 'Musculação (academia)', duracao: 50, intensidade: 'Moderada', esforco: 7, exercicios: ['Agachamento 4x10 40kg'], dor: true }));
    expect(line).toBe('Musculação (academia) · 50 min · Moderada · esforço percebido 7 · Agachamento 4x10 40kg · com dor · volume 1.600 kg');
  });

  it('cada trilha tem painel, com fonte nas métricas que usam referência', () => {
    expect(Object.keys(PANELS).sort()).toEqual(['eleva', 'move', 'nutre', 'prospera', 'respira', 'ritmo']);
    for (const p of Object.values(PANELS)) {
      expect(p.tiles({ today: TODAY, entries: [] }).length).toBeGreaterThanOrEqual(4);
      expect(p.insights({ today: TODAY, entries: [] }).length).toBeGreaterThan(0);
    }
  });
});
