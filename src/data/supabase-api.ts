import { requireSupabase } from '../lib/supabase';
import type { Api, Catalog, ProfilePatch, SessionUser } from './api';
import type {
  AgendaEvent,
  Checkin,
  Comment,
  DiagnosticQuestion,
  DiagnosticResult,
  EscudoAudio,
  LessonMedia,
  LessonProgress,
  LifeArea,
  Live,
  Post,
  Profile,
} from './types';

type Row = Record<string, any>;

/** Lança o erro do Supabase com uma mensagem que dá para mostrar ao aluno. */
function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const toProfile = (r: Row): Profile => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  goal: r.goal,
  healthConsentAt: r.health_consent_at,
  onboardedAt: r.onboarded_at,
});

const toPost = (r: Row): Post => ({
  id: r.id,
  channel: r.channel,
  authorId: r.author_id,
  authorName: r.author_name,
  body: r.body,
  createdAt: r.created_at,
  commentCount: r.comment_count ?? 0,
});

async function currentUserId(): Promise<string> {
  const { data } = await requireSupabase().auth.getUser();
  if (!data.user) throw new Error('Sua sessão expirou. Entre de novo.');
  return data.user.id;
}

const toSessionUser = (u: { id: string; email?: string | null } | null | undefined): SessionUser | null =>
  u ? { id: u.id, email: (u.email ?? '').toLowerCase() } : null;

