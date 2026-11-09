/**
 * Recompensas de cada trilha, resgatadas com os pontos de bondade daquela
 * trilha. A mais barata custa um mês fazendo tudo, todos os dias
 * (38 pontos × 30 = 1.140); as outras, 2, 3, 5, 6 e 12 meses.
 *
 * Este arquivo gera a tabela track_rewards do seed e os cursos exclusivos
 * (conteúdo digital e encontros ao vivo).
 */
import { ONE_MONTH } from './points';

export type RewardKind = 'digital' | 'experiencia' | 'fisico' | 'acesso';

export interface TrackReward {
  id: string;
  trackId: string;
  kind: RewardKind;
  title: string;
  description: string;
  cost: number;
  /** Nível mínimo de bondade na trilha. */
  minLevel: number;
  /** Conteúdo digital ou encontro ao vivo: o curso exclusivo que abre. */
  courseId?: string;
  /** Temas das aulas do curso exclusivo (enquanto não são gravadas). */
  topics?: string[];
}

const month = (n: number) => ONE_MONTH * n;

type Seed = [kind: RewardKind, months: number, minLevel: number, title: string, description: string, topics?: string[]];

const SEEDS: Record<string, Seed[]> = {
  respira: [
    ['digital', 1, 1, 'Áudios Noites Tranquilas', 'Sete áudios guiados para desacelerar e dormir.', ['Noite 1 a 7']],
    ['digital', 2, 2, 'Aula exclusiva: Escuta que Acolhe', 'Como ajudar alguém sem sermão nem conselho apressado.', ['Escutar não é resolver', 'Perguntas que abrem espaço', 'O que nunca dizer']],
    ['experiencia', 3, 3, 'Roda ao vivo com o Edmilson', 'Encontro fechado, em grupo pequeno, para quem mais ajuda na Respira.', ['Gravações das rodas']],
    ['fisico', 5, 4, 'Diário Mente Quieta', 'Caderno físico com o horário da preocupação e as três coisas boas do dia.'],
    ['fisico', 6, 5, 'Broche Coração Gentil e kit chá', 'Broche esmaltado e chás calmantes, enviados para a sua casa.'],
    ['experiencia', 12, 7, 'Mentoria em grupo com o Edmilson', 'Um encontro por trimestre com os Portos Seguros da Respira.', ['Gravações da mentoria']],
  ],
  ritmo: [
    ['digital', 1, 1, 'Planner digital Semana Organizada Plus', 'Modelos de planejamento semanal e diário, com revisão de sexta.', ['Como usar o planner']],
    ['digital', 2, 2, 'Aula exclusiva: Deep Work na prática', 'Como proteger 2 horas de foco por dia no mundo real.', ['Por que o foco some', 'Montando os blocos', 'Defendendo a agenda']],
    ['experiencia', 3, 3, 'Planejamento semanal ao vivo', 'Sessão em grupo para montar a semana junto com o professor.', ['Gravações das sessões']],
    ['fisico', 5, 4, 'Caderno planner Vivah', 'Planner físico com prioridades do dia e blocos de foco.'],
    ['fisico', 6, 5, 'Timer de mesa Vivah', 'Timer físico para os blocos de foco, longe do celular.'],
    ['experiencia', 12, 7, 'Mentoria 1:1 de produtividade', 'Uma sessão individual de 45 minutos para montar o seu sistema.', ['Como funciona a mentoria']],
  ],
  eleva: [
    ['digital', 1, 1, 'Modelos de currículo e LinkedIn', 'Modelos editáveis e checklist de perfil que chama recrutador.', ['Como usar os modelos']],
    ['digital', 2, 2, 'Aula exclusiva: Pitch pessoal em 60 segundos', 'Apresente o seu valor em uma conversa, entrevista ou reunião.', ['Estrutura do pitch', 'Treino guiado']],
    ['experiencia', 3, 3, 'Simulação de entrevista ao vivo', 'Treino de entrevista em grupo com feedback na hora.', ['Gravações das simulações']],
    ['fisico', 5, 4, 'Caneca Vivah Eleva', 'Para a mesa de trabalho de quem ajuda os outros a crescer.'],
    ['experiencia', 6, 5, 'Revisão do seu LinkedIn por especialista', 'Análise do seu perfil com sugestões por escrito.', ['Como enviar o seu perfil']],
    ['experiencia', 12, 7, 'Mentoria de carreira 1:1', 'Sessão individual para o seu próximo passo profissional.', ['Como funciona a mentoria']],
  ],
  prospera: [
    ['digital', 1, 1, 'Planilha 50-30-20 automática', 'Orçamento pronto: necessidades, desejos e futuro.', ['Como usar a planilha']],
    ['digital', 2, 2, 'Aula exclusiva: Plano para sair das dívidas', 'Ordem de pagamento, negociação e como não voltar a dever.', ['Mapa das dívidas', 'Negociação', 'Plano de saída']],
    ['experiencia', 3, 3, 'Aula ao vivo: primeiros investimentos', 'Reserva de emergência e primeiros passos, com perguntas ao vivo.', ['Gravações das aulas']],
    ['fisico', 5, 4, 'Cofre Vivah Prospera', 'Cofre físico para o desafio de guardar todo dia.'],
    ['experiencia', 6, 5, 'Análise do seu orçamento por especialista', 'Um especialista revisa o seu orçamento e sugere ajustes.', ['Como enviar o orçamento']],
    ['experiencia', 12, 7, 'Mentoria financeira 1:1', 'Sessão individual para montar o seu plano financeiro.', ['Como funciona a mentoria']],
  ],
  move: [
    ['digital', 1, 1, 'Treinos extras de mobilidade', 'Oito treinos curtos para soltar o corpo em casa.', ['Treinos 1 a 8']],
    ['digital', 2, 2, 'Aula exclusiva: Treino de 15 minutos', 'Um treino completo para os dias corridos.', ['Aquecimento', 'Treino', 'Alongamento']],
    ['experiencia', 3, 3, 'Aulão ao vivo com o educador físico', 'Treino ao vivo em grupo com correção de postura.', ['Gravações dos aulões']],
    ['fisico', 5, 4, 'Garrafa Vivah Move', 'Garrafa térmica para bater a meta de água.'],
    ['fisico', 6, 5, 'Kit elásticos de treino', 'Três faixas elásticas para treinar força em casa.'],
    ['experiencia', 12, 7, 'Avaliação física com o educador', 'Avaliação individual e um plano de treino para 8 semanas.', ['Como funciona a avaliação']],
  ],
  nutre: [
    ['digital', 1, 1, 'E-book: receitas rápidas de comida de verdade', 'Receitas simples com alimentos in natura, para a semana toda.', ['Como usar o e-book']],
    ['digital', 2, 2, 'Aula exclusiva: Lista de compras inteligente', 'Comprar melhor, gastar menos e desperdiçar menos.', ['Planejar', 'Comprar', 'Guardar']],
    ['experiencia', 3, 3, 'Aula ao vivo de culinária prática', 'Marmitas da semana em uma tarde, ao vivo.', ['Gravações das aulas']],
    ['fisico', 5, 4, 'Kit marmitas Vivah', 'Potes de vidro para levar comida de verdade.'],
    ['experiencia', 6, 5, 'Orientação com nutricionista', 'Conversa de 30 minutos para ajustar a sua rotina alimentar.', ['Como agendar']],
    ['experiencia', 12, 7, 'Acompanhamento Nutre por um mês', 'Plano alimentar individual com retorno.', ['Como funciona o acompanhamento']],
  ],
};

