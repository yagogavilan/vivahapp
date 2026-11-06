/**
 * Catálogo inicial da Vivah: trilhas, cursos, aulas, produtos, lives,
 * Escudo Anticrise e perguntas do diagnóstico.
 *
 * É a fonte única do conteúdo: o `supabase/seed.sql` é gerado a partir
 * deste arquivo (`npm run seed:generate`) e o modo demonstração usa os
 * mesmos dados. Títulos e textos das aulas são rascunhos para o Edmilson
 * e os professores convidados revisarem.
 */
import type {
  Course,
  DiagnosticQuestion,
  Lesson,
  LessonKind,
  LessonMedia,
  LifeArea,
  LowTicketFormat,
  Module,
  Product,
  StoreItem,
  Track,
} from './types';
import { rewardCourseTrack, TRACK_REWARDS } from '../domain/rewards';

export const AREA_LABEL: Record<LifeArea, string> = {
  mente: 'Mente',
  tempo: 'Gestão do tempo',
  carreira: 'Carreira e negócios',
  financas: 'Gestão financeira',
  corpo: 'Corpo',
  alimentacao: 'Alimentação',
};

/** Preço de exemplo da assinatura anual de cada trilha: ajuste na página de admin. */
const TRACK_PRICE = 'R$ 397 por ano';

/** Na ordem da jornada Vivah: Respira → Ritmo → Move → Nutre → Prospera → Eleva. */
export const tracks: Track[] = [
  {
    id: 'respira',
    title: 'Respira',
    area: 'mente',
    areaLabel: AREA_LABEL.mente,
    subtitle: 'Ansiedade, pensar demais, sono e autoestima',
    description:
      'Para quem sente que a cabeça não desliga. Práticas curtas para interromper a ruminação, dormir melhor e retomar o controle do dia.',
    promise: 'Mente quieta, um dia por vez.',
    teacher: 'Edmilson',
    status: 'live',
    launchLabel: 'Disponível',
    sort: 1,
    priceLabel: TRACK_PRICE,
  },
  {
    id: 'ritmo',
    title: 'Ritmo',
    area: 'tempo',
    areaLabel: AREA_LABEL.tempo,
    subtitle: 'Rotina, foco, prioridades e produtividade',
    description:
      'Para quem termina o dia sem fazer o que importa. Um método simples de prioridades e uma rotina que cabe na vida real.',
    promise: 'Uma rotina que cabe no seu dia.',
    teacher: 'Edmilson',
    status: 'live',
    launchLabel: 'Disponível',
    sort: 2,
    priceLabel: TRACK_PRICE,
  },
  {
    id: 'eleva',
    title: 'Eleva',
    area: 'carreira',
    areaLabel: AREA_LABEL.carreira,
    subtitle: 'Customer success, vendas, liderança e comunicação',
    description:
      'Para quem quer crescer no trabalho com método: CS, vendas, retenção de clientes, liderança e posicionamento profissional.',
    promise: 'Crescer no trabalho com método.',
    teacher: 'Especialistas convidados',
    status: 'live',
    launchLabel: 'Disponível',
    sort: 6,
    priceLabel: TRACK_PRICE,
  },
  {
    id: 'prospera',
    title: 'Prospera',
    area: 'financas',
    areaLabel: AREA_LABEL.financas,
    subtitle: 'Orçamento, dívidas, reserva e primeiros investimentos',
    description:
      'Para quem ganha, mas não vê sobrar. Educação financeira prática para organizar o mês, sair das dívidas e montar a reserva.',
    promise: 'O mês fecha no azul.',
    teacher: 'Especialista em finanças',
    status: 'live',
    launchLabel: 'Disponível',
    sort: 5,
    priceLabel: TRACK_PRICE,
  },
  {
    id: 'move',
    title: 'Move',
    area: 'corpo',
    areaLabel: AREA_LABEL.corpo,
    subtitle: 'Movimento, treino em casa, energia e postura',
    description:
      'Para quem está parado e sem tempo para academia. Treinos curtos em casa, em três níveis, com educador físico (CREF).',
    promise: 'Um corpo que se mexe todo dia.',
    teacher: 'Educador físico (CREF)',
    status: 'live',
    launchLabel: 'Disponível',
    sort: 3,
    priceLabel: TRACK_PRICE,
  },
  {
    id: 'nutre',
    title: 'Nutre',
    area: 'alimentacao',
    areaLabel: AREA_LABEL.alimentacao,
    subtitle: 'Reeducação alimentar, rotina de refeições e compras',
    description:
      'Para quem come mal na correria. Hábitos, cardápio da semana e lista de compras, com nutricionista (CRN), sem dieta da moda.',
    promise: 'Comer bem sem complicar.',
    teacher: 'Nutricionista (CRN)',
    status: 'live',
    launchLabel: 'Disponível',
    sort: 4,
    priceLabel: TRACK_PRICE,
  },
];

tracks.sort((a, b) => a.sort - b.sort);

export const trackByArea: Record<LifeArea, string> = {
  mente: 'respira',
  tempo: 'ritmo',
  carreira: 'eleva',
  financas: 'prospera',
  corpo: 'move',
  alimentacao: 'nutre',
};

type CourseSeed = Omit<Course, 'sort'> & {
  price: number | null;
  modules: { title: string; lessons: [string, LessonKind, number, string?][] }[];
};

const c = (
  trackId: string,
  id: string,
  title: string,
  kind: Course['kind'],
  price: number | null,
  summary: string,
  modules: CourseSeed['modules'],
  opts: {
    inSubscription?: boolean;
    isFree?: boolean;
    priceLabel?: string;
    minKindnessLevel?: number;
    rewardOnly?: boolean;
    lowTicket?: LowTicketFormat;
  } = {},
): CourseSeed => ({
  id,
  trackId,
  title,
  kind,
  price,
  summary,
  // Curso da trilha entra na assinatura anual; só o low ticket tem preço próprio.
  priceLabel: opts.lowTicket ? opts.priceLabel ?? (price == null ? null : formatBRL(price)) : null,
  inSubscription: opts.inSubscription ?? false,
  isFree: opts.isFree ?? false,
  minKindnessLevel: opts.minKindnessLevel ?? null,
  rewardOnly: opts.rewardOnly ?? false,
  lowTicket: Boolean(opts.lowTicket),
  format: opts.lowTicket ?? null,
  modules,
});

/** "R$ 2.997" ou "R$ 39,90", sem depender do Intl do aparelho. */
export function formatBRL(value: number) {
  const [int, dec] = value.toFixed(2).split('.');
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec === '00' ? `R$ ${withDots}` : `R$ ${withDots},${dec}`;
}

type LessonRow = [string, LessonKind, number, string?];
const mod = (title: string, lessons: LessonRow[]): CourseSeed['modules'][number] => ({ title, lessons });

const emProducao = (temas: string[]): CourseSeed['modules'] => [
  { title: 'Conteúdo em produção', lessons: temas.map((t) => [t, 'video', 12] as [string, LessonKind, number]) },
];

