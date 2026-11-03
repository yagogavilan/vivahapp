/**
 * Conquistas: marcos ligados a progresso real (aulas, cursos, constância),
 * não só a contagem de dias. Calculadas no app a partir dos dados do aluno.
 */
import type { Activity, Checkin, Lesson, LessonProgress } from '../data/types';
import type { StreakInfo } from './streak';

export interface AchievementInput {
  activity: Activity[];
  progress: LessonProgress[];
  lessons: Lesson[];
  checkins: Checkin[];
  diagnosticDone: boolean;
  streak: StreakInfo;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: 'feather' | 'play-circle' | 'shield' | 'zap' | 'award' | 'heart' | 'compass' | 'message-circle' | 'target' | 'sun';
  earned: boolean;
  /** 0–1, para mostrar quanto falta. */
  progress: number;
}

const ratio = (have: number, need: number) => Math.min(1, have / need);

export function completedCourses(lessons: Lesson[], progress: LessonProgress[]): string[] {
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));
  const byCourse = new Map<string, Lesson[]>();
  for (const l of lessons) byCourse.set(l.courseId, [...(byCourse.get(l.courseId) ?? []), l]);
  return [...byCourse.entries()].filter(([, ls]) => ls.length > 0 && ls.every((l) => done.has(l.id))).map(([id]) => id);
}

export function computeAchievements(i: AchievementInput): Achievement[] {
  const lessonsDone = i.progress.filter((p) => p.completedAt).length;
  const escudoDays = new Set(i.activity.filter((a) => a.kind === 'escudo').map((a) => a.day)).size;
  const focoCount = i.activity.filter((a) => a.kind === 'foco').length;
  const posts = i.activity.filter((a) => a.kind === 'post').length;
  const courses = completedCourses(i.lessons, i.progress).length;
  const best = i.streak.best;

  const list: Omit<Achievement, 'earned'>[] = [
    { id: 'primeiro-passo', title: 'Primeiro passo', description: 'Fez a primeira atividade na Vivah', icon: 'feather', progress: ratio(i.streak.totalActiveDays, 1) },
    { id: 'primeira-aula', title: 'Primeira aula', description: 'Concluiu uma aula', icon: 'play-circle', progress: ratio(lessonsDone, 1) },
    { id: 'escudo-7', title: 'Escudo firme', description: 'Ouviu o Escudo Anticrise em 7 dias', icon: 'shield', progress: ratio(escudoDays, 7) },
    { id: 'sequencia-3', title: 'Pegando ritmo', description: '3 dias seguidos', icon: 'zap', progress: ratio(best, 3) },
    { id: 'sequencia-7', title: 'Uma semana inteira', description: '7 dias seguidos', icon: 'zap', progress: ratio(best, 7) },
    { id: 'sequencia-30', title: 'Hábito criado', description: '30 dias seguidos', icon: 'sun', progress: ratio(best, 30) },
    { id: 'curso-concluido', title: 'Curso concluído', description: 'Terminou um curso inteiro', icon: 'award', progress: ratio(courses, 1) },
    { id: 'checkin-7', title: 'Autocuidado', description: 'Fez 7 check-ins de humor e sono', icon: 'heart', progress: ratio(i.checkins.length, 7) },
    { id: 'diagnostico', title: 'Autoconhecimento', description: 'Fez o diagnóstico Vivah', icon: 'compass', progress: i.diagnosticDone ? 1 : 0 },
    { id: 'foco-5', title: 'Foco treinado', description: 'Completou 5 blocos de foco', icon: 'target', progress: ratio(focoCount, 5) },
    { id: 'comunidade', title: 'Parte da turma', description: 'Publicou na comunidade', icon: 'message-circle', progress: ratio(posts, 1) },
  ];
  return list.map((a) => ({ ...a, earned: a.progress >= 1 }));
}
