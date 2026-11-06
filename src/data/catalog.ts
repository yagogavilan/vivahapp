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
    status: 'soon',
    launchLabel: 'Fevereiro de 2027',
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
    status: 'soon',
    launchLabel: 'Fevereiro de 2027',
    sort: 3,
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
    status: 'soon',
    launchLabel: 'Abril de 2027',
    sort: 4,
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
    status: 'soon',
    launchLabel: 'Abril de 2027',
    sort: 5,
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
    status: 'soon',
    launchLabel: 'Junho de 2027',
    sort: 6,
    priceLabel: TRACK_PRICE,
  },
];

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
    emProducao(['Boas-vindas ao programa', 'Semana 1: observar', 'Semana 2: interromper', 'Semana 3: substituir', 'Semana 4: sustentar'])),
  c('respira', 'terra-firme', 'Terra Firme', 'programa', 997,
    'Continuação do Mente Silenciosa: 8 semanas, 16 aulas, quatro encontros ao vivo e trilha de hábitos.',
    emProducao(['Boas-vindas', 'Fundamentos da terra firme', 'Relações e limites', 'Plano de manutenção'])),
  // ——— Ritmo (tempo) ———
  c('ritmo', 'semana-organizada', 'Semana Organizada em 7 Dias', 'entrada', 37,
    'Método de prioridades e planner digital para organizar a semana em sete dias.',
    emProducao(['O que importa de verdade', 'A semana no papel', 'Blocos de foco']), { inSubscription: true }),
  c('ritmo', 'dono-do-meu-tempo', 'Dono do Meu Tempo', 'programa', 497,
    'Trinta dias para montar e manter a rotina, com dois encontros ao vivo.',
    emProducao(['Diagnóstico do seu tempo', 'Rotina base', 'Manutenção'])),
  // ——— Eleva (carreira) ———
  c('eleva', 'checklist-cs-que-retem', 'Checklist CS que Retém', 'entrada', 27,
    'Checklists práticos de onboarding, acompanhamento e renovação para reter clientes.',
    emProducao(['Onboarding que ativa', 'Sinais de risco', 'Renovação e expansão']), { lowTicket: 'planilha' }),
  c('eleva', 'carreira-em-ordem', 'Carreira em Ordem', 'entrada', 47,
    'Um plano de 90 dias para organizar a carreira e o próximo passo.',
    emProducao(['Onde você está', 'Onde quer chegar', 'Plano de 90 dias']), { inSubscription: true }),
  c('eleva', 'maquina-de-clientes', 'Máquina de Clientes', 'programa', 997,
    'CS, vendas e retenção na prática, do primeiro contato à renovação.',
    emProducao(['Jornada do cliente', 'Health score', 'Vendas consultivas', 'Expansão de receita'])),
  c('eleva', 'carreira-em-alta', 'Carreira em Alta', 'programa', 997,
    'Posicionamento, comunicação e liderança para crescer no trabalho.',
    emProducao(['Posicionamento', 'Comunicação que convence', 'Primeira liderança'])),
  // ——— Prospera (finanças) ———
  c('prospera', 'mes-no-azul', 'Mês no Azul em 30 Dias', 'entrada', 47,
    'Aulas curtas e planilha de orçamento para fechar o mês no azul.',
    emProducao(['Para onde vai o seu dinheiro', 'Orçamento simples', 'Primeira reserva']), { inSubscription: true }),
  c('prospera', 'dinheiro-em-ordem', 'Dinheiro em Ordem', 'programa', 697,
    'Oito semanas: orçamento, dívidas, reserva e primeiros investimentos.',
    emProducao(['Diagnóstico financeiro', 'Plano para as dívidas', 'Reserva de emergência', 'Classes de investimento'])),
  // ——— Move (corpo) ———
  c('move', 'corpo-em-movimento', 'Corpo em Movimento em 21 Dias', 'entrada', 47,
    'Treinos de 15 minutos em casa, em três níveis.',
    emProducao(['Avaliação inicial', 'Semana 1', 'Semana 2', 'Semana 3']), { inSubscription: true }),
  c('move', 'treino-em-casa-12-semanas', 'Treino em Casa 12 Semanas', 'programa', 497,
    'Programa progressivo de 12 semanas montado pelo educador físico.',
    emProducao(['Fase 1: base', 'Fase 2: força', 'Fase 3: resistência'])),
  // ——— Nutre (alimentação) ———
  c('nutre', 'cardapio-da-semana', 'Cardápio da Semana em 7 Dias', 'entrada', 37,
    'Receitas simples e lista de compras pronta para a semana.',
    emProducao(['Planejar a semana', 'Lista de compras', 'Receitas base']), { inSubscription: true }),
  c('nutre', 'reeducacao-alimentar', 'Reeducação Alimentar 8 Semanas', 'programa', 597,
    'Hábitos, rotina de refeições e compras, sem dieta da moda.',
    emProducao(['Fome e saciedade', 'Rotina de refeições', 'Comer fora', 'Manutenção'])),
  // ——— Low tickets: mini produtos vendidos à parte em cada trilha ———
  c('respira', 'diario-do-sono', 'Diário do Sono', 'bonus', 17,
    'Planilha de 30 dias para entender o seu sono e o que atrapalha a noite.',
    [{ title: 'Material', lessons: [['Como usar o diário', 'texto', 3], ['Planilha do sono', 'texto', 2]] }], { lowTicket: 'planilha' }),
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
