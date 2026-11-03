import { escudoThemes, liveThemes } from '../data/catalog';
import type { AgendaEvent, EscudoAudio, Live } from '../data/types';
import { addDays, dayKey, nextWeekday, spDateTime } from './dates';

const WEDNESDAY = 3;

/** Lives semanais, toda quarta às 20h, a partir de `fromDay`. */
export function buildLives(fromDay: string, count = liveThemes.length): Live[] {
  const first = nextWeekday(fromDay, WEDNESDAY);
  return Array.from({ length: count }, (_, i) => {
    const theme = liveThemes[i % liveThemes.length];
    const day = addDays(first, i * 7);
    return {
      id: `live-${day}`,
      title: theme.title,
      description: theme.description,
      trackId: theme.trackId,
      host: 'Edmilson',
      startsAt: spDateTime(day, '20:00'),
      endsAt: spDateTime(day, '21:00'),
      youtubeId: null,
      replayUntil: spDateTime(addDays(day, 1), '20:00'),
    };
  });
}

/** Um áudio do Escudo Anticrise por dia, a partir de `fromDay`. */
export function buildEscudo(fromDay: string, days: number): EscudoAudio[] {
  return Array.from({ length: days }, (_, i) => {
    const theme = escudoThemes[i % escudoThemes.length];
    const day = addDays(fromDay, i);
    return {
      id: `escudo-${day}`,
      publishDate: day,
      title: theme.title,
      summary: theme.summary,
      audioUrl: null,
      durationMin: 5,
    };
  });
}

export type LiveStatus = 'upcoming' | 'live' | 'replay' | 'ended';

export function liveStatus(live: Live, now: Date = new Date()): LiveStatus {
  const t = now.getTime();
  if (t < Date.parse(live.startsAt)) return 'upcoming';
  if (t <= Date.parse(live.endsAt)) return 'live';
  if (live.replayUntil && t <= Date.parse(live.replayUntil)) return 'replay';
  return 'ended';
}

/** A live em andamento ou a próxima a começar. */
export function nextLive(lives: Live[], now: Date = new Date()): Live | undefined {
  return [...lives]
    .filter((l) => ['live', 'upcoming'].includes(liveStatus(l, now)))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
}

/** O áudio do dia; se o de hoje ainda não saiu, o mais recente. */
export function todaysEscudo(audios: EscudoAudio[], now: Date = new Date()): EscudoAudio | undefined {
  const today = dayKey(now);
  return [...audios]
    .filter((a) => a.publishDate <= today)
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))[0];
}

export interface AgendaItem {
  key: string;
  title: string;
  kind: AgendaEvent['kind'];
  startsAt: string;
  endsAt: string;
  liveId: string | null;
  eventId: string | null;
}

/**
 * Junta as lives e os compromissos do aluno, agrupados por dia, a partir de hoje.
 * Uma live já salva na agenda aparece uma vez só.
 */
export function agendaDays(
  lives: Live[],
  events: AgendaEvent[],
  now: Date = new Date(),
  days = 14,
): { day: string; items: AgendaItem[] }[] {
  const today = dayKey(now);
  const last = addDays(today, days - 1);
  const saved = new Set(events.map((e) => e.liveId).filter(Boolean));
  const items: AgendaItem[] = [
    ...events.map((e) => ({
      key: `e-${e.id}`,
      title: e.title,
      kind: e.kind,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      liveId: e.liveId,
      eventId: e.id,
    })),
    ...lives
      .filter((l) => !saved.has(l.id))
      .map((l) => ({
        key: `l-${l.id}`,
        title: `Live: ${l.title}`,
        kind: 'live' as const,
        startsAt: l.startsAt,
        endsAt: l.endsAt,
        liveId: l.id,
        eventId: null,
      })),
  ].filter((i) => {
    const d = dayKey(i.startsAt);
    return d >= today && d <= last;
  });

  const byDay = new Map<string, AgendaItem[]>();
  for (const item of items.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))) {
    const d = dayKey(item.startsAt);
    byDay.set(d, [...(byDay.get(d) ?? []), item]);
  }
  return [...byDay.entries()].map(([day, list]) => ({ day, items: list }));
}
