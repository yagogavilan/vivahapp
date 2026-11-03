import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CourseState } from '../domain/access';
import type { Course, LifeArea, Track } from '../data/types';
import { CAN_SELL_IN_APP } from '../lib/config';
import { colors, radius, shadow, space } from '../theme';
import { Icon, type IconName, Pill, ProgressBar, Txt } from './ui';

export const AREA_ICON: Record<LifeArea, IconName> = {
  mente: 'wind',
  tempo: 'clock',
  carreira: 'trending-up',
  financas: 'dollar-sign',
  corpo: 'activity',
  alimentacao: 'coffee',
};

export function StateBadge({ state, launchLabel }: { state: CourseState; launchLabel?: string }) {
  if (state === 'open') return <Pill label="Liberado" tone="mint" icon="unlock" />;
  if (state === 'soon') return <Pill label={launchLabel ? `Chega em ${launchLabel.toLowerCase()}` : 'Em breve'} tone="sand" icon="calendar" />;
  return <Pill label="Para alunos" tone="coral" icon="lock" />;
}

/** Cartão compacto para a vitrine da tela Hoje. */
export function TrackTile({ track, state }: { track: Track; state: CourseState }) {
  const dark = state !== 'soon';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/trilha/[id]', params: { id: track.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Trilha ${track.title}, ${track.areaLabel}`}
      style={({ pressed }) => [styles.tile, dark ? styles.tileDark : styles.tileSoon, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.tileIcon, { backgroundColor: dark ? colors.petrolSoft : colors.surface }]}>
        <Icon name={AREA_ICON[track.area]} size={20} color={dark ? colors.coral : colors.textSubtle} />
      </View>
      <View style={{ gap: 2 }}>
        <Txt variant="heading" style={{ color: dark ? colors.onDark : colors.text }}>{track.title}</Txt>
        <Txt variant="small" style={{ color: dark ? colors.onDarkMuted : colors.textSubtle }} numberOfLines={1}>
          {track.areaLabel}
        </Txt>
      </View>
      <View style={styles.tileFoot}>
        <Icon name={state === 'open' ? 'unlock' : state === 'locked' ? 'lock' : 'calendar'} size={14} color={dark ? colors.coral : colors.textSubtle} />
        <Txt variant="small" style={{ color: dark ? colors.onDarkMuted : colors.textSubtle, fontSize: 13 }} numberOfLines={1}>
          {state === 'open' ? 'Liberada' : state === 'locked' ? 'Conheça' : track.launchLabel}
        </Txt>
      </View>
    </Pressable>
  );
}

/** Cartão grande da lista de trilhas. */
export function TrackCard({ track, state, courseCount }: { track: Track; state: CourseState; courseCount: number }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/trilha/[id]', params: { id: track.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, shadow, { opacity: pressed ? 0.9 : 1 }]}>
      <View style={[styles.cardIcon, { backgroundColor: state === 'soon' ? colors.sand : colors.petrol }]}>
        <Icon name={AREA_ICON[track.area]} size={24} color={state === 'soon' ? colors.textSubtle : colors.coral} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Txt variant="eyebrow">{track.areaLabel}</Txt>
        <Txt variant="title">{track.title}</Txt>
        <Txt variant="small">{track.subtitle}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: 4 }}>
          <StateBadge state={state} launchLabel={track.launchLabel} />
          <Pill label={`${courseCount} ${courseCount === 1 ? 'curso' : 'cursos'}`} />
        </View>
      </View>
      <Icon name="chevron-right" size={22} color={colors.textSubtle} />
    </Pressable>
  );
}

const KIND_LABEL: Record<Course['kind'], string> = {
  entrada: 'Comece por aqui',
  bonus: 'Complemento',
  programa: 'Programa',
  acompanhamento: 'Acompanhamento',
};

export function CourseRow({
  course,
  state,
  percent,
  showKind = false,
}: {
  course: Course;
  state: CourseState;
  percent?: number;
  showKind?: boolean;
}) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/curso/[id]', params: { id: course.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.course, { opacity: pressed ? 0.9 : 1 }]}>
      <View style={{ flex: 1, gap: 6 }}>
        {showKind ? <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>{KIND_LABEL[course.kind]}</Txt> : null}
        <Txt variant="bodyStrong">{course.title}</Txt>
        <Txt variant="small" numberOfLines={2}>{course.summary}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
          <StateBadge state={state} />
          {course.kind === 'bonus' ? <Pill label="Complemento" /> : null}
          {/* Preço só na web: nos apps das lojas não falamos de compra. */}
          {CAN_SELL_IN_APP && state === 'locked' && course.priceLabel ? <Pill label={course.priceLabel} tone="sand" /> : null}
        </View>
        {state === 'open' && percent !== undefined && percent > 0 ? (
          <View style={{ gap: 4, marginTop: 4 }}>
            <ProgressBar value={percent} />
            <Txt variant="small">{percent}% concluído</Txt>
          </View>
        ) : null}
      </View>
      <Icon name={state === 'open' ? 'play-circle' : state === 'locked' ? 'lock' : 'calendar'} size={24} color={state === 'open' ? colors.coralText : colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: 168, minHeight: 168, borderRadius: radius.lg, padding: space.lg, justifyContent: 'space-between', gap: space.md },
  tileDark: { backgroundColor: colors.petrol },
  tileSoon: { backgroundColor: colors.sand },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tileFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  cardIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  course: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
});
