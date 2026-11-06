/**
 * "Espaço" é o app moldado para uma trilha: Hoje, Cursos e Comunidade só
 * daquela trilha. A Área de Aquecimento (grátis) é um espaço sem trilha.
 */
import type { Course, LifeArea, Track } from '../data/types';
import { type CourseState, isTrackCourse, trackState } from './access';

export const AQUECIMENTO = 'aquecimento';

export interface Space {
  id: string;
  title: string;
  subtitle: string;
  /** Área da vida (capa e cor); null na Área de Aquecimento. */
  area: LifeArea | null;
  /** Canal da comunidade. */
  channel: string;
  isFree: boolean;
  track?: Track;
}

export function spaceFor(id: string, tracks: Track[]): Space | undefined {
  if (id === AQUECIMENTO) {
    return {
      id,
      title: 'Aquecimento',
      subtitle: 'Lives, Escudo Anticrise e check-in diário, de graça',
      area: null,
      channel: AQUECIMENTO,
      isFree: true,
    };
  }
  const track = tracks.find((t) => t.id === id);
  if (!track) return undefined;
  return { id, title: track.title, subtitle: track.subtitle, area: track.area, channel: track.id, isFree: false, track };
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
 * 'soon' (trilha ainda não lançada). O Aquecimento é sempre aberto.
 */
export function spaceAccess(id: string, tracks: Track[], courses: Course[], access: ReadonlySet<string>): CourseState {
  if (id === AQUECIMENTO) return 'open';
  const track = tracks.find((t) => t.id === id);
  if (!track) return 'locked';
  return trackState(track, trackCourses(id, courses), access);
}

/** Todas as trilhas abrem para o aluno conhecer; os cursos é que pedem assinatura. */
export function canEnterSpace(id: string, tracks: Track[]): boolean {
  return id === AQUECIMENTO || tracks.some((t) => t.id === id);
}
