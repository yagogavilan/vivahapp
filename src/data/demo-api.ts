/**
 * Backend de demonstração, em memória. Usa o mesmo catálogo do seed e
 * simula uma aluna que já comprou o Protocolo e o Calma em 5 Minutos.
 */
import { DEMO_CODE } from '../lib/config';
import { addDays, dayKey, spDateTime } from '../domain/dates';
import { buildEscudo, buildLives } from '../domain/schedule';
import type { Api, SessionUser } from './api';
import * as seedCatalog from './catalog';
import { diagnosticQuestions } from './catalog';
import { PERSISTENT_METRICS, type Entry } from '../domain/panels';
import { deriveProducts } from '../domain/admin';
import { sequenceInfo, trackSequence } from '../domain/sequence';
import { judgeContribution } from '../../supabase/functions/_shared/contribution';
import { levelFor } from '../domain/kindness';
import { categoryOf, DEFAULT_PUSH_SETTINGS, pushCopyIssues, wantsPush } from '../domain/notifications';
import { RULES } from '../domain/points';
import { TRACK_REWARDS } from '../domain/rewards';
import { award, type AwardInput, type LedgerEvent, statsOf } from './demo-points';
import type {
  Activity,
  AdviceMessage,
  AdviceRequest,
  AgendaEvent,
  Checkin,
  Comment,
  CounselorProfile,
  DiagnosticResult,
  Favorite,
  LessonProgress,
  Post,
  Profile,
  ReactionKind,
  DailyLog,
  InboxItem,
  NotificationDraft,
  PushSettings,
  Redemption,
  SentNotification,
  SupportAction,
} from './types';
import { communitySeed, DEMO_PEOPLE, type DemoComment, type DemoPost } from './demo-community';

const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

const today = () => dayKey(new Date());

function initialState() {
  const t = today();
  return {
    user: null as SessionUser | null,
    profile: null as Profile | null,
    // Assinante da trilha Respira e dona de um low ticket (Calma em 5 Minutos).
    owned: new Set([...(seedCatalog.products.find((p) => p.id === 'trilha-respira')?.courseIds ?? []), 'calma-em-5-minutos']),
    progress: [] as LessonProgress[],
    lives: buildLives(addDays(t, -7)),
    escudo: buildEscudo(addDays(t, -6), 7),
    ...communitySeed(),
    /** Quem agradeceu o quê (para não agradecer duas vezes). */
    thanks: [] as { id: string; giverId: string; receiverId: string; target: string; createdAt: string }[],
    ledger: [] as LedgerEvent[],
    redemptions: [] as Redemption[],
    logs: [] as DailyLog[],
    support: [] as SupportAction[],
    counselors: {} as Record<string, CounselorProfile>,
    advice: [] as AdviceRequest[],
    adviceMessages: [] as AdviceMessage[],
    agenda: [
      { id: 'a1', title: 'Treino leve', kind: 'treino', startsAt: spDateTime(addDays(t, 1), '07:00'), endsAt: spDateTime(addDays(t, 1), '07:30'), liveId: null, notes: null },
      { id: 'a2', title: 'Bloco de foco', kind: 'foco', startsAt: spDateTime(addDays(t, 1), '09:00'), endsAt: spDateTime(addDays(t, 1), '10:30'), liveId: null, notes: null },
    ] as AgendaEvent[],
    diagnostic: null as DiagnosticResult | null,
    checkins: [] as Checkin[],
    // Uma semana de exemplo: 4 dias seguidos até ontem, para a sequência aparecer.
    activity: [1, 2, 3, 4].map((d) => ({ day: addDays(t, -d), kind: 'escudo' as const, ref: `escudo-${addDays(t, -d)}`, minutes: 5 })) as Activity[],
    notes: {} as Record<string, string>,
    favorites: [] as Favorite[],
    trackEntries: [] as Entry[],
    pushSettings: { ...DEFAULT_PUSH_SETTINGS } as PushSettings,
    pushTokens: [] as string[],
    inboxRead: new Set<string>(),
  };
}

let state = initialState();

/** Catálogo editável pela página de admin (só nesta sessão de demonstração). */
const cat = {
  tracks: seedCatalog.tracks.map((t) => ({ ...t })),
  courses: seedCatalog.courses.map((c) => ({ ...c })),
  modules: seedCatalog.modules.map((m) => ({ ...m })),
  lessons: seedCatalog.lessons.map((l) => ({ ...l })),
  media: seedCatalog.lessonMedia.map((m) => ({ ...m })),
  checkouts: {} as Record<string, string | null>,
  storeItems: seedCatalog.storeItems.map((x) => ({ ...x })),
};

function requireAdmin() {
  if (state.profile?.role !== 'admin') throw new Error('Só o time Vivah pode editar o catálogo.');
}

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = { ...list[i], ...item };
  else list.push(item);
}
const listeners = new Set<(u: SessionUser | null) => void>();

/**
 * Avisos enviados na demonstração (valem para todas as contas: o admin envia,
 * a aluna vê no sino). Dois de exemplo, para o histórico não começar vazio.
 */
