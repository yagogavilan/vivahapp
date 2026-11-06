/**
 * Painel de cada trilha: os registros do dia a dia com as peculiaridades de cada área.
 *
 * Move (corpo): água pela meta de 35 ml por kg, peso com IMC e ritmo de mudança,
 *   treinos (academia, funcional, corrida…) com esforço de 0 a 10 e volume de carga,
 *   minutos da semana contra a OMS (150 a 300 min, vigorosa vale o dobro, força em 2 dias),
 *   passos e medidas com cintura e relação cintura-quadril (OMS, 2008).
 * Nutre (alimentação): refeições com fome antes e saciedade depois, prato do Guia
 *   Alimentar (comida de verdade), porções de frutas e hortaliças (OMS: 400 g ≈ 5 porções),
 *   ultraprocessados e água. Sem contagem de calorias e sem peso: o foco é o hábito.
 * Respira (mente): GAD-7 semanal (Spitzer et al., 2006), diário do sono com eficiência
 *   (meta de 85% usada na terapia cognitivo-comportamental da insônia), registro de
 *   preocupações (controlável ou não) e minutos de respiração.
 * Ritmo (tempo): minutos de foco, interrupções, auditoria do tempo por categoria e
 *   revisão semanal (inspirada no GTD).
 * Prospera (finanças): lançamentos com a regra 50-30-20, quanto ainda dá para gastar
 *   por dia, dívidas na ordem avalanche (maior juro) e bola de neve, reserva de emergência.
 * Eleva (carreira): diário de conquistas, metas do trimestre, contatos, estudo,
 *   feedbacks e autoavaliação de habilidades (PDI).
 */
import type { IconName } from '../components/ui';
import { addDays } from './dates';
import type { Field, Values } from './programs';

export interface Entry {
  id: string;
  trackId: string;
  metric: string;
  day: string;
  key: string;
  value: number | null;
  data: Values;
  createdAt: string;
}

/**
 * counter: soma no dia com toques rápidos (água, passos, minutos);
 * daily: um registro por dia (peso, sono, medidas, reserva);
 * log: vários registros (treino, refeição, gasto, conquista);
 * item: lista que se edita (dívidas, metas);
 * profile: dados de base (altura, renda…);
 * assessment: questionário com nota (GAD-7, revisão semanal, habilidades).
 */
export type MetricKind = 'counter' | 'daily' | 'log' | 'item' | 'profile' | 'assessment';

export interface MetricDef {
  id: string;
  kind: MetricKind;
  title: string;
  icon: IconName;
  /** Trilha onde o registro fica guardado (a água é a mesma no Move e no Nutre). */
  store?: string;
  unit?: string;
  health?: boolean;
  quick?: { label: string; delta: number }[];
  fields?: Field[];
  /** Campo do formulário que vira o número principal (para gráficos). */
  valueField?: string;
  /** Explicação curta e a referência usada. */
  about: string;
  source?: string;
  /** Para contadores: menor é melhor (ultraprocessados, interrupções). */
  lowerIsBetter?: boolean;
}

export interface Tile {
  metric: string;
  label: string;
  value: string;
  detail?: string;
  /** 0–100 */
  progress?: number | null;
  tone?: 'ok' | 'aviso' | 'alerta';
  quick?: { label: string; delta: number };
}

export interface Insight {
  level: 'ok' | 'aviso' | 'alerta';
  text: string;
}

export interface PanelCtx {
  today: string;
  entries: Entry[];
}

export interface Panel {
  trackId: string;
  title: string;
  subtitle: string;
  metrics: MetricDef[];
  tiles: (ctx: PanelCtx) => Tile[];
  insights: (ctx: PanelCtx) => Insight[];
}

// ——— utilidades ———

export const fmt = (n: number, d = 0) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const money = (n: number) => `R$ ${fmt(Math.round(n))}`;
const num = (v: Values[string]): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v.replace(',', '.')))) return Number(v.replace(',', '.'));
  return null;
};
const str = (v: Values[string]) => (typeof v === 'string' ? v.trim() : '');
const pct = (a: number, b: number) => (b > 0 ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0);

export function ofMetric(entries: Entry[], metric: string, store?: string): Entry[] {
  return entries.filter((e) => e.metric === metric && (!store || e.trackId === store));
}
export function onDay(entries: Entry[], day: string): Entry[] {
  return entries.filter((e) => e.day === day);
}
export function inLastDays(entries: Entry[], today: string, days: number): Entry[] {
  const from = addDays(today, -(days - 1));
  return entries.filter((e) => e.day >= from && e.day <= today);
}
/** Registro mais recente (por dia e depois por criação). */
export function latest(entries: Entry[]): Entry | undefined {
  return [...entries].sort((a, b) => (a.day === b.day ? b.createdAt.localeCompare(a.createdAt) : b.day.localeCompare(a.day)))[0];
}
export function counterOn(entries: Entry[], metric: string, day: string, store?: string): number {
  return ofMetric(entries, metric, store).filter((e) => e.day === day).reduce((s, e) => s + (e.value ?? 0), 0);
}
/** Série diária para gráficos: soma do valor no dia (null quando não há registro). */
export function dailySeries(entries: Entry[], metric: string, today: string, days: number, store?: string, pick: 'sum' | 'last' | 'count' = 'sum') {
  const list = ofMetric(entries, metric, store);
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i - days + 1);
    const items = list.filter((e) => e.day === day);
    if (!items.length) return { day, value: null as number | null };
    if (pick === 'count') return { day, value: items.length };
    if (pick === 'last') return { day, value: latest(items)?.value ?? null };
    return { day, value: items.reduce((s, e) => s + (e.value ?? 0), 0) };
  });
}
/** Segunda-feira da semana do dia (semana de segunda a domingo). */
export function weekStart(day: string): string {
  const wd = new Date(`${day}T12:00:00Z`).getUTCDay();
  return addDays(day, -((wd + 6) % 7));
}
export function monthStart(day: string): string {
  return `${day.slice(0, 8)}01`;
}
export function daysLeftInMonth(day: string): number {
  const [y, m] = day.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return last - Number(day.slice(8, 10)) + 1;
}

// ————————————————————————————————————————————————————————————
// Move: corpo
// ————————————————————————————————————————————————————————————

export const MODALIDADES = ['Musculação (academia)', 'Funcional', 'Corrida', 'Caminhada', 'Bike', 'Natação', 'Esporte', 'Mobilidade e alongamento', 'Outro'];
const FORCA = new Set(['Musculação (academia)', 'Funcional']);
export const INTENSIDADES = ['Leve', 'Moderada', 'Vigorosa'];

/** Meta de água: 35 ml por kg (faixa usual de 30 a 35 ml/kg), entre 1,5 e 4 litros. Sem peso: 2 litros. */
export function waterGoalMl(weightKg: number | null): number {
  if (!weightKg) return 2000;
  return Math.round(Math.min(4000, Math.max(1500, weightKg * 35)) / 50) * 50;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}
export function bmiClass(v: number): { label: string; tone: Tile['tone'] } {
  if (v < 18.5) return { label: 'abaixo do peso', tone: 'aviso' };
  if (v < 25) return { label: 'peso adequado', tone: 'ok' };
  if (v < 30) return { label: 'sobrepeso', tone: 'aviso' };
  return { label: 'obesidade', tone: 'alerta' };
}

/** Cintura (OMS, 2008): risco aumentado a partir de 94 cm (homens) e 80 cm (mulheres); muito aumentado a partir de 102 e 88. */
export function waistRisk(waistCm: number, sex: 'F' | 'M'): { label: string; tone: Tile['tone'] } {
  const [high, veryHigh] = sex === 'M' ? [94, 102] : [80, 88];
  if (waistCm >= veryHigh) return { label: 'risco muito aumentado', tone: 'alerta' };
  if (waistCm >= high) return { label: 'risco aumentado', tone: 'aviso' };
  return { label: 'dentro da faixa', tone: 'ok' };
}
/** Relação cintura-quadril (OMS): risco a partir de 0,90 (homens) e 0,85 (mulheres). */
export function whrRisk(ratio: number, sex: 'F' | 'M'): Tile['tone'] {
  return ratio >= (sex === 'M' ? 0.9 : 0.85) ? 'aviso' : 'ok';
}

/** "4x10 30kg", "3 x 12 x 20", "4x8 @40": séries × repetições × carga. */
export function parseExercise(line: string): { sets: number; reps: number; load: number } | null {
  const m = /(\d+)\s*[x×]\s*(\d+)(?:\s*(?:[x×@]|com)?\s*(\d+(?:[.,]\d+)?)\s*(?:kg)?)?/i.exec(line);
  if (!m) return null;
  return { sets: Number(m[1]), reps: Number(m[2]), load: m[3] ? Number(m[3].replace(',', '.')) : 0 };
}
export function trainingVolume(exercises: string[]): number {
  return exercises.reduce((s, l) => {
    const p = parseExercise(l);
    return s + (p ? p.sets * p.reps * p.load : 0);
  }, 0);
}

/** Minutos da semana no padrão da OMS: atividade vigorosa conta em dobro. Leve não entra. */
export function weekActivity(treinos: Entry[], today: string) {
  const from = weekStart(today);
  const week = treinos.filter((e) => e.day >= from && e.day <= today);
  let minutes = 0;
  const strengthDays = new Set<string>();
  for (const t of week) {
    const dur = num(t.data.duracao) ?? t.value ?? 0;
    const int = str(t.data.intensidade);
    if (int === 'Vigorosa') minutes += dur * 2;
    else if (int === 'Moderada') minutes += dur;
    if (FORCA.has(str(t.data.modalidade))) strengthDays.add(t.day);
  }
  return { minutes, strengthDays: strengthDays.size, sessions: week.length };
}

