import { trackByArea } from '../data/catalog';
import type { DiagnosticQuestion, LifeArea, Track } from '../data/types';

export const AREAS: LifeArea[] = ['mente', 'tempo', 'carreira', 'financas', 'corpo', 'alimentacao'];

/**
 * Pontuação de atenção por área, de 0 (está bem) a 100 (pede atenção).
 * Cada resposta vale de 0 a 3; a área recebe a média das suas perguntas.
 */
export function scoreDiagnostic(
  questions: DiagnosticQuestion[],
  answers: Record<string, number>,
): Record<LifeArea, number> {
  const scores = {} as Record<LifeArea, number>;
  for (const area of AREAS) {
    const qs = questions.filter((q) => q.area === area);
    const answered = qs.filter((q) => answers[q.id] !== undefined);
    if (answered.length === 0) {
      scores[area] = 0;
      continue;
    }
    const max = answered.reduce((s, q) => s + Math.max(...q.options.map((o) => o.score)), 0);
    const got = answered.reduce((s, q) => s + answers[q.id], 0);
    scores[area] = Math.round((got / max) * 100);
  }
  return scores;
}

/**
 * Trilha recomendada: a área que mais pede atenção. Em empate, vale a ordem
 * das áreas (mente primeiro). Se ninguém precisa de nada, começa pela Respira.
 */
export function recommendTrack(scores: Record<LifeArea, number>): string {
  let best: LifeArea = 'mente';
  for (const area of AREAS) if (scores[area] > scores[best]) best = area;
  return trackByArea[best];
}

/** Áreas em ordem de atenção, da que mais precisa para a que menos precisa. */
export function rankAreas(scores: Record<LifeArea, number>): LifeArea[] {
  return [...AREAS].sort((a, b) => scores[b] - scores[a] || AREAS.indexOf(a) - AREAS.indexOf(b));
}

export function attentionLabel(score: number): string {
  if (score >= 67) return 'Pede atenção agora';
  if (score >= 34) return 'Vale cuidar';
  return 'Está bem';
}

/** Recomendação a mostrar: se a trilha ainda não saiu, sugere a Respira enquanto isso. */
export function recommendationCopy(trackId: string, tracks: Track[]): { track: Track | undefined; waiting: boolean } {
  const track = tracks.find((t) => t.id === trackId);
  return { track, waiting: track?.status === 'soon' };
}
