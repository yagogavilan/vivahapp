import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Course, Lesson, LifeArea } from '../data/types';
import type { Achievement } from '../domain/achievements';
import type { PlanStep } from '../domain/day-plan';
import { dayKey } from '../domain/dates';
import type { StreakInfo } from '../domain/streak';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, shadow, space } from '../theme';
import { Icon, type IconName, ProgressBar, Row, Txt } from './ui';
import { ProgressRing, TrackCover } from './visual';

const WEEK_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/** Chip da sequência no topo da tela Hoje. */
export function StreakChip({ streak }: { streak: StreakInfo }) {
  return (
    <Pressable
      onPress={() => router.push('/conquistas')}
      accessibilityRole="button"
      accessibilityLabel={`Sequência de ${streak.current} dias. Ver conquistas`}
      style={[styles.chip, { backgroundColor: streak.todayDone ? colors.coralSoft : colors.sand }]}>
      <Icon name="zap" size={16} color={streak.todayDone ? colors.coralText : colors.textSubtle} />
      <Txt variant="bodyStrong" style={{ color: streak.todayDone ? colors.coralText : colors.textMuted }}>
        {streak.current} {streak.current === 1 ? 'dia' : 'dias'}
      </Txt>
    </Pressable>
  );
}

/** Semana de segunda a domingo: feito, folga, faltou, hoje, futuro. */
export function WeekStrip({ streak, dark }: { streak: StreakInfo; dark?: boolean }) {
  const fg = dark ? colors.onDark : colors.text;
  const muted = dark ? colors.onDarkMuted : colors.textSubtle;
  const todayKey = dayKey(new Date());
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityLabel="Atividade desta semana">
      {streak.week.map((d, i) => {
        const done = d.status === 'done';
        const rest = d.status === 'rest';
        const today = d.day === todayKey;
        return (
          <View key={d.day} style={{ alignItems: 'center', gap: 6 }}>
            <Txt variant="small" style={{ color: muted, fontSize: 12 }}>{WEEK_LETTERS[i]}</Txt>
            <View
              style={[
                styles.dot,
                done && { backgroundColor: colors.coral, borderColor: colors.coral },
                rest && { backgroundColor: 'transparent', borderColor: colors.mint, borderStyle: 'dashed' },
                d.status === 'today' && { borderColor: dark ? colors.onDark : colors.petrol, borderWidth: 2 },
                (d.status === 'missed' || d.status === 'future') && { borderColor: dark ? colors.petrolSoft : colors.border },
              ]}>
              {done ? <Icon name="check" size={14} color={colors.deep} /> : rest ? <Icon name="coffee" size={12} color={colors.mint} /> : null}
            </View>
            {today ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: fg }} /> : <View style={{ height: 4 }} />}
          </View>
        );
      })}
    </View>
  );
}

