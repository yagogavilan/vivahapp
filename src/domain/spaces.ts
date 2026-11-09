/**
 * "Espaço" é o app moldado para uma trilha: Hoje, Cursos e Comunidade só
 * daquela trilha. Todo espaço é uma das seis trilhas da jornada.
 */
import type { Course, LifeArea, Track } from '../data/types';
import { type CourseState, isTrackCourse, trackState } from './access';

/** Primeira trilha da jornada: usada quando uma tela abre sem dizer a trilha. */
export const FIRST_TRACK = 'respira';

export interface Space {
  id: string;
  title: string;
  subtitle: string;
  /** Área da vida (capa e cor). */
  area: LifeArea;
  /** Canal da comunidade. */
  channel: string;
  track: Track;
}

export function spaceFor(id: string, tracks: Track[]): Space | undefined {
  const track = tracks.find((t) => t.id === id);
  if (!track) return undefined;
  return { id, title: track.title, subtitle: track.subtitle, area: track.area, channel: track.id, track };
}

/** Cursos da sequência da trilha (assinatura anual), na ordem. */
export function trackCourses(trackId: string, courses: Course[]): Course[] {
  return courses.filter((c) => c.trackId === trackId && isTrackCourse(c)).sort((a, b) => a.sort - b.sort);
}

/** Low tickets da trilha: aulas curtas, planilhas e ferramentas vendidas à parte. */
export function lowTicketsOf(trackId: string, courses: Course[]): Course[] {
  return courses.filter((c) => c.trackId === trackId && c.lowTicket).sort((a, b) => a.sort - b.sort);
}

/**
 * Assinatura da trilha: 'open' (assinante), 'locked' (ainda não assinou) ou
 * 'soon' (trilha ainda não lançada).
 */
export function spaceAccess(id: string, tracks: Track[], courses: Course[], access: ReadonlySet<string>): CourseState {
  const track = tracks.find((t) => t.id === id);
  if (!track) return 'locked';
  return trackState(track, trackCourses(id, courses), access);
}

/** Todas as trilhas abrem para o aluno conhecer; os cursos é que pedem assinatura. */
export function canEnterSpace(id: string, tracks: Track[]): boolean {
  return tracks.some((t) => t.id === id);
}
