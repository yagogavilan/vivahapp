import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { FieldInput, ValidationList } from '@/components/form-fields';
import { Button, Card, Loading, Row, Screen, Txt } from '@/components/ui';
import { useDailyLogs, useSaveDailyLog, useTodayCheckin } from '@/data/hooks';
import type { DailyLog, LogValues } from '@/data/types';
import { dayKey } from '@/domain/dates';
import { programFor } from '@/domain/programs';
import { AQUECIMENTO } from '@/domain/spaces';
import { success } from '@/lib/haptics';
import { TrackContextBar } from '@/components/space';
import { colors, space } from '@/theme';

/** Plano do dia da trilha, com a validação acontecendo enquanto a pessoa preenche. */
export default function Plano() {
  const { track = AQUECIMENTO } = useLocalSearchParams<{ track?: string }>();
  const logs = useDailyLogs(track, 2);
  if (logs.isPending) return <Loading />;
  const today = logs.data?.find((l) => l.day === dayKey(new Date()) && l.kind === 'plano');
  return <PlanForm key={today ? 'edit' : 'new'} trackId={track} initial={today} />;
}

function PlanForm({ trackId, initial }: { trackId: string; initial?: DailyLog }) {
  const program = programFor(trackId);
  const [values, setValues] = useState<LogValues>(initial?.data ?? {});
  const [error, setError] = useState<string | null>(null);
  const save = useSaveDailyLog();
  const { today: checkin } = useTodayCheckin(trackId);
  const pain = typeof checkin?.answers.pain === 'number' ? (checkin.answers.pain as number) : undefined;
  const validation = program.validate(values, { pain });

  return (
    <Screen padTop={false}>
      <TrackContextBar trackId={trackId} />
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Plano do dia</Txt>
        <Txt variant="hero">{program.plan.title}</Txt>
        <Txt>{program.plan.subtitle}</Txt>
      </View>

      {program.plan.fields.map((f) => (
        <FieldInput key={f.id} field={f} value={values[f.id]} onChange={(v) => setValues({ ...values, [f.id]: v })} />
      ))}

      <Card style={{ gap: space.md, borderColor: validation.valid ? (validation.perfect ? colors.mint : '#E9CF7A') : colors.coral, borderWidth: 1.5 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Validação do plano</Txt>
          <Txt variant="small" style={{ color: validation.valid ? '#16614F' : colors.danger }}>
            {validation.perfect ? 'Tudo certo' : validation.valid ? 'Dá para salvar' : 'Ajuste para salvar'}
          </Txt>
        </Row>
        <ValidationList checks={validation.checks} />
      </Card>

      <Button
        label={initial ? 'Atualizar o plano' : 'Salvar o plano do dia'}
        icon="check"
        disabled={!validation.valid}
        loading={save.isPending}
        onPress={async () => {
          setError(null);
          try {
            await save.mutateAsync({ trackId, kind: 'plano', data: values, score: null, valid: validation.perfect });
            success();
            router.back();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
    </Screen>
  );
}
