import type {
  AdviceMessage,
  AdviceRequest,
  AdviceStatus,
  Counselor,
  CounselorProfile,
  Feeling,
  DailyLog,
  PointEvent,
  PointsSummary,
  Redemption,
  SupportAction,
  SupportStatus,
  PostKind,
  ReactionKind,
  ThankTarget,
  Activity,
  ActivityKind,
  AgendaEvent,
  Favorite,
  Checkin,
  Comment,
  Course,
  DiagnosticQuestion,
  DiagnosticResult,
  EscudoAudio,
  Lesson,
  LessonKind,
  LessonMedia,
  LowTicketFormat,
  LessonProgress,
  LifeArea,
  Live,
  Module,
  Post,
  Product,
  Profile,
  StoreItem,
  Track,
} from './types';

import type { Entry } from '../domain/panels';

/** Registro do painel da trilha para salvar (sem id cria; com id edita). */
export interface TrackEntryInput {
  id?: string;
  trackId: string;
  metric: string;
  day?: string;
  /** '' = um por dia; outro valor = vários no dia ou itens de lista. */
  key?: string;
  value: number | null;
  data: Record<string, unknown>;
}

export interface SessionUser {
  id: string;
  email: string;
}

export interface Catalog {
  tracks: Track[];
  courses: Course[];
  modules: Module[];
  lessons: Lesson[];
  products: Product[];
  storeItems: StoreItem[];
}

/** Curso como o admin edita (o id é gerado no app a partir do título). */
export interface AdminCourseInput {
  id: string;
  trackId: string;
  title: string;
  summary: string;
  lowTicket: boolean;
  format: LowTicketFormat | null;
  priceLabel: string | null;
  sort: number;
}

export interface AdminModuleInput {
  id: string;
  courseId: string;
  title: string;
  sort: number;
}

export interface AdminLessonInput {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  summary: string;
  kind: LessonKind;
  durationMin: number;
  sort: number;
  isPreview: boolean;
  mediaUrl: string | null;
  body: string | null;
}

export type AdminTrackPatch = Partial<Pick<Track, 'priceLabel' | 'status' | 'launchLabel'>>;

export type ProfilePatch = Partial<Pick<Profile, 'fullName' | 'goal' | 'healthConsentAt' | 'onboardedAt' | 'preferences'>>;

/** Tudo o que o app pede ao backend. Há duas implementações: Supabase e demonstração. */
export interface Api {
  readonly mode: 'supabase' | 'demo';

  getSessionUser(): Promise<SessionUser | null>;
  onAuthChange(listener: (user: SessionUser | null) => void): () => void;
  /** Entrar com e-mail e senha. */
  signIn(email: string, password: string): Promise<void>;
  /** Criar conta. needsCode = a conta só abre depois do código enviado por e-mail. */
  signUp(name: string, email: string, password: string): Promise<{ needsCode: boolean }>;
  confirmSignUp(email: string, code: string): Promise<void>;
  resendSignUpCode(email: string): Promise<void>;
  /** Esqueci a senha: envia um código e depois troca a senha com ele. */
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  /** Entrar só com código por e-mail (usado como alternativa). */
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;

  getProfile(): Promise<Profile>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  exportMyData(): Promise<unknown>;

  getCatalog(): Promise<Catalog>;
  getMyCourseIds(): Promise<string[]>;
  getLessonMedia(lessonId: string): Promise<LessonMedia | null>;
  getProgress(): Promise<LessonProgress[]>;
  saveProgress(lessonId: string, positionSec: number, completed: boolean): Promise<void>;

  getLives(): Promise<Live[]>;
  getEscudo(): Promise<EscudoAudio[]>;

  getPosts(channel: string): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  createPost(channel: string, body: string, kind?: PostKind, feeling?: Feeling | null): Promise<void>;
  deletePost(id: string): Promise<void>;
  getComments(postId: string): Promise<Comment[]>;
  createComment(postId: string, body: string): Promise<void>;
  setReaction(postId: string, kind: ReactionKind, on: boolean): Promise<void>;
  /** "Obrigado": quem recebe e quantos pontos vale, o servidor decide. */
  thank(target: ThankTarget): Promise<void>;
  report(targetType: 'post' | 'comment' | 'advice' | 'user', targetId: string, reason: string): Promise<void>;

  /** Pede ao servidor para validar as mensagens que valem pontos (ajuda e conselho). */
  validateContributions(): Promise<void>;