const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const sentNotifications: SentNotification[] = [
  {
    id: 'demo-n1', kind: 'announcement', title: 'Live de quinta às 20h', body: 'Respiração para dormir melhor, com a equipe Vivah. Salve na agenda.',
    url: '/agenda', audience: 'all', trackId: null, courseId: null, lessonId: null, status: 'sent', createdAt: ago(26), sentAt: ago(26),
    recipients: 5240, pushTargets: 3150, pushOk: 3122, pushFailed: 28, opened: 1408, error: null,
  },
  {
    id: 'demo-n2', kind: 'lesson', title: 'Aula nova na Respira: O que é ruminação', body: 'Já está no curso Mente Silenciosa. Toque para assistir.',
    url: '/aula/mente-silenciosa--m1--a1', audience: 'course', trackId: 'respira', courseId: 'mente-silenciosa', lessonId: 'mente-silenciosa--m1--a1',
    status: 'sent', createdAt: ago(3), sentAt: ago(3), recipients: 1310, pushTargets: 812, pushOk: 809, pushFailed: 3, opened: 377, error: null,
  },
];

/** Na demonstração, o celular mostra o aviso como notificação local (o app registra quem mostra). */
let presentDemoPush: ((n: { title: string; body: string; url: string | null; id: string }) => void) | null = null;
export function setDemoPushPresenter(fn: typeof presentDemoPush) {
  presentDemoPush = fn;
}

/** Público simulado (a demonstração tem uma pessoa só). */
const DEMO_REACH = { all: 5240, track: 1310, course: 870 } as const;
const DEMO_OPT_IN = { new_lessons: 0.62, announcements: 0.6, launches: 0.21 } as const;

function inAudience(n: Pick<SentNotification, 'audience' | 'trackId' | 'courseId'>): boolean {
  if (n.audience === 'all') return true;
  if (n.audience === 'track') {
    return cat.courses.some((c) => c.trackId === n.trackId && !c.lowTicket && state.owned.has(c.id));
  }
  const course = cat.courses.find((c) => c.id === n.courseId);
  return Boolean(course && (course.isFree || state.owned.has(course.id)));
}
const emit = () => listeners.forEach((l) => l(state.user));

function me(): SessionUser {
  if (!state.user) throw new Error('Faça login.');
  return state.user;
}

const firstName = () => state.profile?.fullName?.split(' ')[0] || 'Aluno Vivah';

const nameOf = (id: string | null) =>
  !id ? null : id === state.user?.id ? firstName() : DEMO_PEOPLE.find((p) => p.id === id)?.name ?? 'Aluno Vivah';

function levelOf(userId: string, trackId: string): number {
  const person = DEMO_PEOPLE.find((p) => p.id === userId);
  if (person) return person.level;
  const { earned, givers } = statsOf(state.ledger, userId, trackId);
  return levelFor(earned, givers).level;
}

function give(input: Omit<AwardInput, 'day' | 'now' | 'actorName'>) {
  const ev = award(state.ledger, { ...input, actorName: nameOf(input.actorId), day: today(), now: new Date().toISOString() });
  if (ev) state.ledger = [ev, ...state.ledger];
  return ev;
}

/** Valida na hora o texto que vale pontos (no servidor, quem faz isso é a função validate-contributions). */
function validatePending() {
  state.ledger = state.ledger.map((e) => {
    if (e.status !== 'pendente') return e;
    const kind = e.kind === 'ajuda' ? 'ajuda' : 'conselho';
    const body = e.commentId ? state.comments.find((c) => c.id === e.commentId)?.body : state.posts.find((p) => p.id === e.postId)?.body;
    const verdict = judgeContribution(kind, body ?? '');
    return verdict.ok ? { ...e, status: 'valido' as const, reason: verdict.reason } : { ...e, status: 'recusado' as const, points: 0, reason: verdict.reason };
  });
}

const spentOf = (userId: string, trackId: string) =>
  userId === state.user?.id ? state.redemptions.filter((r) => r.trackId === trackId && r.status !== 'cancelado').reduce((s, r) => s + r.cost, 0) : 0;

function toPost(p: DemoPost): Post {
  const reactions: Partial<Record<ReactionKind, number>> = {};
  for (const r of p.reactions) reactions[r.kind] = (reactions[r.kind] ?? 0) + 1;
  const myId = state.user?.id;
  const key = `post:${p.id}`;
  return {
    id: p.id,
    channel: p.channel,
    authorId: p.authorId,
    authorName: p.authorName,
    authorLevel: levelOf(p.authorId, p.channel),
    body: p.body,
    kind: p.kind,
    feeling: p.feeling,
    createdAt: p.createdAt,
    commentCount: state.comments.filter((c) => c.postId === p.id).length,
    reactions,
    myReactions: p.reactions.filter((r) => r.userId === myId).map((r) => r.kind),
    thanksCount: (p.baseThanks ?? 0) + state.thanks.filter((t) => t.target === key).length,
    iThanked: state.thanks.some((t) => t.target === key && t.giverId === myId),
  };
}

function toComment(c: DemoComment): Comment {
  const key = `comment:${c.id}`;
  const channel = state.posts.find((p) => p.id === c.postId)?.channel ?? 'respira';
  return {
    ...c,
    authorLevel: levelOf(c.authorId, channel),
    thanksCount: state.thanks.filter((t) => t.target === key).length,
    iThanked: state.thanks.some((t) => t.target === key && t.giverId === state.user?.id),
  };
}

/**
 * Histórico de exemplo da aluna: algumas semanas ajudando na Respira (perto do
 * nível Mão Amiga, longe da primeira recompensa) e notas de fechamento do dia.
 */
