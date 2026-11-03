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
  Module,
  Product,
  Track,
} from './types';

export const AREA_LABEL: Record<LifeArea, string> = {
  mente: 'Mente',
  tempo: 'Gestão do tempo',
  carreira: 'Carreira e negócios',
  financas: 'Gestão financeira',
  corpo: 'Corpo',
  alimentacao: 'Alimentação',
};

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
  opts: { inSubscription?: boolean; isFree?: boolean; priceLabel?: string } = {},
): CourseSeed => ({
  id,
  trackId,
  title,
  kind,
  price,
  summary,
  priceLabel: opts.priceLabel ?? (price == null ? null : formatBRL(price)),
  inSubscription: opts.inSubscription ?? false,
  isFree: opts.isFree ?? false,
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
    { inSubscription: true, priceLabel: 'R$ 27 no checkout · R$ 37 avulso' }),
  c('respira', 'kit-descarrega-a-mente', 'Kit Descarrega a Mente', 'bonus', 19,
    'Diário de ruminação, mapa de gatilhos e planner do horário da preocupação, para imprimir ou preencher.',
    [{ title: 'Materiais', lessons: [
      ['Como usar o kit', 'texto', 3], ['Diário de ruminação', 'texto', 2], ['Mapa de gatilhos', 'texto', 2],
    ] }],
    { inSubscription: true }),
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
  c('respira', 'circulo-vivah', 'Círculo Vivah', 'acompanhamento', 2997,
    'Encontros semanais em grupo com o Edmilson, masterclass mensal e grupo fechado, por um ano.',
    emProducao(['Como funciona o Círculo', 'Gravações dos encontros']),
    { priceLabel: 'R$ 2.997 por ano' }),
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
    emProducao(['Onboarding que ativa', 'Sinais de risco', 'Renovação e expansão']), { inSubscription: true }),
  c('eleva', 'carreira-em-ordem', 'Carreira em Ordem', 'entrada', 47,
    'Um plano de 90 dias para organizar a carreira e o próximo passo.',
    emProducao(['Onde você está', 'Onde quer chegar', 'Plano de 90 dias']), { inSubscription: true }),
  c('eleva', 'maquina-de-clientes', 'Máquina de Clientes', 'programa', 997,
    'CS, vendas e retenção na prática, do primeiro contato à renovação.',
    emProducao(['Jornada do cliente', 'Health score', 'Vendas consultivas', 'Expansão de receita'])),
  c('eleva', 'carreira-em-alta', 'Carreira em Alta', 'programa', 997,
    'Posicionamento, comunicação e liderança para crescer no trabalho.',
    emProducao(['Posicionamento', 'Comunicação que convence', 'Primeira liderança'])),
  c('eleva', 'mentoria-carreira', 'Mentoria Carreira Vivah', 'acompanhamento', 2997,
    'Mentoria em grupo com plano individual de carreira.',
    emProducao(['Como funciona a mentoria'])),
  // ——— Prospera (finanças) ———
  c('prospera', 'mes-no-azul', 'Mês no Azul em 30 Dias', 'entrada', 47,
    'Aulas curtas e planilha de orçamento para fechar o mês no azul.',
    emProducao(['Para onde vai o seu dinheiro', 'Orçamento simples', 'Primeira reserva']), { inSubscription: true }),
  c('prospera', 'dinheiro-em-ordem', 'Dinheiro em Ordem', 'programa', 697,
    'Oito semanas: orçamento, dívidas, reserva e primeiros investimentos.',
    emProducao(['Diagnóstico financeiro', 'Plano para as dívidas', 'Reserva de emergência', 'Classes de investimento'])),
  c('prospera', 'circulo-prospera', 'Círculo Prospera', 'acompanhamento', 1497,
    'Encontro mensal em grupo para revisar metas e números.',
    emProducao(['Como funciona o Círculo']), { priceLabel: 'R$ 1.497 por ano' }),
  // ——— Move (corpo) ———
  c('move', 'corpo-em-movimento', 'Corpo em Movimento em 21 Dias', 'entrada', 47,
    'Treinos de 15 minutos em casa, em três níveis.',
    emProducao(['Avaliação inicial', 'Semana 1', 'Semana 2', 'Semana 3']), { inSubscription: true }),
  c('move', 'treino-em-casa-12-semanas', 'Treino em Casa 12 Semanas', 'programa', 497,
    'Programa progressivo de 12 semanas montado pelo educador físico.',
    emProducao(['Fase 1: base', 'Fase 2: força', 'Fase 3: resistência'])),
  c('move', 'acompanhamento-move', 'Acompanhamento Move', 'acompanhamento', 1997,
    'Seis meses com avaliação e ajuste mensal do treino pelo educador físico.',
    emProducao(['Como funciona o acompanhamento'])),
  // ——— Nutre (alimentação) ———
  c('nutre', 'cardapio-da-semana', 'Cardápio da Semana em 7 Dias', 'entrada', 37,
    'Receitas simples e lista de compras pronta para a semana.',
    emProducao(['Planejar a semana', 'Lista de compras', 'Receitas base']), { inSubscription: true }),
  c('nutre', 'reeducacao-alimentar', 'Reeducação Alimentar 8 Semanas', 'programa', 597,
    'Hábitos, rotina de refeições e compras, sem dieta da moda.',
    emProducao(['Fome e saciedade', 'Rotina de refeições', 'Comer fora', 'Manutenção'])),
  c('nutre', 'nutre-individual', 'Nutre Individual', 'acompanhamento', 1497,
    'Consulta e plano alimentar individual com nutricionista, com dois retornos.',
    emProducao(['Como funciona o acompanhamento'])),
];

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

/** Produtos da Hotmart. Preencha `hotmartProductId` e `checkoutUrl` no painel do Supabase. */
export const products: Product[] = [
  ...courseSeeds.map((course) => ({
    id: course.id,
    name: course.title,
    hotmartProductId: null,
    checkoutUrl: null,
    courseIds: [course.id],
  })),
  {
    id: 'assinatura-vivah',
    name: 'Assinatura Vivah',
    hotmartProductId: null,
    checkoutUrl: null,
    courseIds: courseSeeds.filter((x) => x.inSubscription).map((x) => x.id),
  },
];

export const SUBSCRIPTION_PRICE_LABEL = 'R$ 39,90 por mês';

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
