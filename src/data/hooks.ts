import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useSession } from '../auth/session';
import { courseState, type CourseState } from '../domain/access';
import { computeStreak } from '../domain/streak';
import { api } from './index';
import { dayKey } from '../domain/dates';
import type {
  ActivityKind,
  AdviceStatus,
  AgendaEvent,
  Checkin,
  CounselorProfile,
  Course,
  Favorite,
  Feeling,
  LifeArea,
  Post,
  PostKind,
  ReactionKind,
  ThankTarget,
  Track,
} from './types';

/** Chaves de cache por usuário, para nunca misturar dados de contas diferentes. */
function useKey(...parts: unknown[]) {
  const { user } = useSession();
  return [user?.id ?? 'anon', ...parts];
}

export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: () => api.getCatalog(), staleTime: 10 * 60_000 });
}

export function useAccess() {
  const key = useKey('access');
  return useQuery({
    queryKey: key,
    queryFn: async () => new Set(await api.getMyCourseIds()),
    // Volta a conferir quando o app reabre: a compra pode ter caído enquanto isso.
    staleTime: 30_000,
  });
}

/** Catálogo já cruzado com o acesso do aluno. */
export function useLibrary() {
  const catalog = useCatalog();
  const access = useAccess();
  const data = useMemo(() => {
    if (!catalog.data || !access.data) return undefined;
    const trackById = new Map<string, Track>(catalog.data.tracks.map((t) => [t.id, t]));
    const stateOf = (c: Course): CourseState => courseState(c, trackById.get(c.trackId), access.data!);
    return { ...catalog.data, access: access.data, trackById, stateOf };
  }, [catalog.data, access.data]);
  return {
    data,
    isPending: catalog.isPending || access.isPending,
    error: catalog.error ?? access.error,
    refetch: () => Promise.all([catalog.refetch(), access.refetch()]),
    isRefetching: catalog.isRefetching || access.isRefetching,
  };
}

export function useLessonMedia(lessonId: string | undefined) {
  const key = useKey('lesson-media', lessonId);
  return useQuery({ queryKey: key, queryFn: () => api.getLessonMedia(lessonId!), enabled: Boolean(lessonId) });
}

export function useProgress() {
  const key = useKey('progress');
  return useQuery({ queryKey: key, queryFn: () => api.getProgress() });
}

