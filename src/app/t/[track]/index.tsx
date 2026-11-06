import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { LiveCard } from '@/components/aquecimento';
import { FeelingChip } from '@/components/feeling';
import { SpaceCover, SpaceHeader } from '@/components/space';
import { Button, ErrorState, Icon, type IconName, LinkText, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { Columns, FadeIn, ScreenSkeleton } from '@/components/visual';
import {
  useActivity,
  useAgenda,
  useDailyLogs,
  useEscudo,
  useLibrary,
  useLives,
  useProgress,
  useTodayCheckin,
} from '@/data/hooks';
import type { Lesson } from '@/data/types';
import { completion, nextLesson } from '@/domain/access';
import { readCheckin } from '@/domain/checkin-protocol';
import { addDays, dayKey, formatTime, greeting } from '@/domain/dates';
import { buildJourney, type JourneyStep } from '@/domain/journey';
import { evolution, programFor } from '@/domain/programs';
import { agendaDays, nextLive, todaysEscudo } from '@/domain/schedule';
import { AQUECIMENTO, trackCourses } from '@/domain/spaces';
import { tap } from '@/lib/haptics';
import { useSpace } from '@/lib/space-context';
import { colors, radius, space } from '@/theme';

const STEP_ICON: Record<JourneyStep['id'], IconName> = {
  checkin: 'heart',
  plano: 'clipboard',
  pratica: 'play',
  fechamento: 'bar-chart-2',
  comunidade: 'users',
};

/** Hoje da trilha: check-in, plano validado, jornada de 5 passos e evolução diária. */
export default function HojeDaTrilha() {
  const sp = useSpace();
  const program = programFor(sp.id);
  const { profile } = useSession();
  const library = useLibrary();
  const lives = useLives();
  const escudo = useEscudo();
  const progress = useProgress();
  const activity = useActivity(7);
  const agenda = useAgenda();
  const logs = useDailyLogs(sp.id, 30);
  const checkin = useTodayCheckin(sp.id);

  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  const firstName = profile?.fullName?.split(' ')[0];
  const today = dayKey(new Date());

  const ordered = (courseId: string): Lesson[] => {
    const mods = lib.modules.filter((m) => m.courseId === courseId).sort((a, b) => a.sort - b.sort);
    return mods.flatMap((m) => lib.lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.sort - b.sort));
  };
  const current = trackCourses(sp.id, lib.courses)
    .filter((c) => lib.stateOf(c) === 'open')
    .map((course) => {
      const ls = ordered(course.id);
      return { course, next: nextLesson(ls, progress.data ?? []), percent: completion(ls, progress.data ?? []) };
    })
    .filter((x): x is typeof x & { next: Lesson } => Boolean(x.next))
    .sort((a, b) => b.percent - a.percent)[0];

  const audio = escudo.data ? todaysEscudo(escudo.data) : undefined;
  const live = lives.data ? nextLive(lives.data.filter((l) => sp.id === AQUECIMENTO || !l.trackId || l.trackId === sp.id)) : undefined;
  const plan = logs.data?.find((l) => l.day === today && l.kind === 'plano');
  const review = logs.data?.find((l) => l.day === today && l.kind === 'fechamento');
  const journey = buildJourney({
    today,
    activity: activity.data ?? [],
    checkinDone: Boolean(checkin.today),
    planDone: Boolean(plan),
    reviewDone: Boolean(review),
    planTitle: program.plan.title,
    reviewTitle: program.review.title,
    escudo: audio,
    lesson: sp.id === AQUECIMENTO ? undefined : current?.next,
  });
  const evo = evolution((logs.data ?? []).filter((l) => l.kind === 'fechamento' && l.score !== null).map((l) => ({ day: l.day, score: l.score! })), today);
  const todayItems = agendaDays(lives.data ?? [], agenda.data ?? [], new Date(), 1)[0]?.items ?? [];
  const reading = checkin.today ? readCheckin(sp.id, checkin.today.answers) : undefined;
  const planCheck = plan ? program.validate(plan.data) : undefined;
  const pain = typeof checkin.today?.answers.pain === 'number' ? (checkin.today.answers.pain as number) : undefined;

  // Move: minutos ativos da semana contra a meta de 150 da OMS.
  const weekMinutes = sp.id === 'move'
    ? (logs.data ?? []).filter((l) => l.kind === 'fechamento' && l.day > addDays(today, -7))
        .reduce((s, l) => s + (Number(l.data.minutos) || 0), 0)
    : null;

  const go = (route: string, params: Record<string, string> = {}) => {
    tap();
    router.push({ pathname: route as never, params: { track: sp.id, ...params } } as never);
  };
  const openStep = (s: JourneyStep) => {
    if (s.id === 'checkin') go('/checkin');
    if (s.id === 'plano') go('/plano');
    if (s.id === 'fechamento') go('/fechamento');
    if (s.id === 'pratica' && s.ref?.type === 'aula') router.push({ pathname: '/aula/[id]', params: { id: s.ref.id } });
    if (s.id === 'pratica' && s.ref?.type === 'escudo') router.push({ pathname: '/escudo/[id]', params: { id: s.ref.id } });
    if (s.id === 'comunidade') router.push({ pathname: '/t/[track]/comunidade', params: { track: sp.id } });
  };
  const openTool = (t: (typeof program.tools)[number]) => {
    if (t.route === 'socorro') go('/socorro');
    if (t.route === 'exercicio') go('/socorro', { ex: t.exercise ?? 'respiracao' });
    if (t.route === 'foco') router.push('/foco');
    if (t.route === 'escudo' && audio) router.push({ pathname: '/escudo/[id]', params: { id: audio.id } });
  };

  const checkinCard = !checkin.today ? (
    <FadeIn>
      <View style={styles.checkinCard}>
        <Row gap={space.md}>
          <View style={styles.checkinIcon}><Icon name="heart" size={20} color={colors.coral} /></View>
          <View style={{ flex: 1 }}>
            <Txt variant="eyebrow" style={{ color: colors.coral }}>Primeiro passo</Txt>
            <Txt variant="title" style={{ color: colors.onDark }}>Como você está hoje?</Txt>
          </View>
        </Row>
        <Button label="Fazer meu check-in" icon="arrow-right" onPress={() => go('/checkin')} />
      </View>
    </FadeIn>
  ) : (
    <FadeIn>
      <Pressable onPress={() => go('/checkin')} accessibilityRole="button"
        style={[styles.summary, { backgroundColor: reading?.level === 'critico' ? colors.coralSoft : reading?.level === 'atencao' ? '#FCEFC7' : colors.mintSoft }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Check-in de hoje</Txt>
          <Icon name="chevron-right" size={16} color={colors.textSubtle} />
        </Row>
        <Txt variant="heading">{reading?.headline}</Txt>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {checkin.today.feeling ? <FeelingChip feeling={checkin.today.feeling} small /> : null}
          {reading?.metric ? <Txt variant="small">{reading.metric.label} {reading.metric.value}/{reading.metric.max}</Txt> : null}
          {reading?.alerts.length ? <Txt variant="small">· {reading.alerts.length} {reading.alerts.length === 1 ? 'alerta' : 'alertas'}</Txt> : null}
        </Row>
      </Pressable>
    </FadeIn>
  );

  const planCard = (
    <FadeIn delay={60}>
      <Pressable onPress={() => go('/plano')} accessibilityRole="button" style={[styles.plan, plan && { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="eyebrow" style={{ color: plan ? colors.textSubtle : colors.coralText }}>{plan ? 'Plano do dia' : 'Segundo passo'}</Txt>
          {planCheck ? (
            <Row gap={4}>
              <Icon name={planCheck.perfect ? 'check-circle' : 'alert-circle'} size={14} color={planCheck.perfect ? '#16614F' : '#B07A12'} />
              <Txt variant="small" style={{ color: planCheck.perfect ? '#16614F' : '#B07A12' }}>
                {planCheck.perfect ? 'Validado' : `${planCheck.checks.filter((c) => c.level !== 'ok').length} ajustes sugeridos`}
              </Txt>
            </Row>
          ) : null}
        </Row>
        <Txt variant="heading">{program.plan.title}</Txt>
        {plan ? (
          <Txt variant="small" numberOfLines={2}>{summarizePlan(plan.data)}</Txt>
        ) : (
          <>
            <Txt variant="small">{program.plan.subtitle}</Txt>
            {pain !== undefined && pain >= 7 && sp.id === 'move' ? <Txt variant="small" style={{ color: colors.coralText }}>Você marcou dor forte no check-in: o plano vai sugerir algo leve.</Txt> : null}
          </>
        )}
      </Pressable>
    </FadeIn>
  );

  const journeyCard = (
    <FadeIn delay={100} style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Sua jornada de hoje</Txt>
        <Txt variant="title">{journey.doneCount === journey.steps.length ? 'Dia completo' : `${journey.doneCount} de ${journey.steps.length} passos`}</Txt>
      </View>
      <View>
        {journey.steps.map((s, i) => {
          const isNext = journey.next?.id === s.id;
          return (
            <Pressable key={s.id} onPress={() => openStep(s)} accessibilityRole="button" accessibilityLabel={`${s.title}${s.done ? ', feito' : ''}`}
              style={({ pressed }) => [styles.step, { opacity: pressed ? 0.8 : 1 }]}>
              <View style={styles.rail}>
                <View style={[styles.node, s.done ? styles.nodeDone : isNext ? styles.nodeNext : null]}>
                  <Icon name={s.done ? 'check' : STEP_ICON[s.id]} size={16} color={s.done ? colors.deep : isNext ? colors.onDark : colors.textSubtle} />
                </View>
                {i < journey.steps.length - 1 ? <View style={[styles.line, s.done && { backgroundColor: colors.coral }]} /> : null}
              </View>
              <View style={[styles.stepBody, isNext && styles.stepBodyNext]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="bodyStrong" style={s.done ? { color: colors.textSubtle } : undefined}>{s.title}</Txt>
                  <Txt variant="small" numberOfLines={1}>{s.subtitle}</Txt>
                </View>
                {isNext ? <Icon name="arrow-right" size={18} color={colors.coralText} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </FadeIn>
  );

  const max = 100;
  const evolutionCard = (
    <FadeIn delay={80}>
      <Pressable onPress={() => go('/fechamento')} accessibilityRole="button" style={styles.evo}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Sua evolução</Txt>
            <Txt variant="heading">{program.review.scoreName}</Txt>
          </View>
          {review?.score != null ? <Txt variant="title" style={{ color: colors.coralText }}>{review.score}</Txt> : null}
        </Row>
        <View style={styles.bars} accessibilityLabel={`Notas dos últimos 14 dias de ${program.review.scoreName}`}>
          {evo.series.map((d) => (
            <View key={d.day} style={[styles.barCol]}>
              <View style={{ height: d.score === null ? 4 : Math.max(6, (d.score / max) * 72), borderRadius: 3,
                backgroundColor: d.score === null ? colors.sand : d.day === today ? colors.coral : colors.mint }} />
            </View>
          ))}
        </View>
        <Txt variant="small">
          {evo.thisWeek === null
            ? 'Faça o fechamento do dia para começar a medir.'
            : `Média da semana: ${evo.thisWeek}${evo.delta !== null ? ` (${evo.delta >= 0 ? '+' : ''}${evo.delta} vs semana passada)` : ''}`}
        </Txt>
        {weekMinutes !== null ? (
          <View style={{ gap: 4 }}>
            <ProgressBar value={(weekMinutes / 150) * 100} color={colors.coral} />
            <Txt variant="small">{weekMinutes} de 150 minutos na semana (meta da OMS)</Txt>
          </View>
        ) : null}
      </Pressable>
    </FadeIn>
  );

  const tools = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
      {program.tools.map((t) => (
        <Pressable key={t.label} onPress={() => openTool(t)} accessibilityRole="button" style={styles.tool}>
          <Icon name={t.icon} size={16} color={colors.coralText} />
          <Txt variant="bodyStrong" style={{ fontSize: 14 }}>{t.label}</Txt>
        </Pressable>
      ))}
    </ScrollView>
  );

  const agendaCard = (
    <View style={styles.agenda}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Na agenda hoje</Txt>
        <LinkText label="Ver agenda" onPress={() => router.push('/agenda')} />
      </Row>
      {todayItems.length ? (
        todayItems.slice(0, 4).map((it) => (
          <Row key={it.key} gap={space.md}>
            <Txt variant="bodyStrong" style={{ width: 48 }}>{formatTime(it.startsAt)}</Txt>
            <Txt style={{ flex: 1 }} numberOfLines={1}>{it.title}</Txt>
          </Row>
        ))
      ) : (
        <Txt variant="small">Nada marcado. Lives salvas e apoios combinados aparecem aqui.</Txt>
      )}
    </View>
  );

  const continueCard = current ? (
    <Pressable onPress={() => router.push({ pathname: '/curso/[id]', params: { id: current.course.id } })} accessibilityRole="button">
      <SpaceCover space={sp} style={styles.continue}>
        <Txt variant="eyebrow" style={{ color: colors.coral }}>Continue a sua trilha</Txt>
        <Txt variant="heading" style={{ color: colors.onDark }}>{current.course.title}</Txt>
        <ProgressBar value={current.percent} color={colors.coral} track="rgba(255,255,255,0.18)" />
        <Txt variant="small" style={{ color: colors.onDarkMuted }}>{current.percent}% · próxima: {current.next.title}</Txt>
      </SpaceCover>
    </Pressable>
  ) : null;

  return (
    <Screen refreshing={library.isRefetching} onRefresh={() => { library.refetch(); checkin.refetch(); activity.refetch(); logs.refetch(); }}>
      <SpaceHeader space={sp} />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ''}</Txt>
        <Txt variant="hero">{sp.track?.promise ?? 'Um passo de cada vez.'}</Txt>
        <Txt variant="small">{program.purpose}</Txt>
      </View>
      <Columns
        left={<>{checkinCard}{planCard}{journeyCard}</>}
        right={<>{evolutionCard}{tools}{agendaCard}{continueCard}{live ? <LiveCard live={live} /> : null}</>}
      />
    </Screen>
  );
}

/** Uma linha com o essencial do plano (primeiras respostas). */
function summarizePlan(data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) parts.push(v.filter(Boolean).join(' · '));
    else if (typeof v === 'string' && v.trim()) parts.push(v.trim());
    if (parts.join(' · ').length > 90) break;
  }
  return parts.filter(Boolean).join(' · ') || 'Toque para ver o plano';
}

const styles = StyleSheet.create({
  checkinCard: { backgroundColor: colors.petrol, borderRadius: radius.lg, padding: space.xl, gap: space.lg },
  checkinIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  summary: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  plan: { borderRadius: radius.lg, padding: space.lg, gap: space.xs, backgroundColor: colors.coralSoft, borderWidth: 1, borderColor: colors.coralSoft },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'stretch' },
  rail: { width: 36, alignItems: 'center' },
  node: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.coral, borderColor: colors.coral },
  nodeNext: { backgroundColor: colors.petrol, borderColor: colors.petrol },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  stepBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.md, marginBottom: space.sm, borderRadius: radius.md },
  stepBodyNext: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  evo: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 76 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: space.md },
  agenda: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  continue: { gap: space.sm, padding: space.xl },
});