/** Variação de peso: em 7 e 30 dias, e alerta se a mudança passa de 1% do peso por semana. */
export function weightTrend(pesos: Entry[], today: string) {
  const sorted = pesos.filter((e) => e.value != null).sort((a, b) => a.day.localeCompare(b.day));
  const last = sorted.at(-1);
  if (!last) return null;
  const near = (days: number) => [...sorted].reverse().find((e) => e.day <= addDays(today, -days));
  const w7 = near(7);
  const w30 = near(30);
  const d7 = w7 ? last.value! - w7.value! : null;
  const d30 = w30 ? last.value! - w30.value! : null;
  const fast = d7 !== null && Math.abs(d7) > last.value! * 0.01;
  return { current: last.value!, day: last.day, d7, d30, fast };
}

const corpoFields: Field[] = [
  { id: 'altura', type: 'number', label: 'Altura', unit: 'cm', min: 100, max: 230 },
  { id: 'sexo', type: 'choice', label: 'Sexo para os cálculos de saúde', hint: 'As faixas de cintura e da relação cintura-quadril da OMS são diferentes para homens e mulheres.', options: ['Feminino', 'Masculino'] },
  { id: 'objetivo', type: 'choice', label: 'Seu objetivo principal', options: ['Perder gordura', 'Ganhar massa muscular', 'Condicionamento', 'Saúde e disposição'] },
  { id: 'metaPeso', type: 'number', label: 'Meta de peso (opcional)', unit: 'kg', min: 30, max: 250, optional: true },
  { id: 'metaPassos', type: 'number', label: 'Meta de passos por dia', min: 1000, max: 30000, hint: 'Estudos associam 8 a 10 mil passos por dia a menor risco de morte em adultos até 60 anos (6 a 8 mil acima disso).' },
  { id: 'diasTreino', type: 'number', label: 'Quantos dias por semana você quer treinar', min: 1, max: 7 },
];

function corpoOf(entries: Entry[]) {
  const c = latest(ofMetric(entries, 'corpo'))?.data ?? {};
  const sexo = str(c.sexo) === 'Masculino' ? 'M' : str(c.sexo) === 'Feminino' ? 'F' : null;
  return { altura: num(c.altura), sexo: sexo as 'F' | 'M' | null, objetivo: str(c.objetivo), metaPeso: num(c.metaPeso), metaPassos: num(c.metaPassos) ?? 8000, diasTreino: num(c.diasTreino) ?? 3 };
}

const AGUA: MetricDef = {
  id: 'agua', kind: 'counter', store: 'move', title: 'Água', icon: 'droplet', unit: 'ml',
  quick: [{ label: '+ copo 200 ml', delta: 200 }, { label: '+ 300 ml', delta: 300 }, { label: '+ garrafa 500 ml', delta: 500 }],
  about: 'A meta é de 35 ml por kg de peso (faixa usual de 30 a 35 ml/kg). Em dias de treino ou calor, beba mais. Quem tem problema nos rins ou no coração deve seguir a orientação médica.',
  source: 'Faixa de 30–35 ml/kg/dia usada em nutrição clínica',
};

function waterTile(ctx: PanelCtx): Tile {
  const peso = weightTrend(ofMetric(ctx.entries, 'peso'), ctx.today)?.current ?? null;
  const goal = waterGoalMl(peso);
  const today = counterOn(ctx.entries, 'agua', ctx.today, 'move');
  return {
    metric: 'agua', label: 'Água hoje', value: `${fmt(today / 1000, 2)} L`,
    detail: `meta ${fmt(goal / 1000, goal % 1000 ? 2 : 1)} L${peso ? ` (35 ml × ${fmt(peso, 1)} kg)` : ''}`,
    progress: pct(today, goal), tone: today >= goal ? 'ok' : undefined, quick: { label: '+200 ml', delta: 200 },
  };
}