const courseSeeds: CourseSeed[] = [
  // ——— Respira (mente) ———
  c('respira', 'protocolo-desligando-a-mente', 'Protocolo Desligando a Mente em 7 Dias', 'entrada', 47,
    'Cinco aulas de 10 minutos e um exercício por dia para aprender a interromper a ruminação.',
    [
      {
        title: 'Entendendo a mente acelerada',
        lessons: [
          ['Por que a sua mente não desliga', 'video', 10, 'Pensar demais não é defeito de caráter: é um hábito, e hábitos se treinam.'],
          ['Ruminação ou preocupação útil?', 'video', 10, 'Como diferenciar o pensamento que resolve do que só gira em círculo.'],
        ],
      },
      {
        title: 'As interrupções',
        lessons: [
          ['Nomear e soltar', 'video', 10, 'A primeira interrupção: perceber o ciclo e dar nome a ele.'],
          ['O horário da preocupação', 'video', 10, 'Um lugar na agenda para os pensamentos que insistem.'],
          ['Do pensamento para a ação', 'video', 10, 'Transformar o que dá para resolver em um próximo passo.'],
        ],
      },
      {
        title: 'Prática dos 7 dias',
        lessons: [1, 2, 3, 4, 5, 6, 7].map(
          (d) => [`Dia ${d}: exercício guiado`, 'audio', 5, 'Um exercício curto para fazer hoje.'] as [string, LessonKind, number, string],
        ),
      },
    ],
    { inSubscription: true }),
  c('respira', 'calma-em-5-minutos', 'Calma em 5 Minutos', 'bonus', 27,
    'Dez áudios guiados de 5 minutos para os momentos em que a mente acelera.',
    [{ title: 'Áudios de socorro', lessons: [
      ['Respiração 4-6', 'audio', 5], ['Aterramento 5-4-3-2-1', 'audio', 5], ['Soltar o pensamento', 'audio', 5],
      ['Antes de dormir', 'audio', 5], ['Antes de uma reunião', 'audio', 5],
      ['Quando acordo de madrugada', 'audio', 5], ['No trânsito', 'audio', 5], ['Depois de uma discussão', 'audio', 5],
      ['Antes de uma prova ou entrevista', 'audio', 5], ['Voltar para o corpo', 'audio', 5],
    ] }],
    { lowTicket: 'aula' }),
  c('respira', 'kit-descarrega-a-mente', 'Kit Descarrega a Mente', 'bonus', 19,
    'Diário de ruminação, mapa de gatilhos e planner do horário da preocupação, para imprimir ou preencher.',
    [{ title: 'Materiais', lessons: [
      ['Como usar o kit', 'texto', 3], ['Diário de ruminação', 'texto', 2], ['Mapa de gatilhos', 'texto', 2],
    ] }],
    { lowTicket: 'planilha' }),
  c('respira', 'desafio-21-dias', 'Desafio 21 Dias de Mente Quieta', 'entrada', 67,
    'Um áudio de 10 minutos por dia, durante 21 dias, para instalar o hábito com a comunidade.',
    [{ title: 'Os 21 dias', lessons: Array.from({ length: 21 }, (_, i) =>
      [`Dia ${i + 1}`, 'audio', 10] as [string, LessonKind, number]) }],
    { inSubscription: true }),
  c('respira', 'mente-silenciosa', 'Mente Silenciosa', 'programa', 497,
    'Programa de 30 dias: aula curta diária, prática guiada e dois encontros ao vivo com o Edmilson.',
    [
      mod('Semana 1: observar', [
        ['Boas-vindas ao programa', 'video', 8, 'Como aproveitar os 30 dias.'],
        ['O mapa da sua ansiedade', 'video', 10, 'Gatilhos, pensamentos, corpo e comportamento.'],
        ['O corpo avisa primeiro', 'video', 9, 'Sinais físicos da ansiedade e o que fazem.'],
        ['GAD-7: o seu ponto de partida', 'texto', 5, 'Faça o teste no painel e anote a sua nota.'],
      ]),
      mod('Semana 2: interromper', [
        ['Respiração que acalma', 'audio', 10, 'Expirar mais longo que inspirar.'],
        ['Aterramento nos 5 sentidos', 'audio', 8, 'Voltar para o agora.'],
        ['Adiar a preocupação', 'video', 10, 'O horário da preocupação na prática.'],
        ['Os pensamentos não são fatos', 'video', 10, 'Observar o pensamento sem brigar com ele.'],
      ]),
      mod('Semana 3: substituir', [
        ['Questionar o pensamento catastrófico', 'video', 12, 'Qual a evidência? Qual a chance real?'],
        ['Enfrentar aos poucos', 'video', 11, 'A escada da exposição gradual.'],
        ['Autocompaixão', 'audio', 10, 'Falar consigo como falaria com um amigo.'],
      ]),
      mod('Semana 4: sustentar', [
        ['Sono que repara', 'video', 12, 'Higiene do sono e a regra dos 20 minutos.'],
        ['Rotina antiansiedade', 'video', 9, 'Movimento, pausas, telas e cafeína.'],
        ['Plano para os dias difíceis', 'texto', 8, 'O que fazer quando a ansiedade voltar.'],
        ['Encerramento e próximos passos', 'video', 8, 'Refaça o GAD-7 e compare.'],
      ]),
    ],
    { inSubscription: true }),
  c('respira', 'terra-firme', 'Terra Firme', 'programa', 997,
    'Continuação do Mente Silenciosa: 8 semanas sobre autoestima, relações, limites e manutenção.',
    [
      mod('Autoestima', [
        ['De onde vem a voz crítica', 'video', 12, 'Exigência, perfeccionismo e comparação.'],
        ['Valores: o que importa para você', 'video', 10, 'Decidir pelo que importa, não pelo medo.'],
        ['Pequenas vitórias diárias', 'audio', 8, 'Treinar o olhar para o que deu certo.'],
      ]),
      mod('Relações e limites', [
        ['Dizer não sem culpa', 'video', 11, 'Limites claros e gentis.'],
        ['Ansiedade nas relações', 'video', 10, 'Necessidade de aprovação e medo de rejeição.'],
        ['Conversas difíceis', 'video', 12, 'Falar do que sente sem atacar.'],
      ]),
      mod('Trabalho e cobrança', [
        ['Ansiedade no trabalho', 'video', 10, 'Prazos, chefes e a síndrome do impostor.'],
        ['Descanso sem culpa', 'video', 8, 'Pausa também é produtividade.'],
      ]),
      mod('Plano de manutenção', [
        ['Os sinais de recaída', 'video', 9, 'Reconhecer cedo e agir.'],
        ['Quando procurar terapia', 'video', 8, 'Psicólogo, psiquiatra e o que esperar.'],
        ['O seu plano de manutenção', 'texto', 10, 'Modelo para preencher.'],
      ]),
    ],
    { inSubscription: true }),
  // ——— Ritmo (tempo): da semana organizada ao sistema que se mantém sozinho ———
  c('ritmo', 'semana-organizada', 'Semana Organizada em 7 Dias', 'entrada', 37,
    'Um método simples de prioridades e um planner para organizar a semana em sete dias.',
    [
      mod('O que importa de verdade', [
        ['Por que a lista de tarefas não funciona', 'video', 8, 'Lista sem prioridade é só um lembrete de tudo o que falta.'],
        ['Urgente ou importante?', 'video', 10, 'A matriz de Eisenhower em 5 minutos, com exemplos do dia a dia.'],
        ['As 3 prioridades do dia', 'video', 8, 'Por que três, e como escolher com verbo e resultado.'],
      ]),
      mod('A semana no papel', [
        ['Os 15 minutos de domingo', 'video', 10, 'O ritual de planejamento que muda a semana.'],
        ['Compromissos, tarefas e blocos', 'video', 10, 'Separar o que tem hora marcada do que só precisa ser feito.'],
        ['Deixar espaço para o imprevisto', 'video', 8, 'Planejar só 60% do dia e por que isso funciona.'],
      ]),
      mod('Blocos de foco', [
        ['O bloco de 45 minutos', 'video', 9, 'Uma tarefa, celular longe, cronômetro ligado.'],
        ['Comer o sapo', 'video', 7, 'Fazer primeiro a tarefa que você mais quer adiar.'],
        ['Fechar o dia', 'video', 7, 'Três minutos no fim do expediente para começar bem amanhã.'],
      ]),
      mod('Prática dos 7 dias', [1, 2, 3, 4, 5, 6, 7].map((d) => [`Dia ${d}: desafio do dia`, 'texto', 5, 'Uma ação curta para aplicar hoje.'] as LessonRow)),
    ],
    { inSubscription: true }),
  c('ritmo', 'dono-do-meu-tempo', 'Dono do Meu Tempo', 'programa', 497,
    'Trinta dias para descobrir para onde vai o seu tempo e montar uma rotina que cabe na vida real.',
    [
      mod('Diagnóstico do seu tempo', [
        ['A auditoria de 3 dias', 'video', 12, 'Registrar o tempo como ele é, não como você acha que é.'],
        ['Os ladrões de tempo', 'video', 10, 'Reuniões sem pauta, mensagens, troca de tarefa e a pressa.'],
        ['Seu mapa de energia', 'video', 9, 'Os horários em que você rende mais e como usá-los.'],
      ]),
      mod('Rotina base', [
        ['A manhã que dá o tom', 'video', 10, 'Uma rotina de manhã curta e possível.'],
        ['Agrupar tarefas parecidas', 'video', 8, 'Mensagens, ligações e burocracia em blocos.'],
        ['Dizer não sem culpa', 'video', 12, 'Como recusar pedidos e reuniões preservando a relação.'],
        ['Pausas que recarregam', 'video', 8, 'A pausa certa a cada 90 minutos.'],
      ]),
      mod('Manutenção', [
        ['A revisão semanal', 'video', 12, 'Trinta minutos por semana para o sistema não desmontar.'],
        ['Quando a semana desanda', 'video', 8, 'Como recomeçar sem jogar o plano fora.'],
        ['Seu plano para os próximos 90 dias', 'texto', 10, 'Modelo para preencher.'],
      ]),
    ]),
  c('ritmo', 'foco-profundo', 'Foco Profundo', 'programa', 397,
    'Proteger a atenção num mundo de notificações: ambiente, celular, procrastinação e trabalho focado.',
    [
      mod('A atenção sequestrada', [
        ['O custo de trocar de tarefa', 'video', 9, 'Cada interrupção cobra minutos para voltar ao ritmo.'],
        ['Celular: as regras da casa', 'video', 11, 'Notificações, tela inicial e o modo foco na prática.'],
        ['O ambiente que ajuda', 'video', 8, 'Mesa, fone, luz e sinais para quem está por perto.'],
      ]),
      mod('Procrastinação', [
        ['Procrastinar é emoção, não preguiça', 'video', 10, 'O que você evita quando adia uma tarefa.'],
        ['A regra dos 2 minutos', 'video', 6, 'Começar pequeno para vencer a resistência.'],
        ['Dividir até ficar óbvio', 'video', 8, 'Transformar o projeto em próximo passo concreto.'],
      ]),
      mod('Trabalho focado', [
        ['Agenda de foco', 'video', 10, 'Blocos fixos na semana, protegidos como reunião.'],
        ['Mensagens em horários combinados', 'video', 9, 'Responder 3 vezes por dia sem perder nada importante.'],
        ['Medir para evoluir', 'video', 7, 'Minutos de foco e interrupções no painel do Ritmo.'],
      ]),
    ]),
  c('ritmo', 'sistema-de-produtividade', 'Sistema que Funciona Sozinho', 'programa', 397,
    'Captura, organização e revisão: o método GTD simplificado para nada mais ficar só na cabeça.',
    [
      mod('Capturar e esclarecer', [
        ['A mente é para ter ideias, não para guardá-las', 'video', 9, 'Por que anotar tudo alivia a cabeça.'],
        ['Caixas de entrada', 'video', 8, 'Poucas caixas, esvaziadas com frequência.'],
        ['O que é isso? Qual o próximo passo?', 'video', 10, 'As duas perguntas que esclarecem qualquer coisa.'],
      ]),
      mod('Organizar', [
        ['Projetos e próximas ações', 'video', 10, 'A diferença que destrava as tarefas.'],
        ['Listas por contexto', 'video', 8, 'No computador, na rua, em casa, com alguém.'],
        ['Algum dia, talvez', 'video', 6, 'Um lugar para as ideias sem culpa.'],
      ]),
      mod('Revisar e manter', [
        ['A revisão semanal passo a passo', 'video', 14, 'O checklist que está no seu painel.'],
        ['Ferramentas simples', 'video', 9, 'Papel, notas do celular ou app: o que importa é o hábito.'],
      ]),
    ]),
  // ——— Eleva (carreira e negócios) ———
  c('eleva', 'carreira-em-ordem', 'Carreira em Ordem', 'entrada', 47,
    'Um plano de 90 dias para entender onde você está, decidir aonde quer chegar e dar o próximo passo.',
    [
      mod('Onde você está', [
        ['A sua carreira em uma página', 'video', 10, 'Trajetória, conquistas e o que te trouxe até aqui.'],
        ['Forças e lacunas', 'video', 9, 'A autoavaliação de habilidades do seu painel.'],
        ['O que o mercado está pedindo', 'video', 10, 'Como ler vagas e conversas para descobrir o que valorizam.'],
      ]),
      mod('Aonde quer chegar', [
        ['Próximo cargo ou nova área?', 'video', 10, 'Crescer onde está, mudar de empresa ou mudar de área.'],
        ['Metas que dá para medir', 'video', 9, 'Objetivos e resultados-chave para os próximos 90 dias.'],
      ]),
      mod('Plano de 90 dias', [
        ['O PDI simples', 'video', 10, 'Uma habilidade, uma prática semanal, uma pessoa para te ajudar.'],
        ['Conversa de carreira com o líder', 'video', 12, 'Como pedir apoio e feedback sem parecer cobrança.'],
        ['Seu plano no papel', 'texto', 10, 'Modelo para preencher.'],
      ]),
    ],
    { inSubscription: true }),
  c('eleva', 'comunicacao-que-convence', 'Comunicação que Convence', 'programa', 497,
    'Falar, escrever e dar feedback de um jeito que as pessoas entendem, lembram e agem.',
    [
      mod('Clareza', [
        ['Comece pela conclusão', 'video', 9, 'A pirâmide da comunicação: resposta primeiro, detalhes depois.'],
        ['Mensagens e e-mails que são respondidos', 'video', 10, 'Assunto, pedido claro e prazo.'],
        ['Reuniões com pauta e decisão', 'video', 10, 'Abrir, conduzir e fechar com próximos passos.'],
      ]),
      mod('Apresentar', [
        ['Estrutura de uma boa apresentação', 'video', 12, 'Problema, solução, prova e pedido.'],
        ['Dados que contam uma história', 'video', 10, 'Um gráfico, uma mensagem.'],
        ['Nervosismo na hora de falar', 'video', 9, 'Respiração e preparação para falar em público.'],
      ]),
      mod('Feedback', [
        ['Pedir feedback de verdade', 'video', 8, 'Perguntas específicas geram respostas úteis.'],
        ['Dar feedback sem ferir', 'video', 11, 'Situação, comportamento e impacto.'],
        ['Conversas difíceis', 'video', 12, 'Discordar, negociar prazos e dizer não.'],
      ]),
    ]),
  c('eleva', 'carreira-em-alta', 'Carreira em Alta', 'programa', 997,
    'Posicionamento, rede de contatos, entrevistas, negociação salarial e primeira liderança.',
    [
      mod('Posicionamento', [
        ['A sua marca profissional', 'video', 10, 'Pelo que você quer ser lembrado.'],
        ['LinkedIn que gera conversa', 'video', 12, 'Título, sobre, experiências com resultado.'],
        ['Currículo de uma página', 'video', 10, 'Conquistas com número, não lista de tarefas.'],
      ]),
      mod('Rede e oportunidades', [
        ['Networking sem constrangimento', 'video', 9, 'Uma conversa por dia útil, com interesse genuíno.'],
        ['Entrevistas: o método STAR', 'video', 12, 'Situação, tarefa, ação e resultado.'],
        ['Negociar salário', 'video', 12, 'Pesquisa, faixa e o momento certo de falar de dinheiro.'],
      ]),
      mod('Primeira liderança', [
        ['De colega a líder', 'video', 10, 'O que muda no primeiro mês.'],
        ['O 1:1 que desenvolve pessoas', 'video', 11, 'Pauta, escuta e combinados.'],
        ['Delegar sem largar', 'video', 10, 'Combinar resultado, prazo e ponto de acompanhamento.'],
      ]),
    ]),
  c('eleva', 'maquina-de-clientes', 'Máquina de Clientes', 'programa', 997,
    'Customer success, vendas e retenção na prática, do primeiro contato à renovação e à indicação.',
    [
      mod('Jornada do cliente', [
        ['O que é sucesso do cliente', 'video', 10, 'Cliente que alcança o resultado renova e indica.'],
        ['Mapa da jornada', 'video', 12, 'Da compra à renovação: os momentos que decidem.'],
        ['Onboarding que ativa', 'video', 11, 'A primeira vitória o mais cedo possível.'],
      ]),
      mod('Retenção', [
        ['Health score simples', 'video', 12, 'Uso, engajamento, resultado e relacionamento numa nota só.'],
        ['Sinais de risco e plano de ação', 'video', 10, 'Agir antes do pedido de cancelamento.'],
        ['NPS que vira ação', 'video', 9, 'Fechar o ciclo com quem respondeu.'],
      ]),
      mod('Vendas e expansão', [
        ['Venda consultiva', 'video', 12, 'Perguntas de situação, problema, implicação e necessidade.'],
        ['Renovação e expansão', 'video', 10, 'O momento certo de oferecer o próximo passo.'],
        ['Indicações', 'video', 8, 'Quando e como pedir.'],
        ['Métricas que importam', 'video', 11, 'Churn, retenção de receita e tempo até o primeiro valor.'],
      ]),
    ]),
  // ——— Prospera (finanças) ———
  c('prospera', 'mes-no-azul', 'Mês no Azul em 30 Dias', 'entrada', 47,
    'Descobrir para onde vai o dinheiro, montar um orçamento simples e começar a reserva.',
    [
      mod('Para onde vai o seu dinheiro', [
        ['O extrato não mente', 'video', 9, 'Três meses de extrato numa tarde.'],
        ['Gastos fixos, variáveis e invisíveis', 'video', 10, 'Assinaturas, taxas e o cafezinho que vira R$ 300.'],
        ['Anotar tudo por 30 dias', 'video', 7, 'O hábito que mais muda a vida financeira.'],
      ]),
      mod('Orçamento simples', [
        ['A regra 50-30-20', 'video', 10, 'Essenciais, desejos e futuro.'],
        ['Cortar sem sofrer', 'video', 9, 'Começar pelo que você nem vai sentir falta.'],
        ['Cartão de crédito a seu favor', 'video', 11, 'Limite, fatura e a armadilha do mínimo.'],
      ]),
      mod('Primeira reserva', [
        ['Pague-se primeiro', 'video', 8, 'Guardar no dia que o dinheiro cai.'],
        ['Onde deixar a reserva', 'video', 10, 'Liquidez diária e baixo risco.'],
      ]),
    ],
    { inSubscription: true }),
  c('prospera', 'fora-das-dividas', 'Fora das Dívidas', 'programa', 497,
    'Um plano para sair das dívidas: entender os juros, negociar e quitar na ordem certa.',
    [
      mod('Diagnóstico', [
        ['A lista completa', 'video', 9, 'Todas as dívidas, com saldo, juro e parcela.'],
        ['Os juros mais caros do Brasil', 'video', 10, 'Rotativo do cartão e cheque especial.'],
        ['Quanto sobra para pagar', 'video', 8, 'O valor mensal que vai para as dívidas.'],
      ]),
      mod('Negociar', [
        ['Como negociar com banco e loja', 'video', 12, 'O que pedir, o que aceitar e o que nunca assinar.'],
        ['Trocar dívida cara por barata', 'video', 10, 'Portabilidade e crédito com juro menor.'],
        ['Feirões e acordos', 'video', 8, 'Aproveitar os mutirões de renegociação.'],
      ]),
      mod('Quitar e não voltar', [
        ['Avalanche ou bola de neve?', 'video', 10, 'Os dois métodos e qual combina com você.'],
        ['O mês da última parcela', 'video', 7, 'Celebrar e redirecionar o dinheiro.'],
        ['Blindagem: nunca mais no vermelho', 'video', 10, 'Reserva, limite baixo e regra das 24 horas.'],
      ]),
    ]),
  c('prospera', 'primeiros-investimentos', 'Reserva e Primeiros Investimentos', 'programa', 497,
    'Montar a reserva de emergência e dar os primeiros passos em renda fixa com segurança.',
    [
      mod('A reserva', [
        ['Quanto guardar', 'video', 9, '3, 6 ou 12 meses do custo essencial.'],
        ['Tesouro Selic e CDB de liquidez diária', 'video', 12, 'Como funcionam e quanto rendem.'],
        ['Garantia do FGC', 'video', 7, 'O que é protegido e até quanto.'],
      ]),
      mod('Renda fixa', [
        ['Inflação: o inimigo silencioso', 'video', 9, 'Por que guardar na poupança não basta.'],
        ['Prefixado, pós-fixado e IPCA+', 'video', 12, 'Qual título para cada objetivo.'],
        ['Imposto de renda nos investimentos', 'video', 9, 'A tabela regressiva em 5 minutos.'],
      ]),
      mod('Objetivos', [
        ['Metas de curto, médio e longo prazo', 'video', 9, 'Cada objetivo no lugar certo.'],
        ['Cuidado com promessas', 'video', 8, 'Golpes, pirâmides e rentabilidade boa demais.'],
      ]),
    ]),
  c('prospera', 'dinheiro-em-ordem', 'Dinheiro em Ordem', 'programa', 697,
    'Oito semanas para consolidar: dinheiro a dois, renda extra, aposentadoria e consumo consciente.',
    [
      mod('Dinheiro e relações', [
        ['Dinheiro a dois', 'video', 12, 'Conta conjunta, divisão justa e conversas sem briga.'],
        ['Filhos e mesada', 'video', 9, 'Ensinar desde cedo.'],
      ]),
      mod('Ganhar mais', [
        ['Renda extra com o que você já sabe', 'video', 11, 'Serviços, produtos e horas vagas.'],
        ['Pedir aumento com argumentos', 'video', 9, 'Ligando com a trilha Eleva.'],
      ]),
      mod('Longo prazo', [
        ['Aposentadoria sem susto', 'video', 12, 'INSS, previdência privada e investimento próprio.'],
        ['Consumo consciente', 'video', 8, 'Comprar menos e melhor.'],
        ['Seu plano financeiro de 12 meses', 'texto', 10, 'Modelo para preencher.'],
      ]),
    ]),
  // ——— Move (corpo) ———
  c('move', 'corpo-em-movimento', 'Corpo em Movimento em 21 Dias', 'entrada', 47,
    'Sair do zero com treinos de 15 minutos em casa, em três níveis, e medir a evolução.',
    [
      mod('Antes de começar', [
        ['Avaliação inicial em casa', 'video', 12, 'Sentar e levantar, flexão, prancha e caminhada de 6 minutos.'],
        ['Como medir o corpo', 'video', 8, 'Peso, cintura e quadril do jeito certo, para comparar depois.'],
        ['Segurança primeiro', 'video', 7, 'Sinais para parar e quando procurar o médico.'],
      ]),
      mod('Semana 1: acordar o corpo', [1, 2, 3, 4, 5].map((n) => [`Treino ${n} · nível 1, 2 ou 3`, 'video', 15, 'Aquecimento, circuito e volta à calma.'] as LessonRow)),
      mod('Semana 2: ganhar ritmo', [6, 7, 8, 9, 10].map((n) => [`Treino ${n} · nível 1, 2 ou 3`, 'video', 15, 'Mais repetições e menos descanso.'] as LessonRow)),
      mod('Semana 3: consolidar', [
        ...[11, 12, 13, 14].map((n) => [`Treino ${n} · nível 1, 2 ou 3`, 'video', 15, 'Circuito completo.'] as LessonRow),
        ['Reavaliação: compare com o dia 1', 'video', 10, 'Refaça os testes e as medidas.'],
      ]),
    ],
    { inSubscription: true }),
  c('move', 'treino-em-casa-12-semanas', 'Treino em Casa 12 Semanas', 'programa', 497,
    'Programa progressivo de força e condicionamento em casa, com peso do corpo, elástico e halteres.',
    [
      mod('Técnica dos movimentos base', [
        ['Agachamento', 'video', 8, 'Pés, joelhos e quadril: o passo a passo.'],
        ['Flexão de braço e variações', 'video', 8, 'Da parede ao chão.'],
        ['Remada com elástico ou mochila', 'video', 7, 'Costas fortes, postura melhor.'],
        ['Ponte de glúteo e afundo', 'video', 8, 'Glúteos e pernas.'],
        ['Prancha e abdominais seguros', 'video', 7, 'Abdome sem dor nas costas.'],
      ]),
      mod('Fase 1: base (semanas 1 a 4)', [1, 2, 3, 4].map((n) => [`Semana ${n}: treinos A e B`, 'video', 25, '3 séries de 10 a 12 repetições.'] as LessonRow)),
      mod('Fase 2: força (semanas 5 a 8)', [5, 6, 7, 8].map((n) => [`Semana ${n}: treinos A, B e C`, 'video', 30, 'Mais carga, menos repetições.'] as LessonRow)),
      mod('Fase 3: resistência (semanas 9 a 12)', [
        ...[9, 10, 11].map((n) => [`Semana ${n}: circuitos`, 'video', 30, 'Força e cardio no mesmo treino.'] as LessonRow),
        ['Semana 12: teste final e próximos passos', 'video', 20, 'Compare com o início e monte o seu plano.'],
      ]),
    ]),
  c('move', 'academia-sem-medo', 'Academia sem Medo', 'programa', 497,
    'Musculação do jeito certo: montar a ficha, técnica dos aparelhos, progressão de carga e divisão de treino.',
    [
      mod('Primeiros passos', [
        ['Como funciona uma ficha de treino', 'video', 10, 'Exercício, séries, repetições, carga e descanso.'],
        ['Escolher a carga certa', 'video', 9, 'Esforço de 7 a 8 em 10: sobram 2 ou 3 repetições.'],
        ['Aquecimento e alongamento', 'video', 7, 'O que fazer antes e depois.'],
      ]),
      mod('Técnica dos principais exercícios', [
        ['Leg press e agachamento livre', 'video', 10, 'Joelhos alinhados, coluna neutra.'],
        ['Supino e desenvolvimento', 'video', 10, 'Ombros protegidos.'],
        ['Puxada, remada e levantamento terra', 'video', 12, 'Costas e posterior de coxa.'],
        ['Exercícios para braço, panturrilha e abdome', 'video', 9, 'Isolados no final do treino.'],
      ]),
      mod('Progressão', [
        ['Treino A/B e A/B/C', 'video', 10, 'Como dividir a semana conforme os dias disponíveis.'],
        ['Progressão de carga', 'video', 9, 'Anotar o treino (no painel) e subir a carga aos poucos.'],
        ['Platô: quando o resultado para', 'video', 8, 'Volume, sono, alimentação e semana de descanso.'],
      ]),
    ]),
  c('move', 'funcional-cardio-recuperacao', 'Funcional, Cardio e Recuperação', 'programa', 397,
    'Treino funcional, corrida do zero aos 5 km, mobilidade e o descanso que faz o corpo evoluir.',
    [
      mod('Funcional', [
        ['O que é treino funcional', 'video', 8, 'Movimentos do dia a dia, com força e equilíbrio.'],
        ['Circuito funcional de 20 minutos', 'video', 20, 'Sem equipamento.'],
        ['HIIT: intervalado com segurança', 'video', 15, 'Quando fazer e quando evitar.'],
      ]),
      mod('Do zero aos 5 km', [
        ['Semanas 1 e 2: caminhar e trotar', 'audio', 25, 'Treino guiado em áudio.'],
        ['Semanas 3 e 4: mais trote', 'audio', 30, 'Treino guiado em áudio.'],
        ['Semanas 5 a 8: correr 5 km', 'audio', 35, 'Treino guiado em áudio.'],
        ['Tênis, ritmo e respiração na corrida', 'video', 9, 'Os erros mais comuns de quem começa.'],
      ]),
      mod('Recuperação', [
        ['Mobilidade de 10 minutos', 'video', 10, 'Quadril, coluna e ombros.'],
        ['Sono e descanso', 'video', 8, 'O músculo cresce enquanto você descansa.'],
        ['Dor boa e dor ruim', 'video', 8, 'Dor muscular tardia, dor articular e quando parar.'],
      ]),
    ]),
  // ——— Nutre (alimentação) ———
  c('nutre', 'cardapio-da-semana', 'Cardápio da Semana em 7 Dias', 'entrada', 37,
    'Planejar as refeições, fazer a lista de compras e cozinhar o básico para a semana inteira.',
    [
      mod('Planejar a semana', [
        ['Por que planejar é metade do caminho', 'video', 8, 'Quem planeja come melhor e gasta menos.'],
        ['Montar o cardápio em 15 minutos', 'video', 10, 'Repetir bases e variar acompanhamentos.'],
        ['Lista de compras inteligente', 'video', 8, 'Por seção do mercado, com comida de verdade.'],
      ]),
      mod('Cozinhar o básico', [
        ['Arroz e feijão da semana', 'video', 12, 'Fazer, porcionar e congelar.'],
        ['Legumes assados e salada que dura', 'video', 10, 'Variedade com pouco trabalho.'],
        ['Proteínas práticas', 'video', 12, 'Frango, ovos, carne moída e leguminosas.'],
        ['Marmita sem enjoar', 'video', 9, 'Montagem, temperos e conservação.'],
      ]),
      mod('Prática dos 7 dias', [1, 2, 3, 4, 5, 6, 7].map((d) => [`Dia ${d}: desafio do dia`, 'texto', 5, 'Uma ação curta para aplicar hoje.'] as LessonRow)),
    ],
    { inSubscription: true }),
  c('nutre', 'comida-de-verdade', 'Comida de Verdade', 'programa', 397,
    'O Guia Alimentar na prática: entender o que é processado, ler rótulos e montar o prato.',
    [
      mod('Os tipos de alimento', [
        ['In natura, processado e ultraprocessado', 'video', 10, 'A classificação do Guia Alimentar em exemplos.'],
        ['A regra de ouro', 'video', 7, 'Prefira sempre alimentos in natura e preparações caseiras.'],
        ['Óleos, sal e açúcar', 'video', 9, 'Usar pouco, para temperar e cozinhar.'],
      ]),
      mod('No mercado', [
        ['Ler o rótulo em 30 segundos', 'video', 10, 'Lista de ingredientes e a lupa frontal.'],
        ['Bebidas: o açúcar escondido', 'video', 8, 'Refrigerante, suco de caixinha e energético.'],
        ['Comer bem gastando pouco', 'video', 9, 'Feira, safra e compra a granel.'],
      ]),
      mod('O prato', [
        ['O prato equilibrado', 'video', 9, 'Metade vegetais, um quarto grãos, um quarto proteína.'],
        ['Frutas e hortaliças todo dia', 'video', 7, 'Como chegar às 5 porções.'],
        ['Água em primeiro lugar', 'video', 6, 'A bebida do dia a dia.'],
      ]),
    ]),
  c('nutre', 'reeducacao-alimentar', 'Reeducação Alimentar 8 Semanas', 'programa', 597,
    'Hábitos, fome e saciedade, rotina de refeições e comer fora, sem dieta da moda e sem culpa.',
    [
      mod('Ouvir o corpo', [
        ['Fome física e fome emocional', 'video', 10, 'Como diferenciar na hora.'],
        ['A escala de fome e saciedade', 'video', 8, 'Começar com fome moderada e parar satisfeito.'],
        ['Comer com atenção', 'video', 9, 'Devagar, sem tela, prestando atenção.'],
      ]),
      mod('Rotina', [
        ['Horários regulares', 'video', 8, 'Pular refeição costuma virar exagero depois.'],
        ['Lanches planejados', 'video', 7, 'Para não chegar com fome extrema no jantar.'],
        ['Noite e madrugada', 'video', 8, 'Jantar, ceia e beliscos.'],
      ]),
      mod('Vida real', [
        ['Comer fora e delivery', 'video', 10, 'Escolhas melhores sem deixar de aproveitar.'],
        ['Festas e fins de semana', 'video', 8, 'Sem compensar e sem culpa.'],
        ['Recaídas fazem parte', 'video', 8, 'Voltar na próxima refeição.'],
        ['Manutenção', 'video', 9, 'O que fica depois das 8 semanas.'],
      ]),
    ]),
  c('nutre', 'nutricao-para-o-dia', 'Energia e Treino', 'programa', 397,
    'Comer para ter disposição no trabalho e resultado no treino: proteína, hidratação e horários.',
    [
      mod('Energia no dia', [
        ['O café da manhã que segura', 'video', 8, 'Proteína, fibra e fruta.'],
        ['A queda das 15h', 'video', 7, 'Almoço, sono e o lanche da tarde.'],
        ['Cafeína com moderação', 'video', 7, 'Quanto e até que horas.'],
      ]),
      mod('Para quem treina', [
        ['Proteína ao longo do dia', 'video', 10, 'Distribuir nas refeições, com comida de verdade.'],
        ['Antes e depois do treino', 'video', 9, 'O que comer e quando.'],
        ['Hidratação no treino', 'video', 7, 'Água antes, durante e depois.'],
        ['Suplementos: o que tem evidência', 'video', 10, 'E por que procurar um nutricionista antes.'],
      ]),
    ]),
  // ——— Low tickets: mini produtos vendidos à parte em cada trilha ———
  c('respira', 'diario-do-sono', 'Diário do Sono', 'bonus', 17,
    'Planilha de 30 dias para entender o seu sono e o que atrapalha a noite.',
    [{ title: 'Material', lessons: [['Como usar o diário', 'texto', 3], ['Planilha do sono', 'texto', 2]] }], { lowTicket: 'planilha' }),
  c('eleva', 'checklist-cs-que-retem', 'Checklist CS que Retém', 'bonus', 27,
    'Checklists práticos de onboarding, acompanhamento e renovação para reter clientes.',
    [{ title: 'Material', lessons: [['Como usar os checklists', 'video', 8], ['Onboarding que ativa', 'texto', 3], ['Sinais de risco', 'texto', 3], ['Renovação e expansão', 'texto', 3]] }],
    { lowTicket: 'planilha' }),
  c('ritmo', 'planner-semana-organizada', 'Planner Semana Organizada', 'bonus', 27,
    'Planilha para planejar a semana em 15 minutos, com prioridades e blocos de foco.',
    [{ title: 'Material', lessons: [['Como usar o planner', 'video', 6], ['Planner', 'texto', 2]] }], { lowTicket: 'planilha' }),
  c('ritmo', 'matriz-de-prioridades', 'Matriz de Prioridades', 'bonus', 17,
    'Ferramenta para separar o urgente do importante em 5 minutos.',
    [{ title: 'Ferramenta', lessons: [['Como usar a matriz', 'video', 5], ['Matriz para preencher', 'texto', 2]] }], { lowTicket: 'ferramenta' }),
  c('eleva', 'roteiro-one-on-one', 'Roteiro de 1:1 com o Líder', 'bonus', 17,
    'Perguntas e pauta para a conversa individual que faz a carreira andar.',
    [{ title: 'Ferramenta', lessons: [['Como conduzir o 1:1', 'video', 8], ['Roteiro', 'texto', 2]] }], { lowTicket: 'ferramenta' }),
  c('prospera', 'planilha-orcamento', 'Planilha de Orçamento 50-30-20', 'bonus', 27,
    'Orçamento pronto: necessidades, desejos e futuro, com gráfico do mês.',
    [{ title: 'Material', lessons: [['Como usar a planilha', 'video', 7], ['Planilha', 'texto', 2]] }], { lowTicket: 'planilha' }),
  c('prospera', 'calculadora-de-dividas', 'Calculadora de Dívidas', 'bonus', 19,
    'Descubra a ordem certa para quitar as dívidas e quando você fica livre.',
    [{ title: 'Ferramenta', lessons: [['Como usar a calculadora', 'video', 6], ['Calculadora', 'texto', 2]] }], { lowTicket: 'ferramenta' }),
  c('move', 'treinos-de-15-minutos', 'Treinos de 15 Minutos', 'bonus', 27,
    'Cinco aulas curtas para treinar em casa quando o dia aperta.',
    [{ title: 'Aulas', lessons: [1, 2, 3, 4, 5].map((n) => [`Treino ${n}`, 'video', 15] as [string, LessonKind, number]) }], { lowTicket: 'aula' }),
  c('move', 'ficha-de-treino', 'Ficha de Treino da Academia', 'bonus', 19,
    'Planilha com treinos A/B/C prontos e espaço para anotar a carga de cada semana.',
    [{ title: 'Material', lessons: [['Como usar a ficha', 'video', 6], ['Ficha de treino', 'texto', 2]] }], { lowTicket: 'planilha' }),
  c('move', 'mobilidade-10-minutos', 'Mobilidade em 10 Minutos', 'bonus', 17,
    'Três aulas curtas para soltar quadril, coluna e ombros, antes do treino ou no fim do dia.',
    [{ title: 'Aulas', lessons: [['Quadril e lombar', 'video', 10], ['Coluna e ombros', 'video', 10], ['Corpo todo, para dormir melhor', 'video', 10]] }], { lowTicket: 'aula' }),
  c('nutre', 'receitas-de-marmita', 'Receitas de Marmita', 'bonus', 27,
    'Seis aulas curtas com marmitas da semana: baratas, rápidas e com comida de verdade.',
    [{ title: 'Aulas', lessons: [1, 2, 3, 4, 5, 6].map((n) => [`Marmita ${n}`, 'video', 10] as [string, LessonKind, number]) }], { lowTicket: 'aula' }),
  c('nutre', 'guia-de-rotulos', 'Guia de Rótulos no Mercado', 'bonus', 17,
    'Ferramenta de bolso para ler rótulos em 30 segundos e fugir dos ultraprocessados.',
    [{ title: 'Ferramenta', lessons: [['Como usar o guia', 'video', 5], ['Guia para imprimir', 'texto', 2]] }], { lowTicket: 'ferramenta' }),
  c('nutre', 'lista-de-compras', 'Lista de Compras Inteligente', 'bonus', 17,
    'Planilha da semana com comida de verdade, que economiza tempo e dinheiro.',
    [{ title: 'Material', lessons: [['Como usar a lista', 'video', 5], ['Lista', 'texto', 2]] }], { lowTicket: 'planilha' }),
  // ——— Formação de Conselheiro: abre no nível Farol (em qualquer trilha) ———
  c('respira', 'formacao-conselheiro', 'Formação de Conselheiro', 'bonus', null,
    'Obrigatória antes de abrir o espaço de conselheiro: papel, limites e código de conduta.',
    [{ title: 'Formação', lessons: [
      ['O papel do conselheiro Vivah', 'video', 12], ['Escuta, limites e cuidado com você', 'video', 12],
      ['Sinais de risco e como encaminhar (CVV 188)', 'video', 12],
    ] }],
    { minKindnessLevel: 6 }),
  // ——— Recompensas de conteúdo (resgatadas com pontos) ———
  ...TRACK_REWARDS.filter((r) => r.courseId).map((r) =>
    c(rewardCourseTrack(r.trackId), r.courseId!, r.title.replace(/^Aula exclusiva: /, ''), r.kind === 'experiencia' ? 'acompanhamento' : 'bonus', null,
      r.description, emProducao(r.topics ?? ['Conteúdo em produção']), { rewardOnly: true })),
];

