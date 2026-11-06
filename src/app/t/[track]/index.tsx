import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { LiveCard } from '@/components/aquecimento';
import { FeelingChip } from '@/components/feeling';
import { SpaceCover, SpaceHeader } from '@/components/space';
import { Button, ErrorState, Icon, type IconName, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { Columns, FadeIn, ScreenSkeleton } from '@/components/visual';
import { useActivity, useEscudo, useLibrary, useLives, useProgress, useTodayCheckin } from '@/data/hooks';
import type { Lesson } from '@/data/types';
import { completion, nextLesson } from '@/domain/access';
import { readCheckin } from '@/domain/checkin-protocol';
import { dayKey, greeting } from '@/domain/dates';
import { buildJourney, type JourneyStep } from '@/domain/journey';
import { nextLive, todaysEscudo } from '@/domain/schedule';
import { AQUECIMENTO, trackCourses } from '@/domain/spaces';
import { tap } from '@/lib/haptics';
import { useSpace } from '@/lib/space-context';
import { colors, radius, space } from '@/theme';

const STEP_ICON: Record<JourneyStep['id'], IconName> = {
  checkin: 'heart',
  escudo: 'shield',
  aula: 'play',
  comunidade: 'users',
};

/** Hoje da trilha: check-in primeiro, depois a jornada do dia em quatro passos. */
export default function HojeDaTrilha() {
  const sp = useSpace();
  const { profile } = useSession();
  const library = useLibrary();
  const lives = useLives();
  const escudo = useEscudo();
  const progress = useProgress();
  const activity = useActivity(7);
  const checkin = useTodayCheckin(sp.id);

  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  const firstName = profile?.fullName?.split(' ')[0];
  const today = dayKey(new Date());

  const ordered = (courseId: string): Lesson[] => {
    const mods = lib.modules.filter((m) => m.courseId === courseId).sort((a, b) => a.sort - b.sort);
    return mods.flatMap((m) => lib.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.sort - b.sort));
  };

  // Curso atual da trilha: o mais avançado que ainda tem aula pendente.
  const current = trackCourses(sp.id, lib.courses)
    .filter((c) => lib.stateOf(c) === 'open')
    .map((course) => {
      const ls = ordered(course.id);
      return { course, next: nextLesson(ls, progress.data ?? []), percent: completion(ls, progress.data ?? []) };
    })
    .filter((x): x is typeof x & { next: Lesson } => Boolean(x.next))
    .sort((a, b) => b.percent - a.percent)[0];

  const lesson = current?.next ?? (sp.id === AQUECIMENTO ? lib.lessons.find((l) => l.isPreview) : undefined);
  const audio = escudo.data ? todaysEscudo(escudo.data) : undefined;
  const live = lives.data ? nextLive(lives.data.filter((l) => sp.id === AQUECIMENTO || !l.trackId || l.trackId === sp.id)) : undefined;
  const journey = buildJourney({ today, activity: activity.data ?? [], checkinDone: Boolean(checkin.today), escudo: audio, lesson });

  const openStep = (s: JourneyStep) => {
    tap();
    if (s.id === 'checkin') router.push({ pathname: '/checkin', params: { track: sp.id } });
    if (s.id === 'escudo' && s.ref) router.push({ pathname: '/escudo/[id]', params: { id: s.ref } });
    if (s.id === 'aula' && s.ref) router.push({ pathname: '/aula/[id]', params: { id: s.ref } });
    if (s.id === 'comunidade') router.push({ pathname: '/t/[track]/comunidade', params: { track: sp.id } });
  };

  const reading = checkin.today ? readCheckin(sp.id, checkin.today.answers) : undefined;

  const checkinCard = !checkin.today ? (
    <FadeIn>
      <View style={styles.checkinCard}>
        <View style={styles.checkinIcon}>
          <Icon name="heart" size={22} color={colors.coral} />
        </View>
        <View style={{ gap: 4 }}>
          <Txt variant="eyebrow" style={{ color: colors.coral }}>Primeiro passo de hoje</Txt>
          <Txt variant="title" style={{ color: colors.onDark }}>Como você está hoje?</Txt>
          <Txt style={{ color: colors.onDarkMuted }}>Algumas perguntas rápidas e você recebe um cuidado sob medida para agora.</Txt>
        </View>
        <Button label="Fazer meu check-in" icon="arrow-right" onPress={() => router.push({ pathname: '/checkin', params: { track: sp.id } })} />
      </View>
    </FadeIn>
  ) : (
    <FadeIn>
      <Pressable
        onPress={() => router.push({ pathname: '/checkin', params: { track: sp.id } })}
        accessibilityRole="button"
        style={[styles.summary, { backgroundColor: reading?.level === 'critico' ? colors.coralSoft : reading?.level === 'atencao' ? '#FCEFC7' : colors.mintSoft }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Seu check-in de hoje</Txt>
          <Row gap={4}>
            <Txt variant="small">Ver resumo</Txt>
            <Icon name="chevron-right" size={16} color={colors.textSubtle} />
          </Row>
        </Row>
        <Txt variant="heading">{reading?.headline}</Txt>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {checkin.today.feeling ? <FeelingChip feeling={checkin.today.feeling} small /> : null}
          {reading?.metric ? <Txt variant="small">{reading.metric.label} {reading.metric.value}/{reading.metric.max}</Txt> : null}
          {reading?.alerts.length ? <Txt variant="small">· {reading.alerts.length} {reading.alerts.length === 1 ? 'ponto de atenção' : 'pontos de atenção'}</Txt> : null}
        </Row>
      </Pressable>
    </FadeIn>
  );

  const journeyCard = (
    <FadeIn delay={80} style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ gap: 2 }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Sua jornada de hoje</Txt>
          <Txt variant="title">{journey.doneCount === journey.steps.length ? 'Dia completo' : `${journey.doneCount} de ${journey.steps.length} passos`}</Txt>
        </View>
      </Row>
      <View style={styles.journey}>
        {journey.steps.map((s, i) => {
          const isNext = journey.next?.id === s.id;
          const lastStep = i === journey.steps.length - 1;
          return (
            <Pressable key={s.id} onPress={() => openStep(s)} accessibilityRole="button" accessibilityLabel={`${s.title}${s.done ? ', feito' : ''}`}
              style={({ pressed }) => [styles.step, { opacity: pressed ? 0.8 : 1 }]}>
              <View style={styles.rail}>
                <View style={[styles.node, s.done ? styles.nodeDone : isNext ? styles.nodeNext : null]}>
                  <Icon name={s.done ? 'check' : STEP_ICON[s.id]} size={16} color={s.done ? colors.deep : isNext ? colors.onDark : colors.textSubtle} />
                </View>
                {!lastStep ? <View style={[styles.line, s.done && { backgroundColor: colors.coral }]} /> : null}
              </View>
              <View style={[styles.stepBody, isNext && styles.stepBodyNext]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="bodyStrong" style={s.done ? { color: colors.textSubtle } : undefined}>{s.title}</Txt>
                  <Txt variant="small" numberOfLines={1}>{s.subtitle}</Txt>
                </View>
                {isNext ? <Icon name="arrow-right" size={18} color={colors.coralText} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </FadeIn>
  );

  const continueCard = current ? (
    <FadeIn delay={140}>
      <Pressable onPress={() => router.push({ pathname: '/curso/[id]', params: { id: current.course.id } })} accessibilityRole="button">
        <SpaceCover space={sp} style={styles.continue}>
          <Txt variant="eyebrow" style={{ color: colors.coral }}>Continue a sua trilha</Txt>
          <Txt variant="title" style={{ color: colors.onDark }}>{current.course.title}</Txt>
          <View style={{ gap: 6 }}>
            <ProgressBar value={current.percent} color={colors.coral} track="rgba(255,255,255,0.18)" />
            <Txt variant="small" style={{ color: colors.onDarkMuted }}>{current.percent}% concluído · próxima: {current.next.title}</Txt>
          </View>
        </SpaceCover>
      </Pressable>
    </FadeIn>
  ) : null;

  return (
    <Screen refreshing={library.isRefetching} onRefresh={() => { library.refetch(); checkin.refetch(); activity.refetch(); }}>
      <SpaceHeader space={sp} />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ''}</Txt>
        <Txt variant="hero">{sp.track?.promise ?? 'Um passo de cada vez.'}</Txt>
      </View>
      <Columns
        left={<>{checkinCard}{journeyCard}</>}
        right={<>{continueCard}{live ? <FadeIn delay={200}><LiveCard live={live} /></FadeIn> : null}</>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkinCard: { backgroundColor: colors.petrol, borderRadius: radius.lg, padding: space.xl, gap: space.lg },
  checkinIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  summary: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  journey: { gap: 0 },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'stretch' },
  rail: { width: 36, alignItems: 'center' },
  node: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.coral, borderColor: colors.coral },
  nodeNext: { backgroundColor: colors.petrol, borderColor: colors.petrol },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  stepBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.md, marginBottom: space.md, borderRadius: radius.md },
  stepBodyNext: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  continue: { gap: space.md, padding: space.xl },
});
