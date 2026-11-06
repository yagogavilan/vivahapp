import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FieldInput } from '@/components/form-fields';
import { Button, Card, Loading, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { FadeIn } from '@/components/visual';
import { useDailyLogs, useSaveDailyLog } from '@/data/hooks';
import type { DailyLog, LogValues } from '@/data/types';
import { addDays, dayKey } from '@/domain/dates';
import { programFor } from '@/domain/programs';
import { AQUECIMENTO } from '@/domain/spaces';
import { success } from '@/lib/haptics';
import { colors, fonts, radius, space } from '@/theme';

/** Fechamento do dia: o teste da trilha, com nota de 0 a 100 e comparação. */
export default function Fechamento() {
  const { track = AQUECIMENTO } = useLocalSearchParams<{ track?: string }>();
  const logs = useDailyLogs(track, 30);
  if (logs.isPending) return <Loading />;
  const t = dayKey(new Date());
  const plan = logs.data?.find((l) => l.day === t && l.kind === 'plano');
  const done = logs.data?.find((l) => l.day === t && l.kind === 'fechamento');
  const history = (logs.data ?? []).filter((l) => l.kind === 'fechamento' && l.day !== t && l.score !== null);
  return <ReviewForm key={done ? 'edit' : 'new'} trackId={track} plan={plan} initial={done} history={history} />;
}

function ReviewForm({ trackId, plan, initial, history }: { trackId: string; plan?: DailyLog; initial?: DailyLog; history: DailyLog[] }) {
  const program = programFor(trackId);
  const [values, setValues] = useState<LogValues>(initial?.data ?? {});
  const [saved, setSaved] = useState<number | null>(initial?.score ?? null);
  const [error, setError] = useState<string | null>(null);
  const save = useSaveDailyLog();
  const result = program.score(values, plan?.data);
  const yesterday = history.find((h) => h.day === addDays(dayKey(new Date()), -1));
  const week = history.slice(0, 7);
  const avg = week.length ? Math.round(week.reduce((s, h) => s + (h.score ?? 0), 0) / week.length) : null;

  if (saved !== null) {
    return (
      <Screen padTop={false}>
        <FadeIn>
          <View style={styles.result}>
            <Txt variant="eyebrow" style={{ color: colors.coral }}>{program.review.scoreName}</Txt>
            <Txt style={styles.score}>{saved}</Txt>
            <Txt style={{ color: colors.onDarkMuted, textAlign: 'center' }}>{result.message}</Txt>
            <Row gap={space.xl}>
              {yesterday?.score != null ? <Stat label="ontem" value={yesterday.score} now={saved} /> : null}
              {avg !== null ? <Stat label="média de 7 dias" value={avg} now={saved} /> : null}
            </Row>
          </View>
        </FadeIn>
        <Card style={{ gap: space.md }}>
          <Txt variant="heading">De onde veio a nota</Txt>
          {result.parts.map((p) => (
            <View key={p.label} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="small" style={{ color: colors.text }}>{p.label}</Txt>
                <Txt variant="small">{Math.round(p.value)} de {p.max}</Txt>
              </Row>
              <ProgressBar value={(p.value / p.max) * 100} />
            </View>
          ))}
        </Card>
        <Button label="Voltar para o Hoje" icon="arrow-left" onPress={() => router.back()} />
        <Button label="Corrigir respostas" variant="ghost" onPress={() => setSaved(null)} />
      </Screen>
    );
  }

  return (
    <Screen padTop={false}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Fechamento do dia</Txt>
        <Txt variant="hero">{program.review.title}</Txt>
        <Txt>{program.review.subtitle}</Txt>
      </View>
      {program.review.fields.map((f) => (
        <FieldInput key={f.id} field={f} value={values[f.id]} planValues={plan?.data} onChange={(v) => setValues({ ...values, [f.id]: v })} />
      ))}
      <Button
        label="Ver minha nota do dia"
        icon="bar-chart-2"
        loading={save.isPending}
        onPress={async () => {
          setError(null);
          try {
            await save.mutateAsync({ trackId, kind: 'fechamento', data: values, score: result.score, valid: true });
            success();
            setSaved(result.score);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
    </Screen>
  );
}

function Stat({ label, value, now }: { label: string; value: number; now: number }) {
  const d = now - value;
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt variant="title" style={{ color: colors.onDark }}>{d > 0 ? `+${d}` : d}</Txt>
      <Txt variant="small" style={{ color: colors.onDarkMuted }}>vs {label} ({value})</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  result: { backgroundColor: colors.deep, borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.sm },
  score: { fontFamily: fonts.display, fontSize: 72, lineHeight: 80, color: colors.onDark },
});
