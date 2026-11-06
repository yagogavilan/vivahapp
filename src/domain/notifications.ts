/**
 * Notificações: textos prontos para o admin, rótulos e para onde o toque leva.
 * As regras de envio (quem recebe, limites, palavras proibidas) estão em
 * supabase/functions/_shared/push.ts, iguais no app e no servidor.
 */
import type { Course, Lesson, NotificationAudience, NotificationDraft, NotificationKind, Track } from '../data/types';

export {
  BODY_MAX,
  categoryOf,
  DEFAULT_PUSH_SETTINGS,
  pushCopyIssues,
  TITLE_MAX,
  wantsPush,
} from '../../supabase/functions/_shared/push';
export type { CopyIssue } from '../../supabase/functions/_shared/push';

export const KIND_LABEL: Record<NotificationKind, string> = {
  lesson: 'Aula nova',
  course: 'Curso novo',
  low_ticket: 'Low ticket',
  announcement: 'Aviso',
  launch: 'Lançamento',
};

export const KIND_ICON: Record<NotificationKind, 'play-circle' | 'book-open' | 'package' | 'bell' | 'gift'> = {
  lesson: 'play-circle',
  course: 'book-open',
  low_ticket: 'package',
  announcement: 'bell',
  launch: 'gift',
};

/** As três escolhas que o aluno faz nos ajustes. */
export const CATEGORY_INFO = {
  newLessons: { title: 'Aulas e cursos novos', hint: 'Quando sair conteúdo nas trilhas que você faz.', icon: 'play-circle' },
  announcements: { title: 'Avisos da Vivah', hint: 'Lives, mudanças de horário e recados da equipe.', icon: 'bell' },
  launches: {
    title: 'Lançamentos e ofertas',
    hint: 'Materiais novos, eventos e produtos da Loja. Pode desligar quando quiser.',
    icon: 'gift',
  },
} as const;

/** Aula nova: título e texto prontos (o admin pode mudar). */
export function lessonCopy(lesson: Pick<Lesson, 'id' | 'title'>, course: Pick<Course, 'title'>, track?: Pick<Track, 'title'>) {
  return {
    title: clip(`Aula nova${track ? ` na ${track.title}` : ''}: ${lesson.title}`, 65),
    body: clip(`Já está no curso ${course.title}. Toque para assistir.`, 178),
  };
}

/** Curso ou low ticket novo, sem preço (regra das lojas). */
export function courseCopy(course: Pick<Course, 'title' | 'summary' | 'lowTicket'>, track?: Pick<Track, 'title'>) {
  return {
    title: clip(`${course.lowTicket ? 'Novo material' : 'Curso novo'}${track ? ` na ${track.title}` : ''}: ${course.title}`, 65),
    body: clip(course.summary || 'Toque para conhecer.', 178),
  };
}

export function draftForLesson(lesson: Pick<Lesson, 'id' | 'title' | 'courseId'>, course: Course, track?: Track): NotificationDraft {
  return {
    kind: 'lesson',
    ...lessonCopy(lesson, course, track),
    url: `/aula/${lesson.id}`,
    audience: 'course',
    trackId: course.trackId,
    courseId: course.id,
    lessonId: lesson.id,
  };
}

/**
 * Curso da trilha: vai para quem assina. Low ticket: é oferta, então vai
 * só para quem aceitou lançamentos (todo mundo ou só quem assina a trilha).
 */
export function draftForCourse(course: Course, track?: Track, audience: NotificationAudience = course.lowTicket ? 'all' : 'track'): NotificationDraft {
  return {
    kind: course.lowTicket ? 'low_ticket' : 'course',
    ...courseCopy(course, track),
    url: `/curso/${course.id}`,
    audience,
    trackId: course.trackId,
    courseId: audience === 'course' ? course.id : null,
    lessonId: null,
  };
}

export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  if (t[max - 1] === ' ') return `${cut.replace(/[\s,.;:–-]+$/, '')}…`;
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

/** Destinos que o admin pode escolher num aviso livre. */
export const ANNOUNCEMENT_TARGETS: { id: string; label: string; url: (trackId: string | null) => string }[] = [
  { id: 'avisos', label: 'Só o aviso', url: () => '/avisos' },
  { id: 'hoje', label: 'Hoje da trilha', url: (t) => (t ? `/t/${t}` : '/') },
  { id: 'agenda', label: 'Agenda e lives', url: () => '/agenda' },
  { id: 'loja', label: 'Loja', url: (t) => (t ? `/t/${t}/loja` : '/') },
  { id: 'comunidade', label: 'Comunidade', url: (t) => (t ? `/t/${t}/comunidade` : '/') },
];

/** Horário de silêncio: das 21h às 8h (horário de Brasília) avisa o admin antes de enviar. */
export function isQuietHour(date = new Date()): boolean {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(date)) % 24;
  return hour >= 21 || hour < 8;
}

export function openRate(n: { recipients: number; opened: number }): number {
  return n.recipients ? Math.round((n.opened / n.recipients) * 100) : 0;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - Date.parse(iso));
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ontem';
  if (d < 7) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}
