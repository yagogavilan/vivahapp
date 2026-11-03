import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { LockedPanel } from '@/components/locked-panel';
import { StateBadge } from '@/components/tracks';
import { Button, Card, Empty, ErrorState, Icon, LinkText, Loading, Pill, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { useLibrary, useProgress } from '@/data/hooks';
import type { Lesson } from '@/data/types';
import { completion, lessonOpen, nextLesson } from '@/domain/access';
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
  const next = nextLesson(ordered, progress.data ?? []);
  const openLesson = (l: Lesson) => router.push({ pathname: '/aula/[id]', params: { id: l.id } });

  return (
    <Screen padTop={false} refreshing={library.isRefetching} onRefresh={library.refetch}>
      <View style={{ gap: space.sm }}>
        {track ? <LinkText label={`Trilha ${track.title}`} onPress={() => router.push({ pathname: '/trilha/[id]', params: { id: track.id } })} /> : null}
        <Txt variant="hero">{course.title}</Txt>
        <Txt>{course.summary}</Txt>
        <StateBadge state={state} launchLabel={track?.launchLabel} />
      </View>

      {state === 'open' ? (
        <Card style={{ gap: space.md }}>
          <ProgressBar value={percent} />
          <Txt variant="small">{percent}% concluído · {done.size > 0 ? `${ordered.filter((l) => done.has(l.id)).length} de ${ordered.length} aulas` : `${ordered.length} aulas`}</Txt>
          {next ? <Button label={percent > 0 ? 'Continuar' : 'Começar'} icon="play" onPress={() => openLesson(next)} /> : <Pill label="Curso concluído" tone="mint" icon="award" />}
        </Card>
      ) : state === 'locked' ? (
        <LockedPanel course={course} />
      ) : null}

      {mods.map((m) => (
        <View key={m.id} style={{ gap: space.sm }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>{m.title}</Txt>
          <Card style={{ gap: 0, paddingVertical: space.xs }}>
            {lib.lessons
              .filter((l) => l.moduleId === m.id)
              .sort((a, b) => a.sort - b.sort)
              .map((l, i) => {
                const canOpen = lessonOpen(l, state);
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
                        <Txt variant="small">{l.durationMin} min</Txt>
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
