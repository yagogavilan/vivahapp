import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useLibrary } from '../data/hooks';
import { type Space, spaceFor } from '../domain/spaces';
import { tap } from '../lib/haptics';
import { colors, radius, space as sp } from '../theme';
import { AREA_ICON } from './area-icons';
import { Icon, type IconName, Row, Txt } from './ui';
import { BellButton } from './inbox';
import { TrackCover } from './visual';

export function spaceIcon(s: Pick<Space, 'area'>): IconName {
  return AREA_ICON[s.area];
}

/** Capa do espaço: a cor da trilha. */
export function SpaceCover({ space, children, style, muted }: { space: Pick<Space, 'area'>; children?: ReactNode; style?: ViewStyle; muted?: boolean }) {
  return <TrackCover area={space.area} muted={muted} style={style}>{children}</TrackCover>;
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
            <Icon name={spaceIcon(space)} size={18} color={colors.coral} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="small" style={{ color: colors.onDarkMuted, fontSize: 12, lineHeight: 16 }}>Você está na trilha</Txt>
            <Txt variant="bodyStrong" style={{ color: colors.onDark, fontSize: 17 }} numberOfLines={1}>
              {space.title}
              <Txt variant="small" style={{ color: colors.onDarkMuted, fontSize: 13 }}>{`  ${space.track.areaLabel}`}</Txt>
            </Txt>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Icon name="repeat" size={16} color={colors.onDarkMuted} />
            <Txt variant="small" style={{ color: colors.onDarkMuted, fontSize: 11, lineHeight: 14 }}>Trocar</Txt>
          </View>
        </SpaceCover>
      </Pressable>
      {right}
      <BellButton />
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
      <View style={[styles.contextDot, { backgroundColor: colors.petrol }]}>
        <Icon name={spaceIcon(space)} size={12} color={colors.onDark} />
      </View>
      <Txt variant="small" style={{ color: colors.text, fontSize: 13 }}>
        Trilha <Txt variant="bodyStrong" style={{ fontSize: 13 }}>{space.title}</Txt>
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
