import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Button, Card, Field, Icon, Loading, Row, Screen, Txt } from '@/components/ui';
import { useCheckins, useSaveCheckin } from '@/data/hooks';
import type { Checkin } from '@/data/types';
import { dayKey } from '@/domain/dates';
import { colors, fonts, radius, space } from '@/theme';

function Scale({ label, value, onChange, labels }: { label: string; value: number; onChange: (v: number) => void; labels: string[] }) {
  return (
    <View style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="bodyStrong">{label}</Txt>
        <Txt variant="small">{labels[value - 1]}</Txt>
      </Row>
      <Row gap={space.sm}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${labels[n - 1]}`}
            accessibilityState={{ selected: value === n }}
            style={{
              flex: 1,
              height: 48,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: value === n ? colors.petrol : colors.border,
              backgroundColor: value === n ? colors.petrol : colors.surface,
            }}>
            <Txt variant="bodyStrong" style={{ color: value === n ? colors.onDark : colors.text }}>{n}</Txt>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}

export default function CheckinScreen() {
  const { profile } = useSession();
  const today = dayKey(new Date());
  const checkins = useCheckins(14);

  if (!profile?.healthConsentAt) {
    return (
      <Screen padTop={false}>
        <Txt variant="hero">Ative o acompanhamento primeiro</Txt>
        <Txt>Humor e sono são dados de saúde. Só guardamos com a sua autorização.</Txt>
        <Button label="Ir para Privacidade" onPress={() => router.replace('/privacidade')} />
      </Screen>
    );
  }
  if (checkins.isPending) return <Loading />;
  const existing = checkins.data?.find((c) => c.day === today);
  // Remonta o formulário quando o check-in de hoje aparece, já preenchido.
  return <CheckinForm key={existing ? 'editar' : 'novo'} today={today} existing={existing} />;
}

function CheckinForm({ today, existing }: { today: string; existing?: Checkin }) {
  const save = useSaveCheckin();
  const [mood, setMood] = useState(existing?.mood ?? 3);
  const [energy, setEnergy] = useState(existing?.energy ?? 3);
  const [sleepHours, setSleepHours] = useState(existing?.sleepHours ?? 7);
  const [sleepQuality, setSleepQuality] = useState(existing?.sleepQuality ?? 3);
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen padTop={false}>
      <Txt variant="eyebrow">Check-in de hoje</Txt>
      <Txt variant="hero">Como você está?</Txt>

      <Card style={{ gap: space.xl }}>
        <Scale label="Humor" value={mood} onChange={setMood} labels={['Muito mal', 'Mal', 'Mais ou menos', 'Bem', 'Muito bem']} />
        <Scale label="Energia" value={energy} onChange={setEnergy} labels={['Esgotado', 'Baixa', 'Média', 'Boa', 'Alta']} />
        <View style={{ gap: space.sm }}>
          <Txt variant="bodyStrong">Horas de sono</Txt>
          <Row gap={space.lg}>
            <Pressable accessibilityRole="button" accessibilityLabel="Menos meia hora" onPress={() => setSleepHours((h) => Math.max(0, h - 0.5))} style={stepper}>
              <Icon name="minus" color={colors.petrol} />
            </Pressable>
            <Txt style={{ fontFamily: fonts.display, fontSize: 32, color: colors.text, minWidth: 90, textAlign: 'center' }}>
              {String(sleepHours).replace('.', ',')} h
            </Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="Mais meia hora" onPress={() => setSleepHours((h) => Math.min(24, h + 0.5))} style={stepper}>
              <Icon name="plus" color={colors.petrol} />
            </Pressable>
          </Row>
        </View>
        <Scale label="Qualidade do sono" value={sleepQuality} onChange={setSleepQuality} labels={['Péssima', 'Ruim', 'Ok', 'Boa', 'Ótima']} />
        <Field label="Quer anotar algo? (opcional)" value={note} onChangeText={setNote} placeholder="O que pesou ou ajudou hoje" multiline maxLength={500} />
      </Card>

      {mood === 1 ? (
        <Card tone="sand" style={{ gap: space.xs }}>
          <Txt variant="bodyStrong">Dia difícil? Você não precisa passar por isso sozinho.</Txt>
          <Txt variant="small">Converse com alguém de confiança. Se o sofrimento estiver muito intenso, ligue 188 (CVV, 24 horas, gratuito) ou procure um serviço de saúde.</Txt>
        </Card>
      ) : null}

      <Button
        label={existing ? 'Atualizar check-in' : 'Salvar check-in'}
        icon="check"
        loading={save.isPending}
        onPress={async () => {
          setError(null);
          try {
            await save.mutateAsync({ day: today, mood, energy, sleepHours, sleepQuality, note: note.trim() || null });
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

const stepper = {
  width: 48,
  height: 48,
  borderRadius: 24,
  borderWidth: 2,
  borderColor: colors.border,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: colors.surface,
};
