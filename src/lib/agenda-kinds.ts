import type { IconName } from '../components/ui';
import type { AgendaKind } from '../data/types';

export const AGENDA_KIND: Record<AgendaKind, { label: string; icon: IconName }> = {
  live: { label: 'Live', icon: 'radio' },
  aula: { label: 'Aula', icon: 'play-circle' },
  foco: { label: 'Foco', icon: 'target' },
  treino: { label: 'Treino', icon: 'activity' },
  refeicao: { label: 'Refeição', icon: 'coffee' },
  pessoal: { label: 'Pessoal', icon: 'user' },
};