/** Cursos que são vendidos (fora os exclusivos por nível de bondade). */
const sellable = () => courseSeeds.filter((x) => x.minKindnessLevel == null && !x.rewardOnly);

export const courses: Course[] = courseSeeds.map(({ modules: _m, price: _p, ...rest }, i) => ({ ...rest, sort: i + 1 }));

export const modules: Module[] = [];
export const lessons: Lesson[] = [];
export const lessonMedia: LessonMedia[] = [];

for (const course of courseSeeds) {
  course.modules.forEach((m, mi) => {
    const moduleId = `${course.id}--m${mi + 1}`;
    modules.push({ id: moduleId, courseId: course.id, title: m.title, sort: mi + 1 });
    m.lessons.forEach(([title, kind, durationMin, summary], li) => {
      const id = `${moduleId}--a${li + 1}`;
      lessons.push({
        id,
        moduleId,
        courseId: course.id,
        title,
        summary: summary ?? '',
        kind,
        durationMin,
        sort: li + 1,
        // A primeira aula do produto-herói fica aberta na Área de Aquecimento.
        isPreview: course.id === 'protocolo-desligando-a-mente' && mi === 0 && li === 0,
      });
      lessonMedia.push({
        lessonId: id,
        mediaUrl: null,
        body: kind === 'texto' ? 'Material em produção. O arquivo para baixar entra aqui.' : null,
      });
    });
  });
}