function seedHistory() {
  const people = ['demo-marina', 'demo-carlos', 'demo-juliana', 'demo-rafa', 'demo-bea', 'demo-leo', 'demo-paula', 'demo-edmilson'];
  const kinds: [LedgerEvent['kind'], number][] = [['curtida', 1], ['agradecimento', 2], ['ajuda', 3], ['conselho', 4], ['apoio', 5]];
  const t = today();
  for (let d = 1; d <= 24; d++) {
    const day = addDays(t, -d);
    kinds.forEach(([kind, points], k) => {
      if ((d + k) % 3 === 0) return;
      state.ledger.push({
        id: `h-${d}-${k}`, userId: 'demo-user', actorId: kind === 'conselho' ? null : people[(d + k) % people.length],
        actorName: kind === 'conselho' ? null : nameOf(people[(d + k) % people.length]), trackId: 'respira', kind, points,
        status: 'valido', reason: null, day, createdAt: spDateTime(day, '12:00'),
      });
    });
  }
  const scores: Record<string, number[]> = { respira: [48, 55, 52, 61, 58, 66, 70, 63, 72, 69, 75, 78, 74] };
  for (const [trackId, list] of Object.entries(scores)) {
    list.forEach((score, i) => {
      state.logs.push({ day: addDays(t, -(list.length - i)), trackId, kind: 'fechamento', data: {}, score, valid: true });
    });
  }
}

/** Contas da demonstração (só nesta sessão). Duas já prontas para testar. */
const demoAccounts = new Map<string, { name: string; password: string; confirmed: boolean }>([
  ['ana@exemplo.com', { name: 'Ana Souza', password: 'vivah1234', confirmed: true }],
  ['admin@vivah.com.br', { name: 'Equipe Vivah', password: 'vivah1234', confirmed: true }],
]);
const resetCodes = new Set<string>();
/** O que cada conta fez na demonstração, para quem sai e entra de novo não recomeçar do zero. */
const savedSessions = new Map<string, ReturnType<typeof initialState>>();

function startDemoSession(email: string, name: string | null) {
  const saved = savedSessions.get(email);
  if (saved) {
    state = saved;
    emit();
    return;
  }
  const fresh = initialState();
  state = { ...fresh, user: { id: 'demo-user', email } };
  seedHistory();
  state.profile = { id: 'demo-user', role: email.startsWith('admin') ? 'admin' : 'aluno', email, fullName: name, goal: null, healthConsentAt: null, onboardedAt: null, preferences: { showStreak: true, liveReminders: true, dailyReminder: null } };
  emit();
}