export const supabaseApi: Api = {
  mode: 'supabase',

  async getSessionUser() {
    const { data } = await requireSupabase().auth.getSession();
    return toSessionUser(data.session?.user);
  },

  onAuthChange(listener) {
    const { data } = requireSupabase().auth.onAuthStateChange((_event, session) => listener(toSessionUser(session?.user)));
    return () => data.subscription.unsubscribe();
  },

  async requestCode(email) {
    const { error } = await requireSupabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) throw new Error(error.message);
  },

  async verifyCode(email, code) {
    const { error } = await requireSupabase().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (error) throw new Error('Código inválido ou expirado. Peça um novo código.');
  },

  async signOut() {
    await requireSupabase().auth.signOut();
  },

  async deleteAccount() {
    const sb = requireSupabase();
    const { error } = await sb.functions.invoke('delete-account', { method: 'POST' });
    if (error) throw new Error('Não foi possível apagar a conta agora. Tente de novo ou fale com o suporte.');
    await sb.auth.signOut();
  },

  async getProfile() {
    const id = await currentUserId();
    return toProfile(check(await requireSupabase().from('profiles').select('*').eq('id', id).single()) as Row);
  },

  async updateProfile(patch: ProfilePatch) {
    const id = await currentUserId();
    const row: Row = {};
    if ('fullName' in patch) row.full_name = patch.fullName;
    if ('goal' in patch) row.goal = patch.goal;
    if ('healthConsentAt' in patch) row.health_consent_at = patch.healthConsentAt;
    if ('onboardedAt' in patch) row.onboarded_at = patch.onboardedAt;
    return toProfile(check(await requireSupabase().from('profiles').update(row).eq('id', id).select('*').single()) as Row);
  },

  async exportMyData() {
    return check(await requireSupabase().rpc('export_my_data'));
  },

  async getCatalog(): Promise<Catalog> {
    const sb = requireSupabase();
    const [tracks, courses, modules, lessons, products, links] = await Promise.all([
      sb.from('tracks').select('*').order('sort'),
      sb.from('courses').select('*').order('sort'),
      sb.from('modules').select('*').order('sort'),
      sb.from('lessons').select('*').order('sort'),
      sb.from('products').select('*'),
      sb.from('product_courses').select('*'),
    ]);
    const linkRows = check(links) as Row[];
    return {
      tracks: (check(tracks) as Row[]).map((r) => ({
        id: r.id,
        title: r.title,
        area: r.area,
        areaLabel: r.area_label,
        subtitle: r.subtitle,
        description: r.description,
        promise: r.promise,
        teacher: r.teacher,
        status: r.status,
        launchLabel: r.launch_label,
        sort: r.sort,
      })),
      courses: (check(courses) as Row[]).map((r) => ({
        id: r.id,
        trackId: r.track_id,
        title: r.title,
        kind: r.kind,
        summary: r.summary,
        priceLabel: r.price_label,
        sort: r.sort,
        inSubscription: r.in_subscription,
        isFree: r.is_free,
      })),
      modules: (check(modules) as Row[]).map((r) => ({ id: r.id, courseId: r.course_id, title: r.title, sort: r.sort })),
      lessons: (check(lessons) as Row[]).map((r) => ({
        id: r.id,
        moduleId: r.module_id,
        courseId: r.course_id,
        title: r.title,
        summary: r.summary,
        kind: r.kind,
        durationMin: r.duration_min,
        sort: r.sort,
        isPreview: r.is_preview,
      })),
      products: (check(products) as Row[]).map((r) => ({
        id: r.id,
        name: r.name,
        hotmartProductId: r.hotmart_product_id,
        checkoutUrl: r.checkout_url,
        courseIds: linkRows.filter((l) => l.product_id === r.id).map((l) => l.course_id),
      })),
    };
  },

  async getMyCourseIds() {
    const rows = check(await requireSupabase().rpc('my_course_ids')) as unknown;
    return (rows as (string | Row)[]).map((r) => (typeof r === 'string' ? r : (r.my_course_ids as string)));
  },

  async getLessonMedia(lessonId): Promise<LessonMedia | null> {
    const r = check(await requireSupabase().from('lesson_media').select('*').eq('lesson_id', lessonId).maybeSingle()) as Row | null;
    return r ? { lessonId: r.lesson_id, mediaUrl: r.media_url, body: r.body } : null;
  },

  async getProgress(): Promise<LessonProgress[]> {
    const rows = check(await requireSupabase().from('lesson_progress').select('*')) as Row[];
    return rows.map((r) => ({ lessonId: r.lesson_id, positionSec: r.position_sec, completedAt: r.completed_at }));
  },

  async saveProgress(lessonId, positionSec, completed) {
    const sb = requireSupabase();
    const user_id = await currentUserId();
    const existing = check(
      await sb.from('lesson_progress').select('completed_at').eq('lesson_id', lessonId).maybeSingle(),
    ) as Row | null;
    check(
      await sb.from('lesson_progress').upsert({
        user_id,
        lesson_id: lessonId,
        position_sec: Math.max(0, Math.round(positionSec)),
        // Uma aula concluída continua concluída.
        completed_at: completed ? existing?.completed_at ?? new Date().toISOString() : existing?.completed_at ?? null,
        updated_at: new Date().toISOString(),
      }),
    );
  },

  async getLives(): Promise<Live[]> {
    const rows = check(await requireSupabase().from('lives').select('*').order('starts_at')) as Row[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      trackId: r.track_id,
      host: r.host,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      youtubeId: r.youtube_id,
      replayUntil: r.replay_until,
    }));
  },

  async getEscudo(): Promise<EscudoAudio[]> {
    const rows = check(
      await requireSupabase().from('escudo_audios').select('*').order('publish_date', { ascending: false }).limit(30),
    ) as Row[];
    return rows.map((r) => ({
      id: r.id,
      publishDate: r.publish_date,
      title: r.title,
      summary: r.summary,
      audioUrl: r.audio_url,
      durationMin: r.duration_min,
    }));
  },

  async getPosts(channel) {
    const rows = check(
      await requireSupabase().from('posts_feed').select('*').eq('channel', channel).order('created_at', { ascending: false }).limit(50),
    ) as Row[];
    return rows.map(toPost);
  },

  async getPost(id) {
    const r = check(await requireSupabase().from('posts_feed').select('*').eq('id', id).maybeSingle()) as Row | null;
    return r ? toPost(r) : null;
  },

  async createPost(channel, body) {
    check(await requireSupabase().from('posts').insert({ channel, body: body.trim() }));
  },

  async deletePost(id) {
    check(await requireSupabase().from('posts').delete().eq('id', id));
  },

  async getComments(postId): Promise<Comment[]> {
    const rows = check(
      await requireSupabase().from('comments').select('*').eq('post_id', postId).eq('hidden', false).order('created_at'),
    ) as Row[];
    return rows.map((r) => ({
      id: r.id,
      postId: r.post_id,
      authorId: r.author_id,
      authorName: r.author_name,
      body: r.body,
      createdAt: r.created_at,
    }));
  },

  async createComment(postId, body) {
    check(await requireSupabase().from('comments').insert({ post_id: postId, body: body.trim() }));
  },

  async getAgenda(): Promise<AgendaEvent[]> {
    const from = new Date(Date.now() - 86_400_000).toISOString();
    const rows = check(
      await requireSupabase().from('agenda_events').select('*').gte('starts_at', from).order('starts_at'),
    ) as Row[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      liveId: r.live_id,
      notes: r.notes,
    }));
  },

  async createAgendaEvent(e) {
    check(
      await requireSupabase().from('agenda_events').insert({
        title: e.title,
        kind: e.kind,
        starts_at: e.startsAt,
        ends_at: e.endsAt,
        live_id: e.liveId,
        notes: e.notes,
      }),
    );
  },

  async deleteAgendaEvent(id) {
    check(await requireSupabase().from('agenda_events').delete().eq('id', id));
  },

  async getDiagnosticQuestions(): Promise<DiagnosticQuestion[]> {
    const rows = check(await requireSupabase().from('diagnostic_questions').select('*').order('sort')) as Row[];
    return rows.map((r) => ({ id: r.id, area: r.area, prompt: r.prompt, options: r.options, sort: r.sort }));
  },

  async getLatestDiagnostic(): Promise<DiagnosticResult | null> {
    const r = check(
      await requireSupabase().from('diagnostic_results').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ) as Row | null;
    return r
      ? { id: r.id, createdAt: r.created_at, answers: r.answers, scores: r.scores, recommendedTrackId: r.recommended_track }
      : null;
  },

  async saveDiagnostic(answers, scores: Record<LifeArea, number>, recommendedTrackId) {
    check(await requireSupabase().from('diagnostic_results').insert({ answers, scores, recommended_track: recommendedTrackId }));
  },

  async getCheckins(days): Promise<Checkin[]> {
    const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const rows = check(
      await requireSupabase().from('checkins').select('*').gte('day', from).order('day', { ascending: false }),
    ) as Row[];
    return rows.map((r) => ({
      day: r.day,
      mood: r.mood,
      energy: r.energy,
      sleepHours: Number(r.sleep_hours),
      sleepQuality: r.sleep_quality,
      note: r.note,
    }));
  },

  async saveCheckin(c) {
    const user_id = await currentUserId();
    check(
      await requireSupabase().from('checkins').upsert({
        user_id,
        day: c.day,
        mood: c.mood,
        energy: c.energy,
        sleep_hours: c.sleepHours,
        sleep_quality: c.sleepQuality,
        note: c.note,
      }),
    );
  },
};
