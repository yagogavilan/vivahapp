/**
 * Reconhecimento de bondade: quem ajuda alguém na comunidade recebe um
 * "obrigado", que vira pontos, níveis, selos e prêmios.
 *
 * Regras pensadas para não virar "farm" de pontos (lições do Stack Overflow,
 * do Codidact e do 7 Cups):
 * - só a pessoa ajudada agradece, nunca a si mesma, e uma vez por item;
 * - cada pessoa dá no máximo 10 agradecimentos por dia;
 * - de uma mesma pessoa contam no máximo 3 agradecimentos por mês;
 * - cada nível exige pontos E um número mínimo de pessoas diferentes.
 *
 * As mesmas regras estão no banco (migração 20261106000000) e este arquivo
 * gera as tabelas de níveis e prêmios do seed.
 */

export const THANK_POINTS = {
  /** Obrigado num post ou num comentário. */
  item: 10,
  /** O autor do post agradece um comentário que respondeu ao pedido dele. */
  fromPostAuthor: 20,
  /** Conselho recebido de um conselheiro. */
  advice: 30,
} as const;

export const THANKS_PER_DAY = 10;
export const PAIR_CAP_PER_MONTH = 3;

export interface KindnessLevel {
  level: number;
  name: string;
  /** Pontos mínimos. */
  minPoints: number;
  /** Pessoas diferentes que já agradeceram. */
  minGivers: number;
  meaning: string;
  color: string;
  textColor: string;
}

/**
 * Títulos neutros (servem para qualquer pessoa) inspirados nas virtudes de
 * "Humanidade" e "Transcendência" da classificação VIA de forças de caráter
 * (bondade, amor, inteligência social, esperança): de quem estende a mão a
 * quem ilumina o caminho dos outros.
 */
export const KINDNESS_LEVELS: KindnessLevel[] = [
  { level: 1, name: 'Semente', minPoints: 0, minGivers: 0, meaning: 'Toda bondade começa pequena.', color: '#ECE6DA', textColor: '#4A5A55' },
  { level: 2, name: 'Mão Amiga', minPoints: 50, minGivers: 5, meaning: 'Estende a mão para quem precisa.', color: '#D8F2EA', textColor: '#16614F' },
  { level: 3, name: 'Ombro Amigo', minPoints: 200, minGivers: 15, meaning: 'Escuta sem julgar e acolhe.', color: '#BFE9DC', textColor: '#124F58' },
  { level: 4, name: 'Coração Gentil', minPoints: 500, minGivers: 35, meaning: 'A gentileza virou jeito de ser.', color: '#FBE1D5', textColor: '#9A3F2B' },
  { level: 5, name: 'Ponte', minPoints: 1200, minGivers: 70, meaning: 'Liga pessoas ao que elas precisam.', color: '#F4865C', textColor: '#0B2A30' },
  { level: 6, name: 'Farol', minPoints: 2500, minGivers: 120, meaning: 'Ilumina o caminho em dias escuros.', color: '#F2C14E', textColor: '#0B2A30' },
  { level: 7, name: 'Porto Seguro', minPoints: 5000, minGivers: 200, meaning: 'Um lugar seguro para chegar.', color: '#124F58', textColor: '#F6F2EA' },
  { level: 8, name: 'Luz Vivah', minPoints: 10000, minGivers: 350, meaning: 'Inspira a comunidade inteira.', color: '#0B2A30', textColor: '#F2C14E' },
];

/** A partir deste nível a pessoa pode abrir o espaço de conselheiro. */
export const COUNSELOR_LEVEL = 6;

/** Equipe Vivah (Edmilson, moderadores) aparece com selo próprio. */
export const TEAM_LEVEL = 99;

export type RewardKind = 'selo' | 'conteudo' | 'fisico' | 'acesso';

export interface KindnessReward {
  id: string;
  level: number;
  kind: RewardKind;
  title: string;
  description: string;
  /** Para conteúdo exclusivo: o curso que libera. */
  courseId?: string;
}

