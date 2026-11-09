/**
 * O propósito de cada trilha no dia a dia:
 * - Plano do dia (de manhã), com validação na hora: o app aponta o que ajustar;
 * - Fechamento do dia (à noite), com nota de 0 a 100 para medir a evolução;
 * - Na comunidade: o nome de cada atividade que pontua e o "apoio" (5 pontos)
 *   que faz sentido na trilha (marcar um horário, montar um planejamento…).
 *
 * Referências: ritual de planejamento e fechamento do Sunsama, "três coisas
 * boas" (Seligman), regra 50-30-20 e regra das 24 horas (finanças), OMS
 * (150 minutos de atividade por semana) e Guia Alimentar para a População
 * Brasileira (comida de verdade, menos ultraprocessados).
 */
import type { IconName } from '../components/ui';

export type FieldType = 'text' | 'list' | 'number' | 'time' | 'choice' | 'multi' | 'yesno' | 'scale5' | 'scale10' | 'checklist';

export interface Field {
  id: string;
  type: FieldType;
  label: string;
  hint?: string;
  placeholder?: string;
  /** list: máximo de itens; number: máximo aceito. */
  max?: number;
  min?: number;
  unit?: string;
  options?: string[];
  /** checklist: id do campo de lista do plano que vira itens para marcar. */
  from?: string;
  optional?: boolean;
  /** Painel: rótulo curto quando a resposta de sim/não é "sim" (ex.: "em jejum"). */
  tag?: string;
}

export type Values = Record<string, string | number | boolean | string[] | number[] | undefined>;

export interface Check {
  level: 'ok' | 'aviso' | 'erro';
  text: string;
}

export interface Validation {
  checks: Check[];
  /** Sem nenhum erro: o plano pode ser salvo. */
  valid: boolean;
  /** Nenhum erro e nenhum aviso. */
  perfect: boolean;
}

export interface ScorePart {
  label: string;
  value: number;
  max: number;
}

export interface Score {
  score: number;
  parts: ScorePart[];
  message: string;
}

export interface SupportSpec {
  /** agenda: marca um horário para apoiar; plano: monta algo para a pessoa. */
  mode: 'agenda' | 'plano';
  label: string;
  hint: string;
  itemsLabel?: string;
  placeholder?: string;
  disclaimer?: string;
}

export interface Program {
  trackId: string;
  purpose: string;
  plan: { title: string; subtitle: string; fields: Field[] };
  review: { title: string; subtitle: string; scoreName: string; fields: Field[] };
  tools: { label: string; icon: IconName; route: 'socorro' | 'foco' | 'escudo' | 'exercicio'; exercise?: string }[];
  community: {
    ajuda: string;
    conselho: string;
    /** Rótulo do tipo de post "dica" nesta trilha. */
    dicaPost: string;
    apoio: SupportSpec;
  };
  validate: (plan: Values, ctx?: { pain?: number }) => Validation;
  score: (review: Values, plan?: Values) => Score;
}

// ——— utilidades ———

const str = (v: Values[string]) => (typeof v === 'string' ? v.trim() : '');
const num = (v: Values[string]) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN);
const list = (v: Values[string]) => (Array.isArray(v) ? (v as unknown[]).map(String).map((x) => x.trim()).filter(Boolean) : []);
const yes = (v: Values[string]) => v === true;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));
/** "07:30" → minutos do dia. */
export function minutesOf(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}
const choiceIdx = (v: Values[string], options: string[]) => (typeof v === 'string' ? options.indexOf(v) : typeof v === 'number' ? v : -1);

function result(checks: Check[]): Validation {
  return { checks, valid: !checks.some((c) => c.level === 'erro'), perfect: checks.every((c) => c.level === 'ok') };
}

function scored(parts: ScorePart[], messages: [number, string][]): Score {
  const score = clamp(parts.reduce((s, p) => s + p.value, 0), 100);
  const message = messages.find(([min]) => score >= min)?.[1] ?? '';
  return { score, parts, message };
}

const MESSAGES: [number, string][] = [
  [85, 'Dia excelente. Guarde o que funcionou.'],
  [65, 'Dia bom. Um ajuste pequeno e amanhã fica melhor.'],
  [40, 'Dia possível. O importante é fechar o ciclo, e você fechou.'],
  [0, 'Dia difícil. Amanhã é outro dia: comece pelo menor passo.'],
];

