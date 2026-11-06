import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EscudoCard } from '@/components/aquecimento';
import { SpaceCover, SpaceHeader } from '@/components/space';
import { CourseRow } from '@/components/tracks';
import { Card, ErrorState, Icon, Pill, Row, Screen, Txt } from '@/components/ui';
import { FadeIn, ScreenSkeleton } from '@/components/visual';
import { useEscudo, useLibrary, useLives, useProgress } from '@/data/hooks';
import { completion } from '@/domain/access';
import { formatWhen } from '@/domain/dates';
import { liveStatus, todaysEscudo } from '@/domain/schedule';
import { AQUECIMENTO, trackCourses } from '@/domain/spaces';
import { useSpace } from '@/lib/space-context';
import { colors, radius, shadow, space } from '@/theme';

/** Cursos só da trilha aberta. No Aquecimento: aula de amostra, Escudo e lives. */
export default function Cursos() {
  const sp = useSpace();
  const library = useLibrary();
  const progress = useProgress();
  const escudo = useEscudo();
  const lives = useLives();

  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;

  if (sp.id === AQUECIMENTO) {
    const preview = lib.lessons.find((l) => l.isPreview);
    const audio = escudo.data ? todaysEscudo(escudo.data) : undefined;
    const recent = (lives.data ?? []).filter((l) => liveStatus(l) !== 'ended').slice(0, 4);
    return (
      <Screen>
        <SpaceHeader space={sp} />
        <View style={{ gap: 4 }}>
          <Txt variant="eyebrow">Conteúdo grátis</Txt>
          <Txt variant="hero">Para começar hoje</Txt>
        </View>
        {audio ? <EscudoCard audio={audio} /> : null}
        {preview ? (
          <Card onPress={() => router.push({ pathname: '/aula/[id]', params: { id: preview.id } })} style={{ gap: space.sm }}>
            <Pill label="Aula de amostra" tone="mint" icon="play" />
            <Txt variant="heading">{preview.title}</Txt>
            <Txt variant="small">{preview.summary} · {preview.durationMin} min</Txt>
          </Card>
        ) : null}
        <View style={{ gap: space.sm }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Lives gratuitas</Txt>
          {recent.map((l) => (
            <Card key={l.id} onPress={() => router.push({ pathname: '/live/[id]', params: { id: l.id } })} style={{ gap: 2 }}>
              <Txt variant="bodyStrong">{l.title}</Txt>
              <Txt variant="small">{formatWhen(l.startsAt)} · com {l.host}</Txt>
            </Card>
          ))}
        </View>
        <Card tone="sand" onPress={() => router.push('/')} style={{ gap: 4 }}>
          <Txt variant="bodyStrong">Quer ir mais fundo?</Txt>
          <Txt variant="small">Conheça as seis trilhas Vivah na tela inicial.</Txt>
        </Card>
      </Screen>
    );
  }

  const list = trackCourses(sp.id, lib.courses).map((course) => {
    const ls = lib.lessons.filter((l) => l.courseId === course.id);
    return { course, state: lib.stateOf(course), percent: completion(ls, progress.data ?? []), lessons: ls.length, minutes: ls.reduce((a, l) => a + l.durationMin, 0) };
  });
  const mine = list.filter((x) => x.state === 'open');
  const more = list.filter((x) => x.state !== 'open');

  return (
    <Screen refreshing={library.isRefetching} onRefresh={library.refetch}>
      <SpaceHeader space={sp} />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">Trilha {sp.title}</Txt>
        <Txt variant="hero">Seus cursos</Txt>
      </View>

      <View style={{ gap: space.md }}>
        {mine.map(({ course, percent, lessons, minutes }, i) => (
          <FadeIn key={course.id} delay={i * 50}>
            <Pressable onPress={() => router.push({ pathname: '/curso/[id]', params: { id: course.id } })} accessibilityRole="button"
              style={({ pressed }) => [styles.course, shadow, { opacity: pressed ? 0.9 : 1 }]}>
              <SpaceCover space={sp} style={styles.cover}>
                <Icon name={percent >= 100 ? 'award' : 'play'} size={26} color={colors.coral} />
              </SpaceCover>
              <View style={{ flex: 1, gap: 6, paddingVertical: space.xs }}>
                <Txt variant="bodyStrong">{course.title}</Txt>
                <Txt variant="small">{lessons} aulas · {minutes} min</Txt>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${Math.max(2, percent)}%` }]} />
                </View>
                <Txt variant="small">{percent >= 100 ? 'Concluído' : percent === 0 ? 'Ainda não começou' : `${percent}% concluído`}</Txt>
              </View>
            </Pressable>
          </FadeIn>
        ))}
      </View>

      {more.length ? (
        <View style={{ gap: space.sm }}>
          <Row gap={6}>
            <Icon name="lock" size={14} color={colors.textSubtle} />
            <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Para ir além na trilha</Txt>
          </Row>
          {more.map(({ course, state }) => (
            <CourseRow key={course.id} course={course} state={state} showKind />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  course: { flexDirection: 'row', gap: space.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md, alignItems: 'center' },
  cover: { width: 84, height: 84, padding: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.sand, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.mint },
});
