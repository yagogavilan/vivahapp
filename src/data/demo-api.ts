/**
 * Backend de demonstração, em memória. Usa o mesmo catálogo do seed e
 * simula uma aluna que já comprou o Protocolo e o Calma em 5 Minutos.
 */
import { DEMO_CODE } from '../lib/config';
import { addDays, dayKey, spDateTime } from '../domain/dates';
import { buildEscudo, buildLives } from '../domain/schedule';
import type { Api, SessionUser } from './api';
import { courses, diagnosticQuestions, lessonMedia, lessons, modules, products, tracks } from './catalog';
import { computeKindness, levelFor, THANK_POINTS, THANKS_PER_DAY, type ThankRecord } from '../domain/kindness';
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
  RewardClaim,
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
    owned: new Set(['protocolo-desligando-a-mente', 'calma-em-5-minutos']),
    progress: [] as LessonProgress[],
    lives: buildLives(addDays(t, -7)),
    escudo: buildEscudo(addDays(t, -6), 7),
    ...communitySeed(),
    thanks: [] as (ThankRecord & { target: string })[],
    claims: [] as RewardClaim[],
    counselor: null as CounselorProfile | null,
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
  };
}

let state = initialState();
const listeners = new Set<(u: SessionUser | null) => void>();
const emit = () => listeners.forEach((l) => l(state.user));

function me(): SessionUser {
  if (!state.user) throw new Error('Faça login.');
  return state.user;
}

const firstName = () => state.profile?.fullName?.split(' ')[0] || 'Aluno Vivah';

