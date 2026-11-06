/**
 * Teste do primeiro acesso: em que momento da vida a pessoa está e por qual
 * trilha começar.
 *
 * Critério: as necessidades seguem uma ordem (a jornada da Vivah). Primeiro a
 * mente; depois a base da rotina (tempo, corpo e alimentação); depois o
 * dinheiro; e então a carreira. O momento é o primeiro degrau da escada que
 * pede atenção. Quem chega pela carreira com a mente em ordem segue a jornada
 * técnica (Eleva → Ritmo → Prospera).
 *
 * As perguntas de ansiedade e preocupação são inspiradas no GAD-2 e as de
 * atividade física na recomendação da OMS (150 min por semana), mas o teste
 * não diagnostica nada: ele orienta a escolha da trilha.
 */
import type { LifeArea } from '../data/types';

export interface TestOption {
  label: string;
  /** 0 = está bem; 3 = pede atenção. */
  score: number;
}

export interface TestQuestion {
  id: string;
  area: LifeArea | 'objetivo';
  prompt: string;
  options: TestOption[];
}

const freq = (labels: [string, string, string, string]): TestOption[] => labels.map((label, score) => ({ label, score }));
const FREQ = freq(['Nunca', 'Alguns dias', 'Mais da metade dos dias', 'Quase todos os dias']);

export const LIFE_TEST: TestQuestion[] = [
  { id: 'ansiedade', area: 'mente', prompt: 'Nas últimas duas semanas, quantas vezes você se sentiu nervoso, ansioso ou no limite?', options: FREQ },
  { id: 'preocupacao', area: 'mente', prompt: 'E quantas vezes não conseguiu parar ou controlar as preocupações?', options: FREQ },
  { id: 'sono', area: 'mente', prompt: 'Com que frequência você dorme mal ou acorda cansado?', options: FREQ },
  { id: 'prioridades', area: 'tempo', prompt: 'Com que frequência você termina o dia sem ter feito o que era mais importante?', options: FREQ },
  { id: 'rotina', area: 'tempo', prompt: 'Como está a sua rotina?', options: freq(['Tenho horários e cumpro', 'Tenho, mas falho às vezes', 'Muda todo dia', 'Não tenho rotina nenhuma']) },
  { id: 'movimento', area: 'corpo', prompt: 'Em quantos dias da semana você se movimenta por pelo menos 30 minutos?', options: freq(['5 ou mais', '3 ou 4', '1 ou 2', 'Nenhum']) },
  { id: 'disposicao', area: 'corpo', prompt: 'Como está a sua disposição física no dia a dia?', options: freq(['Ótima', 'Boa', 'Baixa', 'Vivo cansado']) },
  { id: 'ultraprocessados', area: 'alimentacao', prompt: 'Com que frequência você come fast food, salgadinhos ou outros ultraprocessados?', options: freq(['Quase nunca', '1 ou 2 vezes por semana', 'Quase todo dia', 'Várias vezes por dia']) },
  { id: 'emocao', area: 'alimentacao', prompt: 'Você come por ansiedade, tédio ou emoção?', options: FREQ },
  { id: 'mes', area: 'financas', prompt: 'Como você costuma terminar o mês?', options: freq(['Sobra e eu guardo', 'Empata', 'Às vezes falta', 'No vermelho, com dívidas']) },
  { id: 'dinheiro', area: 'financas', prompt: 'Quanto o dinheiro tira o seu sono?', options: freq(['Nada', 'Um pouco', 'Bastante', 'Muito']) },
  { id: 'carreira', area: 'carreira', prompt: 'Como você se sente em relação ao seu trabalho ou carreira?', options: freq(['Crescendo', 'Estável', 'Estagnado', 'Perdido']) },
  { id: 'plano', area: 'carreira', prompt: 'Você tem um plano claro para a sua vida profissional nos próximos 12 meses?', options: freq(['Sim, e estou executando', 'Tenho uma ideia', 'Não muito', 'Nenhum']) },
  {
    id: 'objetivo',
    area: 'objetivo',
    prompt: 'O que você mais quer mudar nos próximos 3 meses?',
    options: [
      { label: 'Ter paz na cabeça e dormir melhor', score: 0 },
      { label: 'Organizar a minha rotina e o meu tempo', score: 1 },
      { label: 'Cuidar do corpo e ter mais disposição', score: 2 },
      { label: 'Comer melhor', score: 3 },
      { label: 'Sair do aperto financeiro', score: 4 },
      { label: 'Crescer na carreira', score: 5 },
    ],
  },
];

const GOAL_AREA: LifeArea[] = ['mente', 'tempo', 'corpo', 'alimentacao', 'financas', 'carreira'];

export type MomentId = 'reequilibrio' | 'organizacao' | 'estabilidade' | 'crescimento';

