import type { Course, Lesson, LessonProgress, Product, Track } from '../data/types';

export type CourseState = 'open' | 'locked' | 'soon';

/**
 * Estado de um curso para o aluno:
 * - `soon`: a trilha ainda não foi lançada;
 * - `open`: é gratuito ou o aluno tem acesso (compra ou assinatura);
 * - `locked`: aparece na vitrine, mas pede compra.
 */
export function courseState(course: Course, track: Track | undefined, access: ReadonlySet<string>): CourseState {
  if (track?.status === 'soon') return 'soon';
  if (course.isFree || access.has(course.id)) return 'open';
  return 'locked';
}

/** Uma aula abre se o curso está aberto ou se ela é de amostra (e a trilha já foi lançada). */
export function lessonOpen(lesson: Lesson, state: CourseState): boolean {
  if (state === 'open') return true;
  return state === 'locked' && lesson.isPreview;
}

/** Estado da trilha na vitrine: aberta se ao menos um curso dela estiver aberto. */
export function trackState(track: Track, trackCourses: Course[], access: ReadonlySet<string>): CourseState {
  if (track.status === 'soon') return 'soon';
  return trackCourses.some((c) => courseState(c, track, access) === 'open') ? 'open' : 'locked';
}

/** Percentual de aulas concluídas, 0–100. */
export function completion(courseLessons: Lesson[], progress: LessonProgress[]): number {
  if (courseLessons.length === 0) return 0;
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  const count = courseLessons.filter((l) => done.has(l.id)).length;
  return Math.round((count / courseLessons.length) * 100);
}

/** A próxima aula não concluída, na ordem do curso. */
export function nextLesson(ordered: Lesson[], progress: LessonProgress[]): Lesson | undefined {
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  return ordered.find((l) => !done.has(l.id));
}

/** Produto que vende o curso sozinho (o checkout da vitrine aponta para ele). */
export function productForCourse(courseId: string, products: Product[]): Product | undefined {
  return (
    products.find((p) => p.courseIds.length === 1 && p.courseIds[0] === courseId) ??
    products.find((p) => p.courseIds.includes(courseId))
  );
}

/**
 * Link do checkout da Hotmart com o e-mail já preenchido, para a compra
 * cair no mesmo e-mail da conta e o acesso liberar sozinho.
 */
export function checkoutLink(checkoutUrl: string, email?: string | null, name?: string | null): string {
  const url = new URL(checkoutUrl);
  if (email) url.searchParams.set('email', email);
  if (name) url.searchParams.set('name', name);
  return url.toString();
}
