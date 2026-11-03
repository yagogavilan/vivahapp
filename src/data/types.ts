export type LifeArea = 'mente' | 'tempo' | 'carreira' | 'financas' | 'corpo' | 'alimentacao';

export type TrackStatus = 'live' | 'soon';

export interface Track {
  id: string;
  title: string;
  area: LifeArea;
  areaLabel: string;
  subtitle: string;
  description: string;
  promise: string;
  teacher: string;
  status: TrackStatus;
  launchLabel: string;
  sort: number;
}

export type CourseKind = 'entrada' | 'bonus' | 'programa' | 'acompanhamento';

export interface Course {
  id: string;
  trackId: string;
  title: string;
  kind: CourseKind;
  summary: string;
  priceLabel: string | null;
  sort: number;
  /** Incluído na Assinatura Vivah. */
  inSubscription: boolean;
  /** Aberto para qualquer pessoa com conta (Área de Aquecimento). */
  isFree: boolean;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  sort: number;
}

export type LessonKind = 'video' | 'audio' | 'texto';

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  summary: string;
  kind: LessonKind;
  durationMin: number;
  sort: number;
  /** Aula de amostra: aberta mesmo sem acesso ao curso. */
  isPreview: boolean;
}

/** Conteúdo protegido da aula: só chega a quem tem acesso. */
export interface LessonMedia {
  lessonId: string;
  mediaUrl: string | null;
  body: string | null;
}

export interface Product {
  id: string;
  name: string;
  hotmartProductId: string | null;
  checkoutUrl: string | null;
  courseIds: string[];
}

export interface Live {
  id: string;
  title: string;
  description: string;
  trackId: string | null;
  host: string;
  startsAt: string;
  endsAt: string;
  youtubeId: string | null;
  replayUntil: string | null;
}

export interface EscudoAudio {
  id: string;
  publishDate: string;
  title: string;
  summary: string;
  audioUrl: string | null;
  durationMin: number;
}

export interface Post {
  id: string;
  channel: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  commentCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export type AgendaKind = 'live' | 'aula' | 'foco' | 'treino' | 'refeicao' | 'pessoal';

export interface AgendaEvent {
  id: string;
  title: string;
  kind: AgendaKind;
  startsAt: string;
  endsAt: string;
  liveId: string | null;
  notes: string | null;
}

export interface DiagnosticOption {
  label: string;
  /** 0 = está bem, 3 = precisa de atenção. */
  score: number;
}

export interface DiagnosticQuestion {
  id: string;
  area: LifeArea;
  prompt: string;
  options: DiagnosticOption[];
  sort: number;
}

export interface DiagnosticResult {
  id: string;
  createdAt: string;
  answers: Record<string, number>;
  scores: Record<LifeArea, number>;
  recommendedTrackId: string;
}

export interface Checkin {
  day: string;
  mood: number;
  energy: number;
  sleepHours: number;
  sleepQuality: number;
  note: string | null;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  goal: string | null;
  healthConsentAt: string | null;
  onboardedAt: string | null;
}

export interface LessonProgress {
  lessonId: string;
  positionSec: number;
  completedAt: string | null;
}
