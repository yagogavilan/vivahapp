/**
 * Check-in diário por trilha: perguntas, leitura das respostas, alertas e o
 * "socorro na hora" quando o estado está crítico.
 *
 * A Vivah é psicoeducação: o check-in não diagnostica. Ele orienta, oferece um
 * exercício guiado na hora e mostra quando procurar ajuda (CVV 188, SAMU 192).
 */

import type { AlertLevel, Feeling } from '../data/types';

export type { AlertLevel, Feeling };

export const FEELINGS: Record<Feeling, { label: string; color: string; text: string }> = {
  ansiedade: { label: 'Ansiedade', color: '#FBE1D5', text: '#9A3F2B' },
  tristeza: { label: 'Tristeza', color: '#DCE6F2', text: '#2C4A6B' },
  cansaco: { label: 'Cansaço', color: '#ECE6DA', text: '#5E4A1E' },
  sobrecarga: { label: 'Sobrecarga', color: '#F6DCCB', text: '#7A3B2A' },
  irritacao: { label: 'Irritação', color: '#F7D6D2', text: '#8C2A20' },
  calma: { label: 'Calma', color: '#D8F2EA', text: '#16614F' },
  animo: { label: 'Ânimo', color: '#FCEFC7', text: '#6B5212' },
};

export const FEELING_ORDER: Feeling[] = ['ansiedade', 'tristeza', 'cansaco', 'sobrecarga', 'irritacao', 'calma', 'animo'];

export type QuestionType = 'scale5' | 'scale10' | 'choice' | 'multi' | 'feeling';

export interface CheckinQuestion {
  id: string;
  prompt: string;
  hint?: string;
  type: QuestionType;
  /** Para scale5/choice/multi: rótulos na ordem do valor (0, 1, 2…); scale5 começa em 1. */
  options?: string[];
  /** scale10: rótulos das pontas. */
  ends?: [string, string];
}

export type Answers = Record<string, number | number[] | string>;

