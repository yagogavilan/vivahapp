import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useSession } from '../auth/session';
import { courseState, type CourseState } from '../domain/access';
import { api } from './index';
import type { AgendaEvent, Checkin, Course, LifeArea, Track } from './types';

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
    createPost: useMutation({ mutationFn: (v: { channel: string; body: string }) => api.createPost(v.channel, v.body), onSuccess: refresh }),
    deletePost: useMutation({ mutationFn: (id: string) => api.deletePost(id), onSuccess: refresh }),
    createComment: useMutation({ mutationFn: (v: { postId: string; body: string }) => api.createComment(v.postId, v.body), onSuccess: refresh }),
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
  return useMutation({
    mutationFn: (c: Checkin) => api.saveCheckin(c),
    onSuccess: () => qc.invalidateQueries({ queryKey: base }),
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