export const KINDNESS_REWARDS: KindnessReward[] = [
  { id: 'selo-mao-amiga', level: 2, kind: 'selo', title: 'Selo Mão Amiga', description: 'Aparece ao lado do seu nome em tudo o que você publica.' },
  { id: 'conteudo-escuta', level: 3, kind: 'conteudo', title: 'Aula exclusiva: Escuta que acolhe', description: 'Como ajudar alguém sem dar sermão nem conselho apressado.', courseId: 'escuta-que-acolhe' },
  { id: 'broche-coracao', level: 4, kind: 'fisico', title: 'Broche Coração Gentil', description: 'Broche esmaltado da Vivah, enviado para a sua casa.' },
  { id: 'roda-gentis', level: 4, kind: 'conteudo', title: 'Roda dos Gentis', description: 'Encontro ao vivo mensal, fechado, com o Edmilson.', courseId: 'roda-dos-gentis' },
  { id: 'copo-ponte', level: 5, kind: 'fisico', title: 'Copo térmico Ponte', description: 'Copo térmico Vivah com o seu nível gravado.' },
  { id: 'conteudo-conversas', level: 5, kind: 'conteudo', title: 'Masterclass: Conversas difíceis', description: 'Como apoiar alguém em crise e quando encaminhar para ajuda profissional.', courseId: 'conversas-dificeis' },
  { id: 'acesso-conselheiro', level: 6, kind: 'acesso', title: 'Espaço de Conselheiro', description: 'Você abre um espaço para as pessoas pedirem conselho e trocarem experiências com você.' },
  { id: 'formacao-farol', level: 6, kind: 'conteudo', title: 'Formação de Conselheiro', description: 'Três aulas obrigatórias antes de abrir o seu espaço.', courseId: 'formacao-conselheiro' },
  { id: 'camiseta-farol', level: 6, kind: 'fisico', title: 'Camiseta Farol Vivah', description: 'A camiseta que só os Faróis têm.' },
  { id: 'mentoria-porto', level: 7, kind: 'conteudo', title: 'Mentoria em grupo com o Edmilson', description: 'Um encontro por trimestre com os Portos Seguros.', courseId: 'mentoria-porto-seguro' },
  { id: 'kit-porto', level: 7, kind: 'fisico', title: 'Kit Porto Seguro', description: 'Moletom, caderno e broche dourado.' },
  { id: 'imersao-luz', level: 8, kind: 'fisico', title: 'Convite para a imersão presencial', description: 'Ingresso para a próxima imersão da Vivah, com troféu entregue no palco.' },
  { id: 'mural-luz', level: 8, kind: 'selo', title: 'Nome no Mural da Bondade', description: 'Seu nome fica para sempre no mural do app.' },
];

export function levelInfo(level: number): KindnessLevel {
  return KINDNESS_LEVELS.find((l) => l.level === level) ?? KINDNESS_LEVELS[0];
}

/** Nível alcançado: precisa dos pontos e das pessoas diferentes. */
export function levelFor(points: number, givers: number): KindnessLevel {
  let current = KINDNESS_LEVELS[0];
  for (const l of KINDNESS_LEVELS) if (points >= l.minPoints && givers >= l.minGivers) current = l;
  return current;
}

export interface ThankRecord {
  giverId: string;
  receiverId: string;
  points: number;
  createdAt: string;
}

const monthKey = (iso: string) => {
  // Mês de Brasília (UTC-3, sem horário de verão desde 2019).
  const d = new Date(new Date(iso).getTime() - 3 * 3_600_000);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
};

/** Pontos e pessoas diferentes de quem recebeu, aplicando o limite por pessoa/mês. */
export function computeKindness(thanks: ThankRecord[], userId: string): { points: number; givers: number } {
  const mine = thanks.filter((t) => t.receiverId === userId && t.giverId !== userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const perPairMonth = new Map<string, number>();
  let points = 0;
  for (const t of mine) {
    const k = `${t.giverId}|${monthKey(t.createdAt)}`;
    const n = (perPairMonth.get(k) ?? 0) + 1;
    perPairMonth.set(k, n);
    if (n <= PAIR_CAP_PER_MONTH) points += t.points;
  }
  return { points, givers: new Set(mine.map((t) => t.giverId)).size };
}

export interface KindnessProgress {
  level: KindnessLevel;
  next: KindnessLevel | undefined;
  /** 0–1, pelo requisito mais atrasado (pontos ou pessoas). */
  ratio: number;
  pointsLeft: number;
  giversLeft: number;
}

export function progressToNext(points: number, givers: number): KindnessProgress {
  const level = levelFor(points, givers);
  const next = KINDNESS_LEVELS.find((l) => l.level === level.level + 1);
  if (!next) return { level, next, ratio: 1, pointsLeft: 0, giversLeft: 0 };
  const span = (from: number, to: number, v: number) => (to <= from ? 1 : Math.max(0, Math.min(1, (v - from) / (to - from))));
  const ratio = Math.min(span(level.minPoints, next.minPoints, points), span(level.minGivers, next.minGivers, givers));
  return { level, next, ratio, pointsLeft: Math.max(0, next.minPoints - points), giversLeft: Math.max(0, next.minGivers - givers) };
}

export function rewardsFor(level: number) {
  return KINDNESS_REWARDS.filter((r) => r.level === level);
}