const TREINO = ['Força', 'Cardio', 'Mobilidade', 'Caminhada', 'Descanso ativo'];
const FEITO = ['Feito como planejei', 'Em parte', 'Não fiz'];
const TECNICA = ['Sim, funcionou', 'Sim, ajudou pouco', 'Não usei'];
const POUCO = ['Não', 'Um pouco', 'Muito'];
const INTERRUP = ['Quase nenhuma', 'Algumas', 'Muitas'];
const REFEICOES = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'];
const ULTRA = ['Nenhum', 'Só um', 'Sem meta hoje'];
const HABILIDADES = ['Comunicação', 'Negociação', 'Liderança', 'Sucesso do cliente', 'Vendas', 'Organização'];

// ——— programas ———

const respira: Program = {
  trackId: 'respira',
  purpose: 'Mente quieta: ansiedade sob controle, pensamentos no lugar e sono de verdade.',
  plan: {
    title: 'Plano de cuidado do dia',
    subtitle: 'Três minutos de manhã para a ansiedade não decidir o seu dia.',
    fields: [
      { id: 'intencao', type: 'text', label: 'Minha intenção para hoje', placeholder: 'Ex.: fazer uma coisa de cada vez' },
      { id: 'horaPreocupacao', type: 'time', label: 'Horário da preocupação (15 min)', hint: 'O que surgir antes disso, anote e deixe para esse horário.', placeholder: '18:00' },
      { id: 'pausas', type: 'number', label: 'Pausas de respiração planejadas', min: 0, max: 10 },
      { id: 'horaDormir', type: 'time', label: 'Hora de deitar', placeholder: '23:00' },
      { id: 'telaOff', type: 'yesno', label: 'Desligar as telas 30 minutos antes de deitar' },
    ],
  },
  review: {
    title: 'Diário da noite',
    subtitle: 'Feche o dia e veja a sua mente quieta evoluir.',
    scoreName: 'Mente quieta',
    fields: [
      { id: 'ansiedade', type: 'scale10', label: 'Ansiedade média do dia (0 a 10)' },
      { id: 'disparos', type: 'number', label: 'Quantas vezes a ansiedade disparou', min: 0, max: 30 },
      { id: 'tecnica', type: 'choice', label: 'Usou uma técnica (respiração, aterramento)?', options: TECNICA },
      { id: 'noHorario', type: 'yesno', label: 'Deixei a preocupação para o horário marcado' },
      { id: 'coisasBoas', type: 'list', label: 'Três coisas boas de hoje', max: 3, placeholder: 'Algo que deu certo, por menor que seja' },
    ],
  },
  // O Socorro (botão no topo e atalho aqui) existe só na Respira.
  tools: [
    { label: 'Socorro', icon: 'life-buoy', route: 'socorro' },
    { label: 'Respiração 4-6', icon: 'wind', route: 'exercicio', exercise: 'respiracao' },
    { label: 'Escudo do dia', icon: 'shield', route: 'escudo' },
  ],
  community: {
    ajuda: 'Mensagem de ajuda',
    conselho: 'Conselho ou frase de ajuda',
    dicaPost: 'Conselho',
    apoio: {
      mode: 'agenda',
      label: 'Reservar um horário de apoio',
      hint: 'Marque um horário para conversar com a pessoa aqui no app. Quando ela confirmar que aconteceu, você ganha 5 pontos.',
    },
  },
  validate(p) {
    const checks: Check[] = [];
    const intencao = str(p.intencao);
    checks.push(intencao ? { level: 'ok', text: 'Intenção definida.' } : { level: 'erro', text: 'Escreva uma intenção para o dia.' });
    const wp = minutesOf(str(p.horaPreocupacao));
    checks.push(wp === null
      ? { level: 'erro', text: 'Marque o horário da preocupação: é o coração do Protocolo.' }
      : { level: 'ok', text: 'Horário da preocupação marcado.' });
    const sleep = minutesOf(str(p.horaDormir));
    if (wp !== null && sleep !== null) {
      const gap = (sleep - wp + 1440) % 1440;
      checks.push(gap < 120
        ? { level: 'aviso', text: 'A preocupação está perto da hora de deitar. Deixe pelo menos 2 horas entre as duas.' }
        : { level: 'ok', text: 'Preocupação longe da hora de dormir.' });
    }
    if (sleep === null) checks.push({ level: 'aviso', text: 'Defina a hora de deitar: rotina de sono acalma a mente.' });
    const pausas = num(p.pausas);
    checks.push(!(pausas >= 2)
      ? { level: 'aviso', text: 'Planeje pelo menos 2 pausas de respiração.' }
      : { level: 'ok', text: `${pausas} pausas de respiração no dia.` });
    checks.push(yes(p.telaOff) ? { level: 'ok', text: 'Telas desligadas antes de dormir.' } : { level: 'aviso', text: 'Desligar as telas antes de deitar ajuda a mente a desacelerar.' });
    return result(checks);
  },
  score(r) {
    const ans = num(r.ansiedade);
    const disp = num(r.disparos);
    const tec = choiceIdx(r.tecnica, TECNICA);
    return scored([
      { label: 'Ansiedade do dia', value: Number.isNaN(ans) ? 0 : (10 - ans) * 3, max: 30 },
      { label: 'Disparos', value: Number.isNaN(disp) ? 0 : disp === 0 ? 15 : disp <= 2 ? 8 : 0, max: 15 },
      { label: 'Técnica', value: tec === 0 ? 15 : tec === 1 ? 8 : 0, max: 15 },
      { label: 'Preocupação no horário', value: yes(r.noHorario) ? 20 : 0, max: 20 },
      { label: 'Três coisas boas', value: Math.min(3, list(r.coisasBoas).length) * (20 / 3), max: 20 },
    ], MESSAGES);
  },
};

