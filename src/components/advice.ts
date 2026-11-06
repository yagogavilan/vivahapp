import type { AdviceStatus } from '../data/types';

export const STATUS_LABEL: Record<AdviceStatus, { label: string; tone: 'sand' | 'coral' | 'mint' | 'dark' }> = {
  pendente: { label: 'Aguardando', tone: 'sand' },
  aceito: { label: 'Em conversa', tone: 'mint' },
  recusado: { label: 'Não aceito', tone: 'sand' },
  encerrado: { label: 'Encerrada', tone: 'sand' },
};
