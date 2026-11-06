import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '../lib/haptics';
import { colors, fonts, maxWidth, radius, shadow, space, type } from '../theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export function Icon({ name, size = 20, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}

/** Tela com rolagem, fundo creme e largura máxima no desktop. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  padTop = true,
  style,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padTop?: boolean;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.cream }}
      contentContainerStyle={{ paddingTop: padTop ? insets.top + space.lg : space.lg, paddingBottom: space.xxxl }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.petrol} /> : undefined
      }>
      <View style={[styles.column, style]}>{children}</View>
    </ScrollView>
  );
}

export function Txt({ variant = 'body', style, children, numberOfLines }: {
  variant?: keyof typeof type;
  style?: TextStyle | TextStyle[];
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text style={[type[variant], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Card({ children, style, tone = 'light', onPress }: {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  tone?: 'light' | 'dark' | 'coral' | 'mint' | 'sand';
  onPress?: () => void;
}) {
  const toneStyle = {
    light: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
    dark: { backgroundColor: colors.petrol },
    coral: { backgroundColor: colors.coral },
    mint: { backgroundColor: colors.mint },
    sand: { backgroundColor: colors.sand },
  }[tone];
  const body = <View style={[styles.card, toneStyle, tone === 'light' && shadow, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'light' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const v = {
    primary: { bg: colors.petrol, fg: colors.onDark, border: colors.petrol },
    secondary: { bg: colors.coral, fg: colors.deep, border: colors.coral },
    ghost: { bg: 'transparent', fg: colors.petrol, border: colors.border },
    light: { bg: colors.surface, fg: colors.petrol, border: colors.surface },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={v.fg} /> : null}
          <Text style={[styles.buttonText, { color: v.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Pill({ label, tone = 'sand', icon }: { label: string; tone?: 'sand' | 'coral' | 'mint' | 'dark' | 'outline'; icon?: IconName }) {
  const t = {
    sand: { bg: colors.sand, fg: colors.textMuted, border: colors.sand },
    coral: { bg: colors.coralSoft, fg: colors.coralText, border: colors.coralSoft },
    mint: { bg: colors.mintSoft, fg: colors.petrol, border: colors.mintSoft },
    dark: { bg: colors.petrol, fg: colors.onDark, border: colors.petrol },
    outline: { bg: 'transparent', fg: colors.onDark, border: colors.onDarkMuted },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border }]}>
      {icon ? <Icon name={icon} size={13} color={t.fg} /> : null}
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? <Txt variant="eyebrow">{eyebrow}</Txt> : null}
        <Txt variant="title">{title}</Txt>
      </View>
      {action}
    </View>
  );
}

export function LinkText({ label, onPress, color = colors.coralText }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color }}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.mint, track = colors.sand }: { value: number; color?: string; track?: string }) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: track }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: value }}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.textSubtle} accessibilityLabel={label} {...props} style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]} />
      {hint ? <Txt variant="small">{hint}</Txt> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, onDark }: { label: string; selected: boolean; onPress: () => void; onDark?: boolean }) {
  const on = onDark ? { bg: colors.coral, text: colors.deep } : { bg: colors.petrol, text: colors.onDark };
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected ? { backgroundColor: on.bg, borderColor: on.bg } : null]}>
      <Text style={[styles.chipText, selected ? { color: on.text } : null]}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.petrol} size="large" />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={[styles.center, { gap: space.md, padding: space.xl }]}>
      <Icon name="wifi-off" size={28} color={colors.textSubtle} />
      <Txt variant="bodyStrong" style={{ textAlign: 'center' }}>Não foi possível carregar.</Txt>
      <Txt variant="small" style={{ textAlign: 'center' }}>{error instanceof Error ? error.message : 'Confira a sua internet.'}</Txt>
      {onRetry ? <Button label="Tentar de novo" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text?: string; children?: ReactNode }) {
  return (
    <View style={[styles.emptyBox]}>
      <Icon name={icon} size={26} color={colors.textSubtle} />
      <Txt variant="bodyStrong" style={{ textAlign: 'center' }}>{title}</Txt>
      {text ? <Txt variant="small" style={{ textAlign: 'center' }}>{text}</Txt> : null}
      {children}
    </View>
  );
}

export function Logo({ dark = false, height = 32 }: { dark?: boolean; height?: number }) {
  return (
    <Image
      source={dark ? require('../../assets/images/logo-on-dark.png') : require('../../assets/images/logo-on-light.png')}
      style={{ height, width: height * (827 / 386) }}
      contentFit="contain"
      accessibilityLabel="Vivah"
    />
  );
}

export function Row({ children, gap = space.sm, style }: { children: ReactNode; gap?: number; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth, alignSelf: 'center', paddingHorizontal: space.lg, gap: space.xl },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1.5,
  },
  buttonText: { fontFamily: fonts.bodyHeavy, fontSize: 16 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  section: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginBottom: -space.sm },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', width: '100%' },
  progressFill: { height: 8, borderRadius: 4 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.text,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  emptyBox: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
});
