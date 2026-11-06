/**
 * Validação das mensagens que valem pontos ("mensagem de ajuda", 3 pontos, e
 * "conselho/dica", 4 pontos). Regras simples e explicáveis, usadas no app de
 * demonstração e na função validate-contributions. Quando a chave da IA está
 * configurada, a função também pede a opinião do Claude (ver index.ts).
 *
 * Sem dependências: roda no app (Metro), no Node (testes) e no Deno.
 */

export type ContributionKind = 'ajuda' | 'conselho';

export interface Verdict {
  ok: boolean;
  /** Motivo mostrado no extrato de pontos. */
  reason: string;
  /** Conteúdo que pede atenção da equipe (risco, ofensa, contato fora do app). */
  flag?: 'risco' | 'ofensa' | 'contato';
}

const MIN: Record<ContributionKind, number> = { ajuda: 40, conselho: 80 };

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Sinais de risco: a equipe precisa olhar (e a pessoa vê o CVV 188). */
const RISK = ['me matar', 'suicid', 'tirar minha vida', 'nao quero mais viver', 'me cortar', 'me machucar', 'acabar com tudo', 'sumir pra sempre', 'sumir para sempre'];
const OFFENSE = ['idiota', 'burro', 'burra', 'otario', 'otaria', 'imbecil', 'vagabund', 'lixo de pessoa', 'cala a boca', 'retardad'];
/** Pedir ou passar contato fora do app quebra o combinado da comunidade. */
const CONTACT = [/\b\d{2}\s?9?\d{4}[-\s]?\d{4}\b/, /wa\.me|whatsapp|zap\b|telegram|instagram\.com|@[a-z0-9_.]{3,}/, /https?:\/\//];

/** Palavras que indicam acolhimento, incentivo ou orientação prática. */
const SUPPORT = [
  'contigo', 'com voce', 'estou aqui', 'estamos', 'forca', 'consegue', 'orgulho', 'parabens', 'calma', 'respira',
  'tenta', 'tente', 'experimente', 'experimenta', 'comigo', 'me ajudou', 'funcionou', 'passa', 'um dia de cada vez', 'abraco',
  'nao esta sozinh', 'normal', 'acontece', 'cuide', 'cuida', 'conte', 'conta comigo', 'vai dar certo', 'devagar',
];
const ADVICE = [
  'dica', 'tente', 'experimente', 'comece', 'faca', 'use', 'evite', 'anote', 'separe', 'reserve', 'defina', 'escolha', 'troque',
  'pare', 'planeje', 'guarde', 'beba', 'caminhe', 'respire', 'passo', 'primeiro', 'segundo', 'regra', 'metodo', 'tecnica', 'funciona',
];
const LOW_EFFORT = /^(k+|rs+|ha(ha)+|top|show|boa|concordo|verdade|isso|amei|lindo|demais|sim|nao|ok|blz|valeu|obrigad[oa])[\s!.]*$/;

function signals(text: string, words: string[]) {
  return words.filter((w) => text.includes(w)).length;
}

/** Regras: tamanho, esforço, tom e segurança. */
export function judgeContribution(kind: ContributionKind, body: string, previous: string[] = []): Verdict {
  const raw = body.trim();
  const t = normalize(raw);
  if (RISK.some((w) => t.includes(w))) {
    return { ok: false, reason: 'Mensagem com sinal de risco enviada para a equipe Vivah cuidar.', flag: 'risco' };
  }
  if (OFFENSE.some((w) => t.includes(w))) return { ok: false, reason: 'Mensagem com ofensa não pontua.', flag: 'ofensa' };
  if (CONTACT.some((r) => r.test(t))) return { ok: false, reason: 'Contato ou link fora do app não é permitido.', flag: 'contato' };

  const letters = raw.replace(/[^\p{L}]/gu, '');
  if (raw.length < MIN[kind] || letters.length < MIN[kind] * 0.6) {
    return { ok: false, reason: `Curta demais para contar como ${kind === 'ajuda' ? 'ajuda' : 'conselho'} (mínimo de ${MIN[kind]} caracteres).` };
  }
  if (LOW_EFFORT.test(t)) return { ok: false, reason: 'Resposta curta demais para pontuar.' };
  if (/(.)\1{5,}/.test(t)) return { ok: false, reason: 'Texto com repetição de caracteres.' };
  const uniqueWords = new Set(t.split(/\s+/).filter((w) => w.length > 2));
  if (uniqueWords.size < (kind === 'ajuda' ? 6 : 10)) return { ok: false, reason: 'Texto repetitivo demais para pontuar.' };
  if (previous.some((p) => normalize(p).trim() === t.trim())) return { ok: false, reason: 'Mensagem repetida: escreva algo novo para quem precisa.' };

  const score = signals(t, kind === 'ajuda' ? SUPPORT : ADVICE);
  // Textos mais longos e cuidadosos passam mesmo sem as palavras-chave.
  const longEnough = raw.length >= (kind === 'ajuda' ? 120 : 200);
  if (score === 0 && !longEnough) {
    return {
      ok: false,
      reason: kind === 'ajuda'
        ? 'Não identificamos acolhimento ou orientação. Fale com a pessoa e ofereça algo que ajude.'
        : 'Não identificamos uma dica prática. Diga o que fazer e como.',
    };
  }
  return { ok: true, reason: kind === 'ajuda' ? 'Mensagem de ajuda validada.' : 'Conselho validado.' };
}

/** Prompt para a IA (quando configurada), com saída em JSON. */
export function aiPrompt(kind: ContributionKind, trackPurpose: string, body: string): string {
  return [
    'Você valida contribuições numa comunidade de desenvolvimento pessoal (app Vivah).',
    `Trilha: ${trackPurpose}`,
    kind === 'ajuda'
      ? 'Tipo esperado: MENSAGEM DE AJUDA respondendo a alguém (acolhimento, incentivo ou orientação prática para a pessoa).'
      : 'Tipo esperado: CONSELHO/DICA publicado para a comunidade (orientação prática, útil e aplicável).',
    'Responda só com JSON: {"valido": true|false, "motivo": "frase curta em português", "risco": true|false}.',
    'valido=false se for spam, sem esforço, ofensivo, fora do tema, propaganda, pedido de contato fora do app, ou conselho perigoso (remédios, dietas extremas, investimentos garantidos).',
    'risco=true se o texto indicar que alguém pode se machucar.',
    `Texto: """${body.slice(0, 2000)}"""`,
  ].join('\n');
}
