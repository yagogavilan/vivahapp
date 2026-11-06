import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { AfterCheck, EmergencyCard, ExercisePlayer } from '@/components/care';
import { MOODS } from '@/components/mood';
import { FeelingChip } from '@/components/feeling';
import { TrackContextBar } from '@/components/space';
import { Button, Card, Icon, type IconName, Loading, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { FadeIn } from '@/components/visual';
import { useLibrary, useSaveCheckin, useTodayCheckin, useUpdateProfile } from '@/data/hooks';
import type { Checkin } from '@/data/types';
import {
  type Answers,
  type CheckinQuestion,
  type CheckinReading,
  FEELING_ORDER,
  FEELINGS,
  feelingOf,
  isAnswered,
  questionsFor,
  readCheckin,
  SLEEP_HOURS,
} from '@/domain/checkin-protocol';
import { addDays, dayKey } from '@/domain/dates';
import { exerciseById } from '@/domain/exercises';
import { AQUECIMENTO, spaceFor } from '@/domain/spaces';
import { success, tap } from '@/lib/haptics';
import { colors, radius, space } from '@/theme';

const LEVEL_STYLE: Record<CheckinReading['level'], { bg: string; fg: string; sub: string; icon: IconName }> = {
  bem: { bg: colors.mintSoft, fg: '#16614F', sub: colors.textMuted, icon: 'sun' },
  atencao: { bg: '#FCEFC7', fg: '#6B5212', sub: colors.textMuted, icon: 'cloud' },
  critico: { bg: colors.petrol, fg: colors.onDark, sub: colors.onDarkMuted, icon: 'heart' },
};

/**
 * Check-in diário da trilha: uma pergunta por tela, depois o resumo com
 * alertas e, se o estado estiver crítico, um exercício guiado começa sozinho.
 */
export default function CheckinScreen() {
  const params = useLocalSearchParams<{ track?: string; mood?: string }>();
  const trackId = params.track ?? AQUECIMENTO;
  const { profile } = useSession();
  const library = useLibrary();
  const checkin = useTodayCheckin(trackId);
  const [redo, setRedo] = useState(false);

  if (checkin.isPending || library.isPending) return <Loading />;
  const space_ = library.data ? spaceFor(trackId, library.data.tracks) : undefined;

  if (!profile?.healthConsentAt) return <Consent />;
  if (checkin.today && !redo) {
    const yesterday = checkin.data?.find((c) => c.day === addDays(dayKey(new Date()), -1) && c.trackId === trackId);
    // A chave muda quando o check-in é refeito (mas não quando só o "depois do exercício" é salvo).
    const { after: _after, ...rest } = checkin.today.answers;
    return <Summary key={JSON.stringify(rest)} trackId={trackId} saved={checkin.today} yesterday={yesterday} onRedo={() => setRedo(true)} />;
  }
  const mood = Number(params.mood);
  return <Questions trackId={trackId} title={space_?.title ?? 'Vivah'} initialMood={mood >= 1 && mood <= 5 ? mood : undefined} onSaved={() => setRedo(false)} />;
}

function Consent() {
  const update = useUpdateProfile();
  return (
    <Screen padTop={false}>
      <View style={{ gap: space.sm }}>
        <Txt variant="eyebrow">Check-in diário</Txt>
        <Txt variant="hero">Antes de começar</Txt>
        <Txt>
          Humor e sono são dados de saúde (LGPD). Só você vê, e dá para apagar quando quiser.
        </Txt>
      </View>
      <Button
        label="Autorizo e quero começar"
        icon="check"
        loading={update.isPending}
        onPress={() => update.mutate({ healthConsentAt: new Date().toISOString() })}
      />
      <Button label="Agora não" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

function Questions({ trackId, title, initialMood, onSaved }: { trackId: string; title: string; initialMood?: number; onSaved: () => void }) {
  const questions = questionsFor(trackId);
  // O humor pode vir do toque na carinha, no Hoje: começa já na segunda pergunta.
  const [answers, setAnswers] = useState<Answers>(initialMood ? { mood: initialMood } : {});
  const [i, setI] = useState(initialMood && questions[0]?.id === 'mood' ? 1 : 0);
  const save = useSaveCheckin();
  const [error, setError] = useState<string | null>(null);
  const q = questions[i];
  const last = i === questions.length - 1;

  const submit = async (final: Answers) => {
    setError(null);
    const reading = readCheckin(trackId, final);
    const c: Checkin = {
      day: dayKey(new Date()),
      trackId,
      answers: final,
      feeling: feelingOf(final),
      alertLevel: reading.level,
      mood: Number(final.mood ?? 3),
      energy: Number(final.energy ?? 3),
      sleepHours: SLEEP_HOURS[Number(final.sleepHours ?? 3)] ?? 7,
      sleepQuality: Number(final.sleepQuality ?? 3),
      note: null,
    };
    try {
      await save.mutateAsync(c);
      success();
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const answer = (value: Answers[string], advance = true) => {
    tap();
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (!advance) return;
    if (last) submit(next);
    else setI(i + 1);
  };

  return (
    <Screen padTop={false}>
      <TrackContextBar trackId={trackId} />
      <View style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="eyebrow">Check-in · {title}</Txt>
          <Txt variant="small">{i + 1} de {questions.length}</Txt>
        </Row>
        <ProgressBar value={((i + 1) / questions.length) * 100} color={colors.coral} />
      </View>

      <FadeIn key={q.id} style={{ gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <Txt variant="hero">{q.prompt}</Txt>
          {q.hint ? <Txt>{q.hint}</Txt> : null}
        </View>
        <QuestionInput q={q} answers={answers} onAnswer={answer} />
        {q.type === 'multi' ? (
          <Button
            label={last ? 'Ver meu resumo' : 'Continuar'}
            icon="arrow-right"
            disabled={!isAnswered(q, answers)}
            loading={save.isPending}
            onPress={() => (last ? submit(answers) : setI(i + 1))}
          />
        ) : null}
        {save.isPending && q.type !== 'multi' ? <Txt variant="small">Salvando…</Txt> : null}
        {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
      </FadeIn>

      {i > 0 ? (
        <Pressable onPress={() => setI(i - 1)} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <Row gap={6}>
            <Icon name="arrow-left" size={16} color={colors.textSubtle} />
            <Txt variant="small">Voltar</Txt>
          </Row>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function QuestionInput({ q, answers, onAnswer }: { q: CheckinQuestion; answers: Answers; onAnswer: (v: Answers[string], advance?: boolean) => void }) {
  const value = answers[q.id];
  if (q.type === 'feeling') {
    return (
      <View style={styles.wrap}>
        {FEELING_ORDER.map((f) => (
          <Pressable key={f} onPress={() => onAnswer(f)} accessibilityRole="button" accessibilityState={{ selected: value === f }}
            style={[styles.feeling, { backgroundColor: FEELINGS[f].color, borderColor: value === f ? FEELINGS[f].text : 'transparent' }]}>
            <Txt variant="bodyStrong" style={{ color: FEELINGS[f].text }}>{FEELINGS[f].label}</Txt>
          </Pressable>
        ))}
      </View>
    );
  }
  if (q.type === 'scale10') {
    return (
      <View style={{ gap: space.sm }}>
        <View style={styles.wrap}>
          {Array.from({ length: 11 }, (_, n) => (
            <Pressable key={n} onPress={() => onAnswer(n)} accessibilityRole="button" accessibilityLabel={String(n)}
              style={[styles.num, value === n && styles.selected, n >= 8 && value !== n && { borderColor: colors.coral }]}>
              <Txt variant="heading" style={{ color: value === n ? colors.onDark : colors.text }}>{n}</Txt>
            </Pressable>
          ))}
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="small">0 · {q.ends?.[0]}</Txt>
          <Txt variant="small">10 · {q.ends?.[1]}</Txt>
        </Row>
      </View>
    );
  }
  if (q.type === 'multi') {
    const sel = Array.isArray(value) ? (value as number[]) : [];
    const noneIndex = (q.options?.length ?? 1) - 1;
    const toggle = (k: number) => {
      if (k === noneIndex) return onAnswer([noneIndex], false);
      const base = sel.filter((x) => x !== noneIndex);
      onAnswer(base.includes(k) ? base.filter((x) => x !== k) : [...base, k], false);
    };
    return (
      <View style={{ gap: space.sm }}>
        {q.options?.map((label, k) => (
          <Pressable key={label} onPress={() => toggle(k)} accessibilityRole="checkbox" accessibilityState={{ checked: sel.includes(k) }}
            style={[styles.option, sel.includes(k) && styles.optionOn]}>
            <Icon name={sel.includes(k) ? 'check-square' : 'square'} size={20} color={sel.includes(k) ? colors.onDark : colors.textSubtle} />
            <Txt variant="bodyStrong" style={{ color: sel.includes(k) ? colors.onDark : colors.text }}>{label}</Txt>
          </Pressable>
        ))}
      </View>
    );
  }
  // scale5 começa em 1; choice começa em 0.
  const offset = q.type === 'scale5' ? 1 : 0;
  return (
    <View style={{ gap: space.sm }}>
      {q.options?.map((label, k) => {
        const v = k + offset;
        return (
          <Pressable key={label} onPress={() => onAnswer(v)} accessibilityRole="button" accessibilityState={{ selected: value === v }}
            style={[styles.option, value === v && styles.optionOn]}>
            {q.type === 'scale5' ? (
              <View style={[styles.face, { backgroundColor: MOODS[k].color }]}>
                <Icon name={MOODS[k].icon} size={18} color={colors.deep} />
              </View>
            ) : null}
            <Txt variant="bodyStrong" style={{ color: value === v ? colors.onDark : colors.text }}>{label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function Summary({ trackId, saved, yesterday, onRedo }: { trackId: string; saved: Checkin; yesterday?: Checkin; onRedo: () => void }) {
  const reading = readCheckin(trackId, saved.answers);
  const save = useSaveCheckin();
  const after = typeof saved.answers.after === 'number' ? (saved.answers.after as number) : undefined;
  // Crítico e ainda sem o "depois": o exercício começa sozinho.
  const [phase, setPhase] = useState<'exercise' | 'after' | 'done'>(
    reading.intervention.length && after === undefined ? 'exercise' : 'done',
  );
  const st = LEVEL_STYLE[reading.level];
  const exercises = reading.intervention.map(exerciseById).filter((e) => e !== undefined);
  const yReading = yesterday ? readCheckin(trackId, yesterday.answers) : undefined;

  return (
    <Screen padTop={false}>
      <TrackContextBar trackId={trackId} />
      <FadeIn>
        <View style={[styles.hero, { backgroundColor: st.bg }]}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="eyebrow" style={{ color: st.fg }}>Seu check-in de hoje</Txt>
            <Icon name={st.icon} size={22} color={st.fg} />
          </Row>
          <Txt variant="hero" style={{ color: st.fg }}>{reading.headline}</Txt>
          <Txt style={{ color: st.sub }}>{reading.message}</Txt>
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            {saved.feeling ? <FeelingChip feeling={saved.feeling} /> : null}
            {reading.metric ? (
              <View style={styles.metric}>
                <Txt variant="bodyStrong" style={{ fontSize: 14 }}>
                  {reading.metric.label}: {reading.metric.value}/{reading.metric.max}
                  {yReading?.metric ? ` · ontem ${yReading.metric.value}` : ''}
                  {after !== undefined ? ` · depois do exercício ${after}` : ''}
                </Txt>
              </View>
            ) : null}
          </Row>
        </View>
      </FadeIn>

      {phase === 'exercise' && exercises.length ? (
        <FadeIn delay={120} style={{ gap: space.sm }}>
          <Txt variant="heading">Vamos fazer isso agora, juntos</Txt>
          <ExercisePlayer exercises={exercises} onDone={() => setPhase('after')} />
        </FadeIn>
      ) : null}

      {phase === 'after' && reading.metric ? (
        <AfterCheck
          before={reading.metric.value}
          label={reading.metric.label}
          onAnswer={(v) => {
            save.mutate({ ...saved, answers: { ...saved.answers, after: v } });
          }}
        />
      ) : null}

      <View style={styles.stats}>
        <Stat label="Humor" value={['', 'Muito mal', 'Mal', 'Mais ou menos', 'Bem', 'Muito bem'][saved.mood]} />
        <Stat label="Energia" value={`${saved.energy}/5`} />
        <Stat label="Sono" value={`${String(saved.sleepHours).replace('.', ',')} h`} />
      </View>

      {reading.alerts.length ? (
        <View style={{ gap: space.sm }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Pontos de atenção</Txt>
          {reading.alerts.map((a) => (
            <Card key={a.title} style={{ gap: 4, borderLeftWidth: 4, borderLeftColor: a.tone === 'urgente' ? colors.danger : a.tone === 'atencao' ? colors.coral : colors.mint }}>
              <Txt variant="bodyStrong">{a.title}</Txt>
              <Txt variant="small">{a.text}</Txt>
            </Card>
          ))}
          {reading.alerts.some((a) => a.emergency) ? <EmergencyCard /> : null}
        </View>
      ) : null}

      {reading.suggestion ? (
        <Card tone="sand" style={{ gap: 4 }}>
          <Txt variant="bodyStrong">Sugestão para hoje</Txt>
          <Txt variant="small">{reading.suggestion}</Txt>
        </Card>
      ) : null}

      {phase === 'done' && reading.intervention.length ? (
        <Button label="Fazer o exercício de novo" variant="ghost" icon="wind" onPress={() => setPhase('exercise')} />
      ) : null}
      <Button label="Voltar para o Hoje" icon="arrow-left" onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/t/[track]', params: { track: trackId } }))} />
      <Pressable onPress={onRedo} accessibilityRole="button" style={{ alignSelf: 'center' }}>
        <Txt variant="small" style={{ textDecorationLine: 'underline' }}>Refazer o check-in</Txt>
      </Pressable>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Txt variant="small">{label}</Txt>
      <Txt variant="bodyStrong">{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  feeling: { paddingVertical: 14, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 2 },
  num: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.petrol, borderColor: colors.petrol },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionOn: { backgroundColor: colors.petrol, borderColor: colors.petrol },
  dot: { width: 14, height: 14, borderRadius: 7 },
  hero: { borderRadius: radius.lg, padding: space.xl, gap: space.md },
  metric: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: space.md },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: 2 },
});