function levelOf(userId: string): number {
  const person = DEMO_PEOPLE.find((p) => p.id === userId);
  if (person) return person.level;
  const { points, givers } = computeKindness(state.thanks, userId);
  return levelFor(points, givers).level;
}

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
    authorLevel: levelOf(p.authorId),
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
  return {
    ...c,
    authorLevel: levelOf(c.authorId),
    thanksCount: state.thanks.filter((t) => t.target === key).length,
    iThanked: state.thanks.some((t) => t.target === key && t.giverId === state.user?.id),
  };
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
  async requestCode(email) {
    await wait(400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Confira o e-mail.');
  },
  async verifyCode(email, code) {
    await wait(400);
    if (code.trim() !== DEMO_CODE) throw new Error(`No modo demonstração, o código é ${DEMO_CODE}.`);
    const fresh = initialState();
    state = { ...fresh, user: { id: 'demo-user', email: email.trim().toLowerCase() } };
    // Quatro pessoas já agradeceram a aluna da demonstração: falta pouco para o nível Mão Amiga.
    state.thanks = ['demo-marina', 'demo-carlos', 'demo-juliana', 'demo-rafa'].map((giverId, i) => ({
      giverId, receiverId: 'demo-user', points: 10, createdAt: new Date(Date.now() - (i + 2) * 86_400_000).toISOString(), target: `old:${i}`,
    }));
    state.profile = { id: 'demo-user', email: state.user!.email, fullName: null, goal: null, healthConsentAt: null, onboardedAt: null, preferences: { showStreak: true, liveReminders: true, dailyReminder: null } };
    emit();
  },
  async signOut() {
    state.user = null;
    state.profile = null;
    emit();
  },
  async deleteAccount() {
    await wait();
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
      premios: state.claims,
      conselhos: state.advice,
    };
  },

  async getCatalog() {
    await wait();
    return { tracks, courses, modules, lessons, products };
  },
  async getMyCourseIds() {
    const level = state.user ? levelOf(state.user.id) : 1;
    const exclusive = courses.filter((c) => c.minKindnessLevel != null && level >= c.minKindnessLevel).map((c) => c.id);
    return [...courses.filter((c) => c.isFree).map((c) => c.id), ...state.owned, ...exclusive];
  },
  async getLessonMedia(lessonId) {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return null;
    if (!lesson.isPreview && !(await demoApi.getMyCourseIds()).includes(lesson.courseId)) return null;
    return lessonMedia.find((m) => m.lessonId === lessonId) ?? null;
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
    state.posts = [
      { id: uid(), channel, authorId: u.id, authorName: firstName(), body: body.trim(), kind, feeling, createdAt: new Date().toISOString(), reactions: [] },
      ...state.posts,
    ];
  },
  async deletePost(id) {
    state.posts = state.posts.filter((p) => p.id !== id || p.authorId !== state.user?.id);
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
    state.comments = [
      ...state.comments,
      { id, postId, authorId: u.id, authorName: firstName(), body: body.trim(), createdAt: new Date().toISOString() },
    ];
    // Na demonstração, quem pediu ajuda agradece a resposta: dá para ver os pontos subirem.
    const post = state.posts.find((p) => p.id === postId);
    if (post && post.authorId !== u.id && post.authorId.startsWith('demo-')) {
      state.thanks = [
        ...state.thanks,
        { giverId: post.authorId, receiverId: u.id, points: THANK_POINTS.fromPostAuthor, createdAt: new Date().toISOString(), target: `comment:${id}` },
      ];
    }
  },
  async setReaction(postId, kind, on) {
    const u = me();
    state.posts = state.posts.map((p) => {
      if (p.id !== postId) return p;
      const rest = p.reactions.filter((r) => !(r.userId === u.id && r.kind === kind));
      return { ...p, reactions: on ? [...rest, { userId: u.id, kind }] : rest };
    });
  },
  async thank(target) {
    const u = me();
    const key = `${target.type}:${target.id}`;
    if (state.thanks.some((t) => t.giverId === u.id && t.target === key)) throw new Error('Você já agradeceu.');
    if (state.thanks.filter((t) => t.giverId === u.id && t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length >= THANKS_PER_DAY) {
      throw new Error('Você já deu 10 agradecimentos hoje. Amanhã tem mais.');
    }
    let receiverId: string | undefined;
    let points: number = THANK_POINTS.item;
    if (target.type === 'post') receiverId = state.posts.find((p) => p.id === target.id)?.authorId;
    if (target.type === 'comment') {
      const c = state.comments.find((x) => x.id === target.id);
      receiverId = c?.authorId;
      if (c && state.posts.find((p) => p.id === c.postId)?.authorId === u.id) points = THANK_POINTS.fromPostAuthor;
    }
    if (target.type === 'advice') {
      receiverId = state.advice.find((a) => a.id === target.id)?.counselorId;
      points = THANK_POINTS.advice;
    }
    if (!receiverId) throw new Error('Não encontrado.');
    if (receiverId === u.id) throw new Error('Não dá para agradecer a si mesmo.');
    state.thanks = [...state.thanks, { giverId: u.id, receiverId, points, createdAt: new Date().toISOString(), target: key }];
  },
  async report() {
    await wait();
  },

  async getMyKindness() {
    const u = me();
    const { points, givers } = computeKindness(state.thanks, u.id);
    const givenToday = state.thanks.filter((t) => t.giverId === u.id && t.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
    return { points, givers, level: levelFor(points, givers).level, givenToday };
  },
  async getRewardClaims() {
    return [...state.claims];
  },
  async claimReward(rewardId) {
    if (state.claims.some((c) => c.rewardId === rewardId)) return;
    state.claims = [...state.claims, { rewardId, status: 'solicitado', createdAt: new Date().toISOString() }];
  },

  async listCounselors() {
    await wait();
    return DEMO_PEOPLE.filter((p) => p.counselor).map((p) => ({ userId: p.id, name: p.name, bio: p.counselor!.bio, topics: p.counselor!.topics, level: p.level }));
  },
  async getMyCounselorProfile() {
    return state.counselor;
  },
  async saveCounselorProfile(profile) {
    const u = me();
    const { points, givers } = computeKindness(state.thanks, u.id);
    if (levelFor(points, givers).level < 6) throw new Error('O espaço de conselheiro abre no nível Farol.');
    state.counselor = profile;
  },
  async getAdviceRequests() {
    return [...state.advice].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async createAdviceRequest(counselorId, topic, message) {
    const u = me();
    const counselor = DEMO_PEOPLE.find((p) => p.id === counselorId);
    if (!counselor?.counselor) throw new Error('Este conselheiro não está recebendo pedidos agora.');
    if (state.advice.filter((a) => a.requesterId === u.id && (a.status === 'pendente' || a.status === 'aceito')).length >= 3) {
      throw new Error('Você já tem 3 conversas abertas. Encerre uma para pedir outra.');
    }
    const now = new Date().toISOString();
    const id = uid();
    // Na demonstração, a conselheira aceita na hora e responde.
    state.advice = [
      { id, requesterId: u.id, requesterName: firstName(), counselorId, counselorName: counselor.name, topic: topic.trim(), message: message.trim(), status: 'aceito', createdAt: now, updatedAt: now },
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
  async saveDiagnostic(answers, scores, recommendedTrackId) {
    state.diagnostic = { id: uid(), createdAt: new Date().toISOString(), answers, scores, recommendedTrackId };
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
};
