/**
 * Sequência de dias, no espírito das boas práticas (Duolingo e o estudo de
 * 859 sequências da Mobbin):
 * - a meta do dia é pequena: qualquer atividade conta (ouvir o Escudo,
 *   uma aula, um check-in, um bloco de foco, uma live);
 * - existe um dia de folga por semana: faltar um dia não zera a sequência;
 * - hoje ainda em aberto não quebra nada: a sequência só cai amanhã.
 */
import type { Activity } from '../data/types';
import { addDays, dayKey, weekdayOf } from './dates';

export type DayStatus = 'done' | 'rest' | 'missed' | 'today' | 'future';

export interface StreakInfo {
  /** Dias na sequência atual (dias de folga não somam, mas não quebram). */
  current: number;
  /** Maior sequência no período carregado. */
  best: number;
  todayDone: boolean;
  /** Se a folga desta semana já foi usada. */
  restUsedThisWeek: boolean;
  /** Segunda a domingo da semana atual. */
  week: { day: string; status: DayStatus }[];
  totalActiveDays: number;
}

/** Segunda-feira da semana do dia. */
export function weekStart(day: string): string {
  const wd = weekdayOf(day); // 0 = domingo
  return addDays(day, wd === 0 ? -6 : 1 - wd);
}

/**
 * Percorre os dias para trás a partir de hoje. Um dia sem atividade vira
 * "folga" se ainda não houve folga na mesma semana (segunda a domingo);
 * a segunda falta na semana encerra a sequência.
 */
function walk(active: Set<string>, from: string, limitDays: number) {
  let count = 0;
  const restWeeks = new Set<string>();
  const restDays = new Set<string>();
  let prevWasRest = false;
  let day = from;
  for (let i = 0; i < limitDays; i++) {
    if (active.has(day)) {
      count++;
      prevWasRest = false;
    } else {
      const ws = weekStart(day);
      // Segunda falta na semana, ou dois dias seguidos sem nada: a sequência acaba aqui.
      if (restWeeks.has(ws) || prevWasRest) break;
      restWeeks.add(ws);
      restDays.add(day);
      prevWasRest = true;
    }
    day = addDays(day, -1);
  }
  // Uma folga só vale se houver atividade antes dela.
  if (prevWasRest) {
    const last = [...restDays].sort()[0];
    restDays.delete(last);
  }
  return { count, restDays };
}

export function computeStreak(activity: Activity[], now: Date = new Date(), lookback = 400): StreakInfo {
  const today = dayKey(now);
  const active = new Set(activity.map((a) => a.day));
  const todayDone = active.has(today);
  const start = todayDone ? today : addDays(today, -1);
  const { count, restDays: walkRests } = walk(active, start, lookback);
  const restDays = count > 0 ? walkRests : new Set<string>();

  // Melhor sequência: testa cada dia ativo como fim de uma sequência.
  let best = count;
  for (const d of active) {
    const r = walk(active, d, lookback);
    if (r.count > best) best = r.count;
  }

  const monday = weekStart(today);

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    let status: DayStatus;
    if (active.has(day)) status = 'done';
    else if (day === today) status = 'today';
    else if (day > today) status = 'future';
    else if (restDays.has(day)) status = 'rest';
    else status = 'missed';
    return { day, status };
  });

  return {
    current: count,
    best,
    todayDone,
    restUsedThisWeek: [...restDays].some((d) => d >= monday),
    week,
    totalActiveDays: active.size,
  };
}

/** Frase de incentivo, sem culpa nem urgência. */
export function streakMessage(s: StreakInfo): string {
  if (s.todayDone && s.current >= 7) return `${s.current} dias cuidando de você. Que constância!`;
  if (s.todayDone) return 'Seu dia já conta. Volte amanhã para seguir.';
  if (s.current > 0) return 'Uma atividade curta hoje mantém a sua sequência.';
  return 'Comece hoje: qualquer atividade conta, até 5 minutos.';
}
