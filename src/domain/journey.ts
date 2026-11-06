/**
 * "Sua jornada de hoje": quatro passos na mesma ordem todos os dias
 * (como o "Today" do Headspace), para o aluno sempre saber o próximo passo.
 */
import type { Activity, EscudoAudio, Lesson } from '../data/types';

export type JourneyStepId = 'checkin' | 'escudo' | 'aula' | 'comunidade';

export interface JourneyStep {
  id: JourneyStepId;
  title: string;
  subtitle: string;
  done: boolean;
  /** Para abrir a tela certa. */
  ref?: string;
}

export function buildJourney(input: {
  today: string;
  activity: Activity[];
  checkinDone: boolean;
  escudo?: EscudoAudio;
  lesson?: Lesson;
}): { steps: JourneyStep[]; doneCount: number; next?: JourneyStep } {
  const todays = input.activity.filter((a) => a.day === input.today);
  const did = (kind: Activity['kind'], ref?: string) => todays.some((a) => a.kind === kind && (ref === undefined || a.ref === ref));

  const steps: JourneyStep[] = [
    { id: 'checkin', title: 'Check-in', subtitle: 'Como você está hoje · 1 min', done: input.checkinDone },
  ];
  if (input.escudo) {
    steps.push({
      id: 'escudo',
      title: 'Escudo Anticrise',
      subtitle: `${input.escudo.title} · ${input.escudo.durationMin} min`,
      done: did('escudo'),
      ref: input.escudo.id,
    });
  }
  if (input.lesson) {
    steps.push({
      id: 'aula',
      title: 'Aula do dia',
      subtitle: `${input.lesson.title} · ${input.lesson.durationMin} min`,
      done: did('aula', input.lesson.id) || did('aula'),
      ref: input.lesson.id,
    });
  }
  steps.push({ id: 'comunidade', title: 'Comunidade', subtitle: 'Conte como foi ou apoie alguém', done: did('post') });

  const doneCount = steps.filter((s) => s.done).length;
  return { steps, doneCount, next: steps.find((s) => !s.done) };
}
