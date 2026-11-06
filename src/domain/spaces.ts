/**
 * "Espaço" é o app moldado para uma trilha: Hoje, Cursos e Comunidade só
 * daquela trilha. A Área de Aquecimento (grátis) é um espaço sem trilha.
 */
import type { Course, LifeArea, Track } from '../data/types';
import { type CourseState, trackState } from './access';

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

/** Cursos que aparecem na aba Cursos de uma trilha (sem os exclusivos de bondade). */
export function trackCourses(trackId: string, courses: Course[]): Course[] {
  return courses.filter((c) => c.trackId === trackId && c.minKindnessLevel == null).sort((a, b) => a.sort - b.sort);
}

/** Pode entrar no espaço? Aquecimento sempre; trilha só se comprada. */
export function spaceAccess(id: string, tracks: Track[], courses: Course[], access: ReadonlySet<string>): CourseState {
  if (id === AQUECIMENTO) return 'open';
  const track = tracks.find((t) => t.id === id);
  if (!track) return 'locked';
  return trackState(track, trackCourses(id, courses), access);
}
