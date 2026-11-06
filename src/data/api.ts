import type {
  AdviceMessage,
  AdviceRequest,
  AdviceStatus,
  Counselor,
  CounselorProfile,
  Feeling,
  KindnessSummary,
  PostKind,
  ReactionKind,
  RewardClaim,
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
  LessonMedia,
  LessonProgress,
  LifeArea,
  Live,
  Module,
  Post,
  Product,
  Profile,
  Track,
} from './types';

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
}

export type ProfilePatch = Partial<Pick<Profile, 'fullName' | 'goal' | 'healthConsentAt' | 'onboardedAt' | 'preferences'>>;

/** Tudo o que o app pede ao backend. Há duas implementações: Supabase e demonstração. */
export interface Api {
  readonly mode: 'supabase' | 'demo';

  getSessionUser(): Promise<SessionUser | null>;
  onAuthChange(listener: (user: SessionUser | null) => void): () => void;
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

  getMyKindness(): Promise<KindnessSummary>;
  getRewardClaims(): Promise<RewardClaim[]>;
  claimReward(rewardId: string): Promise<void>;

  listCounselors(): Promise<Counselor[]>;
  getMyCounselorProfile(): Promise<CounselorProfile | null>;
  saveCounselorProfile(profile: CounselorProfile): Promise<void>;
  getAdviceRequests(): Promise<AdviceRequest[]>;
  createAdviceRequest(counselorId: string, topic: string, message: string): Promise<string>;
  setAdviceStatus(id: string, status: AdviceStatus): Promise<void>;
  getAdviceMessages(requestId: string): Promise<AdviceMessage[]>;
  sendAdviceMessage(requestId: string, body: string): Promise<void>;

  getAgenda(): Promise<AgendaEvent[]>;
  createAgendaEvent(event: Omit<AgendaEvent, 'id'>): Promise<void>;
  deleteAgendaEvent(id: string): Promise<void>;

  getDiagnosticQuestions(): Promise<DiagnosticQuestion[]>;
  getLatestDiagnostic(): Promise<DiagnosticResult | null>;
  saveDiagnostic(answers: Record<string, number>, scores: Record<LifeArea, number>, recommendedTrackId: string): Promise<void>;

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
}