  getPointsSummary(trackId: string): Promise<PointsSummary>;
  getPointEvents(trackId: string): Promise<PointEvent[]>;
  getRedemptions(): Promise<Redemption[]>;
  redeemReward(rewardId: string): Promise<void>;

  getDailyLogs(trackId: string, days: number): Promise<DailyLog[]>;
  /** Salva o plano ou o fechamento de hoje (o servidor grava o dia de Brasília). */
  saveDailyLog(log: Omit<DailyLog, 'day'>): Promise<void>;

  getSupportActions(): Promise<SupportAction[]>;
  offerSupport(input: { postId: string; mode: 'agenda' | 'plano'; message: string; items: string[]; scheduledAt: string | null }): Promise<void>;
  setSupportStatus(id: string, status: SupportStatus): Promise<void>;

  listCounselors(trackId: string): Promise<Counselor[]>;
  getMyCounselorProfile(trackId: string): Promise<CounselorProfile | null>;
  saveCounselorProfile(trackId: string, profile: CounselorProfile): Promise<void>;
  getAdviceRequests(): Promise<AdviceRequest[]>;
  createAdviceRequest(counselorId: string, trackId: string, topic: string, message: string): Promise<string>;
  setAdviceStatus(id: string, status: AdviceStatus): Promise<void>;
  getAdviceMessages(requestId: string): Promise<AdviceMessage[]>;
  sendAdviceMessage(requestId: string, body: string): Promise<void>;

  getAgenda(): Promise<AgendaEvent[]>;
  createAgendaEvent(event: Omit<AgendaEvent, 'id'>): Promise<void>;
  deleteAgendaEvent(id: string): Promise<void>;

  getDiagnosticQuestions(): Promise<DiagnosticQuestion[]>;
  getLatestDiagnostic(): Promise<DiagnosticResult | null>;
  saveDiagnostic(answers: Record<string, number>, scores: Record<LifeArea, number>, recommendedTrackId: string, moment?: string): Promise<void>;

  getCheckins(days: number): Promise<Checkin[]>;
  saveCheckin(checkin: Checkin): Promise<void>;

  /** Atividade dos últimos `days` dias (sequência, plano do dia e conquistas). */
  getActivity(days: number): Promise<Activity[]>;
  /** Registra uma atividade de hoje. Repetir a mesma atividade no dia não duplica. */
  logActivity(kind: ActivityKind, ref?: string, minutes?: number): Promise<void>;

  getNote(lessonId: string): Promise<string>;
  saveNote(lessonId: string, body: string): Promise<void>;

  getFavorites(): Promise<Favorite[]>;
  setFavorite(itemType: Favorite['itemType'], itemId: string, on: boolean): Promise<void>;

  // Painel da trilha (água, peso, treinos, sono, gastos, conquistas…).
  /** Registros das trilhas `stores` desde `sinceDay`, mais perfis e itens de qualquer data. */
  getTrackEntries(stores: string[], sinceDay: string): Promise<Entry[]>;
  saveTrackEntry(entry: TrackEntryInput): Promise<void>;
  deleteTrackEntry(id: string): Promise<void>;
  /** Soma num contador do dia (pode ser negativo para desfazer) e devolve o total. */
  addTrackCounter(trackId: string, metric: string, delta: number): Promise<number>;

  // Página de admin (o banco só aceita de quem tem role admin).
  adminUpdateTrack(id: string, patch: AdminTrackPatch): Promise<void>;
  adminSaveCourse(course: AdminCourseInput): Promise<void>;
  adminDeleteCourse(id: string): Promise<void>;
  adminSaveModule(mod: AdminModuleInput): Promise<void>;
  adminDeleteModule(id: string): Promise<void>;
  adminSaveLesson(lesson: AdminLessonInput): Promise<void>;
  adminDeleteLesson(id: string): Promise<void>;
  /** Grava a nova ordem (sort = posição na lista). */
  adminReorder(kind: 'courses' | 'modules' | 'lessons', orderedIds: string[]): Promise<void>;
  /** Link de pagamento do produto (assinatura da trilha ou low ticket). */
  adminSetCheckout(productId: string, checkoutUrl: string | null): Promise<void>;
  /** Loja: produtos físicos (criar ou editar). */
  adminSaveStoreItem(item: StoreItem): Promise<void>;
  adminDeleteStoreItem(id: string): Promise<void>;
}