const ritmo: Program = {
  trackId: 'ritmo',
  purpose: 'Gestão do tempo: o que importa feito, com foco e sem viver apagando incêndio.',
  plan: {
    title: 'Programação do dia',
    subtitle: 'Planeje e o app valida se o seu dia cabe no seu dia.',
    fields: [
      { id: 'prioridades', type: 'list', label: 'Prioridades do dia (até 3)', max: 5, placeholder: 'Verbo + resultado. Ex.: enviar a proposta da Acme' },
      { id: 'disponivel', type: 'number', label: 'Horas de trabalho disponíveis', unit: 'h', min: 0, max: 16 },
      { id: 'reunioes', type: 'number', label: 'Horas de reuniões e compromissos', unit: 'h', min: 0, max: 16 },
      { id: 'blocos', type: 'number', label: 'Blocos de foco de 45 minutos', min: 0, max: 12 },
      { id: 'inicio', type: 'time', label: 'Início do primeiro bloco de foco', placeholder: '09:00' },
    ],
  },
  review: {
    title: 'Teste de produtividade do dia',
    subtitle: 'Dois minutos no fim do expediente para medir a sua evolução.',
    scoreName: 'Produtividade',
    fields: [
      { id: 'feitas', type: 'checklist', label: 'Quais prioridades você concluiu?', from: 'prioridades' },
      { id: 'blocosFeitos', type: 'number', label: 'Blocos de foco que você fez', min: 0, max: 12 },
      { id: 'interrupcoes', type: 'choice', label: 'Interrupções', options: INTERRUP },
      { id: 'procrastinacao', type: 'choice', label: 'Procrastinou?', options: POUCO },
      { id: 'energia', type: 'scale5', label: 'Energia no fim do dia' },
    ],
  },
  tools: [
    { label: 'Bloco de foco', icon: 'target', route: 'foco' },
    { label: 'Descarrego mental', icon: 'list', route: 'exercicio', exercise: 'descarrego' },
  ],
  community: {
    ajuda: 'Mensagem motivacional',
    conselho: 'Dica de produtividade',
    dicaPost: 'Dica de produtividade',
    apoio: {
      mode: 'plano',
      label: 'Montar o planejamento para alguém',
      hint: 'Monte as prioridades e os blocos de foco do dia da pessoa. Quando ela confirmar que ajudou, você ganha 5 pontos.',
      itemsLabel: 'Planejamento sugerido (uma linha por item)',
      placeholder: '09:00–09:45 · Bloco de foco: proposta',
    },
  },
  validate(p) {
    const checks: Check[] = [];
    const pr = list(p.prioridades);
    if (pr.length === 0) checks.push({ level: 'erro', text: 'Defina pelo menos uma prioridade.' });
    else if (pr.length > 3) checks.push({ level: 'erro', text: `${pr.length} prioridades viram lista de desejos. Escolha no máximo 3.` });
    else checks.push({ level: 'ok', text: `${pr.length} ${pr.length === 1 ? 'prioridade' : 'prioridades'}: foco no que importa.` });
    pr.filter((x) => words(x) < 3).forEach((x) => checks.push({ level: 'aviso', text: `Deixe "${x}" mais específica: verbo + resultado.` }));
    const disp = num(p.disponivel);
    const reun = num(p.reunioes) || 0;
    const blocos = num(p.blocos);
    if (!(disp > 0)) checks.push({ level: 'erro', text: 'Informe quantas horas você tem para trabalhar hoje.' });
    if (!(blocos >= 1)) checks.push({ level: 'erro', text: 'Reserve pelo menos um bloco de foco para a prioridade número 1.' });
    if (disp > 0 && blocos >= 1) {
      const carga = blocos * 0.75 + reun;
      if (carga > disp) checks.push({ level: 'erro', text: `O plano pede ${carga.toFixed(1).replace('.', ',')} h e você tem ${disp} h. Corte blocos ou reuniões.` });
      else if (carga > disp * 0.8) checks.push({ level: 'aviso', text: 'Agenda quase cheia: deixe 20% livre para imprevistos.' });
      else checks.push({ level: 'ok', text: 'O dia cabe no dia, com folga para imprevistos.' });
      if (blocos < pr.length) checks.push({ level: 'aviso', text: 'Tem prioridade sem bloco de foco. Um bloco por prioridade, no mínimo.' });
    }
    const ini = minutesOf(str(p.inicio));
    if (ini === null) checks.push({ level: 'aviso', text: 'Marque o horário do primeiro bloco: o que tem hora acontece.' });
    else if (ini > 14 * 60) checks.push({ level: 'aviso', text: 'O primeiro bloco está tarde. Foco costuma render mais pela manhã.' });
    else checks.push({ level: 'ok', text: 'Primeiro bloco de foco com hora marcada.' });
    return result(checks);
  },
  score(r, plan) {
    const pr = list(plan?.prioridades);
    const feitas = Array.isArray(r.feitas) ? (r.feitas as number[]).length : 0;
    const blocosPlan = Math.max(1, num(plan?.blocos) || 1);
    const blocos = num(r.blocosFeitos) || 0;
    const inter = choiceIdx(r.interrupcoes, INTERRUP);
    const proc = choiceIdx(r.procrastinacao, POUCO);
    const energia = num(r.energia);
    return scored([
      { label: 'Prioridades concluídas', value: pr.length ? (feitas / pr.length) * 45 : 0, max: 45 },
      { label: 'Blocos de foco', value: Math.min(1, blocos / blocosPlan) * 25, max: 25 },
      { label: 'Interrupções', value: inter === 0 ? 10 : inter === 1 ? 5 : 0, max: 10 },
      { label: 'Sem procrastinar', value: proc === 0 ? 10 : proc === 1 ? 5 : 0, max: 10 },
      { label: 'Energia', value: energia >= 1 ? ((energia - 1) / 4) * 10 : 0, max: 10 },
    ], MESSAGES);
  },
};

