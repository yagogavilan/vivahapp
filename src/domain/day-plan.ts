/**
 * "Seu dia": três passos curtos, como o "Your Essentials" do Headspace.
 * De manhã e à tarde o foco é começar bem; à noite, desacelerar.
 */
import type { Activity, EscudoAudio, Lesson } from '../data/types';
import { dayKey, SP_OFFSET_MIN } from './dates';

export type PlanStepId = 'escudo' | 'aula' | 'checkin' | 'foco';

export interface PlanStep {
  id: PlanStepId;
  title: string;
  subtitle: string;
  minutes: number;
  done: boolean;
  /** Para onde o passo leva. */
  target: { pathname: string; params?: Record<string, string> } | null;
}

export function isEvening(now: Date = new Date()): boolean {
  const h = new Date(now.getTime() + SP_OFFSET_MIN * 60_000).getUTCHours();
  return h >= 18 || h < 4;
}

export function buildDayPlan(input: {
  now?: Date;
  activity: Activity[];
  escudo?: EscudoAudio;
  nextLesson?: Lesson;
  checkinEnabled: boolean;
}): { steps: PlanStep[]; doneCount: number; evening: boolean } {
  const now = input.now ?? new Date();
  const today = dayKey(now);
  const todays = input.activity.filter((a) => a.day === today);
  const did = (kind: Activity['kind']) => todays.some((a) => a.kind === kind);
  const evening = isEvening(now);

  const steps: PlanStep[] = [
    {
      id: 'escudo',
      title: evening ? 'Feche o dia com o Escudo' : 'Escudo Anticrise de hoje',
      subtitle: input.escudo?.title ?? 'Áudio do dia',
      minutes: input.escudo?.durationMin ?? 5,
      done: did('escudo'),
      target: input.escudo ? { pathname: '/escudo/[id]', params: { id: input.escudo.id } } : null,
    },
    input.nextLesson
      ? {
          id: 'aula',
          title: evening ? 'Uma aula curta antes de descansar' : 'Sua aula de hoje',
          subtitle: input.nextLesson.title,
          minutes: input.nextLesson.durationMin,
          done: did('aula'),
          target: { pathname: '/aula/[id]', params: { id: input.nextLesson.id } },
        }
      : {
          id: 'foco',
          title: evening ? 'Organize o amanhã' : 'Um bloco de foco',
          subtitle: evening ? 'Reserve o horário do que mais importa' : '25 minutos sem distração',
          minutes: evening ? 5 : 25,
          done: did('foco'),
          target: { pathname: evening ? '/evento' : '/foco' },
        },
  ];

  if (input.checkinEnabled) {
    steps.push({
      id: 'checkin',
      title: evening ? 'Como foi o seu dia?' : 'Como você está?',
      subtitle: 'Humor, energia e sono',
      minutes: 1,
      done: did('checkin'),
      target: { pathname: '/checkin' },
    });
  } else {
    steps.push({
      id: 'foco',
      title: 'Um bloco de foco',
      subtitle: '25 minutos sem distração',
      minutes: 25,
      done: did('foco'),
      target: { pathname: '/foco' },
    });
  }

  // Sem passos repetidos (ex.: dois blocos de foco).
  const unique = steps.filter((s, i) => steps.findIndex((x) => x.id === s.id) === i);
  return { steps: unique, doneCount: unique.filter((s) => s.done).length, evening };
}
