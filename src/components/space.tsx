import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useLibrary } from '../data/hooks';
import { type Space, spaceFor } from '../domain/spaces';
import { tap } from '../lib/haptics';
import { colors, radius, space as sp } from '../theme';
import { AREA_ICON } from './area-icons';
import { Icon, type IconName, Row, Txt } from './ui';
import { TrackCover } from './visual';

export function spaceIcon(s: Pick<Space, 'area'>): IconName {
  return s.area ? AREA_ICON[s.area] : 'sunrise';
}

/** Capa do espaço: a da trilha ou, no Aquecimento, um degradê coral. */
export function SpaceCover({ space, children, style, muted }: { space: Pick<Space, 'area'>; children?: ReactNode; style?: ViewStyle; muted?: boolean }) {
  if (space.area) return <TrackCover area={space.area} muted={muted} style={style}>{children}</TrackCover>;
  return (
    <LinearGradient colors={['#F4865C', '#E2674A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cover, style]}>
      <View pointerEvents="none" style={styles.watermark}>
        <Icon name="sunrise" size={96} color="rgba(255,255,255,0.16)" />
      </View>
      {children}
    </LinearGradient>
  );
}

/**
 * Topo das telas da trilha: em qual trilha o aluno está (toque para trocar).
 * Na Respira, também o botão de Socorro, sempre à mão.
 */
export function SpaceHeader({ space, right }: { space: Space; right?: ReactNode }) {
  return (
    <Row gap={sp.sm}>
      <Pressable
        onPress={() => {
          tap();
          router.push('/');
        }}
        accessibilityRole="button"
        accessibilityLabel={`Trilha ${space.title}. Trocar de trilha`}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}>
        <SpaceCover space={space} style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Icon name={spaceIcon(space)} size={18} color={space.area ? colors.coral : colors.deep} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="small" style={{ color: space.area ? colors.onDarkMuted : colors.deep, fontSize: 12, lineHeight: 16 }}>Você está na trilha</Txt>
            <Txt variant="bodyStrong" style={{ color: space.area ? colors.onDark : colors.deep, fontSize: 17 }} numberOfLines={1}>
              {space.title}
              <Txt variant="small" style={{ color: space.area ? colors.onDarkMuted : colors.deep, fontSize: 13 }}>{space.track ? `  ${space.track.areaLabel}` : '  grátis'}</Txt>
            </Txt>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Icon name="repeat" size={16} color={space.area ? colors.onDarkMuted : colors.deep} />
            <Txt variant="small" style={{ color: space.area ? colors.onDarkMuted : colors.deep, fontSize: 11, lineHeight: 14 }}>Trocar</Txt>
          </View>
        </SpaceCover>
      </Pressable>
      {right}
      {space.id === 'respira' ? <Pressable
        onPress={() => {
          tap();
          router.push({ pathname: '/socorro', params: { track: space.id } });
        }}
        accessibilityRole="button"
        accessibilityLabel="Socorro: exercícios para se acalmar agora"
        style={({ pressed }) => [styles.sos, { opacity: pressed ? 0.85 : 1 }]}>
        <Icon name="life-buoy" size={20} color={colors.coralText} />
        <Txt variant="bodyStrong" style={{ color: colors.coralText, fontSize: 11, lineHeight: 14 }}>Socorro</Txt>
      </Pressable> : null}
    </Row>
  );
}

/** Faixa curta nas telas internas (curso, aula, check-in…): a trilha de onde o aluno veio. */
export function TrackContextBar({ trackId }: { trackId: string }) {
  const library = useLibrary();
  const space = library.data ? spaceFor(trackId, library.data.tracks) : undefined;
  if (!space) return null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/t/[track]', params: { track: space.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Trilha ${space.title}`}
      style={styles.context}>
      <View style={[styles.contextDot, { backgroundColor: space.area ? colors.petrol : colors.coral }]}>
        <Icon name={spaceIcon(space)} size={12} color={colors.onDark} />
      </View>
      <Txt variant="small" style={{ color: colors.text, fontSize: 13 }}>
        Trilha <Txt variant="bodyStrong" style={{ fontSize: 13 }}>{space.title}</Txt>
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cover: { borderRadius: radius.lg, padding: sp.xl, overflow: 'hidden' },
  watermark: { position: 'absolute', right: -6, bottom: -10 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: sp.md, paddingVertical: sp.md, paddingHorizontal: sp.md, borderRadius: radius.md },
  bannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  context: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 4, paddingLeft: 4, paddingRight: sp.md },
  contextDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  switcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: sp.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switcherIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.petrol, alignItems: 'center', justifyContent: 'center' },
  sos: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 64,
    alignSelf: 'stretch',
    borderRadius: radius.md,
    backgroundColor: colors.coralSoft,
  },
});