const eleva: Program = {
  trackId: 'eleva',
  purpose: 'Carreira e negócios: uma ação por dia que move a sua vida profissional.',
  plan: {
    title: 'Plano profissional do dia',
    subtitle: 'Uma ação que faz a carreira andar, todo dia.',
    fields: [
      { id: 'acao', type: 'text', label: 'A ação de carreira mais importante hoje', placeholder: 'Ex.: pedir feedback do projeto para a minha líder' },
      { id: 'contato', type: 'text', label: 'Uma pessoa para contatar (cliente, líder, rede)', placeholder: 'Nome ou cargo', optional: true },
      { id: 'habilidade', type: 'choice', label: 'Habilidade que você vai praticar', options: HABILIDADES },
      { id: 'tempo', type: 'number', label: 'Minutos reservados para aprender', unit: 'min', min: 0, max: 240 },
    ],
  },
  review: {
    title: 'Fechamento profissional',
    subtitle: 'O que você fez hoje pela sua carreira.',
    scoreName: 'Dia profissional',
    fields: [
      { id: 'fezAcao', type: 'choice', label: 'A ação do dia', options: FEITO },
      { id: 'vitoria', type: 'text', label: 'Uma vitória de hoje (vai para o seu diário de conquistas)', optional: true },
      { id: 'contatoFeito', type: 'yesno', label: 'Fiz o contato planejado' },
      { id: 'aprendizado', type: 'text', label: 'O que você aprendeu hoje', optional: true },
      { id: 'satisfacao', type: 'scale5', label: 'Satisfação com o dia de trabalho' },
    ],
  },
  tools: [{ label: 'Bloco de foco', icon: 'target', route: 'foco' }],
  community: {
    ajuda: 'Mensagem de incentivo',
    conselho: 'Dica de carreira',
    dicaPost: 'Dica de carreira',
    apoio: {
      mode: 'plano',
      label: 'Montar um plano de carreira de 30 dias para alguém',
      hint: 'Sugira 3 a 5 passos práticos para o próximo mês da pessoa. Quando ela confirmar que ajudou, você ganha 5 pontos.',
      itemsLabel: 'Passos do plano (um por linha)',
      placeholder: 'Semana 1 · Atualizar o LinkedIn com resultados',
    },
  },
  validate(p) {
    const checks: Check[] = [];
    const acao = str(p.acao);
    if (!acao) checks.push({ level: 'erro', text: 'Defina a ação de carreira do dia.' });
    else if (words(acao) < 4) checks.push({ level: 'aviso', text: 'Deixe a ação mais concreta: o que, com quem e até quando.' });
    else checks.push({ level: 'ok', text: 'Ação de carreira concreta.' });
    checks.push(str(p.contato) ? { level: 'ok', text: 'Contato do dia definido: rede se constrói um contato por vez.' } : { level: 'aviso', text: 'Escolha uma pessoa para contatar hoje.' });
    checks.push(str(p.habilidade) ? { level: 'ok', text: `Praticando: ${str(p.habilidade)}.` } : { level: 'aviso', text: 'Escolha uma habilidade para praticar.' });
    const t = num(p.tempo);
    checks.push(!(t >= 15) ? { level: 'aviso', text: 'Reserve pelo menos 15 minutos para aprender.' } : { level: 'ok', text: `${t} minutos de desenvolvimento.` });
    return result(checks);
  },
  score(r) {
    const a = choiceIdx(r.fezAcao, FEITO);
    const s = num(r.satisfacao);
    return scored([
      { label: 'Ação do dia', value: a === 0 ? 35 : a === 1 ? 17 : 0, max: 35 },
      { label: 'Vitória registrada', value: str(r.vitoria) ? 20 : 0, max: 20 },
      { label: 'Contato feito', value: yes(r.contatoFeito) ? 15 : 0, max: 15 },
      { label: 'Aprendizado', value: str(r.aprendizado) ? 15 : 0, max: 15 },
      { label: 'Satisfação', value: s >= 1 ? ((s - 1) / 4) * 15 : 0, max: 15 },
    ], MESSAGES);
  },
};

