import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CourseState } from '../domain/access';
import type { Course, Track } from '../data/types';
import { CAN_SELL_IN_APP } from '../lib/config';
import { colors, radius, shadow, space } from '../theme';
import { AREA_ICON } from './area-icons';
import { Icon, Pill, ProgressBar, Txt } from './ui';
import { TrackCover } from './visual';
import { tap } from '../lib/haptics';

export { AREA_ICON };

export function StateBadge({ state, launchLabel }: { state: CourseState; launchLabel?: string }) {
  if (state === 'open') return <Pill label="Liberado" tone="mint" icon="unlock" />;
  if (state === 'soon') return <Pill label={launchLabel ? `Chega em ${launchLabel.toLowerCase()}` : 'Em breve'} tone="sand" icon="calendar" />;
  return <Pill label="Para alunos" tone="coral" icon="lock" />;
}

/** Cartão compacto para a vitrine da tela Hoje, com a capa da trilha. */
export function TrackTile({ track, state }: { track: Track; state: CourseState }) {
  const muted = state === 'soon';
  const fg = muted ? colors.text : colors.onDark;
  const sub = muted ? colors.textSubtle : colors.onDarkMuted;
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push({ pathname: '/trilha/[id]', params: { id: track.id } });
      }}
      accessibilityRole="button"
      accessibilityLabel={`Trilha ${track.title}, ${track.areaLabel}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <TrackCover area={track.area} muted={muted} style={styles.tile}>
        <View style={[styles.tileIcon, { backgroundColor: muted ? colors.surface : 'rgba(255,255,255,0.14)' }]}>
          <Icon name={AREA_ICON[track.area]} size={20} color={muted ? colors.textSubtle : colors.coral} />
        </View>
        <View style={{ gap: 2 }}>
          <Txt variant="title" style={{ color: fg, fontSize: 22, lineHeight: 26 }}>{track.title}</Txt>
          <Txt variant="small" style={{ color: sub }} numberOfLines={1}>{track.areaLabel}</Txt>
        </View>
        <View style={styles.tileFoot}>
          <Icon name={state === 'open' ? 'unlock' : state === 'locked' ? 'lock' : 'calendar'} size={14} color={muted ? colors.textSubtle : colors.coral} />
          <Txt variant="small" style={{ color: sub, fontSize: 13 }} numberOfLines={1}>
            {state === 'open' ? 'Liberada' : state === 'locked' ? 'Conheça' : track.launchLabel}
          </Txt>
        </View>
      </TrackCover>
    </Pressable>
  );
}

/** Cartão grande da lista de trilhas: capa à esquerda, informações à direita. */
export function TrackCard({ track, state, courseCount }: { track: Track; state: CourseState; courseCount: number }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push({ pathname: '/trilha/[id]', params: { id: track.id } });
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, shadow, { opacity: pressed ? 0.92 : 1 }]}>
      <TrackCover area={track.area} muted={state === 'soon'} style={styles.cardCover}>
        <Icon name={AREA_ICON[track.area]} size={30} color={state === 'soon' ? colors.textSubtle : colors.coral} />
      </TrackCover>
      <View style={{ flex: 1, gap: 6, paddingVertical: space.sm }}>
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
  tile: { width: 176, minHeight: 196, justifyContent: 'space-between', gap: space.md },
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
  cardCover: { width: 96, alignSelf: 'stretch', minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: radius.md },
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
