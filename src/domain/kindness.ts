/**
 * Níveis de bondade de cada trilha. O nível depende dos pontos ganhos
 * (validados) e de quantas pessoas diferentes geraram esses pontos.
 * Ver as regras de pontuação em ./points.ts.
 */
import { MAX_POINTS_PER_DAY, type PointKind, type PointStatus } from './points';

export interface KindnessLevel {
  level: number;
  name: string;
  /** Pontos ganhos (não diminuem quando a pessoa resgata uma recompensa). */
  minPoints: number;
  /** Pessoas diferentes que geraram pontos. */
  minGivers: number;
  meaning: string;
  color: string;
  textColor: string;
}

/**
 * Títulos neutros (servem para qualquer pessoa) inspirados nas virtudes de
 * "Humanidade" e "Transcendência" da classificação VIA de forças de caráter.
 * Com o máximo de 38 pontos por dia, Ombro Amigo pede um mês de dedicação
 * total, Farol uns seis meses e Luz Vivah perto de um ano.
 */
export const KINDNESS_LEVELS: KindnessLevel[] = [
  { level: 1, name: 'Semente', minPoints: 0, minGivers: 0, meaning: 'Toda bondade começa pequena.', color: '#ECE6DA', textColor: '#4A5A55' },
  { level: 2, name: 'Mão Amiga', minPoints: 300, minGivers: 10, meaning: 'Estende a mão para quem precisa.', color: '#D8F2EA', textColor: '#16614F' },
  { level: 3, name: 'Ombro Amigo', minPoints: 1140, minGivers: 30, meaning: 'Escuta sem julgar e acolhe.', color: '#BFE9DC', textColor: '#124F58' },
  { level: 4, name: 'Coração Gentil', minPoints: 2500, minGivers: 60, meaning: 'A gentileza virou jeito de ser.', color: '#FBE1D5', textColor: '#9A3F2B' },
  { level: 5, name: 'Ponte', minPoints: 4500, minGivers: 100, meaning: 'Liga pessoas ao que elas precisam.', color: '#F4865C', textColor: '#0B2A30' },
  { level: 6, name: 'Farol', minPoints: 7000, minGivers: 150, meaning: 'Ilumina o caminho em dias escuros.', color: '#F2C14E', textColor: '#0B2A30' },
  { level: 7, name: 'Porto Seguro', minPoints: 10000, minGivers: 250, meaning: 'Um lugar seguro para chegar.', color: '#124F58', textColor: '#F6F2EA' },
  { level: 8, name: 'Luz Vivah', minPoints: 13680, minGivers: 400, meaning: 'Inspira a comunidade inteira.', color: '#0B2A30', textColor: '#F2C14E' },
];

/** A partir deste nível (na trilha) a pessoa pode abrir o espaço de conselheiro. */
export const COUNSELOR_LEVEL = 6;

/** Equipe Vivah (Edmilson, moderadores) aparece com selo próprio. */
export const TEAM_LEVEL = 99;

export function levelInfo(level: number): KindnessLevel {
  return KINDNESS_LEVELS.find((l) => l.level === level) ?? KINDNESS_LEVELS[0];
}

/** Nível alcançado: precisa dos pontos e das pessoas diferentes. */
export function levelFor(points: number, givers: number): KindnessLevel {
  let current = KINDNESS_LEVELS[0];
  for (const l of KINDNESS_LEVELS) if (points >= l.minPoints && givers >= l.minGivers) current = l;
  return current;
}

/** Dias de dedicação total (38 pontos por dia) para chegar a um total de pontos. */
export function daysAtMax(points: number): number {
  return Math.ceil(points / MAX_POINTS_PER_DAY);
}

export interface LedgerEntry {
  kind: PointKind;
  points: number;
  status: PointStatus;
  actorId: string | null;
}

/** Pontos ganhos (só validados) e pessoas diferentes que geraram pontos. */
export function earnedFrom(events: LedgerEntry[]): { earned: number; givers: number } {
  const valid = events.filter((e) => e.status === 'valido');
  return {
    earned: valid.reduce((s, e) => s + e.points, 0),
    givers: new Set(valid.map((e) => e.actorId).filter(Boolean)).size,
  };
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
