import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AudioPlayer, MediaPlaceholder, VideoPlayer } from '@/components/media';
import { Button, Card, Empty, ErrorState, Field, Icon, LinkText, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { FadeIn } from '@/components/visual';
import {
  useFavorites,
  useLessonMedia,
  useLibrary,
  useLogActivity,
  useNote,
  useProgress,
  useSaveNote,
  useSaveProgress,
  useToggleFavorite,
} from '@/data/hooks';
import { completion, isTrackCourse, lessonOpen } from '@/domain/access';
import { currentLesson, sequenceInfo, trackSequence } from '@/domain/sequence';
import { TrackContextBar } from '@/components/space';
import { success } from '@/lib/haptics';
import { colors, space } from '@/theme';

function Notes({ lessonId }: { lessonId: string }) {
  const note = useNote(lessonId);
  const save = useSaveNote();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? note.data ?? '';
  const dirty = draft !== null && draft !== (note.data ?? '');
  return (
    <Card style={{ gap: space.sm }}>
      <Row>
        <Icon name="edit-3" size={18} color={colors.petrol} />
        <Txt variant="heading">Minhas anotações</Txt>
      </Row>
      <Field
        label="Só você vê"
        value={value}
        onChangeText={setDraft}
        placeholder="O que você quer lembrar desta aula? Um insight, uma tarefa, uma frase."
        multiline
        maxLength={5000}
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="small">{save.isPending ? 'Salvando…' : dirty ? 'Alterações não salvas' : note.data ? 'Salvo' : ''}</Txt>
        <Button
          label="Salvar anotação"
          variant="ghost"
          disabled={!dirty}
          loading={save.isPending}
          onPress={() => save.mutate({ lessonId, body: value }, { onSuccess: () => setDraft(null) })}
        />
      </Row>
    </Card>
  );
}

export default function Aula() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useLibrary();
  const progress = useProgress();
  const media = useLessonMedia(id);
  const save = useSaveProgress();
  const log = useLogActivity();
  const favorites = useFavorites();
  const toggleFav = useToggleFavorite();

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

  const inSequence = isTrackCourse(course) && state === 'open';
  const sequence = inSequence ? trackSequence(course.trackId, lib.courses, lib.modules, lib.lessons) : [];
  const seq = inSequence ? sequenceInfo(sequence, progress.data ?? []) : null;
  // Aula travada: leva o aluno para a aula da vez (a primeira ainda não concluída).
  const before = seq?.locked.has(lesson.id) ? (currentLesson(sequence, progress.data ?? []) ?? seq.previous.get(lesson.id)) : undefined;
  if (before) {
    return (
      <Screen padTop={false}>
        <TrackContextBar trackId={course.trackId} />
        <Empty icon="lock" title="Conclua a aula anterior primeiro" text={`As aulas da trilha seguem uma ordem. A sua próxima aula é: ${before.title}.`}>
          <Button label={`Ir para a aula da vez`} onPress={() => router.replace({ pathname: '/aula/[id]', params: { id: before.id } })} />
        </Empty>
      </Screen>
    );
  }

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
  const completed = Boolean(mine?.completedAt);
  // Na trilha, a próxima aula pode ser a primeira do curso seguinte; ela abre quando esta é concluída.
  const next = inSequence ? sequence[sequence.findIndex((l) => l.id === lesson.id) + 1] : ordered[idx + 1];
  const nextOpen = next && (inSequence ? completed : lessonOpen(next, state));
  const percent = completion(ordered, progress.data ?? []);
  const isFav = (favorites.data ?? []).some((f) => f.itemType === 'lesson' && f.itemId === lesson.id);

  const finish = () => {
    if (completed) return;
    success();
    save.mutate({ lessonId: lesson.id, positionSec: mine?.positionSec ?? 0, completed: true });
    log.mutate({ kind: 'aula', ref: lesson.id, minutes: lesson.durationMin });
  };

  return (
    <Screen padTop={false}>
      <TrackContextBar trackId={course.trackId} />
      <View style={{ gap: space.xs }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <LinkText label={course.title} onPress={() => router.push({ pathname: '/curso/[id]', params: { id: course.id } })} />
          <Pressable
            onPress={() => toggleFav.mutate({ itemType: 'lesson', itemId: lesson.id, on: !isFav })}
            accessibilityRole="button"
            accessibilityLabel={isFav ? 'Tirar dos favoritos' : 'Salvar nos favoritos'}
            hitSlop={10}>
            <Icon name="heart" size={22} color={isFav ? colors.coralText : colors.textSubtle} />
          </Pressable>
        </Row>
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

      {completed && percent === 100 ? (
        <FadeIn>
          <Card tone="coral" style={{ gap: space.sm }}>
            <Row>
              <Icon name="award" color={colors.deep} />
              <Txt variant="heading" style={{ color: colors.deep }}>Curso concluído!</Txt>
            </Row>
            <Txt style={{ color: colors.deep }}>Você terminou todas as aulas de {course.title}. Seu certificado está pronto.</Txt>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button label="Ver certificado" variant="secondary" icon="award" onPress={() => router.push({ pathname: '/certificado/[id]', params: { id: course.id } })} />
            </View>
          </Card>
        </FadeIn>
      ) : null}

      <View style={{ gap: space.md }}>
        {completed ? (
          <Pill label="Aula concluída" tone="mint" icon="check" />
        ) : (
          <Button label="Concluir aula" icon="check" variant="secondary" loading={save.isPending} onPress={finish} />
        )}
        {next ? (
          nextOpen ? (
            <Button
              label={`Próxima: ${next.title}`}
             
              variant={completed ? 'primary' : 'ghost'}
              onPress={() => router.replace({ pathname: '/aula/[id]', params: { id: next.id } })}
            />
          ) : (
            <Row gap={6}><Icon name="lock" size={14} color={colors.textSubtle} /><Txt variant="small" style={{ flex: 1 }}>Próxima: {next.title}</Txt></Row>
          )
        ) : null}
      </View>

      {state === 'open' ? <Notes lessonId={lesson.id} /> : null}
    </Screen>
  );
}