export const TRACK_REWARDS: TrackReward[] = Object.entries(SEEDS).flatMap(([trackId, seeds]) => [
  ...seeds.map(([kind, months, minLevel, title, description, topics], i): TrackReward => {
    const id = `${trackId}-r${i + 1}`;
    const withCourse = kind === 'digital' || kind === 'experiencia';
    return {
      id,
      trackId,
      kind,
      title,
      description,
      cost: month(months),
      minLevel,
      ...(withCourse ? { courseId: `premio-${id}`, topics: topics ?? ['Conteúdo em produção'] } : {}),
    };
  }),
  {
    id: `${trackId}-conselheiro`,
    trackId,
    kind: 'acesso' as const,
    title: 'Espaço de Conselheiro',
    description: 'No nível Farol você abre um espaço para as pessoas pedirem conselho a você. Não custa pontos.',
    cost: 0,
    minLevel: 6,
  },
]);

export function rewardsOf(trackId: string): TrackReward[] {
  return TRACK_REWARDS.filter((r) => r.trackId === trackId).sort((a, b) => a.cost - b.cost || a.minLevel - b.minLevel);
}

/** Meses de dedicação total que a recompensa custa. */
export function monthsOf(cost: number): number {
  return Math.round(cost / ONE_MONTH);
}
