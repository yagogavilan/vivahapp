import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { takeFirstTrack } from '@/lib/first-run';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { SpaceCover, spaceIcon } from '@/components/space';
import { ErrorState, Icon, Logo, Pill, Row, Screen, Txt } from '@/components/ui';
import { FadeIn, ScreenSkeleton, useWide } from '@/components/visual';
import { useLatestDiagnostic, useLibrary, useProgress } from '@/data/hooks';
import { MIND_JOURNEY, MOMENTS, type MomentId } from '@/domain/life-test';
import { completion } from '@/domain/access';
import type { CourseState } from '@/domain/access';
import { greeting } from '@/domain/dates';
import { AQUECIMENTO, type Space, spaceAccess, spaceFor, trackCourses } from '@/domain/spaces';
import { tap } from '@/lib/haptics';
import { colors, radius, shadow, space } from '@/theme';

/**
 * Primeira tela do app: o aluno escolhe a trilha e o app se molda a ela.
 * Trilhas compradas abrem; as outras ficam com cadeado e levam à vitrine.
 */
export default function EscolherTrilha() {
  const { profile } = useSession();
  const library = useLibrary();
  const progress = useProgress();
  const diagnostic = useLatestDiagnostic();
  const wide = useWide();
  // Primeiro acesso: abre direto a trilha escolhida no fim do teste.
  const [firstTrack] = useState(takeFirstTrack);
  if (firstTrack) return <Redirect href={{ pathname: '/t/[track]', params: { track: firstTrack } }} />;

  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  const firstName = profile?.fullName?.split(' ')[0];
  const last = profile?.preferences?.lastSpace;

  const entries = lib.tracks
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((t) => {
      const s = spaceFor(t.id, lib.tracks)!;
      const state = spaceAccess(t.id, lib.tracks, lib.courses, lib.access);
      const ls = lib.lessons.filter((l) => trackCourses(t.id, lib.courses).some((c) => c.id === l.courseId && lib.access.has(c.id)));
      return { s, state, percent: completion(ls, progress.data ?? []) };
    });
  const mine = entries.filter((e) => e.state === 'open');
  const recommendedId = diagnostic.data?.recommendedTrackId;
  const moment = diagnostic.data?.moment ? MOMENTS[diagnostic.data.moment as MomentId] : undefined;
  // As outras trilhas, na ordem da jornada Vivah (mente → rotina → dinheiro → carreira).
  const others = entries
    .filter((e) => e.state !== 'open')
    .sort((a, b) => MIND_JOURNEY.indexOf(a.s.id) - MIND_JOURNEY.indexOf(b.s.id));
  const aquecimento = spaceFor(AQUECIMENTO, lib.tracks)!;

  // Todas as trilhas abrem; os cursos de quem ainda não assinou ficam bloqueados lá dentro.
  const open = (s: Space, _state: CourseState) => {
    tap();
    router.push({ pathname: '/t/[track]', params: { track: s.id } });
  };

  const aquecimentoCard = (
      <FadeIn delay={mine.length * 60} style={wide && mine.length ? styles.cellWide : undefined}>
        <Pressable onPress={() => open(aquecimento, 'open')} accessibilityRole="button" accessibilityLabel="Entrar na Área de Aquecimento, grátis"
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
          <SpaceCover space={aquecimento} style={mine.length ? styles.freeCompact : styles.bigCover}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Pill label="Grátis" tone="dark" />
              {last === AQUECIMENTO ? <Pill label="Última visita" tone="dark" /> : null}
            </Row>
            <View style={{ gap: 4 }}>
              <Txt variant="title" style={{ color: colors.deep }}>Área de Aquecimento</Txt>
              <Txt style={{ color: colors.deep }}>{aquecimento.subtitle}</Txt>
            </View>
            <View style={[styles.enter, { alignSelf: 'flex-start', backgroundColor: colors.surface }]}>
              <Txt variant="bodyStrong" style={{ color: colors.deep }}>Entrar</Txt>
              <Icon name="arrow-right" size={18} color={colors.deep} />
            </View>
          </SpaceCover>
        </Pressable>
      </FadeIn>
  );

  return (
    <Screen>
      <Logo height={32} />
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ''}</Txt>
        <Txt variant="hero">Qual trilha você quer seguir hoje?</Txt>
      </View>

      {moment ? (
        <Pressable onPress={() => router.push('/diagnostico')} accessibilityRole="button" style={styles.moment}>
          <Icon name="compass" size={20} color={colors.coralText} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">{moment.title}</Txt>
            <Txt variant="small">
              Indicada para você: {lib.tracks.find((t) => t.id === recommendedId)?.title ?? '—'} · toque para refazer o teste
            </Txt>
          </View>
        </Pressable>
      ) : (
        <Pressable onPress={() => router.push('/diagnostico')} accessibilityRole="button" style={styles.moment}>
          <Icon name="compass" size={20} color={colors.coralText} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">Descubra o seu momento de vida</Txt>
            <Txt variant="small">14 perguntas e a gente indica por qual trilha começar.</Txt>
          </View>
          <Icon name="chevron-right" size={18} color={colors.textSubtle} />
        </Pressable>
      )}

      {mine.length ? (
        <View style={{ gap: space.md }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Suas trilhas</Txt>
          <View style={[styles.grid, wide && styles.gridWide]}>
            {mine.map(({ s, state, percent }, i) => (
              <FadeIn key={s.id} delay={i * 60} style={wide ? styles.cellWide : undefined}>
                <Pressable onPress={() => open(s, state)} accessibilityRole="button" accessibilityLabel={`Entrar na trilha ${s.title}`}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
                  <SpaceCover space={s} style={styles.bigCover}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={styles.iconBubble}>
                        <Icon name={spaceIcon(s)} size={22} color={colors.coral} />
                      </View>
                      {last === s.id ? <Pill label="Última visita" tone="dark" /> : null}
                    </Row>
                    <View style={{ gap: 4 }}>
                      <Txt variant="eyebrow" style={{ color: colors.coral }}>{s.track?.areaLabel}</Txt>
                      <Txt variant="hero" style={{ color: colors.onDark }}>{s.title}</Txt>
                      <Txt style={{ color: colors.onDarkMuted }}>{s.subtitle}</Txt>
                    </View>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${Math.max(3, percent)}%` }]} />
                        </View>
                        <Txt variant="small" style={{ color: colors.onDarkMuted }}>{percent}% da trilha</Txt>
                      </View>
                      <View style={styles.enter}>
                        <Txt variant="bodyStrong" style={{ color: colors.deep }}>Entrar</Txt>
                        <Icon name="arrow-right" size={18} color={colors.deep} />
                      </View>
                    </Row>
                  </SpaceCover>
                </Pressable>
              </FadeIn>
            ))}
            {aquecimentoCard}
          </View>
        </View>
      ) : (
        aquecimentoCard
      )}


      <View style={{ gap: space.md }}>
        <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>{mine.length ? 'Outras trilhas' : 'Trilhas Vivah'}</Txt>
        <Txt variant="small">Entre para conhecer: as ferramentas do dia são abertas; os cursos e a comunidade vêm com a assinatura anual da trilha.</Txt>
        <View style={[styles.lockedGrid, wide && styles.lockedGridWide]}>
          {others.map(({ s, state }) => (
            <Pressable
              key={s.id}
              onPress={() => open(s, state)}
              accessibilityRole="button"
              accessibilityLabel={`Trilha ${s.title}, ${state === 'soon' ? 'em breve' : 'cursos para assinantes'}`}
              style={({ pressed }) => [styles.locked, shadow, wide && styles.lockedWide, s.id === recommendedId && styles.recommended, { opacity: pressed ? 0.85 : 1 }]}>
              <View style={[styles.lockedIcon, { backgroundColor: colors.sand }]}>
                <Icon name={spaceIcon(s)} size={20} color={colors.textSubtle} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyStrong">{s.title}</Txt>
                <Txt variant="small" numberOfLines={1}>{s.id === recommendedId ? 'Indicada para você' : s.track?.areaLabel}</Txt>
              </View>
              {state === 'soon' ? (
                <Pill label={s.track?.launchLabel ?? 'Em breve'} tone="sand" icon="calendar" />
              ) : (
                <View style={styles.lock}>
                  <Icon name="lock" size={16} color={colors.coralText} />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.md },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWide: { width: '49%' },
  bigCover: { minHeight: 240, justifyContent: 'space-between', gap: space.lg, padding: space.xl },
  freeCompact: { minHeight: 240, justifyContent: 'space-between', gap: space.md, padding: space.xl },
  iconBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginRight: space.lg },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.coral },
  enter: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.coral, paddingVertical: 10, paddingHorizontal: space.lg, borderRadius: radius.pill },
  lockedGrid: { gap: space.sm },
  lockedGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  lockedWide: { width: '49%' },
  lockedIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  recommended: { borderColor: colors.coral, borderWidth: 2 },
  moment: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.coralSoft, borderRadius: radius.md, padding: space.md },
  lock: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
});
