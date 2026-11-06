import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { JourneyList, type JourneyItemInfo } from '@/components/journey-list';
import { SpaceCover } from '@/components/space';
import { ErrorState, Icon, Logo, Row, Screen, Txt } from '@/components/ui';
import { FadeIn, ScreenSkeleton } from '@/components/visual';
import { useLatestDiagnostic, useLibrary, useProgress } from '@/data/hooks';
import { completion } from '@/domain/access';
import { greeting } from '@/domain/dates';
import { MOMENTS, type MomentId } from '@/domain/life-test';
import { AQUECIMENTO, spaceAccess, trackCourses } from '@/domain/spaces';
import { takeFirstTrack } from '@/lib/first-run';
import { tap } from '@/lib/haptics';
import { colors, radius, space } from '@/theme';

/** Tela inicial: a jornada Vivah do 1 ao 6, sempre na mesma ordem, e a área grátis. */
export default function EscolherTrilha() {
  const { profile } = useSession();
  const library = useLibrary();
  const progress = useProgress();
  const diagnostic = useLatestDiagnostic();
  // Primeiro acesso: abre direto a trilha escolhida no fim do teste.
  const [firstTrack] = useState(takeFirstTrack);
  if (firstTrack) return <Redirect href={{ pathname: '/t/[track]', params: { track: firstTrack } }} />;

  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  const firstName = profile?.fullName?.split(' ')[0];
  const last = profile?.preferences?.lastSpace;
  const moment = diagnostic.data?.moment ? MOMENTS[diagnostic.data.moment as MomentId] : undefined;

  const info: Record<string, JourneyItemInfo> = {};
  for (const t of lib.tracks) {
    const subscribed = spaceAccess(t.id, lib.tracks, lib.courses, lib.access) === 'open';
    const ls = lib.lessons.filter((l) => trackCourses(t.id, lib.courses).some((c) => c.id === l.courseId));
    info[t.id] = { subscribed, percent: subscribed ? completion(ls, progress.data ?? []) : undefined, lastVisit: last === t.id };
  }
  const open = (id: string) => {
    tap();
    router.push({ pathname: '/t/[track]', params: { track: id } });
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Logo height={30} />
        <Pressable onPress={() => router.push('/diagnostico')} accessibilityRole="button" style={styles.moment}>
          <Icon name="compass" size={16} color={colors.coralText} />
          <Txt variant="bodyStrong" style={{ fontSize: 13, color: colors.coralText }}>{moment ? moment.title.replace('Momento de ', '') : 'Fazer o teste'}</Txt>
        </Pressable>
      </Row>
      <View style={{ gap: 2 }}>
        <Txt variant="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ''}</Txt>
        <Txt variant="hero">Sua jornada</Txt>
      </View>

      <FadeIn>
        <Pressable onPress={() => open(AQUECIMENTO)} accessibilityRole="button" accessibilityLabel="Entrar na Área de Aquecimento, grátis"
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
          <SpaceCover space={{ area: null }} style={styles.free}>
            <View style={styles.freeIcon}><Icon name="sunrise" size={22} color={colors.deep} /></View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong" style={{ color: colors.deep, fontSize: 17 }}>Aquecimento</Txt>
              <Txt variant="small" style={{ color: colors.deep }}>Grátis · lives e Escudo do dia</Txt>
            </View>
            <Icon name="arrow-right" size={20} color={colors.deep} />
          </SpaceCover>
        </Pressable>
      </FadeIn>

      <JourneyList tracks={lib.tracks} recommendedId={diagnostic.data?.recommendedTrackId} info={info} onPick={open} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  moment: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.coralSoft, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: space.md },
  free: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  freeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
});
