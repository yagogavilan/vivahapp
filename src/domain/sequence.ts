/**
 * Sequência obrigatória da trilha: a próxima aula só abre quando a anterior
 * foi concluída. Vale para os cursos da assinatura, em ordem (curso, módulo,
 * aula). Low tickets e conteúdos de recompensa ficam fora da sequência.
 * O banco aplica a mesma regra (função can_read_lesson).
 */
import type { Course, Lesson, LessonProgress, Module } from '../data/types';
import { trackCourses } from './spaces';

export function trackSequence(trackId: string, courses: Course[], modules: Module[], lessons: Lesson[]): Lesson[] {
  return trackCourses(trackId, courses).flatMap((c) =>
    modules
      .filter((m) => m.courseId === c.id)
      .sort((a, b) => a.sort - b.sort)
      .flatMap((m) => lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.sort - b.sort)),
  );
}

export interface SequenceInfo {
  /** Aulas travadas porque a anterior ainda não foi concluída. */
  locked: Set<string>;
  /** Aula anterior de cada aula da sequência. */
  previous: Map<string, Lesson>;
}

export function sequenceInfo(sequence: Lesson[], progress: LessonProgress[]): SequenceInfo {
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  const locked = new Set<string>();
  const previous = new Map<string, Lesson>();
  sequence.forEach((l, i) => {
    if (i === 0) return;
    previous.set(l.id, sequence[i - 1]);
    if (!done.has(sequence[i - 1].id) && !l.isPreview) locked.add(l.id);
  });
  return { locked, previous };
}

/** A aula da vez: a primeira da sequência ainda não concluída (é para ela que o aluno deve ir). */
export function currentLesson(sequence: Lesson[], progress: LessonProgress[]): Lesson | undefined {
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  return sequence.find((l) => !done.has(l.id));
}
