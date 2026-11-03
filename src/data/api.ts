import type {
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
  createPost(channel: string, body: string): Promise<void>;
  deletePost(id: string): Promise<void>;
  getComments(postId: string): Promise<Comment[]>;
  createComment(postId: string, body: string): Promise<void>;

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
