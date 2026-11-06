/**
 * Backend de demonstração, em memória. Usa o mesmo catálogo do seed e
 * simula uma aluna que já comprou o Protocolo e o Calma em 5 Minutos.
 */
import { DEMO_CODE } from '../lib/config';
import { addDays, dayKey, spDateTime } from '../domain/dates';
import { buildEscudo, buildLives } from '../domain/schedule';
import type { Api, SessionUser } from './api';
import { courses, diagnosticQuestions, lessonMedia, lessons, modules, products, tracks } from './catalog';
import { judgeContribution } from '../../supabase/functions/_shared/contribution';
import { levelFor } from '../domain/kindness';
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
  Redemption,
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
    owned: new Set(['protocolo-desligando-a-mente', 'calma-em-5-minutos']),
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
  const channel = state.posts.find((p) => p.id === c.postId)?.channel ?? 'aquecimento';
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
  const scores: Record<string, number[]> = { respira: [48, 55, 52, 61, 58, 66, 70, 63, 72, 69, 75, 78, 74], aquecimento: [60, 70, 65, 80] };
  for (const [trackId, list] of Object.entries(scores)) {
    list.forEach((score, i) => {
      state.logs.push({ day: addDays(t, -(list.length - i)), trackId, kind: 'fechamento', data: {}, score, valid: true });
    });
  }
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
    seedHistory();
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
      pontos: state.ledger.filter((e) => e.userId === state.user?.id),
      resgates: state.redemptions,
      planos_e_fechamentos: state.logs,
      apoios: state.support,
      conselhos: state.advice,
    };
  },

  async getCatalog() {
    await wait();
    return { tracks, courses, modules, lessons, products };
  },
  async getMyCourseIds() {
    const uid_ = state.user?.id;
    const maxLevel = uid_ ? Math.max(1, ...tracks.map((t) => levelOf(uid_, t.id)), levelOf(uid_, 'aquecimento')) : 1;
    const exclusive = courses.filter((c) => c.minKindnessLevel != null && maxLevel >= c.minKindnessLevel).map((c) => c.id);
    const redeemed = state.redemptions
      .filter((r) => r.status !== 'cancelado')
      .map((r) => TRACK_REWARDS.find((x) => x.id === r.rewardId)?.courseId)
      .filter((x): x is string => Boolean(x));
    return [...courses.filter((c) => c.isFree).map((c) => c.id), ...state.owned, ...exclusive, ...redeemed];
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
    let trackId = 'aquecimento';
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
