import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { useSession } from '@/auth/session';
import { LiveCard } from '@/components/aquecimento';
import { ContinueCarousel, DayPlanCard, type Intent, IntentRow, StreakChip } from '@/components/engagement';
import { TrackTile } from '@/components/tracks';
import { Button, Card, ErrorState, Icon, LinkText, Logo, Pill, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { Columns, FadeIn, ScreenSkeleton } from '@/components/visual';
import {
  useActivity,
  useAgenda,
  useCheckins,
  useEscudo,
  useLatestDiagnostic,
  useLibrary,
  useLives,
  useProgress,
  useStreak,
} from '@/data/hooks';
import type { Lesson } from '@/data/types';
import { completion, nextLesson, trackState } from '@/domain/access';
import { dayKey, formatTime, greeting } from '@/domain/dates';
import { buildDayPlan } from '@/domain/day-plan';
import { agendaDays, nextLive, todaysEscudo } from '@/domain/schedule';
import { IS_DEMO } from '@/lib/config';
import { colors, space } from '@/theme';

const MOOD = ['', 'Muito mal', 'Mal', 'Mais ou menos', 'Bem', 'Muito bem'];

export default function Hoje() {
  const { profile } = useSession();
  const library = useLibrary();
  const lives = useLives();
  const escudo = useEscudo();
  const progress = useProgress();
  const agenda = useAgenda();
  const checkins = useCheckins(14);
  const diagnostic = useLatestDiagnostic();
  const activity = useActivity();
  const streak = useStreak();

  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;

  const lib = library.data;
  const firstName = profile?.fullName?.split(' ')[0];
  const showStreak = profile?.preferences?.showStreak !== false;
  const audio = escudo.data ? todaysEscudo(escudo.data) : undefined;
  const live = lives.data ? nextLive(lives.data) : undefined;
  const today = dayKey(new Date());
  const todayCheckin = checkins.data?.find((c) => c.day === today);
  const todayAgenda = agendaDays(lives.data ?? [], agenda.data ?? [], new Date(), 1)[0]?.items ?? [];

  const ordered = (courseId: string): Lesson[] => {
    const mods = lib.modules.filter((m) => m.courseId === courseId).sort((a, b) => a.sort - b.sort);
    return mods.flatMap((m) => lib.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.sort - b.sort));
  };

  // "Continue de onde parou": cursos abertos com aula pendente, os já começados primeiro.
  const continueItems = lib.courses
    .filter((c) => !c.isFree && lib.stateOf(c) === 'open')
    .map((course) => {
      const ls = ordered(course.id);
      return {
        course,
        next: nextLesson(ls, progress.data ?? []),
        percent: completion(ls, progress.data ?? []),
        area: lib.trackById.get(course.trackId)!.area,
      };
    })
    .filter((x): x is typeof x & { next: Lesson } => Boolean(x.next))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);

  const plan = buildDayPlan({
    activity: activity.data ?? [],
    escudo: audio,
    nextLesson: continueItems[0]?.next ?? lib.lessons.find((l) => l.isPreview),
    checkinEnabled: Boolean(profile?.healthConsentAt),
  });

  // Atalhos por intenção: usam os áudios do Calma em 5 Minutos quando o aluno tem acesso.
  const calma = lib.access.has('calma-em-5-minutos') ? ordered('calma-em-5-minutos') : [];
  const openLessonOrEscudo = (lesson?: Lesson) => {
    if (lesson) router.push({ pathname: '/aula/[id]', params: { id: lesson.id } });
    else if (audio) router.push({ pathname: '/escudo/[id]', params: { id: audio.id } });
  };
  const intents: Intent[] = [
    { label: 'Acalmar agora', icon: 'wind', onPress: () => openLessonOrEscudo(calma[0]) },
    { label: 'Focar', icon: 'target', onPress: () => router.push('/foco') },
    { label: 'Dormir melhor', icon: 'moon', onPress: () => openLessonOrEscudo(calma.find((l) => l.title === 'Antes de dormir')) },
  ];

  const recommended = diagnostic.data ? lib.trackById.get(diagnostic.data.recommendedTrackId) : undefined;

  const left = (
    <>
      <FadeIn>
        <DayPlanCard steps={plan.steps} doneCount={plan.doneCount} evening={plan.evening} streak={streak} showStreak={showStreak} />
      </FadeIn>
      <FadeIn delay={80}>
        <View style={{ gap: space.sm }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Do que você precisa agora?</Txt>
          <IntentRow intents={intents} />
        </View>
      </FadeIn>
      {continueItems.length ? (
        <FadeIn delay={140}>
          <View style={{ gap: space.md }}>
            <SectionTitle eyebrow="Seus cursos" title="Continue de onde parou" />
            <ContinueCarousel items={continueItems} />
          </View>
        </FadeIn>
      ) : null}
    </>
  );

  const right = (
    <>
      {live ? <FadeIn delay={60}><LiveCard live={live} /></FadeIn> : null}

      {profile?.healthConsentAt ? (
        <Card tone={todayCheckin ? 'light' : 'sand'} onPress={() => router.push('/checkin')} style={{ gap: space.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="eyebrow">Check-in de hoje</Txt>
            <Icon name="chevron-right" color={colors.textSubtle} />
          </Row>
          {todayCheckin ? (
            <Txt variant="bodyStrong">
              Humor: {MOOD[todayCheckin.mood]} · Sono: {String(todayCheckin.sleepHours).replace('.', ',')} h · Energia {todayCheckin.energy}/5
            </Txt>
          ) : (
            <Txt variant="heading">Como você está hoje? Leva 20 segundos.</Txt>
          )}
        </Card>
      ) : (
        <Card tone="sand" onPress={() => router.push('/privacidade')} style={{ gap: space.xs }}>
          <Txt variant="bodyStrong">Acompanhe o seu humor e o seu sono</Txt>
          <Txt variant="small">Ative o check-in diário e veja a sua evolução. Você decide o que guardamos.</Txt>
        </Card>
      )}

      {recommended ? (
        <Card onPress={() => router.push({ pathname: '/trilha/[id]', params: { id: recommended.id } })} style={{ gap: space.xs }}>
          <Txt variant="eyebrow">Recomendada para você</Txt>
          <Txt variant="heading">Trilha {recommended.title} · {recommended.areaLabel}</Txt>
          <Txt variant="small">
            {recommended.status === 'soon'
              ? `Chega em ${recommended.launchLabel.toLowerCase()}. Enquanto isso, comece pela Respira.`
              : recommended.promise}
          </Txt>
        </Card>
      ) : (
        <Card tone="coral" onPress={() => router.push('/diagnostico')} style={{ gap: space.sm }}>
          <Txt variant="heading" style={{ color: colors.deep }}>Descubra por onde começar</Txt>
          <Txt style={{ color: colors.deep }}>12 perguntas rápidas sobre mente, tempo, carreira, dinheiro, corpo e alimentação.</Txt>
          <View style={{ alignSelf: 'flex-start' }}>
            <Button label="Fazer o diagnóstico" variant="secondary" onPress={() => router.push('/diagnostico')} />
          </View>
        </Card>
      )}

      <View style={{ gap: space.md }}>
        <SectionTitle eyebrow="Agenda" title="Hoje" action={<LinkText label="Abrir agenda" onPress={() => router.push('/agenda')} />} />
        {todayAgenda.length ? (
          <Card style={{ gap: space.md }}>
            {todayAgenda.map((item) => (
              <Row key={item.key} gap={space.md}>
                <Txt variant="bodyStrong" style={{ width: 52 }}>{formatTime(item.startsAt)}</Txt>
                <Txt style={{ flex: 1 }}>{item.title}</Txt>
              </Row>
            ))}
          </Card>
        ) : (
          <Card tone="sand" onPress={() => router.push('/evento')} style={{ gap: space.xs }}>
            <Txt variant="bodyStrong">Nada marcado para hoje</Txt>
            <Txt variant="small">Reserve um bloco de foco, um treino ou o horário da preocupação.</Txt>
          </Card>
        )}
      </View>
    </>
  );

  return (
    <Screen
      refreshing={library.isRefetching}
      onRefresh={() => {
        library.refetch();
        lives.refetch();
        escudo.refetch();
        activity.refetch();
      }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Logo height={34} />
        <Row gap={space.sm}>
          {IS_DEMO ? <Pill label="Demonstração" tone="coral" /> : null}
          {showStreak && streak ? <StreakChip streak={streak} /> : null}
          <Pressable onPress={() => router.push('/buscar')} accessibilityRole="button" accessibilityLabel="Buscar" hitSlop={8} style={{ padding: 6 }}>
            <Icon name="search" size={22} color={colors.petrol} />
          </Pressable>
        </Row>
      </Row>

      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">Área de Aquecimento Vivah</Txt>
        <Txt variant="hero">{greeting()}{firstName ? `, ${firstName}` : ''}.</Txt>
      </View>

      <Columns left={left} right={right} />

      <View style={{ gap: space.md }}>
        <SectionTitle eyebrow="Seis trilhas" title="Uma vida inteira" action={<LinkText label="Ver todas" onPress={() => router.push('/trilhas')} />} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.lg }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg }}>
          {lib.tracks.map((t) => (
            <TrackTile key={t.id} track={t} state={trackState(t, lib.courses.filter((c) => c.trackId === t.id), lib.access)} />
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}
