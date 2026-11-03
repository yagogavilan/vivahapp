/**
 * Datas no horário de Brasília. O Brasil não tem horário de verão desde 2019,
 * então o fuso é fixo em UTC−3. Formatamos à mão para o resultado ser igual
 * em qualquer celular, sem depender do suporte a fusos do aparelho.
 */
export const SP_OFFSET_MIN = -180;

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Uma data "de parede" em São Paulo, com os campos já no fuso local. */
function sp(date: Date | string | number) {
  const d = new Date(typeof date === 'string' || typeof date === 'number' ? date : date.getTime());
  return new Date(d.getTime() + SP_OFFSET_MIN * 60_000);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-12-02" no fuso de São Paulo. */
export function dayKey(date: Date | string | number): string {
  return sp(date).toISOString().slice(0, 10);
}

/** Instante ISO de um dia e hora em São Paulo, ex.: spDateTime('2026-12-02', '20:00'). */
export function spDateTime(day: string, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const utc = Date.parse(`${day}T00:00:00Z`) + (h * 60 + m - SP_OFFSET_MIN) * 60_000;
  return new Date(utc).toISOString();
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

export function formatTime(date: Date | string): string {
  const d = sp(date);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "qua, 2 dez" */
export function formatShortDate(date: Date | string): string {
  const d = sp(date);
  return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Hoje", "Amanhã" ou "quarta, 2 dez" */
export function formatDayLabel(day: string, today: string): string {
  if (day === today) return 'Hoje';
  if (day === addDays(today, 1)) return 'Amanhã';
  const d = new Date(`${day}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Quarta, 20:00" ou "Hoje, 20:00" */
export function formatWhen(date: string, now: Date = new Date()): string {
  const label = formatDayLabel(dayKey(date), dayKey(now));
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}, ${formatTime(date)}`;
}

/** Texto curto para quanto falta: "em 3 dias", "em 2 h", "em 15 min", "agora". */
export function formatCountdown(target: string, now: Date = new Date()): string {
  const diffMin = Math.round((Date.parse(target) - now.getTime()) / 60_000);
  if (diffMin <= 0) return 'agora';
  if (diffMin < 60) return `em ${diffMin} min`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `em ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'amanhã' : `em ${days} dias`;
}

export function greeting(now: Date = new Date()): string {
  const h = sp(now).getUTCHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Próxima data (a partir de `fromDay`, inclusive) que cai no dia da semana pedido. */
export function nextWeekday(fromDay: string, weekday: number): string {
  const delta = (weekday - weekdayOf(fromDay) + 7) % 7;
  return addDays(fromDay, delta);
}