const prospera: Program = {
  trackId: 'prospera',
  purpose: 'Finanças: gastar com intenção, guardar todo dia e sair do vermelho.',
  plan: {
    title: 'Orçamento do dia',
    subtitle: 'Decida antes quanto pode gastar: o app confere se fecha.',
    fields: [
      { id: 'limite', type: 'number', label: 'Limite de gastos para hoje', unit: 'R$', min: 0 },
      { id: 'previstos', type: 'number', label: 'Contas e gastos já previstos', unit: 'R$', min: 0 },
      { id: 'guardar', type: 'number', label: 'Quanto você vai guardar hoje', unit: 'R$', min: 0 },
      { id: 'evitar', type: 'text', label: 'Uma compra que você vai evitar', placeholder: 'Ex.: delivery no almoço', optional: true },
    ],
  },
  review: {
    title: 'Fechamento financeiro',
    subtitle: 'Cinco perguntas para ver o seu dinheiro evoluir.',
    scoreName: 'Saúde financeira',
    fields: [
      { id: 'gasto', type: 'number', label: 'Quanto você gastou hoje', unit: 'R$', min: 0 },
      { id: 'impulsos', type: 'number', label: 'Compras por impulso', min: 0, max: 50 },
      { id: 'anotou', type: 'yesno', label: 'Anotei todos os gastos' },
      { id: 'guardou', type: 'yesno', label: 'Guardei o que planejei' },
      { id: 'regra24h', type: 'yesno', label: 'Esperei 24 horas antes de alguma compra' },
    ],
  },
  tools: [{ label: 'O que está no meu controle', icon: 'sliders', route: 'exercicio', exercise: 'controle' }],
  community: {
    ajuda: 'Mensagem de apoio',
    conselho: 'Dica de finanças',
    dicaPost: 'Dica de finanças',
    apoio: {
      mode: 'plano',
      label: 'Montar um orçamento para alguém',
      hint: 'Monte um orçamento simples (50-30-20 ou outro) para a pessoa. Quando ela confirmar que ajudou, você ganha 5 pontos.',
      itemsLabel: 'Orçamento sugerido (uma linha por item)',
      placeholder: 'Necessidades (50%) · R$ 1.250',
      disclaimer: 'É uma ajuda entre colegas, não consultoria financeira.',
    },
  },
  validate(p) {
    const checks: Check[] = [];
    const limite = num(p.limite);
    const prev = num(p.previstos) || 0;
    const guardar = num(p.guardar) || 0;
    if (!(limite >= 0) || Number.isNaN(limite)) checks.push({ level: 'erro', text: 'Defina o limite de gastos de hoje (pode ser zero).' });
    else {
      checks.push({ level: 'ok', text: `Limite do dia: R$ ${limite}.` });
      if (prev > limite) checks.push({ level: 'erro', text: `Os gastos previstos (R$ ${prev}) passam do limite. Ajuste o limite ou adie um gasto.` });
      else if (limite > 0 && prev >= limite * 0.9) checks.push({ level: 'aviso', text: 'Sobra quase nada para imprevistos.' });
    }
    checks.push(guardar > 0 ? { level: 'ok', text: `Pague-se primeiro: R$ ${guardar} guardados.` } : { level: 'aviso', text: 'Pague-se primeiro: guarde algo hoje, mesmo que R$ 5.' });
    checks.push(str(p.evitar) ? { level: 'ok', text: 'Compra a evitar definida.' } : { level: 'aviso', text: 'Escolha uma compra que você vai evitar.' });
    return result(checks);
  },
  score(r, plan) {
    const limite = num(plan?.limite);
    const gasto = num(r.gasto);
    let dentro = 0;
    if (!Number.isNaN(gasto)) {
      if (Number.isNaN(limite)) dentro = 20;
      else if (gasto <= limite) dentro = 40;
      else dentro = limite > 0 ? 40 * Math.max(0, 1 - (gasto - limite) / limite) : 0;
    }
    const imp = num(r.impulsos) || 0;
    return scored([
      { label: 'Dentro do limite', value: dentro, max: 40 },
      { label: 'Sem impulsos', value: imp === 0 ? 20 : imp === 1 ? 10 : 0, max: 20 },
      { label: 'Gastos anotados', value: yes(r.anotou) ? 15 : 0, max: 15 },
      { label: 'Guardou', value: yes(r.guardou) ? 15 : 0, max: 15 },
      { label: 'Regra das 24 horas', value: yes(r.regra24h) ? 10 : 0, max: 10 },
    ], MESSAGES);
  },
};

