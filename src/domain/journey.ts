/**
 * "Sua jornada de hoje": cinco passos na mesma ordem todos os dias, no jeito
 * da trilha — check-in, plano do dia, prática, fechamento com nota e comunidade.
 */
import type { Activity, EscudoAudio, Lesson } from '../data/types';

export type JourneyStepId = 'checkin' | 'plano' | 'pratica' | 'fechamento' | 'comunidade';

export interface JourneyStep {
  id: JourneyStepId;
  title: string;
  subtitle: string;
  done: boolean;
  /** Prática: aula ou Escudo a abrir. */
  ref?: { type: 'aula' | 'escudo'; id: string };
}

export function buildJourney(input: {
  today: string;
  activity: Activity[];
  checkinDone: boolean;
  planDone: boolean;
  reviewDone: boolean;
  planTitle: string;
  reviewTitle: string;
  escudo?: EscudoAudio;
  lesson?: Lesson;
}): { steps: JourneyStep[]; doneCount: number; next?: JourneyStep } {
  const todays = input.activity.filter((a) => a.day === input.today);
  const did = (kind: Activity['kind']) => todays.some((a) => a.kind === kind);

  const steps: JourneyStep[] = [
    { id: 'checkin', title: 'Check-in', subtitle: 'Como você está hoje · 1 min', done: input.checkinDone },
    { id: 'plano', title: input.planTitle, subtitle: 'Planeje e o app valida · 3 min', done: input.planDone },
  ];
  if (input.lesson) {
    steps.push({
      id: 'pratica',
      title: 'Aula do dia',
      subtitle: `${input.lesson.title} · ${input.lesson.durationMin} min`,
      done: did('aula'),
      ref: { type: 'aula', id: input.lesson.id },
    });
  } else if (input.escudo) {
    steps.push({
      id: 'pratica',
      title: 'Escudo Anticrise',
      subtitle: `${input.escudo.title} · ${input.escudo.durationMin} min`,
      done: did('escudo'),
      ref: { type: 'escudo', id: input.escudo.id },
    });
  }
  steps.push(
    { id: 'fechamento', title: input.reviewTitle, subtitle: 'Sua nota do dia · 2 min', done: input.reviewDone },
    { id: 'comunidade', title: 'Comunidade', subtitle: 'Ajude alguém e ganhe pontos', done: did('post') },
  );

  const doneCount = steps.filter((s) => s.done).length;
  return { steps, doneCount, next: steps.find((s) => !s.done) };
}