export const demoApi: Api = {
  mode: 'demo',

  async getSessionUser() {
    return state.user;
  },
  onAuthChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async signIn(email, password) {
    await wait(400);
    const e = email.trim().toLowerCase();
    const acc = demoAccounts.get(e);
    if (!acc || acc.password !== password) throw new Error('E-mail ou senha incorretos.');
    if (!acc.confirmed) throw new Error('Confirme o seu e-mail com o código que enviamos.');
    startDemoSession(e, acc.name);
  },
  async signUp(name, email, password) {
    await wait(400);
    const e = email.trim().toLowerCase();
    if (demoAccounts.get(e)?.confirmed) throw new Error('Este e-mail já tem conta. Entre ou use "Esqueci a senha".');
    demoAccounts.set(e, { name: name.trim(), password, confirmed: false });
    return { needsCode: true };
  },
  async confirmSignUp(email, code) {
    await wait(400);
    const e = email.trim().toLowerCase();
    const acc = demoAccounts.get(e);
    if (!acc) throw new Error('Crie a conta primeiro.');
    if (code.trim() !== DEMO_CODE) throw new Error(`Código inválido. Na demonstração, o código é ${DEMO_CODE}.`);
    acc.confirmed = true;
    startDemoSession(e, acc.name);
  },
  async resendSignUpCode() {
    await wait(300);
  },
  async requestPasswordReset(email) {
    await wait(400);
    resetCodes.add(email.trim().toLowerCase());
  },
  async resetPassword(email, code, newPassword) {
    await wait(400);
    const e = email.trim().toLowerCase();
    if (code.trim() !== DEMO_CODE) throw new Error(`Código inválido. Na demonstração, o código é ${DEMO_CODE}.`);
    const acc = demoAccounts.get(e) ?? { name: '', password: '', confirmed: true };
    demoAccounts.set(e, { ...acc, password: newPassword, confirmed: true });
    startDemoSession(e, acc.name || null);
  },
  async requestCode(email) {
    await wait(400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Confira o e-mail.');
  },
  async verifyCode(email, code) {
    await wait(400);
    if (code.trim() !== DEMO_CODE) throw new Error(`No modo demonstração, o código é ${DEMO_CODE}.`);
    startDemoSession(email.trim().toLowerCase(), null);
  },
  async signOut() {
    if (state.user) savedSessions.set(state.user.email, { ...state });
    state = { ...state, user: null, profile: null };
    emit();
  },
  async deleteAccount() {
    await wait();
    if (state.user) {
      savedSessions.delete(state.user.email);
      demoAccounts.delete(state.user.email);
    }
    state = initialState();
    emit();
  },

  async getProfile() {
    me();
    return { ...state.profile! };
  },
  async updateProfile(patch) {
    me();
    state.profile = { ...state.profile!, ...patch };
    if ('healthConsentAt' in patch && patch.healthConsentAt === null) state.checkins = [];
    return { ...state.profile };
  },
  async exportMyData() {
    return {
      exportado_em: new Date().toISOString(),
      perfil: state.profile,
      progresso: state.progress,
      agenda: state.agenda,
      diagnosticos: state.diagnostic ? [state.diagnostic] : [],
      checkins: state.checkins,
      anotacoes: state.notes,
      favoritos: state.favorites,
      atividade: state.activity,
      publicacoes: state.posts.filter((p) => p.authorId === state.user?.id),
      agradecimentos: state.thanks.filter((t) => t.giverId === state.user?.id || t.receiverId === state.user?.id),
      pontos: state.ledger.filter((e) => e.userId === state.user?.id),
      resgates: state.redemptions,
      planos_e_fechamentos: state.logs,
      apoios: state.support,
      conselhos: state.advice,
    };
  },

  async getCatalog() {
    await wait();
    return {
      tracks: cat.tracks.map((t) => ({ ...t })),
      courses: cat.courses.map((c) => ({ ...c })),
      modules: cat.modules.map((m) => ({ ...m })),
      lessons: cat.lessons.map((l) => ({ ...l })),
      products: deriveProducts(cat.tracks, cat.courses, cat.checkouts),
      storeItems: cat.storeItems.filter((x) => x.active || state.profile?.role === 'admin').map((x) => ({ ...x })),
    };
  },
  async getMyCourseIds() {
    const uid_ = state.user?.id;
    if (state.profile?.role === 'admin') return cat.courses.map((c) => c.id);
    const maxLevel = uid_ ? Math.max(1, ...cat.tracks.map((t) => levelOf(uid_, t.id))) : 1;
    const subscribed = new Set(cat.courses.filter((c) => state.owned.has(c.id) && !c.lowTicket).map((c) => c.trackId));
    const trackCourses = cat.courses.filter((c) => subscribed.has(c.trackId) && !c.lowTicket && !c.rewardOnly && c.minKindnessLevel == null).map((c) => c.id);
    const exclusive = cat.courses.filter((c) => c.minKindnessLevel != null && maxLevel >= c.minKindnessLevel).map((c) => c.id);
    const redeemed = state.redemptions
      .filter((r) => r.status !== 'cancelado')
      .map((r) => TRACK_REWARDS.find((x) => x.id === r.rewardId)?.courseId)
      .filter((x): x is string => Boolean(x));
    return [...new Set([...cat.courses.filter((c) => c.isFree).map((c) => c.id), ...state.owned, ...trackCourses, ...exclusive, ...redeemed])];
  },
  async getLessonMedia(lessonId) {
    const lesson = cat.lessons.find((l) => l.id === lessonId);
    if (!lesson) return null;
    if (!lesson.isPreview && !(await demoApi.getMyCourseIds()).includes(lesson.courseId)) return null;
    // Mesma regra do banco: a aula só abre com a anterior da trilha concluída.
    const course = cat.courses.find((c) => c.id === lesson.courseId);
    if (course && state.profile?.role !== 'admin') {
      const seq = sequenceInfo(trackSequence(course.trackId, cat.courses, cat.modules, cat.lessons), state.progress);
      if (seq.locked.has(lessonId)) return null;
    }
    return cat.media.find((m) => m.lessonId === lessonId) ?? null;
  },
  async getProgress() {
    return [...state.progress];
  },
  async saveProgress(lessonId, positionSec, completed) {
    const prev = state.progress.find((p) => p.lessonId === lessonId);
    const next: LessonProgress = {
      lessonId,
      positionSec: Math.round(positionSec),
      completedAt: completed ? prev?.completedAt ?? new Date().toISOString() : prev?.completedAt ?? null,
    };
    state.progress = [...state.progress.filter((p) => p.lessonId !== lessonId), next];
  },

  async getLives() {
    return state.lives;
  },
  async getEscudo() {
    return [...state.escudo].filter((a) => a.publishDate <= today()).reverse();
  },

  async getPosts(channel) {
    await wait();
    return state.posts
      .filter((p) => p.channel === channel)
      .map(toPost)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getPost(id) {
    const p = state.posts.find((x) => x.id === id);
    return p ? toPost(p) : null;
  },
  async createPost(channel, body, kind = 'desabafo', feeling = null) {
    const u = me();
    const id = uid();
    state.posts = [
      { id, channel, authorId: u.id, authorName: firstName(), body: body.trim(), kind, feeling, createdAt: new Date().toISOString(), reactions: [] },
      ...state.posts,
    ];
    // Conselho/dica: 4 pontos depois da validação (a comunidade é quem "gera" o ponto).
    if (kind === 'dica') {
      const used = state.ledger.filter((e) => e.userId === u.id && e.trackId === channel && e.kind === 'conselho' && e.day === today() && e.status !== 'recusado').length;
      state.ledger = [{
        id: uid(), userId: u.id, actorId: null, actorName: null, trackId: channel, kind: 'conselho', points: used ? 0 : 4,
        status: used ? 'recusado' : 'pendente', reason: used ? 'Limite diário desta atividade atingido.' : null,
        day: today(), createdAt: new Date().toISOString(), postId: id,
      }, ...state.ledger];
    }
  },
  async deletePost(id) {
    state.posts = state.posts.filter((p) => p.id !== id || p.authorId !== state.user?.id);
    state.ledger = state.ledger.filter((e) => e.postId !== id || e.kind !== 'conselho');
  },
  async getComments(postId) {
    return state.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(toComment);
  },
  async createComment(postId, body) {
    const u = me();
    const id = uid();
    const post = state.posts.find((p) => p.id === postId);
    state.comments = [
      ...state.comments,
      { id, postId, authorId: u.id, authorName: firstName(), body: body.trim(), createdAt: new Date().toISOString() },
    ];
    if (!post || post.authorId === u.id) return;
    // Mensagem de ajuda: só a primeira em cada post pontua (3 pontos depois da validação).
    const already = state.ledger.some(
      (e) => e.userId === u.id && e.kind === 'ajuda' && e.status !== 'recusado' && state.comments.find((c) => c.id === e.commentId)?.postId === postId,
    );
    if (already) {
      state.ledger = [{
        id: uid(), userId: u.id, actorId: post.authorId, actorName: nameOf(post.authorId), trackId: post.channel, kind: 'ajuda', points: 0,
        status: 'recusado', reason: 'Só a primeira mensagem em cada publicação pontua.', day: today(), createdAt: new Date().toISOString(), commentId: id,
      }, ...state.ledger];
    } else {
      give({ userId: u.id, actorId: post.authorId, trackId: post.channel, kind: 'ajuda', status: 'pendente', refs: { commentId: id, postId } });
    }
    // Na demonstração, quem pediu ajuda agradece a resposta (2 pontos).
    if (post.authorId.startsWith('demo-')) {
      const thankId = uid();
      state.thanks = [...state.thanks, { id: thankId, giverId: post.authorId, receiverId: u.id, target: `comment:${id}`, createdAt: new Date().toISOString() }];
      give({ userId: u.id, actorId: post.authorId, trackId: post.channel, kind: 'agradecimento', status: 'valido', refs: { thankId } });
    }
  },
  async setReaction(postId, kind, on) {
    const u = me();
    state.posts = state.posts.map((p) => {
      if (p.id !== postId) return p;
      const rest = p.reactions.filter((r) => !(r.userId === u.id && r.kind === kind));
      return { ...p, reactions: on ? [...rest, { userId: u.id, kind }] : rest };
    });
    const post = state.posts.find((p) => p.id === postId);
    if (kind !== 'like' || !post) return;
    if (on) {
      if (!state.ledger.some((e) => e.kind === 'curtida' && e.postId === postId && e.actorId === u.id)) {
        give({ userId: post.authorId, actorId: u.id, trackId: post.channel, kind: 'curtida', status: 'valido', refs: { postId } });
      }
    } else {
      state.ledger = state.ledger.filter((e) => !(e.kind === 'curtida' && e.postId === postId && e.actorId === u.id));
    }
  },
  async thank(target) {
    const u = me();
    const key = `${target.type}:${target.id}`;
    if (state.thanks.some((t) => t.giverId === u.id && t.target === key)) throw new Error('Você já agradeceu.');
    if (state.thanks.filter((t) => t.giverId === u.id && t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length >= RULES.agradecimentosDadosPorDia) {
      throw new Error('Você já deu 10 agradecimentos hoje. Amanhã tem mais.');
    }
    let receiverId: string | undefined;
    let trackId = 'respira';
    if (target.type === 'post') {
      const p = state.posts.find((x) => x.id === target.id);
      receiverId = p?.authorId;
      trackId = p?.channel ?? trackId;
    }
    if (target.type === 'comment') {
      const c = state.comments.find((x) => x.id === target.id);
      receiverId = c?.authorId;
      trackId = state.posts.find((p) => p.id === c?.postId)?.channel ?? trackId;
    }
    if (target.type === 'advice') {
      const a = state.advice.find((x) => x.id === target.id);
      receiverId = a?.counselorId;
      trackId = a?.trackId ?? trackId;
    }
    if (!receiverId) throw new Error('Não encontrado.');
    if (receiverId === u.id) throw new Error('Não dá para agradecer a si mesmo.');
    const thankId = uid();
    state.thanks = [...state.thanks, { id: thankId, giverId: u.id, receiverId, target: key, createdAt: new Date().toISOString() }];
    give({ userId: receiverId, actorId: u.id, trackId, kind: 'agradecimento', status: 'valido', refs: { thankId } });
  },
  async report() {
    await wait();
  },

  async validateContributions() {
    await wait(300);
    validatePending();
  },
  async getPointsSummary(trackId) {
    const u = me();
    const { earned, givers } = statsOf(state.ledger, u.id, trackId);
    const spent = spentOf(u.id, trackId);
    return { earned, givers, spent, balance: earned - spent, level: levelFor(earned, givers).level };
  },
  async getPointEvents(trackId) {
    const u = me();
    return state.ledger
      .filter((e) => e.userId === u.id && e.trackId === trackId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100)
      .map(({ id, trackId: t, kind, points, status, reason, actorName, createdAt }) => ({ id, trackId: t, kind, points, status, reason, actorName, createdAt }));
  },
  async getRedemptions() {
    return [...state.redemptions];
  },
  async redeemReward(rewardId) {
    const u = me();
    const r = TRACK_REWARDS.find((x) => x.id === rewardId);
    if (!r) throw new Error('Recompensa não encontrada.');
    if (r.kind === 'acesso') throw new Error('Este acesso abre sozinho quando você chega ao nível.');
    if (state.redemptions.some((x) => x.rewardId === rewardId && x.status !== 'cancelado')) throw new Error('Você já resgatou esta recompensa.');
    const s = await demoApi.getPointsSummary(r.trackId);
    if (s.level < r.minLevel) throw new Error('Esta recompensa pede um nível maior nesta trilha.');
    if (s.balance < r.cost) throw new Error(`Faltam ${r.cost - s.balance} pontos para esta recompensa.`);
    state.redemptions = [
      { id: uid(), rewardId, trackId: r.trackId, cost: r.cost, status: r.kind === 'fisico' ? 'solicitado' : 'liberado', createdAt: new Date().toISOString() },
      ...state.redemptions,
    ];
    void u;
  },

  async getDailyLogs(trackId, days) {
    const from = addDays(today(), -days);
    return state.logs.filter((l) => l.trackId === trackId && l.day >= from).sort((a, b) => b.day.localeCompare(a.day));
  },
  async saveDailyLog(log) {
    me();
    const day = today();
    state.logs = [...state.logs.filter((l) => !(l.day === day && l.trackId === log.trackId && l.kind === log.kind)), { ...log, day }];
  },

  async getSupportActions() {
    const u = me();
    return state.support.filter((s) => s.helperId === u.id || s.helpedId === u.id);
  },
  async offerSupport(input) {
    const u = me();
    const post = state.posts.find((p) => p.id === input.postId);
    if (!post) throw new Error('Publicação não encontrada.');
    if (post.kind !== 'apoio') throw new Error('Apoio só pode ser oferecido em pedidos de apoio.');
    if (post.authorId === u.id) throw new Error('Você não pode oferecer apoio para si mesmo.');
    if (state.support.some((s) => s.postId === post.id && s.helperId === u.id && (s.status === 'oferecido' || s.status === 'aceito'))) {
      throw new Error('Você já ofereceu apoio neste pedido.');
    }
    const items = input.items.map((i) => i.trim()).filter(Boolean);
    if (input.mode === 'plano' && (items.length < 2 || items.length > 12 || items.some((i) => i.length < 3 || i.length > 200))) {
      throw new Error('Monte de 2 a 12 itens, cada um com 3 a 200 caracteres.');
    }
    if (input.mode === 'agenda') {
      const at = input.scheduledAt ? Date.parse(input.scheduledAt) : NaN;
      if (!(at >= Date.now() + 30 * 60_000 && at <= Date.now() + 14 * 86_400_000)) {
        throw new Error('Escolha um horário entre daqui a 30 minutos e os próximos 14 dias.');
      }
    }
    const action: SupportAction = {
      id: uid(), trackId: post.channel, postId: post.id, helperId: u.id, helperName: firstName(), helpedId: post.authorId,
      helpedName: post.authorName, mode: input.mode, message: input.message.trim(), items, scheduledAt: input.mode === 'agenda' ? input.scheduledAt : null,
      status: 'oferecido', createdAt: new Date().toISOString(),
    };
    state.support = [action, ...state.support];
    // Na demonstração, a pessoa ajudada aceita na hora; um plano ela já confirma que ajudou.
    if (post.authorId.startsWith('demo-')) {
      action.status = 'aceito';
      if (action.mode === 'agenda' && action.scheduledAt) {
        state.agenda = [...state.agenda, {
          id: uid(), title: `Apoio a ${action.helpedName}`, kind: 'pessoal', startsAt: action.scheduledAt,
          endsAt: new Date(Date.parse(action.scheduledAt) + 30 * 60_000).toISOString(), liveId: null, notes: null,
        }];
      } else {
        action.status = 'concluido';
        give({ userId: u.id, actorId: post.authorId, trackId: post.channel, kind: 'apoio', status: 'valido', refs: { supportId: action.id } });
      }
    }
  },
  async setSupportStatus(id, status) {
    const u = me();
    const s = state.support.find((x) => x.id === id);
    if (!s) throw new Error('Apoio não encontrado.');
    const ok =
      (u.id === s.helpedId && s.status === 'oferecido' && (status === 'aceito' || status === 'recusado')) ||
      (u.id === s.helpedId && s.status === 'aceito' && status === 'concluido' && (s.mode === 'plano' || Date.parse(s.scheduledAt ?? '') <= Date.now())) ||
      (u.id === s.helperId && (s.status === 'oferecido' || s.status === 'aceito') && status === 'cancelado');
    if (!ok) throw new Error('Mudança não permitida. Num horário marcado, confirme só depois que ele acontecer.');
    state.support = state.support.map((x) => (x.id === id ? { ...x, status } : x));
    if (status === 'concluido') give({ userId: s.helperId, actorId: s.helpedId, trackId: s.trackId, kind: 'apoio', status: 'valido', refs: { supportId: id } });
  },

  async listCounselors(trackId) {
    await wait();
    return DEMO_PEOPLE.filter((p) => p.counselor?.tracks.includes(trackId)).map((p) => ({
      userId: p.id, name: p.name, bio: p.counselor!.bio, topics: p.counselor!.topics, level: p.level,
    }));
  },
  async getMyCounselorProfile(trackId) {
    return state.counselors[trackId] ?? null;
  },
  async saveCounselorProfile(trackId, profile) {
    const u = me();
    if (levelOf(u.id, trackId) < 6) throw new Error('O espaço de conselheiro abre no nível Farol desta trilha.');
    state.counselors = { ...state.counselors, [trackId]: profile };
  },
  async getAdviceRequests() {
    return [...state.advice].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async createAdviceRequest(counselorId, trackId, topic, message) {
    const u = me();
    const counselor = DEMO_PEOPLE.find((p) => p.id === counselorId);
    if (!counselor?.counselor?.tracks.includes(trackId)) throw new Error('Este conselheiro não está recebendo pedidos agora.');
    if (state.advice.filter((a) => a.requesterId === u.id && (a.status === 'pendente' || a.status === 'aceito')).length >= 3) {
      throw new Error('Você já tem 3 conversas abertas. Encerre uma para pedir outra.');
    }
    const now = new Date().toISOString();
    const id = uid();
    // Na demonstração, a conselheira aceita na hora e responde.
    state.advice = [
      { id, trackId, requesterId: u.id, requesterName: firstName(), counselorId, counselorName: counselor.name, topic: topic.trim(), message: message.trim(), status: 'aceito', createdAt: now, updatedAt: now },
      ...state.advice,
    ];
    state.adviceMessages = [
      ...state.adviceMessages,
      { id: uid(), requestId: id, senderId: counselorId, body: `Oi, ${firstName()}. Li o que você escreveu e fico feliz que tenha pedido ajuda. Me conta: quando isso costuma acontecer?`, createdAt: now },
    ];
    return id;
  },
  async setAdviceStatus(id, status) {
    state.advice = state.advice.map((a) => (a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a));
  },
  async getAdviceMessages(requestId) {
    return state.adviceMessages.filter((m) => m.requestId === requestId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async sendAdviceMessage(requestId, body) {
    const u = me();
    const req = state.advice.find((a) => a.id === requestId);
    if (req?.status !== 'aceito') throw new Error('A conversa não está aberta.');
    state.adviceMessages = [...state.adviceMessages, { id: uid(), requestId, senderId: u.id, body: body.trim(), createdAt: new Date().toISOString() }];
  },

  async getAgenda() {
    return [...state.agenda].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
  async createAgendaEvent(e) {
    if (e.liveId && state.agenda.some((a) => a.liveId === e.liveId)) return;
    state.agenda = [...state.agenda, { ...e, id: uid() }];
  },
  async deleteAgendaEvent(id) {
    state.agenda = state.agenda.filter((a) => a.id !== id);
  },

  async getDiagnosticQuestions() {
    return diagnosticQuestions;
  },
  async getLatestDiagnostic() {
    return state.diagnostic;
  },
  async saveDiagnostic(answers, scores, recommendedTrackId, moment) {
    state.diagnostic = { id: uid(), createdAt: new Date().toISOString(), answers, scores, recommendedTrackId, moment: moment ?? null };
  },

  async getCheckins(days) {
    const from = addDays(today(), -days);
    return state.checkins.filter((c) => c.day >= from).sort((a, b) => b.day.localeCompare(a.day));
  },
  async saveCheckin(c) {
    if (!state.profile?.healthConsentAt) throw new Error('Ative o acompanhamento de humor e sono primeiro.');
    state.checkins = [...state.checkins.filter((x) => !(x.day === c.day && x.trackId === c.trackId)), c];
  },

  async getActivity(days) {
    const from = addDays(today(), -days);
    return state.activity.filter((a) => a.day >= from);
  },
  async logActivity(kind, ref = '', minutes = 0) {
    const day = today();
    if (state.activity.some((a) => a.day === day && a.kind === kind && a.ref === ref)) return;
    state.activity = [...state.activity, { day, kind, ref, minutes }];
  },
  async getNote(lessonId) {
    return state.notes[lessonId] ?? '';
  },
  async saveNote(lessonId, body) {
    state.notes = { ...state.notes, [lessonId]: body };
  },
  async getFavorites() {
    return [...state.favorites];
  },
  async setFavorite(itemType, itemId, on) {
    state.favorites = state.favorites.filter((f) => !(f.itemType === itemType && f.itemId === itemId));
    if (on) state.favorites = [{ itemType, itemId, createdAt: new Date().toISOString() }, ...state.favorites];
  },
  async adminUpdateTrack(id, patch) {
    requireAdmin();
    await wait();
    const t = cat.tracks.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
  },
  async adminSaveCourse(c) {
    requireAdmin();
    await wait();
    const existing = cat.courses.find((x) => x.id === c.id);
    upsert(cat.courses, {
      ...(existing ?? { inSubscription: false, isFree: false, minKindnessLevel: null, rewardOnly: false }),
      id: c.id,
      trackId: c.trackId,
      title: c.title,
      summary: c.summary,
      kind: c.lowTicket ? 'bonus' : 'programa',
      lowTicket: c.lowTicket,
      format: c.lowTicket ? (c.format ?? 'aula') : null,
      priceLabel: c.lowTicket ? c.priceLabel : null,
      sort: c.sort,
    });
  },
  async adminDeleteCourse(id) {
    requireAdmin();
    await wait();
    if (state.owned.has(id)) throw new Error('Este curso já tem alunos com acesso. Em vez de apagar, mude o título ou mova as aulas.');
    cat.courses = cat.courses.filter((c) => c.id !== id);
    cat.modules = cat.modules.filter((m) => m.courseId !== id);
    cat.lessons = cat.lessons.filter((l) => l.courseId !== id);
  },
  async adminSaveModule(m) {
    requireAdmin();
    await wait();
    upsert(cat.modules, { ...m });
  },
  async adminDeleteModule(id) {
    requireAdmin();
    await wait();
    cat.modules = cat.modules.filter((m) => m.id !== id);
    cat.lessons = cat.lessons.filter((l) => l.moduleId !== id);
  },
  async adminSaveLesson(l) {
    requireAdmin();
    await wait();
    const { mediaUrl, body, ...lesson } = l;
    upsert(cat.lessons, lesson);
    const media = cat.media.find((m) => m.lessonId === l.id);
    if (media) Object.assign(media, { mediaUrl, body });
    else cat.media.push({ lessonId: l.id, mediaUrl, body });
  },
  async adminDeleteLesson(id) {
    requireAdmin();
    await wait();
    cat.lessons = cat.lessons.filter((l) => l.id !== id);
  },
  async adminReorder(kind, orderedIds) {
    requireAdmin();
    await wait();
    const list: { id: string; sort: number }[] = kind === 'courses' ? cat.courses : kind === 'modules' ? cat.modules : cat.lessons;
    orderedIds.forEach((id, i) => {
      const item = list.find((x) => x.id === id);
      if (item) item.sort = i + 1;
    });
  },
  async adminSaveStoreItem(item) {
    requireAdmin();
    await wait();
    upsert(cat.storeItems, { ...item });
  },
  async adminDeleteStoreItem(id) {
    requireAdmin();
    await wait();
    cat.storeItems = cat.storeItems.filter((x) => x.id !== id);
  },
  async adminSetCheckout(productId, checkoutUrl) {
    requireAdmin();
    await wait();
    cat.checkouts[productId] = checkoutUrl;
  },
  async getTrackEntries(stores, sinceDay) {
    await wait(80);
    return state.trackEntries
      .filter((e) => stores.includes(e.trackId) && (e.day >= sinceDay || PERSISTENT_METRICS.includes(e.metric)))
      .map((e) => ({ ...e, data: { ...e.data } }));
  },
  async saveTrackEntry(e) {
    await wait(80);
    const health = ['peso', 'medidas', 'corpo', 'gad7', 'sono', 'refeicao'];
    if (health.includes(e.metric) && !state.profile?.healthConsentAt) throw new Error('Ative o acompanhamento de saúde em Privacidade para registrar isso.');
    if (e.id) {
      const cur = state.trackEntries.find((x) => x.id === e.id);
      if (cur) Object.assign(cur, { value: e.value, data: e.data as Entry['data'] });
      return;
    }
    const day = e.day && e.day <= today() && e.day >= addDays(today(), -7) ? e.day : today();
    const key = e.key ?? '';
    const cur = state.trackEntries.find((x) => x.trackId === e.trackId && x.metric === e.metric && x.day === day && x.key === key);
    if (cur) Object.assign(cur, { value: e.value, data: e.data as Entry['data'] });
    else state.trackEntries.push({ id: uid(), trackId: e.trackId, metric: e.metric, day, key, value: e.value, data: e.data as Entry['data'], createdAt: new Date().toISOString() });
  },
  async deleteTrackEntry(id) {
    await wait(60);
    state.trackEntries = state.trackEntries.filter((e) => e.id !== id);
  },
  async addTrackCounter(trackId, metric, delta) {
    await wait(40);
    const day = today();
    const cur = state.trackEntries.find((x) => x.trackId === trackId && x.metric === metric && x.day === day && x.key === '');
    if (cur) {
      cur.value = Math.max(0, (cur.value ?? 0) + delta);
      return cur.value;
    }
    const value = Math.max(0, delta);
    state.trackEntries.push({ id: uid(), trackId, metric, day, key: '', value, data: {}, createdAt: new Date().toISOString() });
    return value;
  },
  async registerPushToken(token) {
    await wait(30);
    if (!state.pushTokens.includes(token)) state.pushTokens.push(token);
  },
  async unregisterPushToken(token) {
    await wait(30);
    state.pushTokens = state.pushTokens.filter((t) => t !== token);
  },
  async getPushSettings() {
    await wait(40);
    return { ...state.pushSettings, mutedTracks: [...state.pushSettings.mutedTracks] };
  },
  async savePushSettings(s) {
    await wait(60);
    state.pushSettings = { ...s, mutedTracks: [...new Set(s.mutedTracks)] };
  },
  async getInbox() {
    await wait(60);
    return sentNotifications
      .filter((n) => n.status !== 'draft' && n.status !== 'failed' && inAudience(n))
      .map((n): InboxItem => ({
        id: n.id, kind: n.kind, title: n.title, body: n.body, url: n.url, trackId: n.trackId,
        sentAt: n.sentAt ?? n.createdAt, readAt: state.inboxRead.has(n.id) ? n.createdAt : null,
      }));
  },
  async markInboxRead(ids) {
    await wait(30);
    for (const n of sentNotifications) if (!ids || ids.includes(n.id)) state.inboxRead.add(n.id);
  },
  async adminNotificationReach(d) {
    await wait(120);
    requireAdmin();
    const recipients = DEMO_REACH[d.audience];
    return { recipients, pushTargets: Math.round(recipients * DEMO_OPT_IN[categoryOf(d.kind)]) };
  },
  async adminSendNotification(d: NotificationDraft) {
    await wait(300);
    requireAdmin();
    const blocking = pushCopyIssues(d.kind, d.title, d.body).filter((i) => i.blocking);
    if (blocking.length) throw new Error(blocking.map((i) => i.message).join(' '));
    const reach = await demoApi.adminNotificationReach(d);
    const n: SentNotification = {
      ...d, title: d.title.trim(), body: d.body.trim(), id: `demo-${uid()}`, status: 'sending', createdAt: new Date().toISOString(), sentAt: null,
      recipients: reach.recipients, pushTargets: reach.pushTargets, pushOk: 0, pushFailed: 0, opened: 0, error: null,
    };
    sentNotifications.unshift(n);
    // O envio termina "em segundo plano", como no servidor.
    setTimeout(() => {
      n.status = 'sent';
      n.sentAt = new Date().toISOString();
      n.pushFailed = Math.round(n.pushTargets * 0.008);
      n.pushOk = n.pushTargets - n.pushFailed;
      if (presentDemoPush && wantsPush(state.pushSettings, n.kind, n.trackId) && inAudience(n)) presentDemoPush(n);
    }, 1500);
    return n.id;
  },
  async adminRetryNotification(id) {
    await wait(200);
    requireAdmin();
    const n = sentNotifications.find((x) => x.id === id);
    if (n && (n.status === 'failed' || n.status === 'draft')) n.status = 'sent';
  },
  async adminListNotifications() {
    await wait(80);
    requireAdmin();
    return sentNotifications.map((n) => ({ ...n, opened: n.opened + (state.inboxRead.has(n.id) ? 1 : 0) }));
  },
};
