import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { useSession } from '@/auth/session';
import { EscudoCard, LiveCard } from '@/components/aquecimento';
import { TrackTile } from '@/components/tracks';
import { Button, Card, ErrorState, Icon, LinkText, Loading, Logo, Pill, ProgressBar, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useAgenda, useCheckins, useEscudo, useLatestDiagnostic, useLibrary, useLives, useProgress } from '@/data/hooks';
import { completion, nextLesson, trackState } from '@/domain/access';
import { dayKey, formatTime, greeting } from '@/domain/dates';
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

  if (library.isPending) return <Loading />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;

  const lib = library.data;
  const firstName = profile?.fullName?.split(' ')[0];
  const audio = escudo.data ? todaysEscudo(escudo.data) : undefined;
  const live = lives.data ? nextLive(lives.data) : undefined;
  const today = dayKey(new Date());
  const todayCheckin = checkins.data?.find((c) => c.day === today);
  const todayAgenda = agendaDays(lives.data ?? [], agenda.data ?? [], new Date(), 1)[0]?.items ?? [];

  // "Continue de onde parou": primeiro curso aberto (pago) com aula pendente.
  const ordered = (courseId: string) => {
    const mods = lib.modules.filter((m) => m.courseId === courseId).sort((a, b) => a.sort - b.sort);
    return mods.flatMap((m) => lib.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.sort - b.sort));
  };
  const continueItem = lib.courses
    .filter((c) => !c.isFree && lib.stateOf(c) === 'open')
    .map((course) => {
      const lessons = ordered(course.id);
      return { course, next: nextLesson(lessons, progress.data ?? []), percent: completion(lessons, progress.data ?? []) };
    })
    .find((x) => x.next);

  const recommended = diagnostic.data ? lib.trackById.get(diagnostic.data.recommendedTrackId) : undefined;

  return (
    <Screen refreshing={library.isRefetching} onRefresh={() => { library.refetch(); lives.refetch(); escudo.refetch(); }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Logo height={34} />
        {IS_DEMO ? <Pill label="Demonstração" tone="coral" /> : null}
      </Row>

      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">Área de Aquecimento Vivah</Txt>
        <Txt variant="hero">{greeting()}{firstName ? `, ${firstName}` : ''}.</Txt>
      </View>

      {audio ? <EscudoCard audio={audio} /> : null}
      {live ? <LiveCard live={live} /> : null}

      {continueItem?.next ? (
        <Card onPress={() => router.push({ pathname: '/aula/[id]', params: { id: continueItem.next!.id } })} style={{ gap: space.md }}>
          <Txt variant="eyebrow">Continue de onde parou</Txt>
          <Txt variant="heading">{continueItem.next.title}</Txt>
          <Txt variant="small">{continueItem.course.title}</Txt>
          <ProgressBar value={continueItem.percent} />
          <Txt variant="small">{continueItem.percent}% do curso</Txt>
        </Card>
      ) : null}

      {profile?.healthConsentAt ? (
        <Card tone={todayCheckin ? 'light' : 'sand'} onPress={() => router.push('/checkin')} style={{ gap: space.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="eyebrow">Check-in de hoje</Txt>
            <Icon name="chevron-right" color={colors.textSubtle} />
          </Row>
          {todayCheckin ? (
            <Txt variant="bodyStrong">
              Humor: {MOOD[todayCheckin.mood]} · Sono: {todayCheckin.sleepHours} h · Energia {todayCheckin.energy}/5
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

      <SectionTitle eyebrow="Seis trilhas" title="Uma vida inteira" action={<LinkText label="Ver todas" onPress={() => router.push('/trilhas')} />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.lg }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg }}>
        {lib.tracks.map((t) => (
          <TrackTile key={t.id} track={t} state={trackState(t, lib.courses.filter((c) => c.trackId === t.id), lib.access)} />
        ))}
      </ScrollView>

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
    </Screen>
  );
}
