import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect, useState } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { LifeArea } from '../data/types';
import { areaGradient, colors, radius, space, WIDE } from '../theme';

/** Capa da trilha: gradiente da área, círculos suaves e o ícone grande ao fundo. */
export function TrackCover({ area, children, style, muted }: { area: LifeArea; children?: ReactNode; style?: ViewStyle; muted?: boolean }) {
  const [from, to] = areaGradient[area];
  return (
    <LinearGradient
      colors={muted ? [colors.sand, '#E3DCCD'] : [from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cover, style]}>
      {children}
    </LinearGradient>
  );
}

/** Anel de progresso (0–1). */
export function ProgressRing({ value, size = 64, stroke = 7, color = colors.coral, track = colors.petrolSoft, children }: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Bloco cinza pulsando enquanto o conteúdo carrega. */
export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: ViewStyle }) {
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, width, borderRadius: radius.sm, backgroundColor: colors.sand, opacity: pulse }, style]} />;
}

/** Tela de carregamento com a forma da tela real. */
export function ScreenSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, padding: space.lg, paddingTop: space.xxxl, gap: space.lg, width: '100%', maxWidth: 1120, alignSelf: 'center' }}>
      <Skeleton height={14} width={140} />
      <Skeleton height={34} width="70%" />
      <Skeleton height={150} style={{ borderRadius: radius.lg }} />
      <Skeleton height={110} style={{ borderRadius: radius.lg }} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Skeleton height={150} width={160} style={{ borderRadius: radius.lg }} />
        <Skeleton height={150} width={160} style={{ borderRadius: radius.lg }} />
      </View>
    </View>
  );
}

/** Entrada suave (sobe e aparece), com atraso opcional para cascata. */
/**
 * Antes, cada bloco entrava deslizando. Agora a tela aparece inteira de uma vez:
 * o movimento fica para o que responde ao toque (respiração, botões, progresso).
 */
export function FadeIn({ children, style }: { children: ReactNode; delay?: number; style?: ViewStyle }) {
  return <View style={style}>{children}</View>;
}

export function useWide() {
  const { width } = useWindowDimensions();
  return width >= WIDE;
}

/** Duas colunas no desktop/tablet, uma no celular. */
export function Columns({ left, right, ratio = 1.4 }: { left: ReactNode; right: ReactNode; ratio?: number }) {
  const wide = useWide();
  if (!wide) {
    return (
      <View style={{ gap: space.xl }}>
        {left}
        {right}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' }}>
      <View style={{ flex: ratio, gap: space.xl }}>{left}</View>
      <View style={{ flex: 1, gap: space.xl }}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { borderRadius: radius.lg, overflow: 'hidden', padding: space.lg },
  ring: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 28, right: -90, top: -110 },
  ringSmall: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 10, right: 40, bottom: -40 },
  watermark: { position: 'absolute', right: 12, bottom: 4 },
});