const move: Program = {
  trackId: 'move',
  purpose: 'Corpo: movimento todo dia, rumo aos 150 minutos por semana da OMS.',
  plan: {
    title: 'Treino do dia',
    subtitle: 'Treino com hora marcada é treino que acontece.',
    fields: [
      { id: 'tipo', type: 'choice', label: 'Tipo de treino', options: TREINO },
      { id: 'duracao', type: 'number', label: 'Duração', unit: 'min', min: 0, max: 240 },
      { id: 'horario', type: 'time', label: 'Horário', placeholder: '07:00' },
      { id: 'passos', type: 'number', label: 'Meta de passos', min: 0, max: 40000 },
    ],
  },
  review: {
    title: 'Fechamento do corpo',
    subtitle: 'Registre e veja os seus minutos da semana.',
    scoreName: 'Corpo ativo',
    fields: [
      { id: 'treinou', type: 'choice', label: 'O treino', options: FEITO },
      { id: 'minutos', type: 'number', label: 'Minutos ativos no dia', unit: 'min', min: 0, max: 600 },
      { id: 'passos', type: 'number', label: 'Passos', min: 0, max: 60000, optional: true },
      { id: 'agua', type: 'number', label: 'Copos de água', min: 0, max: 30 },
      { id: 'disposicao', type: 'scale5', label: 'Disposição' },
    ],
  },
  tools: [{ label: 'Relaxar o corpo', icon: 'activity', route: 'exercicio', exercise: 'relaxamento' }],
  community: {
    ajuda: 'Mensagem de incentivo',
    conselho: 'Dica de treino',
    dicaPost: 'Dica de treino',
    apoio: {
      mode: 'agenda',
      label: 'Combinar um treino juntos',
      hint: 'Seja parceiro de treino: marquem um horário e treinem ao mesmo tempo, cada um na sua casa. Quando a pessoa confirmar, você ganha 5 pontos.',
      disclaimer: 'Não substitui a orientação de um profissional de educação física.',
    },
  },
  validate(p, ctx) {
    const checks: Check[] = [];
    const tipo = str(p.tipo);
    if (!tipo) checks.push({ level: 'erro', text: 'Escolha o tipo de treino (descanso ativo também vale).' });
    else checks.push({ level: 'ok', text: `Treino: ${tipo.toLowerCase()}.` });
    const d = num(p.duracao);
    if (tipo && tipo !== 'Descanso ativo') {
      if (!(d >= 10)) checks.push({ level: 'erro', text: 'Planeje pelo menos 10 minutos.' });
      else if (d > 120) checks.push({ level: 'aviso', text: 'Mais de 2 horas: cuidado com o excesso.' });
      else checks.push({ level: 'ok', text: `${d} minutos planejados.` });
    }
    if (ctx?.pain !== undefined && ctx.pain >= 7 && (tipo === 'Força' || tipo === 'Cardio')) {
      checks.push({ level: 'aviso', text: 'No check-in você marcou dor forte. Hoje prefira mobilidade ou descanso ativo.' });
    }
    checks.push(minutesOf(str(p.horario)) === null ? { level: 'aviso', text: 'Marque o horário do treino.' } : { level: 'ok', text: 'Treino com hora marcada.' });
    const passos = num(p.passos);
    checks.push(!(passos >= 4000) ? { level: 'aviso', text: 'Coloque uma meta de pelo menos 4.000 passos.' } : { level: 'ok', text: `Meta de ${passos} passos.` });
    return result(checks);
  },
  score(r, plan) {
    const t = choiceIdx(r.treinou, FEITO);
    const min = num(r.minutos) || 0;
    const meta = num(plan?.passos) || 6000;
    const passos = num(r.passos) || 0;
    const agua = num(r.agua) || 0;
    const disp = num(r.disposicao);
    return scored([
      { label: 'Treino', value: t === 0 ? 35 : t === 1 ? 18 : 0, max: 35 },
      { label: 'Minutos ativos', value: Math.min(1, min / 30) * 20, max: 20 },
      { label: 'Passos', value: Math.min(1, passos / meta) * 15, max: 15 },
      { label: 'Água', value: Math.min(1, agua / 8) * 15, max: 15 },
      { label: 'Disposição', value: disp >= 1 ? ((disp - 1) / 4) * 15 : 0, max: 15 },
    ], MESSAGES);
  },
};

