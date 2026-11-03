import type { Catalog } from '../data/api';
import type { Course, Lesson, Track } from '../data/types';

/** Minúsculas e sem acento: "Ruminação" casa com "ruminacao". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export interface SearchResults {
  tracks: Track[];
  courses: Course[];
  lessons: Lesson[];
}

/** Todas as palavras da busca precisam aparecer (em qualquer ordem). */
export function searchCatalog(catalog: Pick<Catalog, 'tracks' | 'courses' | 'lessons'>, query: string, limit = 20): SearchResults {
  const words = normalize(query).split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) return { tracks: [], courses: [], lessons: [] };
  const hit = (...fields: string[]) => {
    const hay = normalize(fields.join(' '));
    return words.every((w) => hay.includes(w));
  };
  return {
    tracks: catalog.tracks.filter((t) => hit(t.title, t.areaLabel, t.subtitle, t.description)).slice(0, limit),
    courses: catalog.courses.filter((c) => hit(c.title, c.summary)).slice(0, limit),
    lessons: catalog.lessons.filter((l) => hit(l.title, l.summary)).slice(0, limit),
  };
}