const COMMON: CheckinQuestion[] = [
  { id: 'mood', prompt: 'Como você está agora?', type: 'scale5', options: ['Muito mal', 'Mal', 'Mais ou menos', 'Bem', 'Muito bem'] },
  { id: 'feeling', prompt: 'Qual palavra descreve melhor o que você sente?', hint: 'Ela ajuda a encontrar na comunidade quem sente o mesmo.', type: 'feeling' },
  { id: 'energy', prompt: 'E a sua energia?', type: 'scale5', options: ['Sem energia', 'Baixa', 'Média', 'Boa', 'Ótima'] },
  { id: 'sleepQuality', prompt: 'Como foi o seu sono?', type: 'scale5', options: ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo'] },
  { id: 'sleepHours', prompt: 'Quantas horas você dormiu?', type: 'choice', options: ['4 ou menos', '5', '6', '7', '8', '9 ou mais'] },
];

/** Horas de sono por opção da pergunta sleepHours. */
export const SLEEP_HOURS = [4, 5, 6, 7, 8, 9];

const ANXIETY: CheckinQuestion[] = [
  { id: 'anxiety', prompt: 'De 0 a 10, quanta ansiedade você sente agora?', type: 'scale10', ends: ['Nenhuma', 'A pior possível'] },
  { id: 'racing', prompt: 'Os pensamentos estão acelerados?', type: 'choice', options: ['Não', 'Um pouco', 'Muito'] },
  {
    id: 'body',
    prompt: 'Está sentindo algo disso no corpo agora?',
    hint: 'Marque tudo o que valer.',
    type: 'multi',
    options: ['Coração acelerado', 'Falta de ar', 'Aperto no peito', 'Tremor ou suor', 'Tontura', 'Nada disso'],
  },
];

const BY_TRACK: Record<string, CheckinQuestion[]> = {
  aquecimento: ANXIETY,
  respira: ANXIETY,
  ritmo: [
    { id: 'overload', prompt: 'De 0 a 10, quanta sobrecarga você sente hoje?', type: 'scale10', ends: ['Tranquilo', 'Não dou conta'] },
    { id: 'priority', prompt: 'Você sabe qual é a prioridade de hoje?', type: 'choice', options: ['Sim', 'Mais ou menos', 'Não'] },
  ],
  eleva: [
    { id: 'workStress', prompt: 'De 0 a 10, quanto o trabalho está pesando hoje?', type: 'scale10', ends: ['Nada', 'Demais'] },
    { id: 'motivation', prompt: 'Como está a sua motivação com o trabalho?', type: 'scale5', options: ['Nenhuma', 'Baixa', 'Média', 'Boa', 'Alta'] },
  ],
  prospera: [
    { id: 'moneyWorry', prompt: 'De 0 a 10, quanto o dinheiro te preocupa hoje?', type: 'scale10', ends: ['Nada', 'Muito'] },
    { id: 'impulse', prompt: 'Comprou algo por impulso nos últimos dias?', type: 'choice', options: ['Não', 'Uma vez', 'Mais de uma vez'] },
  ],
  move: [
    { id: 'pain', prompt: 'De 0 a 10, sente dor no corpo hoje?', type: 'scale10', ends: ['Nenhuma', 'Muita'] },
    { id: 'moved', prompt: 'Você se movimentou ontem?', type: 'choice', options: ['Sim, treinei', 'Um pouco', 'Não'] },
  ],
  nutre: [
    { id: 'eating', prompt: 'Como foi a sua alimentação ontem?', type: 'scale5', options: ['Muito ruim', 'Ruim', 'Regular', 'Boa', 'Ótima'] },
    { id: 'emotionalEating', prompt: 'Comeu por ansiedade ou emoção?', type: 'choice', options: ['Não', 'Um pouco', 'Muito'] },
  ],
};

export function questionsFor(trackId: string): CheckinQuestion[] {
  return [...COMMON, ...(BY_TRACK[trackId] ?? ANXIETY)];
}

/** Uma pergunta está respondida? (multi pode ficar vazia só se a pessoa escolher "Nada disso") */
export function isAnswered(q: CheckinQuestion, a: Answers): boolean {
  const v = a[q.id];
  if (q.type === 'multi') return Array.isArray(v) && v.length > 0;
  return v !== undefined && v !== '';
}

export interface CheckinAlert {
  tone: 'info' | 'atencao' | 'urgente';
  title: string;
  text: string;
  /** Mostrar os telefones de emergência. */
  emergency?: boolean;
}

export interface CheckinReading {
  level: AlertLevel;
  headline: string;
  message: string;
  /** Indicador principal da trilha (ex.: ansiedade 7/10). */
  metric?: { label: string; value: number; max: number };
  alerts: CheckinAlert[];
  /** Exercícios guiados, na ordem, quando o estado pede socorro na hora. */
  intervention: string[];
  /** Sugestão leve para os outros dias. */
  suggestion?: string;
}

const num = (a: Answers, id: string, fallback = 0) => (typeof a[id] === 'number' ? (a[id] as number) : fallback);

/** Lê as respostas e decide o nível, os alertas e o socorro. */
export function readCheckin(trackId: string, a: Answers): CheckinReading {
  const mood = num(a, 'mood', 3);
  const energy = num(a, 'energy', 3);
  const hours = SLEEP_HOURS[num(a, 'sleepHours', 3)] ?? 7;
  const alerts: CheckinAlert[] = [];
  let level = 'bem' as AlertLevel;
  let intervention: string[] = [];
  let metric: CheckinReading['metric'];
  const raise = (to: AlertLevel) => {
    const order: AlertLevel[] = ['bem', 'atencao', 'critico'];
    if (order.indexOf(to) > order.indexOf(level)) level = to;
  };

  if (hours <= 5) {
    alerts.push({ tone: 'atencao', title: 'Sono curto', text: `Você dormiu ${hours === 4 ? '4 horas ou menos' : `${hours} horas`}. Pouco sono deixa tudo mais pesado: vá com calma hoje.` });
    raise('atencao');
  }
  if (energy <= 1) alerts.push({ tone: 'info', title: 'Energia no chão', text: 'Escolha só uma tarefa importante para hoje.' });
  if (mood <= 2) raise('atencao');

  const track = BY_TRACK[trackId] ? trackId : 'respira';
  if (track === 'respira' || track === 'aquecimento') {
    const anxiety = num(a, 'anxiety');
    const racing = num(a, 'racing');
    const body = Array.isArray(a.body) ? (a.body as number[]).filter((i) => i !== 5) : [];
    metric = { label: 'Ansiedade', value: anxiety, max: 10 };
    if (anxiety >= 8 || (anxiety >= 6 && body.length >= 2)) {
      raise('critico');
      intervention = ['respiracao', 'aterramento'];
    } else if (anxiety >= 5 || racing === 2) {
      raise('atencao');
    }
    if (racing === 2) alerts.push({ tone: 'atencao', title: 'Mente acelerada', text: 'Anote o que está girando na cabeça e marque um horário para pensar nisso depois.' });
    if (body.includes(1) || body.includes(2)) {
      alerts.push({
        tone: 'urgente',
        title: 'Falta de ar ou aperto no peito',
        text: 'Na crise de ansiedade isso é comum e passa. Se a dor no peito for forte, espalhar para o braço ou a mandíbula, ou se não melhorar em alguns minutos, ligue 192 ou vá a um pronto-socorro.',
        emergency: true,
      });
    }
  } else if (track === 'ritmo') {
    const overload = num(a, 'overload');
    metric = { label: 'Sobrecarga', value: overload, max: 10 };
    if (overload >= 8) {
      raise('critico');
      intervention = ['respiracao', 'descarrego'];
    } else if (overload >= 6) raise('atencao');
    if (num(a, 'priority') === 2) alerts.push({ tone: 'info', title: 'Sem prioridade clara', text: 'Antes de começar, escolha a única tarefa que faria o dia valer a pena.' });
  } else if (track === 'eleva') {
    const stress = num(a, 'workStress');
    metric = { label: 'Peso do trabalho', value: stress, max: 10 };
    if (stress >= 8) {
      raise('critico');
      intervention = ['respiracao', 'controle'];
    } else if (stress >= 6) raise('atencao');
    if (num(a, 'motivation', 3) <= 1) alerts.push({ tone: 'info', title: 'Motivação baixa', text: 'Acontece. Que tal uma tarefa pequena que você consiga terminar em 25 minutos?' });
  } else if (track === 'prospera') {
    const worry = num(a, 'moneyWorry');
    metric = { label: 'Preocupação com dinheiro', value: worry, max: 10 };
    if (worry >= 8) {
      raise('critico');
      intervention = ['respiracao', 'controle'];
    } else if (worry >= 6) raise('atencao');
    if (num(a, 'impulse') === 2) alerts.push({ tone: 'atencao', title: 'Compras por impulso', text: 'Experimente a regra das 24 horas: espere um dia antes de comprar o que não estava no plano.' });
  } else if (track === 'move') {
    const pain = num(a, 'pain');
    metric = { label: 'Dor', value: pain, max: 10 };
    if (pain >= 7) {
      raise('atencao');
      alerts.push({ tone: 'urgente', title: 'Dor forte', text: 'Hoje não é dia de treino intenso. Se a dor for nova, muito forte ou não passar, procure um médico ou fisioterapeuta.' });
    } else if (pain >= 4) {
      alerts.push({ tone: 'info', title: 'Corpo pedindo cuidado', text: 'Prefira um treino leve e alongamento.' });
    }
  } else if (track === 'nutre') {
    const emotional = num(a, 'emotionalEating');
    metric = { label: 'Alimentação ontem', value: num(a, 'eating', 3), max: 5 };
    if (emotional === 2) {
      raise('atencao');
      alerts.push({ tone: 'atencao', title: 'Comer pela emoção', text: 'Antes da próxima refeição, faça uma pausa de 1 minuto e pergunte: é fome ou é emoção?' });
      if (mood <= 2) intervention = ['respiracao'];
    }
  }

  // Humor no fundo do poço: sempre socorro na hora, em qualquer trilha.
  if (mood <= 1) {
    raise('critico');
    if (intervention.length === 0) intervention = ['respiracao', 'aterramento'];
  }

  if (level === 'critico') {
    alerts.unshift({
      tone: 'urgente',
      title: 'Você não precisa passar por isso sozinho',
      text: 'Se em algum momento pensar em se machucar, ligue 188 (CVV, 24 horas, gratuito) ou procure alguém de confiança agora.',
      emergency: true,
    });
  }

  const headline = level === 'critico' ? 'Vamos cuidar disso agora' : level === 'atencao' ? 'Dia pedindo atenção' : 'Você está bem hoje';
  const message =
    level === 'critico'
      ? 'Respire com a gente por alguns minutos. É rápido e ajuda o corpo a sair do modo alerta.'
      : level === 'atencao'
        ? 'Nada de cobrança: escolha um passo pequeno e cuide de você no caminho.'
        : 'Aproveite a energia para avançar na sua trilha.';

  const suggestion =
    level === 'bem' ? 'Siga para a próxima aula da trilha.' : intervention.length ? undefined : 'Ouça o Escudo Anticrise de hoje: são só 5 minutos.';

  return { level, headline, message, metric, alerts, intervention, suggestion };
}

/** Sentimento escolhido no check-in (ou nenhum). */
export function feelingOf(a: Answers): Feeling | null {
  const v = a.feeling;
  return typeof v === 'string' && v in FEELINGS ? (v as Feeling) : null;
}
