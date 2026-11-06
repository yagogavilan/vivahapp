/**
 * Selo de aulas de cada trilha: um pedaço por curso, que vai se completando
 * conforme o aluno conclui as aulas. Todos os cursos concluídos = selo completo.
 */
import type { Course, Lesson, LessonProgress } from '../data/types';
import { trackCourses } from './spaces';

export interface BadgePiece {
  courseId: string;
  title: string;
  done: number;
  total: number;
  fraction: number;
}

export interface TrackBadge {
  trackId: string;
  pieces: BadgePiece[];
  piecesComplete: number;
  /** 0–100, pelo total de aulas da trilha. */
  percent: number;
  complete: boolean;
}

export function trackBadge(trackId: string, courses: Course[], lessons: Lesson[], progress: LessonProgress[]): TrackBadge {
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  const pieces = trackCourses(trackId, courses)
    .map((c) => {
      const ls = lessons.filter((l) => l.courseId === c.id);
      const d = ls.filter((l) => done.has(l.id)).length;
      return { courseId: c.id, title: c.title, done: d, total: ls.length, fraction: ls.length ? d / ls.length : 0 };
    })
    .filter((p) => p.total > 0);
  const total = pieces.reduce((s, p) => s + p.total, 0);
  const finished = pieces.reduce((s, p) => s + p.done, 0);
  const piecesComplete = pieces.filter((p) => p.fraction >= 1).length;
  return {
    trackId,
    pieces,
    piecesComplete,
    percent: total ? Math.round((finished / total) * 100) : 0,
    complete: pieces.length > 0 && piecesComplete === pieces.length,
  };
}
