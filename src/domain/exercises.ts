/**
 * Exercícios guiados do "socorro na hora". Funcionam sem áudio (texto, tempo e
 * animação); quando o Edmilson gravar a versão narrada, basta preencher `audioUrl`.
 */

export interface BreathPhase {
  /** Uma palavra, em letra grande (Inspire, Segure, Solte). */
  label: string;
  /** Como fazer, em letra pequena (pelo nariz, pela boca). */
  how?: string;
  seconds: number;
  /** Escala do círculo ao fim da fase (0 = vazio, 1 = cheio). */
  to: 0 | 1;
  /** Som que toca no início da fase. */
  cue: 'inspire' | 'segure' | 'solte';
}

export interface ExerciseStep {
  title: string;
  text: string;
  /** Avança sozinho depois deste tempo; sem valor, a pessoa toca em "Próximo". */
  seconds?: number;
}

export interface Exercise {
  id: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  kind: 'breath' | 'steps';
  phases?: BreathPhase[];
  cycles?: number;
  steps?: ExerciseStep[];
  audioUrl: string | null;
}

export const EXERCISES: Exercise[] = [
  {
    id: 'respiracao',
    title: 'Respiração 4-6',
    subtitle: 'Soltar o ar mais devagar acalma o coração.',
    durationLabel: '2 min',
    kind: 'breath',
    phases: [
      { label: 'Inspire', how: 'pelo nariz', seconds: 4, to: 1, cue: 'inspire' },
      { label: 'Solte', how: 'devagar, pela boca', seconds: 6, to: 0, cue: 'solte' },
    ],
    cycles: 12,
    audioUrl: null,
  },
  {
    // Suspiro cíclico: duas puxadas pelo nariz e uma soltada longa. No estudo de
    // Balban et al. (Cell Reports Medicine, 2023), 5 minutos por dia melhoraram o
    // humor e baixaram a frequência respiratória mais do que a meditação.
    id: 'suspiro',
    title: 'Suspiro cíclico',
    subtitle: 'Duas puxadas e uma soltada longa.',
    durationLabel: '3 min',
    kind: 'breath',
    phases: [
      { label: 'Inspire', how: 'pelo nariz', seconds: 3, to: 1, cue: 'inspire' },
      { label: 'Mais um pouco', how: 'encha o pulmão', seconds: 1, to: 1, cue: 'segure' },
      { label: 'Solte', how: 'bem devagar, pela boca', seconds: 7, to: 0, cue: 'solte' },
    ],
    cycles: 16,
    audioUrl: null,
  },
  {
    // Coerência: cerca de 6 respirações por minuto, ritmo usado no biofeedback de
    // variabilidade da frequência cardíaca.
    id: 'coerencia',
    title: 'Coerência cardíaca',
    subtitle: '6 respirações por minuto.',
    durationLabel: '5 min',
    kind: 'breath',
    phases: [
      { label: 'Inspire', how: 'pelo nariz', seconds: 5, to: 1, cue: 'inspire' },
      { label: 'Solte', how: 'pelo nariz ou pela boca', seconds: 5, to: 0, cue: 'solte' },
    ],
    cycles: 30,
    audioUrl: null,
  },
  {
    id: 'caixa',
    title: 'Respiração em caixa',
    subtitle: 'Quatro tempos iguais.',
    durationLabel: '2 min',
    kind: 'breath',
    phases: [
      { label: 'Inspire', seconds: 4, to: 1, cue: 'inspire' },
      { label: 'Segure', seconds: 4, to: 1, cue: 'segure' },
      { label: 'Solte', seconds: 4, to: 0, cue: 'solte' },
      { label: 'Segure', seconds: 4, to: 0, cue: 'segure' },
    ],
    cycles: 8,
    audioUrl: null,
  },
  {
    id: 'aterramento',
    title: 'Aterramento 5-4-3-2-1',
    subtitle: 'Trazer a atenção para o agora usando os sentidos.',
    durationLabel: '3 min',
    kind: 'steps',
    steps: [
      { title: '5 coisas que você vê', text: 'Olhe ao redor e diga, em voz baixa ou na cabeça, cinco coisas que está vendo.' },
      { title: '4 coisas que você sente', text: 'O pé no chão, a roupa no corpo, a temperatura do ar, as mãos.' },
      { title: '3 sons que você ouve', text: 'Perto e longe. Só perceba, sem julgar.' },
      { title: '2 cheiros', text: 'Se não sentir nenhum, lembre de dois cheiros de que você gosta.' },
      { title: '1 sabor', text: 'Ou uma coisa boa que você pode dizer para si mesmo agora.' },
    ],
    audioUrl: null,
  },
  {
    id: 'descarrego',
    title: 'Descarrego mental',
    subtitle: 'Tirar tudo da cabeça e escolher um passo só.',
    durationLabel: '4 min',
    kind: 'steps',
    steps: [
      { title: 'Despeje tudo', text: 'Num papel ou no bloco de notas, escreva tudo o que está na sua cabeça. Sem ordem, sem filtro.', seconds: 120 },
      { title: 'Circule o essencial', text: 'Marque só o que precisa mesmo ser feito hoje. O resto pode esperar.' },
      { title: 'Um passo', text: 'Escolha a menor ação possível para a primeira tarefa e faça só ela.' },
    ],
    audioUrl: null,
  },
  {
    id: 'controle',
    title: 'O que está no meu controle',
    subtitle: 'Separar o que dá para fazer do que só preocupa.',
    durationLabel: '3 min',
    kind: 'steps',
    steps: [
      { title: 'Nomeie a preocupação', text: 'Em uma frase: o que está pesando agora?' },
      { title: 'Fora do seu controle', text: 'O que disso não depende de você? Reconheça e deixe de lado por enquanto.' },
      { title: 'No seu controle', text: 'O que depende de você, mesmo que seja pequeno?' },
      { title: 'O menor passo', text: 'Qual é o próximo passo que você consegue dar hoje?' },
    ],
    audioUrl: null,
  },
  {
    id: 'relaxamento',
    title: 'Relaxamento do corpo',
    subtitle: 'Contrair e soltar para o corpo sair do modo alerta.',
    durationLabel: '2 min',
    kind: 'steps',
    steps: [
      { title: 'Mãos', text: 'Feche as mãos com força por 5 segundos e solte devagar.', seconds: 15 },
      { title: 'Ombros', text: 'Suba os ombros até as orelhas, segure e deixe cair.', seconds: 15 },
      { title: 'Rosto', text: 'Aperte os olhos e a boca, segure e solte.', seconds: 15 },
      { title: 'Barriga', text: 'Contraia a barriga, segure e solte junto com o ar.', seconds: 15 },
      { title: 'Pernas e pés', text: 'Estique as pernas e puxe os dedos dos pés, segure e solte.', seconds: 15 },
    ],
    audioUrl: null,
  },
];

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

/** Exercícios sugeridos no botão "Socorro" de cada trilha. */
export const SOS_BY_TRACK: Record<string, string[]> = {
  respira: ['respiracao', 'suspiro', 'aterramento', 'caixa', 'coerencia', 'relaxamento'],
  ritmo: ['descarrego', 'respiracao', 'caixa'],
  eleva: ['controle', 'respiracao', 'caixa'],
  prospera: ['controle', 'respiracao', 'aterramento'],
  move: ['relaxamento', 'respiracao'],
  nutre: ['respiracao', 'aterramento'],
};

/** Duração de um ciclo, em segundos. */
export function cycleSeconds(e: Exercise): number {
  return (e.phases ?? []).reduce((s, p) => s + p.seconds, 0);
}

/** Quantos ciclos cabem em `minutes` (pelo menos 1). */
export function cyclesFor(e: Exercise, minutes: number): number {
  const c = cycleSeconds(e);
  return c ? Math.max(1, Math.round((minutes * 60) / c)) : 1;
}
