/**
 * Pontos de bondade: quanto vale cada atividade e os limites.
 *
 * Os pontos são de cada trilha (como a reputação em cada site do Stack
 * Exchange): ajudar na comunidade Ritmo rende pontos e recompensas da Ritmo.
 *
 * Quem calcula é o banco (migração 20261107000000). Este arquivo é a regra
 * escrita para o app mostrar e para o modo demonstração. Os dois precisam
 * bater; o teste em tests/pontos.test.ts confere os números.
 */

export type PointKind = 'curtida' | 'agradecimento' | 'ajuda' | 'conselho' | 'apoio';

export const POINT_KINDS: PointKind[] = ['curtida', 'agradecimento', 'ajuda', 'conselho', 'apoio'];

/** Pontos por atividade. */
export const POINTS: Record<PointKind, number> = {
  curtida: 1,
  agradecimento: 2,
  ajuda: 3,
  conselho: 4,
  apoio: 5,
};

/** Quantas vezes por dia cada atividade conta pontos (o resto fica registrado, sem pontos). */
export const DAILY_COUNT: Record<PointKind, number> = {
  curtida: 10,
  agradecimento: 5,
  ajuda: 3,
  conselho: 1,
  apoio: 1,
};

/** Teto de pontos por dia em cada atividade. */
export const DAILY_CAP: Record<PointKind, number> = {
  curtida: POINTS.curtida * DAILY_COUNT.curtida,
  agradecimento: POINTS.agradecimento * DAILY_COUNT.agradecimento,
  ajuda: POINTS.ajuda * DAILY_COUNT.ajuda,
  conselho: POINTS.conselho * DAILY_COUNT.conselho,
  apoio: POINTS.apoio * DAILY_COUNT.apoio,
};

/** O máximo que dá para ganhar num dia, numa trilha, fazendo tudo. */
export const MAX_POINTS_PER_DAY = POINT_KINDS.reduce((s, k) => s + DAILY_CAP[k], 0);

/** Um mês fazendo tudo, todos os dias: o preço da recompensa mais barata. */
export const ONE_MONTH = MAX_POINTS_PER_DAY * 30;

/** Regras contra abuso, validadas no servidor. */
export const RULES = {
  /** Curtidas da mesma pessoa que contam por mês. */
  curtidasDaMesmaPessoaPorMes: 10,
  /** Agradecimentos da mesma pessoa que contam por mês. */
  agradecimentosDaMesmaPessoaPorMes: 3,
  /** Agradecimentos que cada pessoa pode dar por dia. */
  agradecimentosDadosPorDia: 10,
  /** Tamanho mínimo de uma mensagem de ajuda. */
  ajudaMinCaracteres: 40,
  /** Tamanho mínimo de uma postagem de conselho/dica. */
  conselhoMinCaracteres: 80,
  /** Apoio para a mesma pessoa que conta por semana. */
  apoioMesmaPessoaPorSemana: 1,
} as const;

export type PointStatus = 'pendente' | 'valido' | 'recusado';

export const STATUS_LABEL: Record<PointStatus, string> = {
  pendente: 'Em validação',
  valido: 'Validado',
  recusado: 'Não pontuou',
};

/** "1.140", sem depender do Intl do aparelho. */
export function formatPoints(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