/** "Seu dia": anel de progresso e três passos curtos. */
export function DayPlanCard({ steps, doneCount, evening, streak, showStreak }: {
  steps: PlanStep[];
  doneCount: number;
  evening: boolean;
  streak?: StreakInfo;
  showStreak: boolean;
}) {
  const all = doneCount === steps.length;
  return (
    <View style={[styles.plan]}>
      <Row gap={space.lg}>
        <ProgressRing value={doneCount / steps.length} size={72} stroke={8} track={colors.petrolSoft}>
          <Txt variant="bodyStrong" style={{ color: colors.onDark, fontSize: 18 }}>{doneCount}/{steps.length}</Txt>
        </ProgressRing>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="eyebrow" style={{ color: colors.coral }}>{evening ? 'Sua noite' : 'Seu dia'}</Txt>
          <Txt variant="title" style={{ color: colors.onDark, fontSize: 22, lineHeight: 27 }}>
            {all ? 'Tudo feito. Bom descanso!' : evening ? 'Desacelere em poucos minutos' : 'Três passos curtos para hoje'}
          </Txt>
        </View>
      </Row>
      <View style={{ gap: space.sm }}>
        {steps.map((s) => (
          <Pressable
            key={s.id}
            disabled={!s.target}
            onPress={() => {
              tap();
              if (s.target) router.push(s.target as never);
            }}
            accessibilityRole="button"
            accessibilityState={{ checked: s.done }}
            style={({ pressed }) => [styles.step, { opacity: pressed ? 0.85 : 1 }]}>
            <View style={[styles.check, s.done && { backgroundColor: colors.coral, borderColor: colors.coral }]}>
              {s.done ? <Icon name="check" size={16} color={colors.deep} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong" style={{ color: colors.onDark, textDecorationLine: s.done ? 'line-through' : 'none', opacity: s.done ? 0.7 : 1 }}>
                {s.title}
              </Txt>
              <Txt variant="small" style={{ color: colors.onDarkMuted }} numberOfLines={1}>
                {s.subtitle} · {s.minutes} min
              </Txt>
            </View>
            <Icon name="chevron-right" size={18} color={colors.onDarkMuted} />
          </Pressable>
        ))}
      </View>
      {showStreak && streak ? (
        <View style={{ gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.petrolSoft }}>
          <WeekStrip streak={streak} dark />
          <Txt variant="small" style={{ color: colors.onDarkMuted }}>
            {streak.restUsedThisWeek ? 'Folga da semana usada: sua sequência continua. ' : 'Você tem 1 dia de folga por semana sem perder a sequência. '}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

export interface Intent {
  label: string;
  icon: IconName;
  onPress: () => void;
}

/** Atalhos por intenção: o que a pessoa quer sentir agora. */
export function IntentRow({ intents }: { intents: Intent[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {intents.map((i) => (
        <Pressable
          key={i.label}
          onPress={() => {
            tap();
            i.onPress();
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.intent, shadow, { opacity: pressed ? 0.85 : 1 }]}>
          <View style={styles.intentIcon}>
            <Icon name={i.icon} size={20} color={colors.coralText} />
          </View>
          <Txt variant="bodyStrong" style={{ fontSize: 14, textAlign: 'center' }}>{i.label}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

/** Carrossel "Continue de onde parou" com a capa da trilha de cada curso. */
export function ContinueCarousel({ items }: { items: { course: Course; next: Lesson; percent: number; area: LifeArea }[] }) {
  if (!items.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.lg }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg }}>
      {items.map(({ course, next, percent, area }) => (
        <Pressable
          key={course.id}
          onPress={() => {
            tap();
            router.push({ pathname: '/aula/[id]', params: { id: next.id } });
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.continue, shadow, { opacity: pressed ? 0.9 : 1 }]}>
          <TrackCover area={area} style={{ height: 92, borderRadius: radius.md, justifyContent: 'flex-end' }}>
            <View style={styles.playBadge}>
              <Icon name="play" size={16} color={colors.deep} />
            </View>
          </TrackCover>
          <View style={{ gap: 4, padding: space.md }}>
            <Txt variant="small" numberOfLines={1}>{course.title}</Txt>
            <Txt variant="bodyStrong" numberOfLines={2}>{next.title}</Txt>
            <ProgressBar value={percent} />
            <Txt variant="small" style={{ fontSize: 12 }}>{percent}% · {next.durationMin} min</Txt>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const ICON_MAP: Record<Achievement['icon'], IconName> = {
  feather: 'feather',
  'play-circle': 'play-circle',
  shield: 'shield',
  zap: 'zap',
  award: 'award',
  heart: 'heart',
  compass: 'compass',
  'message-circle': 'message-circle',
  target: 'target',
  sun: 'sun',
};

export function AchievementGrid({ items }: { items: Achievement[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
      {items.map((a) => (
        <View key={a.id} style={[styles.badge, a.earned ? styles.badgeOn : null]} accessibilityLabel={`${a.title}: ${a.earned ? 'conquistada' : `${Math.round(a.progress * 100)}%`}`}>
          <View style={[styles.badgeIcon, { backgroundColor: a.earned ? colors.coral : colors.sand }]}>
            <Icon name={ICON_MAP[a.icon]} size={22} color={a.earned ? colors.deep : colors.textSubtle} />
          </View>
          <Txt variant="bodyStrong" style={{ fontSize: 14, textAlign: 'center', color: a.earned ? colors.text : colors.textSubtle }}>{a.title}</Txt>
          <Txt variant="small" style={{ fontSize: 12, textAlign: 'center' }} numberOfLines={2}>{a.description}</Txt>
          {!a.earned ? <ProgressBar value={a.progress * 100} color={colors.coral} /> : <Txt variant="small" style={{ fontSize: 12, color: colors.coralText, fontFamily: fonts.bodyBold }}>Conquistada</Txt>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  plan: { backgroundColor: colors.petrol, borderRadius: radius.lg, padding: space.lg, gap: space.lg },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.petrolSoft, borderRadius: radius.md, padding: space.md },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.onDarkMuted, alignItems: 'center', justifyContent: 'center' },
  intent: {
    flex: 1,
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
  continue: { width: 220, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', padding: space.xs },
  playBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: 150,
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  badgeOn: { borderColor: colors.coral, backgroundColor: '#FFF7F2' },
  badgeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