/**
 * Produtos: a assinatura anual de cada trilha (todos os cursos da trilha) e
 * cada low ticket vendido à parte. O link de pagamento de cada um é cadastrado
 * na página de admin (ou no painel do Supabase).
 */
export const products: Product[] = [
  ...tracks.map((t) => ({
    id: `trilha-${t.id}`,
    name: `Trilha ${t.title} · anual`,
    hotmartProductId: null,
    checkoutUrl: null,
    courseIds: sellable().filter((x) => x.trackId === t.id && !x.lowTicket).map((x) => x.id),
  })),
  ...sellable()
    .filter((x) => x.lowTicket)
    .map((course) => ({ id: course.id, name: course.title, hotmartProductId: null, checkoutUrl: null, courseIds: [course.id] })),
];

/**
 * Loja: produtos físicos da Vivah (exemplos para o time trocar na página de admin).
 * Preço e link de pagamento são definidos lá; sem link, o produto aparece como "em breve".
 */
const item = (id: string, trackId: string | null, title: string, description: string, priceLabel: string, sort: number): StoreItem => ({
  id, trackId, title, description, priceLabel, imageUrl: null, checkoutUrl: null, active: true, sort,
});
export const storeItems: StoreItem[] = [
  item('camiseta-vivah', null, 'Camiseta Vivah', 'Algodão, estampa "um passo de cada vez". Tamanhos P ao GG.', 'R$ 89', 1),
  item('caneca-vivah', null, 'Caneca Vivah', 'Cerâmica, 350 ml, para o café da pausa consciente.', 'R$ 49', 2),
  item('diario-mente-quieta', 'respira', 'Diário Mente Quieta', 'Caderno de 90 dias com horário da preocupação, diário do sono e três coisas boas.', 'R$ 69', 3),
  item('planner-ritmo-2027', 'ritmo', 'Planner Ritmo 2027', 'Planner anual com prioridades do dia, blocos de foco e revisão semanal.', 'R$ 99', 4),
  item('caderno-de-conquistas', 'eleva', 'Caderno de Conquistas', 'Para anotar vitórias, metas do trimestre e feedbacks.', 'R$ 59', 5),
  item('envelopes-do-orcamento', 'prospera', 'Kit Envelopes do Orçamento', 'Envelopes e fichas para o método 50-30-20 no papel.', 'R$ 39', 6),
  item('garrafa-move', 'move', 'Garrafa Move 1 litro', 'Com marcação de horários para bater a meta de água.', 'R$ 59', 7),
  item('kit-elasticos', 'move', 'Kit de elásticos', 'Três intensidades, para os treinos em casa.', 'R$ 79', 8),
  item('kit-marmitas', 'nutre', 'Kit Marmitas de Vidro', 'Quatro potes que vão ao micro-ondas e ao freezer.', 'R$ 119', 9),
];

