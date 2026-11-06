import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { Space } from '../domain/spaces';
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
 * Topo de todas as telas do espaço: a trilha atual (toque para trocar) e o
 * botão de socorro, sempre à mão.
 */
export function SpaceHeader({ space, right }: { space: Space; right?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Pressable
        onPress={() => {
          tap();
          router.push('/');
        }}
        accessibilityRole="button"
        accessibilityLabel={`Trilha ${space.title}. Trocar de trilha`}
        style={({ pressed }) => [styles.switcher, { opacity: pressed ? 0.8 : 1 }]}>
        <View style={styles.switcherIcon}>
          <Icon name={spaceIcon(space)} size={16} color={colors.onDark} />
        </View>
        <Txt variant="bodyStrong" style={{ fontSize: 15 }}>{space.title}</Txt>
        <Icon name="chevron-down" size={16} color={colors.textSubtle} />
      </Pressable>
      <Row gap={sp.sm}>
        {right}
        <Pressable
          onPress={() => {
            tap();
            router.push({ pathname: '/socorro', params: { track: space.id } });
          }}
          accessibilityRole="button"
          accessibilityLabel="Socorro: exercícios para se acalmar agora"
          style={({ pressed }) => [styles.sos, { opacity: pressed ? 0.85 : 1 }]}>
          <Icon name="life-buoy" size={16} color={colors.coralText} />
          <Txt variant="bodyStrong" style={{ color: colors.coralText, fontSize: 14 }}>Socorro</Txt>
        </Pressable>
      </Row>
    </Row>
  );
}

const styles = StyleSheet.create({
  cover: { borderRadius: radius.lg, padding: sp.xl, overflow: 'hidden' },
  watermark: { position: 'absolute', right: -6, bottom: -10 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: sp.md,
    borderRadius: radius.pill,
    backgroundColor: colors.coralSoft,
  },
});