export function useSaveProgress() {
  const qc = useQueryClient();
  const key = useKey('progress');
  return useMutation({
    mutationFn: (v: { lessonId: string; positionSec: number; completed: boolean }) =>
      api.saveProgress(v.lessonId, v.positionSec, v.completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useLives() {
  return useQuery({ queryKey: ['lives'], queryFn: () => api.getLives(), staleTime: 5 * 60_000 });
}

export function useEscudo() {
  return useQuery({ queryKey: ['escudo'], queryFn: () => api.getEscudo(), staleTime: 30 * 60_000 });
}

export function usePosts(channel: string) {
  const key = useKey('posts', channel);
  return useQuery({ queryKey: key, queryFn: () => api.getPosts(channel) });
}

export function usePost(id: string | undefined) {
  const key = useKey('post', id);
  return useQuery({ queryKey: key, queryFn: () => api.getPost(id!), enabled: Boolean(id) });
}

export function useComments(postId: string | undefined) {
  const key = useKey('comments', postId);
  return useQuery({ queryKey: key, queryFn: () => api.getComments(postId!), enabled: Boolean(postId) });
}

export function useCommunityMutations() {
  const qc = useQueryClient();
  const base = useKey();
  const refresh = () => qc.invalidateQueries({ queryKey: base });
  return {
    createPost: useMutation({
      mutationFn: async (v: { channel: string; body: string; kind?: PostKind; feeling?: Feeling | null }) => {
        await api.createPost(v.channel, v.body, v.kind, v.feeling);
        await api.logActivity('post', v.channel).catch(() => undefined);
      },
      onSuccess: refresh,
    }),
    deletePost: useMutation({ mutationFn: (id: string) => api.deletePost(id), onSuccess: refresh }),
    createComment: useMutation({
      mutationFn: async (v: { postId: string; body: string }) => {
        await api.createComment(v.postId, v.body);
        await api.logActivity('post', v.postId).catch(() => undefined);
      },
      onSuccess: refresh,
    }),
    thank: useMutation({ mutationFn: (t: ThankTarget) => api.thank(t), onSuccess: refresh }),
    report: useMutation({
      mutationFn: (v: { type: 'post' | 'comment' | 'advice' | 'user'; id: string; reason: string }) => api.report(v.type, v.id, v.reason),
    }),
  };
}

/** Curtir e reagir com resposta imediata na tela (otimista). */
export function useReact(channel: string) {
  const qc = useQueryClient();
  const key = useKey('posts', channel);
  const base = useKey();
  return useMutation({
    mutationFn: (v: { postId: string; kind: ReactionKind; on: boolean }) => api.setReaction(v.postId, v.kind, v.on),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Post[]>(key);
      const patch = (p: Post): Post => {
        if (p.id !== v.postId) return p;
        const count = (p.reactions[v.kind] ?? 0) + (v.on ? 1 : -1);
        return {
          ...p,
          reactions: { ...p.reactions, [v.kind]: Math.max(0, count) },
          myReactions: v.on ? [...p.myReactions.filter((k) => k !== v.kind), v.kind] : p.myReactions.filter((k) => k !== v.kind),
        };
      };
      if (prev) qc.setQueryData(key, prev.map(patch));
      const single = qc.getQueryData<Post | null>([...base, 'post', v.postId]);
      if (single) qc.setQueryData([...base, 'post', v.postId], patch(single));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: base }),
  });
}

export function useKindness() {
  const key = useKey('kindness');
  return useQuery({ queryKey: key, queryFn: () => api.getMyKindness() });
}

export function useRewardClaims() {
  const key = useKey('reward-claims');
  return useQuery({ queryKey: key, queryFn: () => api.getRewardClaims() });
}

export function useClaimReward() {
  const qc = useQueryClient();
  const key = useKey('reward-claims');
  return useMutation({ mutationFn: (rewardId: string) => api.claimReward(rewardId), onSuccess: () => qc.invalidateQueries({ queryKey: key }) });
}

export function useCounselors() {
  const key = useKey('counselors');
  return useQuery({ queryKey: key, queryFn: () => api.listCounselors() });
}

export function useMyCounselorProfile() {
  const key = useKey('my-counselor');
  return useQuery({ queryKey: key, queryFn: () => api.getMyCounselorProfile() });
}

export function useSaveCounselorProfile() {
  const qc = useQueryClient();
  const base = useKey();
  return useMutation({ mutationFn: (p: CounselorProfile) => api.saveCounselorProfile(p), onSuccess: () => qc.invalidateQueries({ queryKey: base }) });
}

export function useAdviceRequests() {
  const key = useKey('advice');
  return useQuery({ queryKey: key, queryFn: () => api.getAdviceRequests(), refetchInterval: 20_000 });
}

export function useAdviceMessages(requestId: string | undefined) {
  const key = useKey('advice-messages', requestId);
  return useQuery({ queryKey: key, queryFn: () => api.getAdviceMessages(requestId!), enabled: Boolean(requestId), refetchInterval: 10_000 });
}

export function useAdviceMutations() {
  const qc = useQueryClient();
  const base = useKey();
  const refresh = () => qc.invalidateQueries({ queryKey: base });
  return {
    request: useMutation({
      mutationFn: (v: { counselorId: string; topic: string; message: string }) => api.createAdviceRequest(v.counselorId, v.topic, v.message),
      onSuccess: refresh,
    }),
    setStatus: useMutation({ mutationFn: (v: { id: string; status: AdviceStatus }) => api.setAdviceStatus(v.id, v.status), onSuccess: refresh }),
    send: useMutation({ mutationFn: (v: { requestId: string; body: string }) => api.sendAdviceMessage(v.requestId, v.body), onSuccess: refresh }),
  };
}

/** Check-in de hoje nesta trilha (ou undefined). */
export function useTodayCheckin(trackId: string) {
  const checkins = useCheckins(30);
  const today = dayKey(new Date());
  return {
    ...checkins,
    today: checkins.data?.find((c) => c.day === today && c.trackId === trackId),
    /** Sentimento mais recente de hoje em qualquer trilha (para o filtro da comunidade). */
    feelingToday: checkins.data?.find((c) => c.day === today && c.feeling)?.feeling ?? null,
  };
}

export function useAgenda() {
  const key = useKey('agenda');
  return useQuery({ queryKey: key, queryFn: () => api.getAgenda() });
}

export function useAgendaMutations() {
  const qc = useQueryClient();
  const key = useKey('agenda');
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  return {
    create: useMutation({ mutationFn: (e: Omit<AgendaEvent, 'id'>) => api.createAgendaEvent(e), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => api.deleteAgendaEvent(id), onSuccess: refresh }),
  };
}

export function useDiagnosticQuestions() {
  return useQuery({ queryKey: ['diagnostic-questions'], queryFn: () => api.getDiagnosticQuestions(), staleTime: Infinity });
}

export function useLatestDiagnostic() {
  const key = useKey('diagnostic');
  return useQuery({ queryKey: key, queryFn: () => api.getLatestDiagnostic() });
}

export function useSaveDiagnostic() {
  const qc = useQueryClient();
  const key = useKey('diagnostic');
  return useMutation({
    mutationFn: (v: { answers: Record<string, number>; scores: Record<LifeArea, number>; trackId: string }) =>
      api.saveDiagnostic(v.answers, v.scores, v.trackId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useCheckins(days = 14) {
  const key = useKey('checkins', days);
  return useQuery({ queryKey: key, queryFn: () => api.getCheckins(days) });
}

export function useSaveCheckin() {
  const qc = useQueryClient();
  const base = useKey('checkins');
  const activity = useKey('activity');
  return useMutation({
    mutationFn: async (c: Checkin) => {
      await api.saveCheckin(c);
      await api.logActivity('checkin', c.trackId).catch(() => undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: base });
      qc.invalidateQueries({ queryKey: activity });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useSession();
  return useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (profile) => {
      qc.setQueryData(['profile', user?.id], profile);
      qc.invalidateQueries({ queryKey: [user?.id ?? 'anon', 'checkins'] });
    },
  });
}

// ——— Engajamento ———

export function useActivity(days = 120) {
  const key = useKey('activity', days);
  return useQuery({ queryKey: key, queryFn: () => api.getActivity(days) });
}

/** Registra atividade e atualiza sequência, plano do dia e conquistas. */
export function useLogActivity() {
  const qc = useQueryClient();
  const base = useKey('activity');
  return useMutation({
    mutationFn: (v: { kind: ActivityKind; ref?: string; minutes?: number }) => api.logActivity(v.kind, v.ref, v.minutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: base }),
  });
}

export function useStreak() {
  const activity = useActivity();
  return useMemo(() => (activity.data ? computeStreak(activity.data) : undefined), [activity.data]);
}

export function useNote(lessonId: string | undefined) {
  const key = useKey('note', lessonId);
  return useQuery({ queryKey: key, queryFn: () => api.getNote(lessonId!), enabled: Boolean(lessonId) });
}

export function useSaveNote() {
  const qc = useQueryClient();
  const base = useKey('note');
  return useMutation({
    mutationFn: (v: { lessonId: string; body: string }) => api.saveNote(v.lessonId, v.body),
    onSuccess: (_d, v) => qc.setQueryData([...base, v.lessonId], v.body),
  });
}

export function useFavorites() {
  const key = useKey('favorites');
  return useQuery({ queryKey: key, queryFn: () => api.getFavorites() });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const key = useKey('favorites');
  return useMutation({
    mutationFn: (v: { itemType: Favorite['itemType']; itemId: string; on: boolean }) => api.setFavorite(v.itemType, v.itemId, v.on),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Favorite[]>(key) ?? [];
      const next = prev.filter((f) => !(f.itemType === v.itemType && f.itemId === v.itemId));
      qc.setQueryData(key, v.on ? [{ itemType: v.itemType, itemId: v.itemId, createdAt: new Date().toISOString() }, ...next] : next);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