/** Temas das lives semanais (quarta, 20h). Dezembro e janeiro: só a trilha Mente. */
export const liveThemes: { title: string; description: string; trackId: string }[] = [
  { title: 'Como desligar a mente à noite', description: 'Um método para parar de ruminar antes de dormir, aplicado ao vivo.', trackId: 'respira' },
  { title: 'Ansiedade no trabalho', description: 'O que fazer quando a cabeça acelera no meio do expediente.', trackId: 'respira' },
  { title: 'Pensar demais não é defeito', description: 'De onde vem a ruminação e como treinar o contrário.', trackId: 'respira' },
  { title: 'Um fim de ano com a mente em paz', description: 'Festas, balanço do ano e expectativas sem ansiedade.', trackId: 'respira' },
  { title: 'Começar o ano sem se cobrar demais', description: 'Metas possíveis para quem vive no modo cobrança.', trackId: 'respira' },
  { title: 'Sono: por que você acorda cansado', description: 'Hábitos simples para uma noite mais tranquila.', trackId: 'respira' },
  { title: 'Autoestima e comparação', description: 'Como parar de se medir pela régua dos outros.', trackId: 'respira' },
  { title: 'O horário da preocupação', description: 'Exercício ao vivo para dar lugar aos pensamentos que insistem.', trackId: 'respira' },
];