const move: Panel = {
  trackId: 'move',
  title: 'Painel do corpo',
  subtitle: 'Água, peso, treinos, passos e medidas. Tudo o que mostra o seu corpo mudando.',
  metrics: [
    AGUA,
    {
      id: 'treino', kind: 'log', title: 'Treinos', icon: 'activity', valueField: 'duracao', unit: 'min',
      fields: [
        { id: 'modalidade', type: 'choice', label: 'Modalidade', options: MODALIDADES },
        { id: 'duracao', type: 'number', label: 'Duração', unit: 'min', min: 1, max: 600 },
        { id: 'intensidade', type: 'choice', label: 'Intensidade', hint: 'Moderada: dá para falar, mas não cantar. Vigorosa: só dá para falar poucas palavras.', options: INTENSIDADES },
        { id: 'esforco', type: 'scale10', label: 'Esforço percebido (0 a 10)', hint: 'Escala de Borg: 0 é repouso, 10 é o máximo que você consegue.' },
        { id: 'exercicios', type: 'list', label: 'Exercícios (opcional)', max: 12, placeholder: 'Ex.: Agachamento 4x10 40kg', optional: true },
        { id: 'dor', type: 'yesno', label: 'Sentiu dor fora do normal?', optional: true, tag: 'com dor' },
        { id: 'obs', type: 'text', label: 'Observação (opcional)', optional: true, placeholder: 'Ex.: aumentei a carga no supino' },
      ],
      about: 'A OMS recomenda de 150 a 300 minutos de atividade moderada por semana (ou 75 a 150 de vigorosa, que vale o dobro) e fortalecimento muscular em pelo menos 2 dias. Escreva os exercícios como "4x10 40kg" e o app calcula o volume de carga.',
      source: 'OMS, Diretrizes de atividade física e comportamento sedentário (2020)',
    },
    {
      id: 'peso', kind: 'daily', title: 'Peso', icon: 'trending-down', unit: 'kg', health: true, valueField: 'peso',
      fields: [
        { id: 'peso', type: 'number', label: 'Peso de hoje', unit: 'kg', min: 30, max: 300 },
        { id: 'jejum', type: 'yesno', label: 'Pesou de manhã, em jejum?', tag: 'em jejum', hint: 'Para comparar, pese sempre no mesmo horário, de preferência ao acordar.' },
      ],
      about: 'Pese-se de 1 a 3 vezes por semana, no mesmo horário. O peso oscila de um dia para o outro (água, intestino, sal): olhe a tendência. Perder mais de 1% do peso por semana costuma levar a perda de massa muscular.',
      source: 'IMC e faixas da OMS',
    },
    {
      id: 'passos', kind: 'counter', title: 'Passos', icon: 'navigation', quick: [{ label: '+1.000', delta: 1000 }, { label: '+2.000', delta: 2000 }, { label: '+5.000', delta: 5000 }],
      about: 'Some os passos do dia (o celular ou o relógio mostram). Uma meta de 8 a 10 mil passos por dia é associada a menor risco de morte em adultos até 60 anos.',
      source: 'Paluch et al., Lancet Public Health (2022)',
    },
    {
      id: 'medidas', kind: 'daily', title: 'Medidas', icon: 'maximize-2', unit: 'cm', health: true, valueField: 'cintura',
      fields: [
        { id: 'cintura', type: 'number', label: 'Cintura', unit: 'cm', hint: 'No ponto médio entre a última costela e o osso do quadril, sem apertar, depois de soltar o ar.', min: 40, max: 250 },
        { id: 'quadril', type: 'number', label: 'Quadril', unit: 'cm', hint: 'Na parte mais larga do bumbum.', min: 50, max: 250 },
        { id: 'peito', type: 'number', label: 'Peito (opcional)', unit: 'cm', optional: true, min: 50, max: 250 },
        { id: 'braco', type: 'number', label: 'Braço contraído (opcional)', unit: 'cm', optional: true, min: 15, max: 80 },
        { id: 'coxa', type: 'number', label: 'Coxa (opcional)', unit: 'cm', optional: true, min: 30, max: 120 },
        { id: 'gordura', type: 'number', label: 'Gordura corporal (opcional)', unit: '%', optional: true, min: 3, max: 70, hint: 'Se você mediu na balança de bioimpedância ou com um profissional.' },
      ],
      about: 'Meça a cada 2 a 4 semanas. A cintura mostra a gordura da barriga, a mais ligada a risco de diabetes e doenças do coração. Quando o peso não muda mas a cintura diminui, você está ganhando músculo e perdendo gordura.',
      source: 'OMS, Waist circumference and waist-hip ratio (2008)',
    },
    { id: 'corpo', kind: 'profile', title: 'Meus dados', icon: 'user', health: true, fields: corpoFields, about: 'Altura e sexo servem para calcular o IMC e as faixas de risco da cintura. Você pode mudar quando quiser.' },
  ],
  tiles(ctx) {
    const c = corpoOf(ctx.entries);
    const tiles: Tile[] = [waterTile(ctx)];
    const wa = weekActivity(ofMetric(ctx.entries, 'treino'), ctx.today);
    tiles.push({
      metric: 'treino', label: 'Treino da semana', value: `${fmt(wa.minutes)} min`,
      detail: `meta 150 · ${wa.sessions} ${wa.sessions === 1 ? 'treino' : 'treinos'} · força em ${wa.strengthDays} de 2 dias`,
      progress: pct(wa.minutes, 150), tone: wa.minutes >= 150 && wa.strengthDays >= 2 ? 'ok' : undefined,
    });
    const wt = weightTrend(ofMetric(ctx.entries, 'peso'), ctx.today);
    if (wt) {
      const b = c.altura ? bmi(wt.current, c.altura) : null;
      tiles.push({
        metric: 'peso', label: 'Peso', value: `${fmt(wt.current, 1)} kg`,
        detail: [wt.d30 !== null ? `${wt.d30 > 0 ? '+' : ''}${fmt(wt.d30, 1)} kg em 30 dias` : wt.d7 !== null ? `${wt.d7 > 0 ? '+' : ''}${fmt(wt.d7, 1)} kg em 7 dias` : 'primeiro registro', b ? `IMC ${fmt(b, 1)}` : null].filter(Boolean).join(' · '),
        tone: wt.fast ? 'aviso' : undefined,
      });
    } else {
      tiles.push({ metric: 'peso', label: 'Peso', value: '—', detail: 'Registre para ver a sua tendência' });
    }
    const steps = counterOn(ctx.entries, 'passos', ctx.today);
    tiles.push({ metric: 'passos', label: 'Passos hoje', value: fmt(steps), detail: `meta ${fmt(c.metaPassos)}`, progress: pct(steps, c.metaPassos), tone: steps >= c.metaPassos ? 'ok' : undefined, quick: { label: '+1.000', delta: 1000 } });
    const med = latest(ofMetric(ctx.entries, 'medidas'));
    const cintura = med ? num(med.data.cintura) : null;
    tiles.push(
      cintura
        ? { metric: 'medidas', label: 'Cintura', value: `${fmt(cintura, 1)} cm`, detail: c.sexo ? waistRisk(cintura, c.sexo).label : 'Informe o sexo em Meus dados', tone: c.sexo ? waistRisk(cintura, c.sexo).tone : undefined }
        : { metric: 'medidas', label: 'Medidas', value: '—', detail: 'Meça a cada 2 a 4 semanas' },
    );
    return tiles;
  },
  insights(ctx) {
    const out: Insight[] = [];
    const c = corpoOf(ctx.entries);
    const treinos = ofMetric(ctx.entries, 'treino');
    const wa = weekActivity(treinos, ctx.today);
    if (!latest(ofMetric(ctx.entries, 'corpo'))) out.push({ level: 'aviso', text: 'Preencha Meus dados (altura e sexo) para o app calcular o IMC e as faixas de risco da cintura.' });
    if (wa.minutes >= 300) out.push({ level: 'ok', text: `${fmt(wa.minutes)} minutos nesta semana: você passou do nível de benefício extra da OMS (300 min).` });
    else if (wa.minutes >= 150) out.push({ level: 'ok', text: `Meta da OMS cumprida: ${fmt(wa.minutes)} minutos nesta semana.` });
    else {
      const left = 150 - wa.minutes;
      out.push({ level: 'aviso', text: `Faltam ${fmt(left)} minutos moderados para os 150 da semana (ou ${fmt(Math.ceil(left / 2))} de atividade vigorosa).` });
    }
    if (wa.strengthDays < 2) out.push({ level: 'aviso', text: `Fortalecimento muscular em ${wa.strengthDays} de 2 dias na semana. Musculação e funcional contam.` });
    const recent = inLastDays(treinos, ctx.today, 7);
    if (recent.some((t) => t.data.dor === true)) out.push({ level: 'alerta', text: 'Você marcou dor fora do normal num treino recente. Diminua a carga e, se continuar, procure um profissional de saúde.' });
    const hard = recent.filter((t) => (num(t.data.esforco) ?? 0) >= 9).length;
    if (hard >= 3) out.push({ level: 'aviso', text: `${hard} treinos com esforço 9 ou 10 nos últimos 7 dias. Inclua dias leves para o corpo se recuperar.` });
    const wt = weightTrend(ofMetric(ctx.entries, 'peso'), ctx.today);
    if (wt?.fast) out.push({ level: 'aviso', text: `O peso mudou ${fmt(Math.abs(wt.d7 ?? 0), 1)} kg em 7 dias, mais de 1% por semana. Mudanças rápidas costumam ser água ou perda de músculo.` });
    if (wt && c.metaPeso) {
      const diff = wt.current - c.metaPeso;
      if (Math.abs(diff) < 0.5) out.push({ level: 'ok', text: 'Você chegou à sua meta de peso. Agora o objetivo é manter.' });
      else out.push({ level: 'ok', text: `Faltam ${fmt(Math.abs(diff), 1)} kg para a sua meta de ${fmt(c.metaPeso, 1)} kg.` });
    }
    if (wt && c.altura) {
      const b = bmi(wt.current, c.altura);
      const k = bmiClass(b);
      if (k.tone !== 'ok') out.push({ level: k.tone === 'alerta' ? 'alerta' : 'aviso', text: `IMC ${fmt(b, 1)} (${k.label}). O IMC não separa músculo de gordura: olhe junto com a cintura.` });
    }
    const med = latest(ofMetric(ctx.entries, 'medidas'));
    const cintura = med ? num(med.data.cintura) : null;
    const quadril = med ? num(med.data.quadril) : null;
    if (cintura && quadril && c.sexo) {
      const r = cintura / quadril;
      if (whrRisk(r, c.sexo) !== 'ok') out.push({ level: 'aviso', text: `Relação cintura-quadril ${fmt(r, 2)}: acima da faixa da OMS (${c.sexo === 'M' ? '0,90' : '0,85'}).` });
    }
    const medidas = ofMetric(ctx.entries, 'medidas').sort((a, b) => a.day.localeCompare(b.day));
    if (medidas.length >= 2) {
      const first = num(medidas[0].data.cintura);
      const last = num(medidas.at(-1)!.data.cintura);
      if (first && last && last < first) out.push({ level: 'ok', text: `A cintura diminuiu ${fmt(first - last, 1)} cm desde a primeira medida.` });
    }
    const water = counterOn(ctx.entries, 'agua', addDays(ctx.today, -1), 'move');
    if (water > 0 && water < waterGoalMl(wt?.current ?? null) * 0.6) out.push({ level: 'aviso', text: 'Ontem você bebeu menos de 60% da meta de água. Deixe uma garrafa à vista.' });
    return out;
  },
};

// ————————————————————————————————————————————————————————————
// Nutre: alimentação
// ————————————————————————————————————————————————————————————

export const PRATO = ['Verduras e legumes', 'Frutas', 'Arroz, feijão ou outro grão', 'Proteína (carne, ovo, peixe, feijão)', 'Ultraprocessado', 'Bebida adoçada'];
export const COMO = ['Com calma', 'Sem tela', 'Em companhia', 'Com pressa', 'Em pé ou no carro'];
export const EMOCAO = ['Fome de verdade', 'Ansiedade', 'Tédio', 'Tristeza ou cansaço', 'Ocasião social'];

/** Fome antes de 3 a 6 e saciedade depois de 5 a 7: comer com fome e parar satisfeito. */
export function mealBalance(m: Entry): 'ok' | 'pouca-fome' | 'muita-fome' | 'passou' | null {
  const fome = num(m.data.fome);
  const sac = num(m.data.saciedade);
  if (fome === null && sac === null) return null;
  if (sac !== null && sac >= 9) return 'passou';
  if (fome !== null && fome >= 8) return 'muita-fome';
  if (fome !== null && fome <= 1) return 'pouca-fome';
  return 'ok';
}