const nutre: Program = {
  trackId: 'nutre',
  purpose: 'Alimentação: comida de verdade, menos ultraprocessados e mais água.',
  plan: {
    title: 'Plano de alimentação do dia',
    subtitle: 'Planejar as refeições é metade do caminho.',
    fields: [
      { id: 'refeicoes', type: 'multi', label: 'Refeições do dia', options: REFEICOES },
      { id: 'agua', type: 'number', label: 'Meta de copos de água', min: 0, max: 30 },
      { id: 'caseira', type: 'yesno', label: 'Comida feita em casa na maior parte do dia' },
      { id: 'ultra', type: 'choice', label: 'Ultraprocessados hoje', options: ULTRA },
    ],
  },
  review: {
    title: 'Diário da alimentação',
    subtitle: 'Sem culpa: só olhar como foi e ajustar amanhã.',
    scoreName: 'Comida de verdade',
    fields: [
      { id: 'seguiu', type: 'choice', label: 'O plano do dia', options: ['Segui', 'Em parte', 'Não segui'] },
      { id: 'frutas', type: 'number', label: 'Porções de frutas, verduras e legumes', min: 0, max: 20 },
      { id: 'agua', type: 'number', label: 'Copos de água', min: 0, max: 30 },
      { id: 'emocao', type: 'choice', label: 'Comeu por emoção?', options: POUCO },
      { id: 'ultra', type: 'number', label: 'Ultraprocessados consumidos', min: 0, max: 20 },
    ],
  },
  tools: [{ label: 'Pausa antes de comer', icon: 'wind', route: 'exercicio', exercise: 'respiracao' }],
  community: {
    ajuda: 'Mensagem de incentivo',
    conselho: 'Receita ou dica de alimentação',
    dicaPost: 'Receita ou dica',
    apoio: {
      mode: 'plano',
      label: 'Montar um cardápio do dia para alguém',
      hint: 'Sugira um dia de refeições simples com comida de verdade. Quando a pessoa confirmar que ajudou, você ganha 5 pontos.',
      itemsLabel: 'Cardápio sugerido (uma refeição por linha)',
      placeholder: 'Almoço · arroz, feijão, frango e salada',
      disclaimer: 'É uma ideia entre colegas, não prescrição de nutricionista.',
    },
  },
  validate(p) {
    const checks: Check[] = [];
    const refs = Array.isArray(p.refeicoes) ? (p.refeicoes as unknown[]).length : 0;
    if (refs === 0) checks.push({ level: 'erro', text: 'Marque as refeições do dia.' });
    else if (refs < 3) checks.push({ level: 'aviso', text: 'Menos de 3 refeições: a fome costuma cobrar no fim do dia.' });
    else checks.push({ level: 'ok', text: `${refs} refeições planejadas.` });
    const agua = num(p.agua);
    checks.push(!(agua >= 6) ? { level: 'aviso', text: 'Coloque uma meta de pelo menos 6 copos de água.' } : { level: 'ok', text: `Meta de ${agua} copos de água.` });
    checks.push(yes(p.caseira) ? { level: 'ok', text: 'Comida feita em casa: a regra de ouro do Guia Alimentar.' } : { level: 'aviso', text: 'Prefira comida feita em casa, com alimentos in natura.' });
    const u = choiceIdx(p.ultra, ULTRA);
    checks.push(u === 2 || u < 0 ? { level: 'aviso', text: 'Defina uma meta para ultraprocessados.' } : { level: 'ok', text: 'Meta de ultraprocessados definida.' });
    return result(checks);
  },
  score(r, plan) {
    const s = choiceIdx(r.seguiu, ['Segui', 'Em parte', 'Não segui']);
    const frutas = num(r.frutas) || 0;
    const meta = num(plan?.agua) || 8;
    const agua = num(r.agua) || 0;
    const e = choiceIdx(r.emocao, POUCO);
    const u = num(r.ultra) || 0;
    return scored([
      { label: 'Plano seguido', value: s === 0 ? 30 : s === 1 ? 15 : 0, max: 30 },
      { label: 'Frutas e verduras', value: Math.min(1, frutas / 5) * 20, max: 20 },
      { label: 'Água', value: Math.min(1, agua / meta) * 20, max: 20 },
      { label: 'Sem comer por emoção', value: e === 0 ? 15 : e === 1 ? 8 : 0, max: 15 },
      { label: 'Poucos ultraprocessados', value: u === 0 ? 15 : u === 1 ? 8 : 0, max: 15 },
    ], MESSAGES);
  },
};

export const PROGRAMS: Record<string, Program> = { respira, ritmo, eleva, prospera, move, nutre };

export function programFor(trackId: string): Program {
  return PROGRAMS[trackId] ?? respira;
}

/** Nome de cada atividade que pontua, do jeito da trilha. */
export function pointLabel(trackId: string, kind: 'curtida' | 'agradecimento' | 'ajuda' | 'conselho' | 'apoio'): string {
  const c = programFor(trackId).community;
  return { curtida: 'Curtida recebida', agradecimento: 'Agradecimento recebido', ajuda: c.ajuda, conselho: c.conselho, apoio: c.apoio.label }[kind];
}

/** Resumo de uma série de notas: média, comparação com a semana anterior. */
export function evolution(scores: { day: string; score: number }[], today: string) {
  const byDay = new Map(scores.map((s) => [s.day, s.score]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const series = days.map((day) => ({ day, score: byDay.get(day) ?? null }));
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const thisWeek = avg(series.slice(7).map((s) => s.score));
  const lastWeek = avg(series.slice(0, 7).map((s) => s.score));
  return { series, thisWeek, lastWeek, delta: thisWeek !== null && lastWeek !== null ? thisWeek - lastWeek : null };
}