/** Títulos dos áudios diários do Escudo Anticrise. */
export const escudoThemes: { title: string; summary: string }[] = [
  { title: 'Comece o dia antes do celular', summary: 'Três respirações e uma intenção para o dia.' },
  { title: 'Quando a mente acelera', summary: 'Um exercício de 5 minutos para os picos do dia.' },
  { title: 'Um pensamento de cada vez', summary: 'Como observar o pensamento sem entrar nele.' },
  { title: 'O que está no seu controle', summary: 'Separe o que dá para resolver do que não dá.' },
  { title: 'Pausa no meio do expediente', summary: 'Um respiro rápido para voltar ao foco.' },
  { title: 'Gentileza com você', summary: 'Trocar a cobrança pela conversa de quem cuida.' },
  { title: 'Fechar o dia em paz', summary: 'Descarregar a mente antes de dormir.' },
];

// Opções de cada pergunta, da melhor situação (0) para a que pede mais atenção (3).
const OPTIONS_TEXT: string[][] = [
  ['Quase nunca', 'Às vezes', 'Com frequência', 'O tempo todo'],
  ['Durmo bem', 'Durmo bem na maioria das noites', 'Durmo mal com frequência', 'Quase nunca durmo bem'],
  ['Quase sempre', 'Na maioria dos dias', 'Raramente', 'Quase nunca'],
  ['Totalmente', 'Na maior parte do tempo', 'Pouco', 'Nada'],
  ['Crescendo como eu quero', 'Bem, mas poderia mais', 'Estagnado', 'Perdido'],
  ['Sim, com metas', 'Mais ou menos', 'Ainda não', 'Nem sei por onde começar'],
  ['Sobra dinheiro', 'Fica no zero a zero', 'Às vezes no vermelho', 'Quase sempre no vermelho'],
  ['Sim, de 6 meses ou mais', 'Uma reserva pequena', 'Quase nada', 'Não, e tenho dívidas'],
  ['4 ou mais', '2 a 3', '1', 'Nenhum'],
  ['Alta o dia todo', 'Boa na maior parte', 'Cai bastante à tarde', 'Vivo cansado'],
  ['Comida de verdade, na hora', 'Na maioria das vezes bem', 'Muito lanche e pressa', 'Pulo refeições ou como qualquer coisa'],
  ['Sim, toda semana', 'Às vezes', 'Raramente', 'Nunca'],
];
const OPTIONS = OPTIONS_TEXT.map((labels) => labels.map((label, score) => ({ label, score })));

export const diagnosticQuestions: DiagnosticQuestion[] = (
  [
    ['mente', 'Com que frequência sua cabeça fica presa nos mesmos pensamentos?'],
    ['mente', 'Como tem sido o seu sono nas últimas semanas?'],
    ['tempo', 'Você termina o dia tendo feito o que era mais importante?'],
    ['tempo', 'Quanto você se sente no controle da sua agenda?'],
    ['carreira', 'Como você se sente sobre o seu crescimento profissional?'],
    ['carreira', 'Você tem um plano claro para o próximo passo da carreira?'],
    ['financas', 'Como o seu mês costuma terminar financeiramente?'],
    ['financas', 'Você tem uma reserva para imprevistos?'],
    ['corpo', 'Quantos dias por semana você se movimenta por 20 minutos ou mais?'],
    ['corpo', 'Como está a sua energia ao longo do dia?'],
    ['alimentacao', 'Como estão as suas refeições na correria?'],
    ['alimentacao', 'Você planeja o que vai comer na semana?'],
  ] as [LifeArea, string][]
).map(([area, prompt], i) => ({
  id: `q${i + 1}`,
  area,
  prompt,
  sort: i + 1,
  options: OPTIONS[i],
}));