const nutre: Panel = {
  trackId: 'nutre',
  title: 'Painel da alimentação',
  subtitle: 'Refeições, fome e saciedade, frutas e hortaliças, ultraprocessados e água. Sem calorias, sem culpa.',
  metrics: [
    {
      id: 'refeicao', kind: 'log', title: 'Refeições', icon: 'coffee', health: true,
      fields: [
        { id: 'tipo', type: 'choice', label: 'Refeição', options: ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'] },
        { id: 'horario', type: 'time', label: 'Horário', placeholder: '12:30' },
        { id: 'oque', type: 'text', label: 'O que você comeu', placeholder: 'Ex.: arroz, feijão, frango e salada' },
        { id: 'prato', type: 'multi', label: 'O que tinha no prato', options: PRATO },
        { id: 'casa', type: 'yesno', label: 'Feita em casa?', tag: 'feita em casa' },
        { id: 'fome', type: 'scale10', label: 'Fome antes (0 = nenhuma, 10 = fome extrema)' },
        { id: 'saciedade', type: 'scale10', label: 'Como ficou depois (0 = com fome, 10 = cheio demais)' },
        { id: 'como', type: 'multi', label: 'Como você comeu', options: COMO },
        { id: 'motivo', type: 'choice', label: 'O que te levou a comer', options: EMOCAO },
      ],
      about: 'O Guia Alimentar para a População Brasileira orienta: faça de alimentos in natura ou minimamente processados a base da alimentação, evite ultraprocessados e coma com regularidade, com atenção e, se puder, em companhia. Comer com fome moderada e parar satisfeito ajuda a ouvir o corpo.',
      source: 'Guia Alimentar para a População Brasileira (Ministério da Saúde, 2014)',
    },
    {
      id: 'porcoes', kind: 'counter', title: 'Frutas e hortaliças', icon: 'feather', unit: 'porções', quick: [{ label: '+1 porção', delta: 1 }],
      about: 'A OMS recomenda pelo menos 400 g de frutas, verduras e legumes por dia, cerca de 5 porções (1 porção = 1 fruta média ou 3 colheres de sopa de legumes ou 1 prato de sobremesa de salada).',
      source: 'OMS, Healthy diet (2020)',
    },
    {
      id: 'ultra', kind: 'counter', title: 'Ultraprocessados', icon: 'package', quick: [{ label: '+1', delta: 1 }], lowerIsBetter: true,
      about: 'Biscoitos recheados, salgadinhos, refrigerantes, embutidos, macarrão instantâneo, refeições prontas congeladas. A regra de ouro do Guia: prefira sempre alimentos in natura e preparações culinárias.',
      source: 'Guia Alimentar para a População Brasileira',
    },
    AGUA,
  ],
  tiles(ctx) {
    const meals = ofMetric(ctx.entries, 'refeicao');
    const today = onDay(meals, ctx.today);
    const flv = counterOn(ctx.entries, 'porcoes', ctx.today);
    const ultra = counterOn(ctx.entries, 'ultra', ctx.today);
    const ok = today.filter((m) => mealBalance(m) === 'ok').length;
    return [
      { metric: 'refeicao', label: 'Refeições hoje', value: String(today.length), detail: today.length ? `${ok} com fome e saciedade na medida` : 'Registre a primeira refeição' },
      { metric: 'porcoes', label: 'Frutas e hortaliças', value: `${fmt(flv)} de 5`, detail: 'porções hoje', progress: pct(flv, 5), tone: flv >= 5 ? 'ok' : undefined, quick: { label: '+1', delta: 1 } },
      { metric: 'ultra', label: 'Ultraprocessados', value: fmt(ultra), detail: ultra === 0 ? 'nenhum hoje' : 'hoje', tone: ultra === 0 ? 'ok' : ultra >= 3 ? 'aviso' : undefined, quick: { label: '+1', delta: 1 } },
      waterTile(ctx),
    ];
  },
  insights(ctx) {
    const out: Insight[] = [];
    const week = inLastDays(ofMetric(ctx.entries, 'refeicao'), ctx.today, 7);
    if (week.length >= 3) {
      const casa = week.filter((m) => m.data.casa === true).length;
      out.push({ level: casa / week.length >= 0.6 ? 'ok' : 'aviso', text: `${pct(casa, week.length)}% das refeições da semana foram feitas em casa.` });
      const veg = week.filter((m) => Array.isArray(m.data.prato) && (m.data.prato as string[]).includes('Verduras e legumes')).length;
      const main = week.filter((m) => ['Almoço', 'Jantar'].includes(str(m.data.tipo))).length;
      if (main) out.push({ level: veg >= main * 0.7 ? 'ok' : 'aviso', text: `Verduras e legumes em ${veg} de ${main} almoços e jantares registrados.` });
      const pressa = week.filter((m) => Array.isArray(m.data.como) && (m.data.como as string[]).some((x) => x === 'Com pressa' || x === 'Em pé ou no carro')).length;
      if (pressa >= 3) out.push({ level: 'aviso', text: `${pressa} refeições com pressa nesta semana. Comer devagar ajuda a perceber a saciedade.` });
      const emo = week.filter((m) => ['Ansiedade', 'Tédio', 'Tristeza ou cansaço'].includes(str(m.data.motivo))).length;
      if (emo >= 3) out.push({ level: 'aviso', text: `Em ${emo} refeições a vontade veio de uma emoção, não da fome. Antes de comer, tente uma pausa de respiração de 2 minutos e pergunte: é fome?` });
      const passou = week.filter((m) => mealBalance(m) === 'passou').length;
      if (passou >= 3) out.push({ level: 'aviso', text: `${passou} refeições terminaram com a sensação de cheio demais. Sirva porções menores e espere 10 minutos antes de repetir.` });
      const longFome = week.filter((m) => mealBalance(m) === 'muita-fome').length;
      if (longFome >= 3) out.push({ level: 'aviso', text: `${longFome} vezes você chegou com fome extrema. Um lanche planejado no meio da tarde evita exageros à noite.` });
    } else {
      out.push({ level: 'aviso', text: 'Registre as refeições por alguns dias: o painel mostra os seus padrões, sem contar calorias.' });
    }
    const days = Array.from({ length: 7 }, (_, i) => addDays(ctx.today, -i));
    const flvAvg = days.reduce((s, d) => s + counterOn(ctx.entries, 'porcoes', d), 0) / 7;
    if (flvAvg > 0) out.push({ level: flvAvg >= 5 ? 'ok' : 'aviso', text: `Média de ${fmt(flvAvg, 1)} porções de frutas e hortaliças por dia (meta: 5).` });
    const ultraAvg = days.reduce((s, d) => s + counterOn(ctx.entries, 'ultra', d), 0) / 7;
    if (ultraAvg >= 1) out.push({ level: 'aviso', text: `Média de ${fmt(ultraAvg, 1)} ultraprocessados por dia. Troque um deles por fruta ou castanhas amanhã.` });
    return out;
  },
};

// ————————————————————————————————————————————————————————————
// Respira: mente
// ————————————————————————————————————————————————————————————

const GAD_OPTIONS = ['Nenhuma vez', 'Vários dias', 'Mais da metade dos dias', 'Quase todos os dias'];
export const GAD7: Field[] = [
  'Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)',
  'Não ser capaz de impedir ou de controlar as preocupações',
  'Preocupar-se muito com diversas coisas',
  'Dificuldade para relaxar',
  'Ficar tão agitado(a) que se torna difícil permanecer sentado(a)',
  'Ficar facilmente aborrecido(a) ou irritado(a)',
  'Sentir medo como se algo horrível fosse acontecer',
].map((label, i) => ({ id: `q${i + 1}`, type: 'choice' as const, label, options: GAD_OPTIONS }));

export function gad7Score(data: Values): number | null {
  const vals = GAD7.map((f) => (typeof data[f.id] === 'string' ? GAD_OPTIONS.indexOf(data[f.id] as string) : -1));
  if (vals.some((v) => v < 0)) return null;
  return vals.reduce((s, v) => s + v, 0);
}
export function gad7Band(score: number): { label: string; tone: Tile['tone']; advice: string } {
  if (score >= 15) return { label: 'ansiedade grave', tone: 'alerta', advice: 'Procure um psicólogo ou psiquiatra. Este teste não é diagnóstico, mas indica que vale ter ajuda profissional agora.' };
  if (score >= 10) return { label: 'ansiedade moderada', tone: 'alerta', advice: 'A partir de 10 pontos, o recomendado é conversar com um profissional de saúde mental. As práticas da trilha ajudam, mas não substituem o tratamento.' };
  if (score >= 5) return { label: 'ansiedade leve', tone: 'aviso', advice: 'Siga com as práticas diárias e refaça o teste na semana que vem.' };
  return { label: 'ansiedade mínima', tone: 'ok', advice: 'Continue cuidando da rotina: sono, respiração e pausas.' };
}

/** Diário do sono: tempo na cama, tempo dormindo e eficiência (dormindo ÷ na cama). */
export function sleepStats(data: Values) {
  const toMin = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const bed = toMin(str(data.deitou));
  const up = toMin(str(data.levantou));
  if (bed === null || up === null) return null;
  const inBed = (up - bed + 1440) % 1440 || 1440;
  const latency = num(data.latencia) ?? 0;
  const awake = num(data.acordado) ?? 0;
  const asleep = Math.max(0, inBed - latency - awake);
  return { inBed, asleep, efficiency: pct(asleep, inBed) };
}

const respira: Panel = {
  trackId: 'respira',
  title: 'Painel da mente',
  subtitle: 'Ansiedade da semana (GAD-7), sono, preocupações e respiração.',
  metrics: [
    {
      id: 'sono', kind: 'daily', title: 'Diário do sono', icon: 'moon', health: true, unit: '%',
      fields: [
        { id: 'deitou', type: 'time', label: 'Que horas você deitou para dormir', placeholder: '23:00' },
        { id: 'latencia', type: 'number', label: 'Quanto tempo levou para pegar no sono', unit: 'min', min: 0, max: 600 },
        { id: 'despertares', type: 'number', label: 'Quantas vezes acordou durante a noite', min: 0, max: 30 },
        { id: 'acordado', type: 'number', label: 'Tempo acordado no meio da noite, somando tudo', unit: 'min', min: 0, max: 720 },
        { id: 'levantou', type: 'time', label: 'Que horas saiu da cama', placeholder: '07:00' },
        { id: 'qualidade', type: 'scale5', label: 'Qualidade do sono (1 a 5)' },
        { id: 'telas', type: 'yesno', label: 'Usou celular na cama?', tag: 'celular na cama' },
      ],
      about: 'Preencha de manhã, sobre a noite que passou. A eficiência do sono é o tempo dormindo dividido pelo tempo na cama: acima de 85% é o alvo usado na terapia cognitivo-comportamental para insônia.',
      source: 'Diário do sono da TCC-I (Morin; American Academy of Sleep Medicine)',
    },
    {
      id: 'gad7', kind: 'assessment', title: 'Ansiedade da semana (GAD-7)', icon: 'thermometer', health: true, fields: GAD7,
      about: 'Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos problemas abaixo? Faça uma vez por semana para acompanhar a evolução. É uma triagem, não um diagnóstico.',
      source: 'GAD-7 (Spitzer, Kroenke, Williams e Löwe, 2006), versão em português',
    },
    {
      id: 'preocupacao', kind: 'log', title: 'Preocupações', icon: 'cloud',
      fields: [
        { id: 'texto', type: 'text', label: 'O que está te preocupando', placeholder: 'Escreva em uma frase' },
        { id: 'intensidade', type: 'scale10', label: 'Intensidade (0 a 10)' },
        { id: 'controle', type: 'choice', label: 'Isso depende de você?', options: ['Sim, depende de mim', 'Em parte', 'Não depende de mim'] },
        { id: 'passo', type: 'text', label: 'Se depende: qual o próximo passo', optional: true, placeholder: 'Ex.: mandar mensagem para o banco amanhã às 9h' },
      ],
      about: 'Anote a preocupação e guarde para o seu horário da preocupação. Separar o que depende de você do que não depende é o primeiro passo para agir no que dá e soltar o resto.',
      source: 'Técnica de adiamento da preocupação (TCC para ansiedade generalizada)',
    },
    {
      id: 'respiracao', kind: 'counter', title: 'Respiração e pausas', icon: 'wind', unit: 'min', quick: [{ label: '+3 min', delta: 3 }, { label: '+5 min', delta: 5 }, { label: '+10 min', delta: 10 }],
      about: 'Some os minutos de respiração guiada, meditação e pausas conscientes do dia. Os exercícios do botão Socorro entram aqui sozinhos.',
    },
  ],
  tiles(ctx) {
    const tiles: Tile[] = [];
    const g = latest(ofMetric(ctx.entries, 'gad7'));
    if (g?.value != null) {
      const b = gad7Band(g.value);
      const due = g.day <= addDays(ctx.today, -7);
      tiles.push({ metric: 'gad7', label: 'Ansiedade (GAD-7)', value: `${g.value} de 21`, detail: due ? `${b.label} · refaça o teste desta semana` : b.label, tone: b.tone });
    } else tiles.push({ metric: 'gad7', label: 'Ansiedade (GAD-7)', value: '—', detail: 'Faça o teste da semana (2 minutos)', tone: 'aviso' });
    const s = ofMetric(ctx.entries, 'sono').find((e) => e.day === ctx.today);
    const st = s ? sleepStats(s.data) : null;
    tiles.push(st
      ? { metric: 'sono', label: 'Sono desta noite', value: `${Math.floor(st.asleep / 60)}h${String(st.asleep % 60).padStart(2, '0')}`, detail: `eficiência ${st.efficiency}%`, progress: st.efficiency, tone: st.efficiency >= 85 ? 'ok' : 'aviso' }
      : { metric: 'sono', label: 'Sono desta noite', value: '—', detail: 'Preencha o diário do sono' });
    const worries = onDay(ofMetric(ctx.entries, 'preocupacao'), ctx.today);
    tiles.push({ metric: 'preocupacao', label: 'Preocupações hoje', value: String(worries.length), detail: worries.length ? `${worries.filter((w) => str(w.data.controle) === 'Não depende de mim').length} não dependem de você` : 'Anote e deixe para o horário marcado' });
    const br = counterOn(ctx.entries, 'respiracao', ctx.today);
    tiles.push({ metric: 'respiracao', label: 'Respiração hoje', value: `${fmt(br)} min`, detail: 'meta 10 min', progress: pct(br, 10), tone: br >= 10 ? 'ok' : undefined, quick: { label: '+3 min', delta: 3 } });
    return tiles;
  },
  insights(ctx) {
    const out: Insight[] = [];
    const gs = ofMetric(ctx.entries, 'gad7').filter((e) => e.value != null).sort((a, b) => a.day.localeCompare(b.day));
    const last = gs.at(-1);
    if (last) {
      const b = gad7Band(last.value!);
      out.push({ level: b.tone === 'alerta' ? 'alerta' : b.tone === 'aviso' ? 'aviso' : 'ok', text: `GAD-7: ${last.value} pontos (${b.label}). ${b.advice}` });
      if (gs.length >= 2) {
        const first = gs[0].value!;
        const d = last.value! - first;
        if (d <= -5) out.push({ level: 'ok', text: `Seu GAD-7 caiu ${-d} pontos desde o primeiro teste. Queda de 5 ou mais é uma melhora importante.` });
        else if (d >= 5) out.push({ level: 'alerta', text: `Seu GAD-7 subiu ${d} pontos desde o primeiro teste. Converse com um profissional.` });
      }
      if (last.day <= addDays(ctx.today, -7)) out.push({ level: 'aviso', text: 'Já faz uma semana do último GAD-7. Refaça para ver a evolução.' });
    } else out.push({ level: 'aviso', text: 'Faça o GAD-7 desta semana: são 7 perguntas e ele mostra a evolução da sua ansiedade.' });
    const sleeps = inLastDays(ofMetric(ctx.entries, 'sono'), ctx.today, 7).map((e) => sleepStats(e.data)).filter((x): x is NonNullable<typeof x> => x !== null);
    if (sleeps.length >= 3) {
      const eff = Math.round(sleeps.reduce((s, x) => s + x.efficiency, 0) / sleeps.length);
      const hours = sleeps.reduce((s, x) => s + x.asleep, 0) / sleeps.length / 60;
      out.push({ level: eff >= 85 ? 'ok' : 'aviso', text: `Eficiência média do sono: ${eff}% (alvo: 85%). Você dormiu ${fmt(hours, 1)} h por noite.` });
      if (eff < 85) out.push({ level: 'aviso', text: 'Se não dormir em 20 minutos, levante, faça algo calmo com pouca luz e volte quando o sono vier. Cama é só para dormir.' });
      if (hours < 7) out.push({ level: 'aviso', text: 'Menos de 7 horas por noite em média. Adultos precisam de 7 a 9 horas.' });
    }
    const worries = inLastDays(ofMetric(ctx.entries, 'preocupacao'), ctx.today, 7);
    if (worries.length >= 3) {
      const out_ = worries.filter((w) => str(w.data.controle) === 'Não depende de mim').length;
      out.push({ level: 'ok', text: `${worries.length} preocupações anotadas na semana; ${out_} não dependem de você. Para essas, a prática é observar e soltar.` });
    }
    return out;
  },
};

// ————————————————————————————————————————————————————————————
// Ritmo: tempo
// ————————————————————————————————————————————————————————————

export const CATEGORIAS_TEMPO = ['Trabalho focado', 'Reuniões', 'E-mail e mensagens', 'Tarefas operacionais', 'Pausas', 'Redes e distrações', 'Deslocamento'];
const REVISAO: Field[] = [
  'Esvaziei as caixas de entrada (e-mail, mensagens, anotações)',
  'Revisei a agenda da semana que passou e da próxima',
  'Atualizei a lista de próximas ações',
  'Revisei os projetos em andamento',
  'Escolhi as 3 prioridades da semana',
  'Bloqueei horários de foco na agenda',
  'Olhei a lista de "algum dia" e tirei o que não faz mais sentido',
].map((label, i) => ({ id: `r${i + 1}`, type: 'yesno' as const, label }));
export function reviewScore(data: Values): number {
  return pct(REVISAO.filter((f) => data[f.id] === true).length, REVISAO.length);
}

const ritmo: Panel = {
  trackId: 'ritmo',
  title: 'Painel do tempo',
  subtitle: 'Minutos de foco, interrupções, para onde foi o seu tempo e a revisão da semana.',
  metrics: [
    {
      id: 'foco', kind: 'counter', title: 'Minutos de foco', icon: 'target', unit: 'min', quick: [{ label: '+25 min', delta: 25 }, { label: '+45 min', delta: 45 }, { label: '+90 min', delta: 90 }],
      about: 'Trabalho focado é tempo sem notificações, numa tarefa só. Os blocos do Bloco de foco do app entram aqui sozinhos. Alvo: 2 a 4 horas por dia de trabalho focado.',
      source: 'Cal Newport, Trabalho focado (Deep Work)',
    },
    {
      id: 'interrupcoes', kind: 'counter', title: 'Interrupções', icon: 'bell-off', quick: [{ label: '+1 interrupção', delta: 1 }], lowerIsBetter: true,
      about: 'Toque a cada vez que algo te tirar do foco (mensagem, alguém chamando, vontade de abrir as redes). Só de contar, você percebe os padrões e consegue proteger o seu tempo.',
    },
    {
      id: 'tempo', kind: 'log', title: 'Para onde foi o tempo', icon: 'pie-chart', valueField: 'minutos', unit: 'min',
      fields: [
        { id: 'categoria', type: 'choice', label: 'Categoria', options: CATEGORIAS_TEMPO },
        { id: 'minutos', type: 'number', label: 'Quanto tempo', unit: 'min', min: 1, max: 960 },
        { id: 'nota', type: 'text', label: 'O que foi (opcional)', optional: true },
      ],
      about: 'Faça a auditoria do tempo por alguns dias: registre os blocos do dia por categoria. A maioria das pessoas descobre que reuniões e mensagens tomam mais da metade do dia.',
      source: 'Auditoria do tempo (Peter Drucker, O Gestor Eficaz)',
    },
    {
      id: 'revisao', kind: 'assessment', title: 'Revisão da semana', icon: 'check-square',
      fields: [...REVISAO, { id: 'prioridades', type: 'list', label: 'As 3 prioridades da próxima semana', max: 3, placeholder: 'Verbo + resultado' }],
      about: 'Uma vez por semana (sexta à tarde ou domingo à noite), 30 minutos para colocar tudo em dia e escolher o que importa. É o hábito que mantém o sistema de pé.',
      source: 'Revisão semanal do método GTD (David Allen)',
    },
  ],
  tiles(ctx) {
    const foco = counterOn(ctx.entries, 'foco', ctx.today);
    const inter = counterOn(ctx.entries, 'interrupcoes', ctx.today);
    const week = inLastDays(ofMetric(ctx.entries, 'tempo'), ctx.today, 7);
    const total = week.reduce((s, e) => s + (num(e.data.minutos) ?? 0), 0);
    const deep = week.filter((e) => str(e.data.categoria) === 'Trabalho focado').reduce((s, e) => s + (num(e.data.minutos) ?? 0), 0);
    const rev = latest(ofMetric(ctx.entries, 'revisao'));
    const revDue = !rev || rev.day < weekStart(ctx.today);
    return [
      { metric: 'foco', label: 'Foco hoje', value: `${fmt(foco / 60, 1)} h`, detail: 'alvo: 2 a 4 h', progress: pct(foco, 120), tone: foco >= 120 ? 'ok' : undefined, quick: { label: '+25 min', delta: 25 } },
      { metric: 'interrupcoes', label: 'Interrupções hoje', value: fmt(inter), detail: inter === 0 ? 'nenhuma até agora' : 'toque a cada uma', tone: inter >= 10 ? 'aviso' : undefined, quick: { label: '+1', delta: 1 } },
      { metric: 'tempo', label: 'Foco na semana', value: total ? `${pct(deep, total)}%` : '—', detail: total ? `${fmt(deep / 60, 1)} h de ${fmt(total / 60, 1)} h registradas` : 'Registre os blocos do dia' },
      { metric: 'revisao', label: 'Revisão da semana', value: rev && !revDue ? `${rev.value ?? 0}%` : 'Pendente', detail: rev && !revDue ? 'feita nesta semana' : 'Faça até domingo', tone: rev && !revDue ? 'ok' : 'aviso' },
    ];
  },
  insights(ctx) {
    const out: Insight[] = [];
    const days = Array.from({ length: 7 }, (_, i) => addDays(ctx.today, -i));
    const focoAvg = days.reduce((s, d) => s + counterOn(ctx.entries, 'foco', d), 0) / 7;
    if (focoAvg > 0) out.push({ level: focoAvg >= 120 ? 'ok' : 'aviso', text: `Média de ${fmt(focoAvg / 60, 1)} h de foco por dia nos últimos 7 dias.` });
    const interAvg = days.reduce((s, d) => s + counterOn(ctx.entries, 'interrupcoes', d), 0) / 7;
    if (interAvg >= 6) out.push({ level: 'aviso', text: `Média de ${fmt(interAvg, 1)} interrupções por dia. Silencie as notificações nos blocos de foco e combine horários para responder mensagens.` });
    const week = inLastDays(ofMetric(ctx.entries, 'tempo'), ctx.today, 7);
    const total = week.reduce((s, e) => s + (num(e.data.minutos) ?? 0), 0);
    if (total >= 240) {
      const by = (c: string) => week.filter((e) => str(e.data.categoria) === c).reduce((s, e) => s + (num(e.data.minutos) ?? 0), 0);
      const reun = pct(by('Reuniões'), total);
      const msg = pct(by('E-mail e mensagens'), total);
      const dist = pct(by('Redes e distrações'), total);
      if (reun + msg >= 50) out.push({ level: 'aviso', text: `Reuniões e mensagens somam ${reun + msg}% do seu tempo registrado. Agrupe as mensagens em 2 ou 3 horários e recuse reuniões sem pauta.` });
      if (dist >= 15) out.push({ level: 'aviso', text: `${dist}% do tempo foi para redes e distrações.` });
      const deep = pct(by('Trabalho focado'), total);
      out.push({ level: deep >= 30 ? 'ok' : 'aviso', text: `${deep}% do tempo registrado foi trabalho focado.` });
    }
    const rev = latest(ofMetric(ctx.entries, 'revisao'));
    if (!rev || rev.day < weekStart(ctx.today)) out.push({ level: 'aviso', text: 'A revisão desta semana ainda não foi feita.' });
    else if (Array.isArray(rev.data.prioridades) && (rev.data.prioridades as string[]).filter(Boolean).length) {
      out.push({ level: 'ok', text: `Prioridades da semana: ${(rev.data.prioridades as string[]).filter(Boolean).join(' · ')}` });
    }
    return out;
  },
};

// ————————————————————————————————————————————————————————————
// Prospera: finanças
// ————————————————————————————————————————————————————————————

export const CATEGORIAS_GASTO: { label: string; grupo: 'essencial' | 'desejo' | 'futuro' }[] = [
  { label: 'Moradia', grupo: 'essencial' },
  { label: 'Mercado', grupo: 'essencial' },
  { label: 'Contas da casa', grupo: 'essencial' },
  { label: 'Transporte', grupo: 'essencial' },
  { label: 'Saúde', grupo: 'essencial' },
  { label: 'Educação', grupo: 'essencial' },
  { label: 'Restaurante e delivery', grupo: 'desejo' },
  { label: 'Lazer', grupo: 'desejo' },
  { label: 'Compras', grupo: 'desejo' },
  { label: 'Assinaturas', grupo: 'desejo' },
  { label: 'Outros', grupo: 'desejo' },
  { label: 'Pagamento de dívida', grupo: 'futuro' },
  { label: 'Reserva e investimento', grupo: 'futuro' },
];
const GRUPO = Object.fromEntries(CATEGORIAS_GASTO.map((c) => [c.label, c.grupo]));

function financasOf(entries: Entry[]) {
  const f = latest(ofMetric(entries, 'financas'))?.data ?? {};
  return { renda: num(f.renda), essencial: num(f.essencial), meses: num(String(f.meses ?? '').replace(/\D/g, '')) ?? 6 };
}

/** Gastos e entradas do mês, separados pela regra 50-30-20 (essenciais, desejos e futuro). */
export function monthBudget(entries: Entry[], today: string) {
  const from = monthStart(today);
  const month = ofMetric(entries, 'gasto').filter((e) => e.day >= from && e.day <= today);
  const out = { essencial: 0, desejo: 0, futuro: 0, entradas: 0, saidas: 0, credito: 0 };
  for (const e of month) {
    const v = num(e.data.valor) ?? e.value ?? 0;
    if (str(e.data.tipo) === 'Entrada') {
      out.entradas += v;
      continue;
    }
    out.saidas += v;
    out[GRUPO[str(e.data.categoria)] ?? 'desejo'] += v;
    if (str(e.data.pagamento) === 'Cartão de crédito') out.credito += v;
  }
  return out;
}

export interface Debt { id: string; nome: string; saldo: number; juros: number; parcela: number }
export function debtsOf(entries: Entry[]): Debt[] {
  return ofMetric(entries, 'divida')
    .map((e) => ({ id: e.id, nome: str(e.data.nome) || 'Dívida', saldo: num(e.data.saldo) ?? 0, juros: num(e.data.juros) ?? 0, parcela: num(e.data.parcela) ?? 0 }))
    .filter((d) => d.saldo > 0);
}
/** Avalanche: maior juro primeiro (economiza mais). Bola de neve: menor saldo primeiro (vitórias rápidas). */
export function debtOrder(debts: Debt[], method: 'avalanche' | 'bola-de-neve'): Debt[] {
  return [...debts].sort((a, b) => (method === 'avalanche' ? b.juros - a.juros || a.saldo - b.saldo : a.saldo - b.saldo || b.juros - a.juros));
}

const prospera: Panel = {
  trackId: 'prospera',
  title: 'Painel do dinheiro',
  subtitle: 'Gastos do mês na regra 50-30-20, quanto ainda dá para gastar, dívidas e reserva.',
  metrics: [
    {
      id: 'gasto', kind: 'log', title: 'Lançamentos', icon: 'credit-card', valueField: 'valor', unit: 'R$',
      fields: [
        { id: 'tipo', type: 'choice', label: 'Tipo', options: ['Saída', 'Entrada'] },
        { id: 'valor', type: 'number', label: 'Valor', unit: 'R$', min: 0, max: 10000000 },
        { id: 'categoria', type: 'choice', label: 'Categoria', options: CATEGORIAS_GASTO.map((c) => c.label) },
        { id: 'descricao', type: 'text', label: 'Descrição (opcional)', optional: true, placeholder: 'Ex.: mercado do mês' },
        { id: 'pagamento', type: 'choice', label: 'Como pagou', options: ['Pix ou débito', 'Cartão de crédito', 'Dinheiro', 'Boleto'] },
        { id: 'impulso', type: 'yesno', label: 'Foi por impulso?', optional: true, tag: 'por impulso' },
      ],
      about: 'Anote tudo, até o cafezinho: é o hábito que mais muda a vida financeira. A regra 50-30-20 sugere até 50% da renda para o essencial, até 30% para desejos e pelo menos 20% para o futuro (pagar dívidas, reserva e investimentos).',
      source: 'Regra 50-30-20 (Elizabeth Warren, All Your Worth)',
    },
    {
      id: 'divida', kind: 'item', title: 'Dívidas', icon: 'alert-triangle', valueField: 'saldo', unit: 'R$',
      fields: [
        { id: 'nome', type: 'text', label: 'Nome', placeholder: 'Ex.: cartão Nubank, empréstimo' },
        { id: 'saldo', type: 'number', label: 'Quanto falta pagar', unit: 'R$', min: 0, max: 100000000 },
        { id: 'juros', type: 'number', label: 'Juros por mês', unit: '%', min: 0, max: 30, hint: 'Está na fatura ou no contrato (CET mensal). Rotativo do cartão e cheque especial passam de 8% ao mês.' },
        { id: 'parcela', type: 'number', label: 'Parcela mínima', unit: 'R$', min: 0, max: 10000000, optional: true },
      ],
      about: 'Liste todas as dívidas. Pelo método avalanche, você paga o mínimo em todas e coloca o que sobrar na de maior juro. Pela bola de neve, na de menor saldo, para ganhar ânimo com vitórias rápidas. Rotativo do cartão e cheque especial vêm sempre primeiro.',
      source: 'Métodos avalanche e bola de neve; juros do rotativo: Banco Central do Brasil',
    },
    {
      id: 'reserva', kind: 'daily', title: 'Reserva de emergência', icon: 'shield', unit: 'R$', valueField: 'saldo',
      fields: [{ id: 'saldo', type: 'number', label: 'Quanto você tem guardado hoje na reserva', unit: 'R$', min: 0, max: 100000000 }],
      about: 'A reserva cobre imprevistos (demissão, saúde, conserto) sem virar dívida. A meta usual é de 6 meses do custo essencial (3 para quem tem renda estável, 12 para autônomos). Deixe em aplicação com liquidez diária e baixo risco, como Tesouro Selic ou CDB de liquidez diária.',
      source: 'Educação financeira: Banco Central do Brasil (Cidadania Financeira)',
    },
    {
      id: 'financas', kind: 'profile', title: 'Minha renda', icon: 'briefcase',
      fields: [
        { id: 'renda', type: 'number', label: 'Renda líquida do mês', unit: 'R$', min: 0, max: 100000000, hint: 'O que cai na conta, depois dos descontos.' },
        { id: 'essencial', type: 'number', label: 'Custo essencial do mês', unit: 'R$', min: 0, max: 100000000, hint: 'Moradia, mercado, contas, transporte, saúde e educação.' },
        { id: 'meses', type: 'choice', label: 'Meta da reserva', options: ['3 meses', '6 meses', '12 meses'] },
      ],
      about: 'Com a renda e o custo essencial, o painel calcula a regra 50-30-20, quanto dá para gastar por dia e a meta da reserva.',
    },
  ],
  tiles(ctx) {
    const f = financasOf(ctx.entries);
    const b = monthBudget(ctx.entries, ctx.today);
    const renda = f.renda ?? (b.entradas || null);
    const left = renda !== null ? renda - b.saidas : null;
    const perDay = left !== null ? left / daysLeftInMonth(ctx.today) : null;
    const debts = debtsOf(ctx.entries);
    const total = debts.reduce((s, d) => s + d.saldo, 0);
    const first = debtOrder(debts, 'avalanche')[0];
    const res = latest(ofMetric(ctx.entries, 'reserva'));
    const goal = f.essencial ? f.essencial * f.meses : null;
    return [
      { metric: 'gasto', label: 'Gastos do mês', value: money(b.saidas), detail: renda ? `${pct(b.saidas, renda)}% da renda` : 'Informe a renda em Minha renda', progress: renda ? pct(b.saidas, renda) : null, tone: renda && b.saidas > renda ? 'alerta' : renda && b.saidas > renda * 0.9 ? 'aviso' : undefined },
      { metric: 'gasto', label: 'Pode gastar por dia', value: perDay !== null ? money(Math.max(0, perDay)) : '—', detail: left !== null ? `até o fim do mês (${money(Math.max(0, left))} livres)` : 'Informe a renda', tone: perDay !== null && perDay <= 0 ? 'alerta' : undefined },
      { metric: 'divida', label: 'Dívidas', value: debts.length ? money(total) : 'Nenhuma', detail: first ? `Ataque primeiro: ${first.nome} (${fmt(first.juros, 1)}% a.m.)` : 'Cadastre se tiver', tone: debts.some((d) => d.juros >= 8) ? 'alerta' : debts.length ? 'aviso' : 'ok' },
      { metric: 'reserva', label: 'Reserva', value: res?.value != null ? money(res.value) : '—', detail: goal ? `${pct(res?.value ?? 0, goal)}% da meta de ${money(goal)}` : 'Informe o custo essencial', progress: goal ? pct(res?.value ?? 0, goal) : null, tone: goal && (res?.value ?? 0) >= goal ? 'ok' : undefined },
    ];
  },
  insights(ctx) {
    const out: Insight[] = [];
    const f = financasOf(ctx.entries);
    const b = monthBudget(ctx.entries, ctx.today);
    const renda = f.renda ?? (b.entradas || null);
    if (!f.renda) out.push({ level: 'aviso', text: 'Informe a renda e o custo essencial em Minha renda para ver a regra 50-30-20.' });
    if (renda) {
      const e = pct(b.essencial, renda);
      const d = pct(b.desejo, renda);
      const fu = pct(b.futuro, renda);
      out.push({ level: e <= 50 && d <= 30 ? 'ok' : 'aviso', text: `Neste mês: ${e}% em essenciais (até 50%), ${d}% em desejos (até 30%) e ${fu}% no futuro (pelo menos 20%).` });
      if (b.saidas > renda) out.push({ level: 'alerta', text: `Você já gastou ${money(b.saidas - renda)} a mais do que a renda do mês. Pare os gastos não essenciais até o próximo pagamento.` });
      if (b.credito > renda * 0.3) out.push({ level: 'aviso', text: `${money(b.credito)} no cartão de crédito neste mês (${pct(b.credito, renda)}% da renda). Cuidado com a fatura do mês que vem.` });
    }
    const imp = ofMetric(ctx.entries, 'gasto').filter((e) => e.day >= monthStart(ctx.today) && e.data.impulso === true);
    if (imp.length) out.push({ level: 'aviso', text: `${imp.length} ${imp.length === 1 ? 'compra' : 'compras'} por impulso no mês, somando ${money(imp.reduce((s, e) => s + (num(e.data.valor) ?? 0), 0))}. Antes da próxima, espere 24 horas.` });
    const debts = debtsOf(ctx.entries);
    const caras = debts.filter((d) => d.juros >= 8);
    if (caras.length) out.push({ level: 'alerta', text: `${caras.map((d) => d.nome).join(', ')}: juro de rotativo ou cheque especial. Troque por um empréstimo mais barato (consignado ou pessoal com CET menor) e quite primeiro.` });
    if (debts.length >= 2) {
      const av = debtOrder(debts, 'avalanche').map((d) => d.nome).join(' → ');
      const bn = debtOrder(debts, 'bola-de-neve').map((d) => d.nome).join(' → ');
      out.push({ level: 'ok', text: `Ordem avalanche (economiza mais): ${av}. Bola de neve (vitórias rápidas): ${bn}.` });
    }
    const res = latest(ofMetric(ctx.entries, 'reserva'));
    if (f.essencial && res?.value != null) {
      const months = res.value / f.essencial;
      out.push({ level: months >= f.meses ? 'ok' : 'aviso', text: `A sua reserva cobre ${fmt(months, 1)} ${months < 2 ? 'mês' : 'meses'} do custo essencial (meta: ${f.meses}).` });
      if (debts.some((d) => d.juros >= 3) && months >= 1) out.push({ level: 'aviso', text: 'Com dívidas acima de 3% ao mês, vale manter só um mês de reserva e usar o resto para quitar: nenhum investimento seguro rende isso.' });
    }
    return out;
  },
};

// ————————————————————————————————————————————————————————————
// Eleva: carreira
// ————————————————————————————————————————————————————————————

export const HABILIDADES = ['Comunicação', 'Negociação', 'Liderança', 'Sucesso do cliente', 'Vendas', 'Organização', 'Visão de negócio', 'Ferramentas e dados'];
const HAB_FIELDS: Field[] = HABILIDADES.map((h, i) => ({ id: `h${i + 1}`, type: 'scale5' as const, label: h }));
export function skillsAverage(data: Values): number | null {
  const v = HAB_FIELDS.map((f) => num(data[f.id])).filter((x): x is number => x !== null);
  return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 : null;
}

const eleva: Panel = {
  trackId: 'eleva',
  title: 'Painel da carreira',
  subtitle: 'Diário de conquistas, metas do trimestre, contatos, estudo, feedbacks e habilidades.',
  metrics: [
    {
      id: 'conquista', kind: 'log', title: 'Diário de conquistas', icon: 'award',
      fields: [
        { id: 'oque', type: 'text', label: 'O que você fez', placeholder: 'Ex.: recuperei um cliente que ia cancelar' },
        { id: 'resultado', type: 'text', label: 'Qual foi o resultado (com número, se der)', placeholder: 'Ex.: contrato de R$ 40 mil renovado' },
        { id: 'tipo', type: 'choice', label: 'Tipo', options: ['Entrega', 'Cliente', 'Liderança', 'Aprendizado', 'Reconhecimento'] },
      ],
      about: 'Anote as suas vitórias toda semana. Na hora da avaliação, da promoção ou de atualizar o currículo, você terá fatos e números, não "acho que fui bem".',
      source: 'Brag document (Julia Evans)',
    },
    {
      id: 'meta', kind: 'item', title: 'Metas do trimestre', icon: 'flag', valueField: 'progresso', unit: '%',
      fields: [
        { id: 'objetivo', type: 'text', label: 'Objetivo', placeholder: 'Ex.: ser promovido a coordenador' },
        { id: 'resultados', type: 'list', label: 'Resultados-chave (como saber que chegou lá)', max: 3, placeholder: 'Ex.: liderar 1 projeto com o time' },
        { id: 'prazo', type: 'choice', label: 'Prazo', options: ['Este mês', 'Este trimestre', 'Este semestre', 'Este ano'] },
        { id: 'progresso', type: 'number', label: 'Progresso', unit: '%', min: 0, max: 100 },
      ],
      about: 'No máximo 3 metas por vez, cada uma com até 3 resultados-chave que dá para medir. Atualize o progresso toda semana.',
      source: 'OKR (John Doerr, Avalie o que importa)',
    },
    {
      id: 'contatos', kind: 'counter', title: 'Contatos e conversas', icon: 'users', quick: [{ label: '+1 conversa', delta: 1 }],
      about: 'Uma conversa por dia útil com alguém da sua rede: cliente, líder, colega de outra área, alguém do mercado. Oportunidades chegam por pessoas.',
    },
    {
      id: 'estudo', kind: 'counter', title: 'Estudo', icon: 'book-open', unit: 'min', quick: [{ label: '+15 min', delta: 15 }, { label: '+30 min', delta: 30 }, { label: '+60 min', delta: 60 }],
      about: 'Meta: 150 minutos por semana (30 por dia útil) de estudo intencional na habilidade que você está desenvolvendo.',
    },
    {
      id: 'feedback', kind: 'log', title: 'Feedbacks', icon: 'message-square',
      fields: [
        { id: 'quem', type: 'text', label: 'De quem', placeholder: 'Ex.: minha líder' },
        { id: 'ouvi', type: 'text', label: 'O que você ouviu' },
        { id: 'acao', type: 'text', label: 'O que vai fazer com isso', optional: true },
      ],
      about: 'Peça feedback com perguntas específicas ("o que eu poderia ter feito melhor na apresentação?") e anote o que vai mudar.',
    },
    {
      id: 'habilidades', kind: 'assessment', title: 'Minhas habilidades', icon: 'bar-chart', fields: HAB_FIELDS,
      about: 'Dê uma nota de 1 a 5 para cada habilidade, uma vez por mês. Escolha uma para desenvolver no seu plano (PDI) e veja a evolução.',
      source: 'Plano de Desenvolvimento Individual (PDI)',
    },
  ],
  tiles(ctx) {
    const ws = weekStart(ctx.today);
    const weekSum = (m: string) => ofMetric(ctx.entries, m).filter((e) => e.day >= ws && e.day <= ctx.today).reduce((s, e) => s + (e.value ?? 0), 0);
    const contatos = weekSum('contatos');
    const estudo = weekSum('estudo');
    const metas = ofMetric(ctx.entries, 'meta');
    const avg = metas.length ? Math.round(metas.reduce((s, m) => s + (num(m.data.progresso) ?? 0), 0) / metas.length) : null;
    const month = ofMetric(ctx.entries, 'conquista').filter((e) => e.day >= monthStart(ctx.today));
    return [
      { metric: 'conquista', label: 'Conquistas do mês', value: String(month.length), detail: month.length ? str(latest(month)?.data.oque) : 'Anote a primeira vitória' },
      { metric: 'meta', label: 'Metas', value: avg !== null ? `${avg}%` : '—', detail: metas.length ? `${metas.length} ${metas.length === 1 ? 'meta' : 'metas'} em andamento` : 'Defina até 3 metas', progress: avg },
      { metric: 'contatos', label: 'Contatos na semana', value: `${fmt(contatos)} de 5`, progress: pct(contatos, 5), tone: contatos >= 5 ? 'ok' : undefined, quick: { label: '+1', delta: 1 } },
      { metric: 'estudo', label: 'Estudo na semana', value: `${fmt(estudo)} min`, detail: 'meta 150 min', progress: pct(estudo, 150), tone: estudo >= 150 ? 'ok' : undefined, quick: { label: '+15 min', delta: 15 } },
    ];
  },
  insights(ctx) {
    const out: Insight[] = [];
    const metas = ofMetric(ctx.entries, 'meta');
    if (!metas.length) out.push({ level: 'aviso', text: 'Defina de 1 a 3 metas para o trimestre. Sem meta, a carreira anda no piloto automático.' });
    if (metas.length > 3) out.push({ level: 'aviso', text: `${metas.length} metas ao mesmo tempo. Foque em até 3.` });
    const parada = metas.filter((m) => m.day <= addDays(ctx.today, -21) && (num(m.data.progresso) ?? 0) < 25);
    if (parada.length) out.push({ level: 'aviso', text: `${parada.map((m) => str(m.data.objetivo)).join(', ')}: menos de 25% depois de 3 semanas. Qual é o menor próximo passo?` });
    const month = ofMetric(ctx.entries, 'conquista').filter((e) => e.day >= addDays(ctx.today, -30));
    if (month.length >= 4) out.push({ level: 'ok', text: `${month.length} conquistas nos últimos 30 dias. Use essa lista na sua próxima conversa de carreira.` });
    else out.push({ level: 'aviso', text: 'Anote pelo menos uma conquista por semana, mesmo pequena.' });
    const sk = ofMetric(ctx.entries, 'habilidades').sort((a, b) => a.day.localeCompare(b.day));
    if (sk.length) {
      const last = sk.at(-1)!.data;
      const ranked = HAB_FIELDS.map((f, i) => ({ h: HABILIDADES[i], v: num(last[f.id]) ?? 0 })).sort((a, b) => a.v - b.v);
      out.push({ level: 'ok', text: `Habilidade para desenvolver: ${ranked[0].h} (nota ${ranked[0].v}). Ponto forte: ${ranked.at(-1)!.h} (nota ${ranked.at(-1)!.v}).` });
      if (sk.length >= 2) {
        const d = (skillsAverage(last) ?? 0) - (skillsAverage(sk[0].data) ?? 0);
        if (d > 0) out.push({ level: 'ok', text: `A média das suas habilidades subiu ${fmt(d, 1)} ponto desde a primeira avaliação.` });
      }
    } else out.push({ level: 'aviso', text: 'Faça a autoavaliação de habilidades para montar o seu PDI.' });
    const fb = ofMetric(ctx.entries, 'feedback').filter((e) => e.day >= addDays(ctx.today, -30));
    if (!fb.length) out.push({ level: 'aviso', text: 'Nenhum feedback anotado em 30 dias. Peça um esta semana.' });
    return out;
  },
};

/** Perfis e itens valem até serem editados: o app os carrega de qualquer data. */
export const PERSISTENT_METRICS = ['corpo', 'financas', 'divida', 'meta'];

export const PANELS: Record<string, Panel> = { move, nutre, respira, ritmo, prospera, eleva };

export function panelFor(trackId: string): Panel | undefined {
  return PANELS[trackId];
}

/** Trilhas de onde o painel lê registros (o Nutre lê a água do Move). */
export function panelStores(trackId: string): string[] {
  const p = PANELS[trackId];
  if (!p) return [];
  return [...new Set([trackId, ...p.metrics.map((m) => m.store ?? trackId)])];
}

export function metricOf(trackId: string, metric: string): MetricDef | undefined {
  return PANELS[trackId]?.metrics.find((m) => m.id === metric);
}

/** Valor principal de um registro (para salvar em `value`). */
export function valueFor(def: MetricDef, data: Values): number | null {
  if (def.id === 'gad7') return gad7Score(data);
  if (def.id === 'sono') return sleepStats(data)?.efficiency ?? null;
  if (def.id === 'revisao') return reviewScore(data);
  if (def.id === 'habilidades') return skillsAverage(data);
  if (def.valueField) return num(data[def.valueField]);
  return null;
}

/** Campos obrigatórios preenchidos? */
export function missingFields(def: MetricDef, data: Values): string[] {
  return (def.fields ?? [])
    .filter((f) => !f.optional && f.type !== 'checklist')
    .filter((f) => {
      const v = data[f.id];
      if (f.type === 'list' || f.type === 'multi') return !Array.isArray(v) || !(v as unknown[]).length;
      return v === undefined || v === null || v === '';
    })
    .map((f) => f.label);
}

/** Uma linha que resume o registro, na ordem dos campos (ex.: "Musculação · 50 min · Moderada"). */
export function describeEntry(def: MetricDef, e: Entry): string {
  const parts: string[] = [];
  for (const f of def.fields ?? []) {
    const v = e.data[f.id];
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      const list = (v as unknown[]).map(String).filter((x) => x.trim());
      if (list.length) parts.push(list.join(', '));
    } else if (typeof v === 'boolean') {
      if (v && f.tag) parts.push(f.tag);
    } else if (typeof v === 'number') {
      if (f.unit === 'R$') parts.push(money(v));
      else if (f.type === 'scale10' || f.type === 'scale5') parts.push(`${f.label.split(' (')[0].toLowerCase()} ${v}`);
      else parts.push(`${fmt(v, Number.isInteger(v) ? 0 : 1)}${f.unit ? ` ${f.unit}` : ''}`);
    } else {
      parts.push(String(v));
    }
  }
  if (def.id === 'treino' && Array.isArray(e.data.exercicios)) {
    const vol = trainingVolume(e.data.exercicios as string[]);
    if (vol > 0) parts.push(`volume ${fmt(vol)} kg`);
  }
  if (def.id === 'sono') {
    const s = sleepStats(e.data);
    if (s) return `${Math.floor(s.asleep / 60)}h${String(s.asleep % 60).padStart(2, '0')} dormindo · eficiência ${s.efficiency}%`;
  }
  if (def.kind === 'assessment' && e.value != null) {
    if (def.id === 'gad7') return `${e.value} pontos · ${gad7Band(e.value).label}`;
    if (def.id === 'revisao') return `${e.value}% da revisão feita`;
    if (def.id === 'habilidades') return `média ${fmt(e.value, 1)} de 5`;
  }
  return parts.join(' · ');
}

/** Meta diária do contador, quando existe (a água depende do peso; os passos, da meta do aluno). */
export function counterGoal(trackId: string, metric: string, entries: Entry[], today: string): number | null {
  switch (metric) {
    case 'agua': return waterGoalMl(weightTrend(ofMetric(entries, 'peso'), today)?.current ?? null);
    case 'passos': return corpoOf(entries).metaPassos;
    case 'porcoes': return 5;
    case 'respiracao': return 10;
    case 'foco': return 120;
    case 'contatos': return 1;
    case 'estudo': return 30;
    default: return null;
  }
}
