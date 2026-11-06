import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { LockedPanel } from '@/components/locked-panel';
import { StateBadge } from '@/components/tracks';
import { Button, Card, Empty, ErrorState, Icon, Loading, Pill, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { TrackCover } from '@/components/visual';
import { useLibrary, useProgress } from '@/data/hooks';
import type { Lesson } from '@/data/types';
import { completion, isTrackCourse, lessonOpen, nextLesson } from '@/domain/access';
import { currentLesson, sequenceInfo, trackSequence } from '@/domain/sequence';
import { TrackContextBar } from '@/components/space';
import { colors, space } from '@/theme';

const KIND_ICON = { video: 'play-circle', audio: 'headphones', texto: 'file-text' } as const;

export default function Curso() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useLibrary();
  const progress = useProgress();

  if (library.isPending) return <Loading />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  const course = lib.courses.find((c) => c.id === id);
  if (!course) return <Screen padTop={false}><Empty icon="book" title="Curso não encontrado" /></Screen>;

  const track = lib.trackById.get(course.trackId);
  const state = lib.stateOf(course);
  const mods = lib.modules.filter((m) => m.courseId === course.id).sort((a, b) => a.sort - b.sort);
  const ordered: Lesson[] = mods.flatMap((m) => lib.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.sort - b.sort));
  const done = new Set((progress.data ?? []).filter((p) => p.completedAt).map((p) => p.lessonId));
  const percent = completion(ordered, progress.data ?? []);
  // Sequência obrigatória: a próxima aula da trilha só abre com a anterior concluída.
  const inSequence = isTrackCourse(course) && state === 'open';
  const sequence = inSequence ? trackSequence(course.trackId, lib.courses, lib.modules, lib.lessons) : [];
  const seq = inSequence ? sequenceInfo(sequence, progress.data ?? []) : null;
  const next = nextLesson(ordered, progress.data ?? []);
  // Próxima aula travada: o botão leva à aula da vez na trilha (a primeira não concluída).
  const nextLocked = next && seq?.locked.has(next.id) ? (currentLesson(sequence, progress.data ?? []) ?? seq.previous.get(next.id)) : undefined;
  const blockingCourse = nextLocked ? lib.courses.find((c) => c.id === nextLocked.courseId) : undefined;
  const openLesson = (l: Lesson) => router.push({ pathname: '/aula/[id]', params: { id: l.id } });
  const totalMin = ordered.reduce((sum, l) => sum + l.durationMin, 0);
  const remainingMin = ordered.filter((l) => !done.has(l.id)).reduce((sum, l) => sum + l.durationMin, 0);
  // Marcos de progresso (25/50/75%): mensagens curtas aumentam a conclusão.
  const milestone =
    percent >= 75 && percent < 100 ? 'Reta final: você já passou de 75% do curso.'
    : percent >= 50 && percent < 75 ? 'Metade do caminho feita. Siga no seu ritmo.'
    : percent >= 25 && percent < 50 ? 'Você já fez um quarto do curso. Bom começo!'
    : null;

  return (
    <Screen padTop={false} refreshing={library.isRefetching} onRefresh={library.refetch}>
      {track ? <TrackContextBar trackId={track.id} /> : null}
      {track ? (
        <TrackCover area={track.area} muted={state === 'soon'} style={{ padding: space.xl, gap: space.sm }}>
          <Pressable onPress={() => router.push({ pathname: '/t/[track]/cursos', params: { track: track.id } })}>
            <Txt variant="eyebrow" style={{ color: state === 'soon' ? colors.coralText : colors.coral }}>
              {course.lowTicket ? `Low ticket · Trilha ${track.title}` : `Trilha ${track.title}`}
            </Txt>
          </Pressable>
          <Txt variant="hero" style={{ color: state === 'soon' ? colors.text : colors.onDark }}>{course.title}</Txt>
          <Txt style={{ color: state === 'soon' ? colors.textMuted : colors.onDarkMuted }}>{course.summary}</Txt>
          <Row style={{ flexWrap: 'wrap' }}>
            <StateBadge state={state} launchLabel={track.launchLabel} />
            <Txt variant="small" style={{ color: state === 'soon' ? colors.textSubtle : colors.onDarkMuted }}>
              {ordered.length} aulas · {totalMin} min
            </Txt>
          </Row>
        </TrackCover>
      ) : null}

      {state === 'open' ? (
        <Card style={{ gap: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="heading">{percent}% concluído</Txt>
            <Txt variant="small">{remainingMin > 0 ? `faltam ${remainingMin} min` : 'tudo visto'}</Txt>
          </Row>
          <ProgressBar value={percent} />
          {milestone ? <Txt variant="small" style={{ color: colors.coralText }}>{milestone}</Txt> : null}
          {next && nextLocked ? (
            <View style={{ gap: space.sm }}>
              <Row gap={6}>
                <Icon name="lock" size={16} color={colors.textSubtle} />
                <Txt variant="small" style={{ flex: 1 }}>
                  As aulas seguem a ordem da trilha. Conclua antes {blockingCourse && blockingCourse.id !== course.id ? `o curso ${blockingCourse.title}` : 'a aula anterior'}.
                </Txt>
              </Row>
              <Button label={blockingCourse && blockingCourse.id !== course.id ? `Continuar em ${blockingCourse.title}` : `Ir para: ${nextLocked.title}`} variant="ghost" onPress={() => openLesson(nextLocked)} />
            </View>
          ) : next ? (
            <Button label={percent > 0 ? `Continuar: ${next.title}` : 'Começar'} icon="play" onPress={() => openLesson(next)} />
          ) : (
            <Button label="Ver certificado" icon="award" onPress={() => router.push({ pathname: '/certificado/[id]', params: { id: course.id } })} />
          )}
        </Card>
      ) : state === 'locked' ? (
        <LockedPanel course={course} />
      ) : null}

      {mods.map((m) => (
        <View key={m.id} style={{ gap: space.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>{m.title}</Txt>
            {state === 'open' ? (
              <Txt variant="small" style={{ fontSize: 13 }}>
                {lib.lessons.filter((l) => l.moduleId === m.id && done.has(l.id)).length}/{lib.lessons.filter((l) => l.moduleId === m.id).length}
              </Txt>
            ) : null}
          </Row>
          <Card style={{ gap: 0, paddingVertical: space.xs }}>
            {lib.lessons
              .filter((l) => l.moduleId === m.id)
              .sort((a, b) => a.sort - b.sort)
              .map((l, i) => {
                const seqLocked = Boolean(seq?.locked.has(l.id));
                const canOpen = lessonOpen(l, state) && !seqLocked;
                return (
                  <Pressable
                    key={l.id}
                    disabled={!canOpen}
                    onPress={() => openLesson(l)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canOpen }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, paddingVertical: space.md })}>
                    <Row gap={space.md}>
                      <Icon
                        name={done.has(l.id) ? 'check-circle' : canOpen ? KIND_ICON[l.kind] : 'lock'}
                        color={done.has(l.id) ? colors.mint : canOpen ? colors.coralText : colors.textSubtle}
                      />
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyStrong" style={{ color: canOpen ? colors.text : colors.textSubtle }}>{l.title}</Txt>
                        <Txt variant="small">{seqLocked ? 'Conclua a aula anterior para abrir' : `${l.durationMin} min`}</Txt>
                      </View>
                      {l.isPreview && state === 'locked' ? <Pill label="Aula grátis" tone="mint" /> : null}
                    </Row>
                  </Pressable>
                );
              })}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
