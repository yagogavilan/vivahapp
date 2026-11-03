/**
 * Backend de demonstração, em memória. Usa o mesmo catálogo do seed e
 * simula uma aluna que já comprou o Protocolo e o Calma em 5 Minutos.
 */
import { DEMO_CODE } from '../lib/config';
import { addDays, dayKey, spDateTime } from '../domain/dates';
import { buildEscudo, buildLives } from '../domain/schedule';
import type { Api, SessionUser } from './api';
import { courses, diagnosticQuestions, lessonMedia, lessons, modules, products, tracks } from './catalog';
import type { AgendaEvent, Checkin, Comment, DiagnosticResult, LessonProgress, Post, Profile } from './types';

const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

const today = () => dayKey(new Date());

function initialState() {
  const t = today();
  const author = (name: string) => ({ authorId: `demo-${name}`, authorName: name });
  return {
    user: null as SessionUser | null,
    profile: null as Profile | null,
    owned: new Set(['protocolo-desligando-a-mente', 'calma-em-5-minutos']),
    progress: [] as LessonProgress[],
    lives: buildLives(addDays(t, -7)),
    escudo: buildEscudo(addDays(t, -6), 7),
    posts: [
      { id: 'p1', channel: 'aquecimento', ...author('Marina'), body: 'Ouvi o Escudo de hoje no ônibus e cheguei no trabalho bem mais leve. Obrigada!', createdAt: new Date(Date.now() - 3_600_000).toISOString(), commentCount: 1 },
      { id: 'p2', channel: 'aquecimento', ...author('Carlos'), body: 'Alguém mais acorda de madrugada com a cabeça a mil? Na live de quarta o Edmilson vai falar disso.', createdAt: new Date(Date.now() - 6 * 3_600_000).toISOString(), commentCount: 0 },
      { id: 'p3', channel: 'respira', ...author('Juliana'), body: 'Terminei o dia 7 do Protocolo. O horário da preocupação mudou minhas noites.', createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString(), commentCount: 0 },
    ] as Post[],
    comments: [
      { id: 'c1', postId: 'p1', ...author('Edmilson'), body: 'Que bom, Marina! Um dia de cada vez.', createdAt: new Date(Date.now() - 1_800_000).toISOString() },
    ] as Comment[],
    agenda: [
      { id: 'a1', title: 'Treino leve', kind: 'treino', startsAt: spDateTime(addDays(t, 1), '07:00'), endsAt: spDateTime(addDays(t, 1), '07:30'), liveId: null, notes: null },
      { id: 'a2', title: 'Bloco de foco', kind: 'foco', startsAt: spDateTime(addDays(t, 1), '09:00'), endsAt: spDateTime(addDays(t, 1), '10:30'), liveId: null, notes: null },
    ] as AgendaEvent[],
    diagnostic: null as DiagnosticResult | null,
    checkins: [] as Checkin[],
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
    state.profile = { id: 'demo-user', email: state.user!.email, fullName: null, goal: null, healthConsentAt: null, onboardedAt: null };
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
      publicacoes: state.posts.filter((p) => p.authorId === state.user?.id),
    };
  },

  async getCatalog() {
    await wait();
    return { tracks, courses, modules, lessons, products };
  },
  async getMyCourseIds() {
    return [...courses.filter((c) => c.isFree).map((c) => c.id), ...state.owned];
  },
  async getLessonMedia(lessonId) {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return null;
    if (!lesson.isPreview && !state.owned.has(lesson.courseId)) return null;
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
      .map((p) => ({ ...p, commentCount: state.comments.filter((c) => c.postId === p.id).length }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getPost(id) {
    const p = state.posts.find((x) => x.id === id);
    return p ? { ...p, commentCount: state.comments.filter((c) => c.postId === id).length } : null;
  },
  async createPost(channel, body) {
    const u = me();
    state.posts = [
      { id: uid(), channel, authorId: u.id, authorName: firstName(), body: body.trim(), createdAt: new Date().toISOString(), commentCount: 0 },
      ...state.posts,
    ];
  },
  async deletePost(id) {
    state.posts = state.posts.filter((p) => p.id !== id || p.authorId !== state.user?.id);
  },
  async getComments(postId) {
    return state.comments.filter((c) => c.postId === postId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async createComment(postId, body) {
    const u = me();
    state.comments = [
      ...state.comments,
      { id: uid(), postId, authorId: u.id, authorName: firstName(), body: body.trim(), createdAt: new Date().toISOString() },
    ];
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
    state.checkins = [...state.checkins.filter((x) => x.day !== c.day), c];
  },
};
