import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { AudioPlayer, MediaPlaceholder, VideoPlayer } from '@/components/media';
import { Button, Card, Empty, ErrorState, LinkText, Loading, Pill, Screen, Txt } from '@/components/ui';
import { useLessonMedia, useLibrary, useProgress, useSaveProgress } from '@/data/hooks';
import { lessonOpen } from '@/domain/access';
import { space } from '@/theme';

export default function Aula() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useLibrary();
  const progress = useProgress();
  const media = useLessonMedia(id);
  const save = useSaveProgress();

  const lesson = library.data?.lessons.find((l) => l.id === id);
  const onProgress = useCallback(
    (positionSec: number) => lesson && save.mutate({ lessonId: lesson.id, positionSec, completed: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson?.id],
  );

  if (library.isPending || media.isPending) return <Loading />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  if (!lesson) return <Screen padTop={false}><Empty icon="book" title="Aula não encontrada" /></Screen>;

  const course = lib.courses.find((c) => c.id === lesson.courseId)!;
  const state = lib.stateOf(course);
  const mine = progress.data?.find((p) => p.lessonId === lesson.id);

  if (!lessonOpen(lesson, state) || !media.data) {
    return (
      <Screen padTop={false}>
        <Empty icon="lock" title="Esta aula é para alunos do curso">
          <Button label="Ver o curso" variant="ghost" onPress={() => router.replace({ pathname: '/curso/[id]', params: { id: course.id } })} />
        </Empty>
      </Screen>
    );
  }

  const ordered = lib.modules
    .filter((m) => m.courseId === course.id)
    .sort((a, b) => a.sort - b.sort)
    .flatMap((m) => lib.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.sort - b.sort));
  const idx = ordered.findIndex((l) => l.id === lesson.id);
  const next = ordered[idx + 1];
  const nextOpen = next && lessonOpen(next, state);
  const completed = Boolean(mine?.completedAt);

  const finish = () => save.mutate({ lessonId: lesson.id, positionSec: mine?.positionSec ?? 0, completed: true });

  return (
    <Screen padTop={false}>
      <View style={{ gap: space.xs }}>
        <LinkText label={course.title} onPress={() => router.push({ pathname: '/curso/[id]', params: { id: course.id } })} />
        <Txt variant="title">{lesson.title}</Txt>
        <Txt variant="small">Aula {idx + 1} de {ordered.length} · {lesson.durationMin} min</Txt>
      </View>

      {lesson.kind === 'video' ? (
        media.data.mediaUrl ? (
          <VideoPlayer url={media.data.mediaUrl} startAt={mine?.completedAt ? 0 : mine?.positionSec} onProgress={onProgress} onFinish={finish} />
        ) : (
          <MediaPlaceholder kind="video" durationMin={lesson.durationMin} />
        )
      ) : lesson.kind === 'audio' ? (
        media.data.mediaUrl ? (
          <AudioPlayer url={media.data.mediaUrl} title={lesson.title} startAt={mine?.completedAt ? 0 : mine?.positionSec} onProgress={onProgress} onFinish={finish} />
        ) : (
          <MediaPlaceholder kind="audio" durationMin={lesson.durationMin} />
        )
      ) : (
        <Card>
          <Txt>{media.data.body ?? 'Material em produção.'}</Txt>
          {media.data.mediaUrl ? <LinkText label="Baixar material" onPress={() => import('expo-web-browser').then((w) => w.openBrowserAsync(media.data!.mediaUrl!))} /> : null}
        </Card>
      )}

      {lesson.summary ? <Txt>{lesson.summary}</Txt> : null}

      <View style={{ gap: space.md }}>
        {completed ? (
          <Pill label="Aula concluída" tone="mint" icon="check" />
        ) : (
          <Button label="Concluir aula" icon="check" variant="secondary" loading={save.isPending} onPress={finish} />
        )}
        {next ? (
          nextOpen ? (
            <Button label={`Próxima: ${next.title}`} icon="arrow-right" variant="ghost" onPress={() => router.replace({ pathname: '/aula/[id]', params: { id: next.id } })} />
          ) : (
            <Button label="Ver o curso completo" variant="ghost" onPress={() => router.replace({ pathname: '/curso/[id]', params: { id: course.id } })} />
          )
        ) : null}
      </View>
    </Screen>
  );
}
