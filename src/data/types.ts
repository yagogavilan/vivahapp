import type { NotificationKind, PushSettings } from '../../supabase/functions/_shared/push';

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
  /** Preço da assinatura anual da trilha (só aparece na web). */
  priceLabel: string | null;
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
  /** Aberto para qualquer pessoa com conta, sem assinatura. */
  isFree: boolean;
  /** Conteúdo exclusivo liberado pelo nível de bondade (não é vendido). */
  minKindnessLevel: number | null;
  /** Só abre resgatando uma recompensa com pontos (não é vendido). */
  rewardOnly: boolean;
  /** Low ticket: mini produto vendido à parte (aula curta, planilha ou ferramenta). Fora da sequência da trilha. */
  lowTicket: boolean;
  format: LowTicketFormat | null;
}

export type LowTicketFormat = 'aula' | 'planilha' | 'ferramenta';

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

/** Produto físico da loja (vendido fora do app, com checkout próprio). Não confundir com recompensas de pontos. */
export interface StoreItem {
  id: string;
  /** null = aparece em todas as trilhas. */
  trackId: string | null;
  title: string;
  description: string;
  priceLabel: string | null;
  imageUrl: string | null;
  checkoutUrl: string | null;
  active: boolean;
  sort: number;
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

export type Feeling = 'ansiedade' | 'tristeza' | 'cansaco' | 'sobrecarga' | 'irritacao' | 'calma' | 'animo';

/** Pedir apoio, desabafar, contar uma conquista ou dar uma dica. */
export type PostKind = 'apoio' | 'desabafo' | 'conquista' | 'dica';

export type ReactionKind = 'like' | 'abraco' | 'forca' | 'parabens' | 'tocou';

export interface Post {
  id: string;
  channel: string;
  authorId: string;
  authorName: string;
  /** Nível de bondade de quem escreveu (99 = equipe Vivah). */
  authorLevel: number;
  body: string;
  kind: PostKind;
  feeling: Feeling | null;
  createdAt: string;
  commentCount: number;
  reactions: Partial<Record<ReactionKind, number>>;
  myReactions: ReactionKind[];
  thanksCount: number;
  iThanked: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorLevel: number;
  body: string;
  createdAt: string;
  thanksCount: number;
  iThanked: boolean;
}

export type ThankTarget = { type: 'post' | 'comment' | 'advice'; id: string };

export type PointKind = 'curtida' | 'agradecimento' | 'ajuda' | 'conselho' | 'apoio';
export type PointStatus = 'pendente' | 'valido' | 'recusado';

/** Uma linha do extrato de pontos. */
export interface PointEvent {
  id: string;
  trackId: string;
  kind: PointKind;
  points: number;
  status: PointStatus;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface PointsSummary {
  /** Pontos validados ganhos na trilha (definem o nível). */
  earned: number;
  /** Pessoas diferentes que geraram pontos. */
  givers: number;
  spent: number;
  /** Saldo para resgatar recompensas. */
  balance: number;
  level: number;
}

export interface Redemption {
  id: string;
  rewardId: string;
  trackId: string;
  cost: number;
  status: 'liberado' | 'solicitado' | 'enviado' | 'entregue' | 'cancelado';
  createdAt: string;
}

export type LogValues = Record<string, string | number | boolean | string[] | number[] | undefined>;

/** Plano (manhã) ou fechamento (noite) do dia numa trilha. */
export interface DailyLog {
  day: string;
  trackId: string;
  kind: 'plano' | 'fechamento';
  data: LogValues;
  score: number | null;
  valid: boolean;
}

export type SupportStatus = 'oferecido' | 'aceito' | 'recusado' | 'concluido' | 'cancelado';

/** Apoio a outra pessoa: um horário marcado ou algo montado para ela. */
export interface SupportAction {
  id: string;
  trackId: string;
  postId: string;
  helperId: string;
  helperName: string;
  helpedId: string;
  helpedName: string;
  mode: 'agenda' | 'plano';
  message: string;
  items: string[];
  scheduledAt: string | null;
  status: SupportStatus;
  createdAt: string;
}

export interface Counselor {
  userId: string;
  name: string;
  bio: string;
  topics: string[];
  level: number;
}

export interface CounselorProfile {
  bio: string;
  topics: string[];
  isOpen: boolean;
}

export type AdviceStatus = 'pendente' | 'aceito' | 'recusado' | 'encerrado';

export interface AdviceRequest {
  id: string;
  trackId: string;
  requesterId: string;
  requesterName: string;
  counselorId: string;
  counselorName: string;
  topic: string;
  message: string;
  status: AdviceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdviceMessage {
  id: string;
  requestId: string;
  senderId: string;
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
  /** Momento de vida do teste do primeiro acesso (reequilibrio, organizacao, estabilidade, crescimento). */
  moment: string | null;
}

export type AlertLevel = 'bem' | 'atencao' | 'critico';

export interface Checkin {
  day: string;
  /** Trilha do check-in. */
  trackId: string;
  answers: Record<string, number | number[] | string>;
  feeling: Feeling | null;
  alertLevel: AlertLevel;
  mood: number;
  energy: number;
  sleepHours: number;
  sleepQuality: number;
  note: string | null;
}

export interface Preferences {
  /** Lembrete diário do Escudo Anticrise, "07:30"; null = desligado. */
  dailyReminder?: string | null;
  /** Lembrete 15 min antes das lives salvas na agenda. */
  liveReminders?: boolean;
  /** Mostrar a sequência de dias na tela Hoje. */
  showStreak?: boolean;
  /** Última trilha (espaço) aberta, destacada na escolha de trilha. */
  lastSpace?: string;
  /** Quando o convite para ativar as notificações foi respondido ("Agora não" ou ativou). */
  pushPromptAt?: string;
}

export interface Profile {
  id: string;
  /** 'admin' abre a página de gestão de cursos. */
  role: 'aluno' | 'admin';
  email: string;
  fullName: string | null;
  goal: string | null;
  healthConsentAt: string | null;
  onboardedAt: string | null;
  preferences: Preferences;
}

export type ActivityKind = 'escudo' | 'aula' | 'checkin' | 'live' | 'foco' | 'diagnostico' | 'post';

export interface Activity {
  day: string;
  kind: ActivityKind;
  ref: string;
  minutes: number;
}

export interface Favorite {
  itemType: 'lesson' | 'escudo';
  itemId: string;
  createdAt: string;
}

export interface LessonProgress {
  lessonId: string;
  positionSec: number;
  completedAt: string | null;
}

// ——— Notificações ———
export type { NotificationKind, PushSettings };

/** Público de um aviso: todos, quem assina a trilha ou quem tem o curso. */
export type NotificationAudience = 'all' | 'track' | 'course';

/** Aviso na caixa do aluno (o sino). */
export interface InboxItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  url: string | null;
  trackId: string | null;
  sentAt: string;
  readAt: string | null;
}

/** O que o admin escreve antes de enviar. */
export interface NotificationDraft {
  kind: NotificationKind;
  title: string;
  body: string;
  url: string | null;
  audience: NotificationAudience;
  trackId: string | null;
  courseId: string | null;
  lessonId: string | null;
}

export type NotificationStatus = 'draft' | 'sending' | 'sent' | 'failed';

/** Aviso no histórico do admin, com os números do envio. */
export interface SentNotification extends NotificationDraft {
  id: string;
  status: NotificationStatus;
  createdAt: string;
  sentAt: string | null;
  recipients: number;
  pushTargets: number;
  pushOk: number;
  pushFailed: number;
  opened: number;
  error: string | null;
}

export interface NotificationReach {
  recipients: number;
  pushTargets: number;
}
