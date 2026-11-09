import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SpaceCover, SpaceHeader } from '@/components/space';
import { ErrorState, Icon, Row, Screen, Txt } from '@/components/ui';
import { FadeIn, ScreenSkeleton } from '@/components/visual';
import { useLibrary, useProgress } from '@/data/hooks';
import { completion } from '@/domain/access';
import { lowTicketsOf, spaceAccess, trackCourses } from '@/domain/spaces';
import { sequenceInfo, trackSequence } from '@/domain/sequence';
import { TrackSubscribePanel } from '@/components/locked-panel';
import { CAN_SELL_IN_APP } from '@/lib/config';
import { useSpace } from '@/lib/space-context';
import { colors, radius, shadow, space } from '@/theme';

/** Cursos só da trilha aberta. */
export default function Cursos() {
  const sp = useSpace();
  const library = useLibrary();
  const progress = useProgress();

  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;

  const subscription = lib.trackById.get(sp.id) ? spaceAccess(sp.id, lib.tracks, lib.courses, lib.access) : 'locked';
  const seq = sequenceInfo(trackSequence(sp.id, lib.courses, lib.modules, lib.lessons), progress.data ?? []);
  const list = trackCourses(sp.id, lib.courses).map((course) => {
    const ls = lib.lessons.filter((l) => l.courseId === course.id);
    const first = trackSequence(sp.id, [course], lib.modules, lib.lessons)[0];
    return {
      course,
      percent: completion(ls, progress.data ?? []),
      lessons: ls.length,
      minutes: ls.reduce((a, l) => a + l.durationMin, 0),
      waiting: Boolean(first && seq.locked.has(first.id)),
    };
  });
  const lows = lowTicketsOf(sp.id, lib.courses);

  return (
    <Screen refreshing={library.isRefetching} onRefresh={library.refetch}>
      <SpaceHeader space={sp} />
      <View style={{ gap: 4 }}>
        <Txt variant="hero">{subscription === 'open' ? 'Seus cursos' : 'Os cursos da trilha'}</Txt>
        <Row gap={6}><Icon name="list" size={14} color={colors.textSubtle} /><Txt variant="small">Em ordem: cada aula abre a próxima</Txt></Row>
      </View>

      {subscription !== 'open' && sp.track ? <TrackSubscribePanel track={sp.track} /> : null}

      <View style={{ gap: space.md }}>
        {list.map(({ course, percent, lessons, minutes, waiting }, i) => {
          const locked = subscription !== 'open';
          return (
            <FadeIn key={course.id} delay={i * 50}>
              <Pressable onPress={() => router.push({ pathname: '/curso/[id]', params: { id: course.id } })} accessibilityRole="button"
                style={({ pressed }) => [styles.course, shadow, { opacity: pressed ? 0.9 : 1 }]}>
                <SpaceCover space={sp} muted={locked} style={styles.cover}>
                  <Txt variant="title" style={{ color: locked ? colors.textSubtle : colors.onDark }}>{i + 1}</Txt>
                </SpaceCover>
                <View style={{ flex: 1, gap: 6, paddingVertical: space.xs }}>
                  <Txt variant="bodyStrong">{course.title}</Txt>
                  <Txt variant="small">{lessons} aulas · {minutes} min</Txt>
                  {locked ? (
                    <Row gap={6}><Icon name="lock" size={14} color={colors.textSubtle} /><Txt variant="small">{subscription === 'soon' ? `Chega em ${sp.track?.launchLabel.toLowerCase()}` : 'Na assinatura da trilha'}</Txt></Row>
                  ) : waiting && percent === 0 ? (
                    <Row gap={6}><Icon name="lock" size={14} color={colors.textSubtle} /><Txt variant="small">Abre quando você concluir o curso anterior</Txt></Row>
                  ) : (
                    <>
                      <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(2, percent)}%` }]} /></View>
                      <Txt variant="small">{percent >= 100 ? 'Concluído' : percent === 0 ? 'Pronto para começar' : `${percent}% concluído`}</Txt>
                    </>
                  )}
                </View>
              </Pressable>
            </FadeIn>
          );
        })}
      </View>

      {lows.length ? (
        <View style={{ gap: space.md }}>
          <View style={{ gap: 2 }}>
            <Txt variant="title">Low tickets da {sp.title}</Txt>
            <Txt variant="small">Aulas curtas, planilhas e ferramentas</Txt>
          </View>
          <View style={styles.lowGrid}>
            {lows.map((c) => {
              const owned = lib.access.has(c.id);
              return (
                <Pressable key={c.id} onPress={() => router.push({ pathname: '/curso/[id]', params: { id: c.id } })} accessibilityRole="button"
                  style={({ pressed }) => [styles.low, shadow, owned && { borderColor: colors.mint }, { opacity: pressed ? 0.9 : 1 }]}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={styles.lowIcon}><Icon name={FORMAT_ICON[c.format ?? 'aula']} size={18} color={colors.coralText} /></View>
                    <Txt variant="small" style={{ fontSize: 12 }}>{FORMAT_LABEL[c.format ?? 'aula']}</Txt>
                  </Row>
                  <Txt variant="bodyStrong">{c.title}</Txt>
                  <Txt variant="small" numberOfLines={3}>{c.summary}</Txt>
                  {owned ? (
                    <Row gap={6}><Icon name="check-circle" size={14} color="#16614F" /><Txt variant="small" style={{ color: '#16614F' }}>Você já tem</Txt></Row>
                  ) : CAN_SELL_IN_APP && c.priceLabel ? (
                    <Txt variant="bodyStrong" style={{ color: colors.coralText }}>{c.priceLabel}</Txt>
                  ) : (
                    <Row gap={6}><Icon name="lock" size={14} color={colors.textSubtle} /><Txt variant="small">Vendido à parte</Txt></Row>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const FORMAT_ICON = { aula: 'play-circle', planilha: 'grid', ferramenta: 'tool' } as const;
const FORMAT_LABEL = { aula: 'Aula curta', planilha: 'Planilha', ferramenta: 'Ferramenta' } as const;

const styles = StyleSheet.create({
  course: { flexDirection: 'row', gap: space.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md, alignItems: 'center' },
  cover: { width: 84, height: 84, padding: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.sand, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.mint },
  lowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  low: { width: 220, flexGrow: 1, gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  lowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
});
