import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AdminGate, backTo, ConfirmDelete } from '@/components/admin';
import { TrackContextBar } from '@/components/space';
import { Button, Card, Chip, Empty, ErrorState, Field, Row, Screen, Txt } from '@/components/ui';
import { ScreenSkeleton } from '@/components/visual';
import { useAdmin, useLessonMedia, useLibrary } from '@/data/hooks';
import type { Lesson, LessonKind, LessonMedia } from '@/data/types';
import { slugId } from '@/domain/admin';
import { colors, space } from '@/theme';

type Lib = NonNullable<ReturnType<typeof useLibrary>['data']>;

export default function AdminLesson() {
  return (
    <AdminGate>
      <AdminLessonBody />
    </AdminGate>
  );
}

function AdminLessonBody() {
  const params = useLocalSearchParams<{ id: string; module?: string; sort?: string }>();
  const isNew = params.id === 'nova';
  const library = useLibrary();
  const media = useLessonMedia(isNew ? undefined : params.id);
  if (library.isPending || (!isNew && media.isPending)) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  const lesson = isNew ? undefined : lib.lessons.find((l) => l.id === params.id);
  const moduleId = lesson?.moduleId ?? params.module;
  const mod = lib.modules.find((m) => m.id === moduleId);
  const course = mod ? lib.courses.find((c) => c.id === mod.courseId) : undefined;
  if ((!isNew && !lesson) || !mod || !course) return <Screen padTop={false}><Empty icon="file" title="Aula não encontrada" /></Screen>;

  return (
    <Screen padTop={false}>
      <TrackContextBar trackId={course.trackId} />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">{course.title} · {mod.title}</Txt>
        <Txt variant="hero">{lesson ? 'Editar aula' : 'Nova aula'}</Txt>
      </View>
      <LessonForm
        key={lesson?.id ?? 'nova'}
        lib={lib}
        courseId={course.id}
        moduleId={mod.id}
        lesson={lesson}
        media={media.data ?? null}
        defaultSort={Number(params.sort) || 1}
      />
    </Screen>
  );
}

const KINDS: { id: LessonKind; label: string }[] = [
  { id: 'video', label: 'Vídeo' },
  { id: 'audio', label: 'Áudio' },
  { id: 'texto', label: 'Texto ou arquivo' },
];

function LessonForm({ lib, courseId, moduleId, lesson, media, defaultSort }: {
  lib: Lib;
  courseId: string;
  moduleId: string;
  lesson?: Lesson;
  media: LessonMedia | null;
  defaultSort: number;
}) {
  const admin = useAdmin();
  const modules = lib.modules.filter((m) => m.courseId === courseId).sort((a, b) => a.sort - b.sort);
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [summary, setSummary] = useState(lesson?.summary ?? '');
  const [kind, setKind] = useState<LessonKind>(lesson?.kind ?? 'video');
  const [duration, setDuration] = useState(String(lesson?.durationMin ?? 10));
  const [mediaUrl, setMediaUrl] = useState(media?.mediaUrl ?? '');
  const [body, setBody] = useState(media?.body ?? '');
  const [preview, setPreview] = useState(lesson?.isPreview ?? false);
  const [targetModule, setTargetModule] = useState(moduleId);
  const [error, setError] = useState<string | null>(null);
  const minutes = Number.parseInt(duration, 10);
  const valid = title.trim().length >= 3 && Number.isFinite(minutes) && minutes >= 0 && minutes <= 600;
  const back = () => backTo({ pathname: '/admin/curso/[id]', params: { id: courseId } });

  const save = () => {
    setError(null);
    const movedSort = Math.max(0, ...lib.lessons.filter((l) => l.moduleId === targetModule).map((l) => l.sort)) + 1;
    admin.saveLesson.mutate(
      {
        id: lesson?.id ?? slugId(title, lib.lessons.map((l) => l.id), `${moduleId}--`),
        moduleId: targetModule,
        courseId,
        title: title.trim(),
        summary: summary.trim(),
        kind,
        durationMin: minutes,
        sort: lesson && lesson.moduleId === targetModule ? lesson.sort : lesson ? movedSort : defaultSort,
        isPreview: preview,
        mediaUrl: mediaUrl.trim() || null,
        body: body.trim() || null,
      },
      { onSuccess: back, onError: (e) => setError(e.message) },
    );
  };

  return (
    <Card style={{ gap: space.md }}>
      <Field label="Título da aula" value={title} onChangeText={setTitle} maxLength={120} placeholder="Ex.: O que é ruminação" />
      <Field label="Resumo (opcional)" value={summary} onChangeText={setSummary} maxLength={300} multiline placeholder="Uma frase sobre o que a aula entrega" />
      <View style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Formato</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {KINDS.map((k) => <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => setKind(k.id)} />)}
        </Row>
      </View>
      <Field label="Duração (minutos)" value={duration} onChangeText={(t) => setDuration(t.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" style={{ width: 120 }} />
      <Field
        label={kind === 'texto' ? 'Link do arquivo (PDF, planilha…)' : kind === 'audio' ? 'Link do áudio' : 'Link do vídeo'}
        value={mediaUrl}
        onChangeText={setMediaUrl}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://..."
        hint="Só chega a quem tem acesso à aula. Pode preencher depois."
      />
      <Field label="Texto da aula (opcional)" value={body} onChangeText={setBody} multiline maxLength={8000} placeholder="Roteiro, material de apoio ou instruções" />
      <View style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Aula grátis de amostra?</Txt>
        <Row>
          <Chip label="Não" selected={!preview} onPress={() => setPreview(false)} />
          <Chip label="Sim, aberta para todos" selected={preview} onPress={() => setPreview(true)} />
        </Row>
      </View>
      {modules.length > 1 ? (
        <View style={{ gap: space.xs }}>
          <Txt variant="bodyStrong">Módulo</Txt>
          <Row style={{ flexWrap: 'wrap' }}>
            {modules.map((m) => <Chip key={m.id} label={m.title} selected={targetModule === m.id} onPress={() => setTargetModule(m.id)} />)}
          </Row>
        </View>
      ) : null}
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
      <Button label={lesson ? 'Salvar aula' : 'Criar aula'} icon="save" disabled={!valid} loading={admin.saveLesson.isPending} onPress={save} />
      {lesson ? (
        <ConfirmDelete
          label="Excluir aula"
          warning="Apaga a aula e o progresso dos alunos nela. A próxima aula da sequência passa a depender da anterior a esta."
          loading={admin.deleteLesson.isPending}
          onConfirm={() => admin.deleteLesson.mutate(lesson.id, { onSuccess: back, onError: (e) => setError(e.message) })}
        />
      ) : null}
    </Card>
  );
}
