/** Comunidade de exemplo do modo demonstração: pessoas, níveis, posts e comentários. */
import type { Feeling, PostKind, ReactionKind } from './types';

export interface DemoPerson {
  id: string;
  name: string;
  level: number;
  counselor?: { bio: string; topics: string[] };
}

export const DEMO_PEOPLE: DemoPerson[] = [
  { id: 'demo-edmilson', name: 'Edmilson', level: 99 },
  {
    id: 'demo-marina',
    name: 'Marina',
    level: 6,
    counselor: { bio: 'Tive crises de ansiedade por anos e hoje vivo bem. Gosto de ouvir quem está começando.', topics: ['Ansiedade', 'Sono', 'Recomeços'] },
  },
  {
    id: 'demo-paula',
    name: 'Paula',
    level: 7,
    counselor: { bio: 'Mãe, gestora e ex-workaholic. Posso ajudar com rotina, culpa e limites no trabalho.', topics: ['Rotina', 'Trabalho', 'Maternidade'] },
  },
  { id: 'demo-juliana', name: 'Juliana', level: 4 },
  { id: 'demo-rafa', name: 'Rafael', level: 3 },
  { id: 'demo-carlos', name: 'Carlos', level: 2 },
  { id: 'demo-bea', name: 'Beatriz', level: 1 },
  { id: 'demo-leo', name: 'Leonardo', level: 1 },
];

export interface DemoPost {
  id: string;
  channel: string;
  authorId: string;
  authorName: string;
  body: string;
  kind: PostKind;
  feeling: Feeling | null;
  createdAt: string;
  reactions: { userId: string; kind: ReactionKind }[];
  baseThanks?: number;
}

export interface DemoComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const by = (id: string) => ({ authorId: id, authorName: DEMO_PEOPLE.find((p) => p.id === id)?.name ?? 'Aluno Vivah' });
const reacts = (spec: Partial<Record<ReactionKind, number>>) =>
  Object.entries(spec).flatMap(([kind, n]) => Array.from({ length: n ?? 0 }, (_, i) => ({ userId: `demo-fan-${kind}-${i}`, kind: kind as ReactionKind })));

export function communitySeed() {
  const posts: DemoPost[] = [
    { id: 'p1', channel: 'respira', ...by('demo-bea'), kind: 'apoio', feeling: 'ansiedade', createdAt: hoursAgo(0.6),
      body: 'Acordei às 3h com o coração disparado de novo. Alguém tem alguma dica pra voltar a dormir quando a cabeça não para?',
      reactions: reacts({ abraco: 6, like: 3 }) },
    { id: 'p2', channel: 'respira', ...by('demo-juliana'), kind: 'conquista', feeling: 'calma', createdAt: hoursAgo(3),
      body: 'Terminei o dia 7 do Protocolo! O horário da preocupação mudou minhas noites. Há um mês eu não dormia antes das 2h.',
      reactions: reacts({ parabens: 14, like: 22, tocou: 3 }), baseThanks: 9 },
    { id: 'p3', channel: 'respira', ...by('demo-marina'), kind: 'dica', feeling: 'calma', createdAt: hoursAgo(7),
      body: 'Uma coisa que me ajudou muito: deixar um caderno do lado da cama. Quando acordo com a mente acelerada, escrevo tudo e digo pra mim mesma "amanhã às 18h eu penso nisso". Funciona mais do que eu imaginava.',
      reactions: reacts({ like: 31, forca: 4 }), baseThanks: 18 },
    { id: 'p4', channel: 'respira', ...by('demo-leo'), kind: 'desabafo', feeling: 'tristeza', createdAt: hoursAgo(20),
      body: 'Semana pesada. Não tenho muito o que dizer, só queria colocar pra fora que tá difícil.',
      reactions: reacts({ abraco: 11, forca: 7 }) },
    { id: 'p5', channel: 'respira', ...by('demo-carlos'), kind: 'apoio', feeling: 'sobrecarga', createdAt: hoursAgo(27),
      body: 'Como vocês fazem a respiração 4-6 no trabalho sem ninguém perceber? Tenho reunião com o chefe amanhã e já estou travado.',
      reactions: reacts({ forca: 5, like: 2 }) },
    { id: 'a1', channel: 'aquecimento', ...by('demo-carlos'), kind: 'desabafo', feeling: 'ansiedade', createdAt: hoursAgo(2),
      body: 'Alguém mais acorda de madrugada com a cabeça a mil? Na live de quarta o Edmilson vai falar disso.',
      reactions: reacts({ abraco: 5, like: 4 }) },
    { id: 'a2', channel: 'aquecimento', ...by('demo-rafa'), kind: 'conquista', feeling: 'animo', createdAt: hoursAgo(9),
      body: 'Ouvi o Escudo de hoje no ônibus e cheguei no trabalho bem mais leve. Sete dias seguidos!',
      reactions: reacts({ parabens: 9, like: 12 }), baseThanks: 2 },
    { id: 'a3', channel: 'aquecimento', ...by('demo-edmilson'), kind: 'dica', feeling: null, createdAt: hoursAgo(30),
      body: 'Lembrete de quarta: ansiedade não é fraqueza, é um alarme sensível demais. A gente não desliga o alarme, a gente aprende a calibrar. Te vejo na live.',
      reactions: reacts({ like: 48, tocou: 9 }), baseThanks: 25 },
  ];
  const comments: DemoComment[] = [
    { id: 'c1', postId: 'p1', ...by('demo-marina'), createdAt: hoursAgo(0.4), body: 'Bea, te entendo demais. Tenta a respiração 4-6 ainda deitada e não pega o celular. E escreve o que está girando num papel. Estou torcendo por você.' },
    { id: 'c2', postId: 'p2', ...by('demo-edmilson'), createdAt: hoursAgo(2.5), body: 'Que orgulho, Juliana! Um dia de cada vez.' },
    { id: 'c3', postId: 'p4', ...by('demo-juliana'), createdAt: hoursAgo(18), body: 'Leo, obrigada por compartilhar. Estamos aqui com você. Se precisar, a live de quarta é um bom lugar pra se sentir acompanhado.' },
    { id: 'c4', postId: 'a1', ...by('demo-edmilson'), createdAt: hoursAgo(1), body: 'Vou falar exatamente disso na quarta, Carlos. Salva a live na agenda!' },
  ];
  return { posts, comments };
}