export interface Moment {
  id: MomentId;
  title: string;
  /** Frase que descreve o momento para a pessoa. */
  text: string;
  /** Degrau da escada (1 a 4). */
  step: number;
}

export const MOMENTS: Record<MomentId, Moment> = {
  reequilibrio: {
    id: 'reequilibrio',
    step: 1,
    title: 'Momento de reequilíbrio',
    text: 'A sua mente está pedindo atenção. Antes de acelerar qualquer outra área, o primeiro passo é baixar o volume da ansiedade e voltar a dormir bem.',
  },
  organizacao: {
    id: 'organizacao',
    step: 2,
    title: 'Momento de organização',
    text: 'A cabeça está mais tranquila, mas a base do dia a dia precisa de ordem: tempo, corpo e alimentação. É isso que dá energia para o resto.',
  },
  estabilidade: {
    id: 'estabilidade',
    step: 3,
    title: 'Momento de estabilidade',
    text: 'A rotina está de pé. Agora o dinheiro é o que mais pesa: organizar o orçamento e sair do aperto traz segurança para crescer.',
  },
  crescimento: {
    id: 'crescimento',
    step: 4,
    title: 'Momento de crescimento',
    text: 'A sua base está firme. É hora de investir na carreira: método, comunicação e liderança para dar o próximo passo.',
  },
};

/** Trilha de cada área. */
export const AREA_TRACK: Record<LifeArea, string> = {
  mente: 'respira',
  tempo: 'ritmo',
  corpo: 'move',
  alimentacao: 'nutre',
  financas: 'prospera',
  carreira: 'eleva',
};

/** As duas jornadas da Vivah (apresentação do plano, slides 19 e 20). */
export const MIND_JOURNEY = ['respira', 'ritmo', 'move', 'nutre', 'prospera', 'eleva'];
export const CAREER_JOURNEY = ['eleva', 'ritmo', 'prospera', 'respira', 'move', 'nutre'];

/** A partir de quanto (0–100) uma área "pede atenção". */
export const ATTENTION = 55;

export interface LifeResult {
  /** Necessidade de cada área, 0 (tudo bem) a 100 (pede muita atenção). */
  needs: Record<LifeArea, number>;
  goal: LifeArea;
  moment: Moment;
  recommendedTrackId: string;
  /** Ordem sugerida das trilhas, a começar pela indicada. */
  path: string[];
  journey: 'mente' | 'carreira';
}

export function scoreLifeTest(answers: Record<string, number>): LifeResult {
  const sums: Record<LifeArea, number[]> = { mente: [], tempo: [], corpo: [], alimentacao: [], financas: [], carreira: [] };
  for (const q of LIFE_TEST) {
    if (q.area === 'objetivo') continue;
    const v = answers[q.id];
    if (typeof v === 'number') sums[q.area].push(v);
  }
  const needs = Object.fromEntries(
    Object.entries(sums).map(([a, vs]) => [a, vs.length ? Math.round((vs.reduce((s, v) => s + v, 0) / (vs.length * 3)) * 100) : 0]),
  ) as Record<LifeArea, number>;
  const goal = GOAL_AREA[answers.objetivo ?? 0] ?? 'mente';

  // Mente em alerta vem primeiro, qualquer que seja o objetivo.
  let moment: Moment;
  let recommended: string;
  let journey: LifeResult['journey'] = 'mente';
  const base: LifeArea[] = ['tempo', 'corpo', 'alimentacao'];
  const worstBase = base.reduce((a, b) => (needs[b] > needs[a] ? b : a));

  if (needs.mente >= ATTENTION) {
    moment = MOMENTS.reequilibrio;
    recommended = 'respira';
  } else if (goal === 'carreira' && needs.financas < 75 && needs[worstBase] < 75) {
    // Quem chega pela carreira com a base razoável segue a jornada técnica.
    moment = MOMENTS.crescimento;
    recommended = 'eleva';
    journey = 'carreira';
  } else if (needs[worstBase] >= ATTENTION) {
    moment = MOMENTS.organizacao;
    // Se o objetivo for uma das áreas da base que pede atenção, começa por ela.
    recommended = base.includes(goal) && needs[goal] >= ATTENTION ? AREA_TRACK[goal] : AREA_TRACK[worstBase];
  } else if (needs.financas >= ATTENTION) {
    moment = MOMENTS.estabilidade;
    recommended = 'prospera';
  } else {
    moment = MOMENTS.crescimento;
    recommended = 'eleva';
    journey = goal === 'carreira' ? 'carreira' : 'mente';
  }

  const order = journey === 'carreira' ? CAREER_JOURNEY : MIND_JOURNEY;
  const path = [recommended, ...order.filter((t) => t !== recommended && order.indexOf(t) > order.indexOf(recommended)), ...order.filter((t) => t !== recommended && order.indexOf(t) < order.indexOf(recommended))];
  return { needs, goal, moment, recommendedTrackId: recommended, path, journey };
}
