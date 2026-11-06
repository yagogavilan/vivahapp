import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AfterCheck, EmergencyCard, ExercisePlayer } from '@/components/care';
import { Icon, Row, Screen, Txt } from '@/components/ui';
import { FadeIn } from '@/components/visual';
import { useLogActivity } from '@/data/hooks';
import { exerciseById, EXERCISES, SOS_BY_TRACK } from '@/domain/exercises';
import { AQUECIMENTO } from '@/domain/spaces';
import { tap } from '@/lib/haptics';
import { TrackContextBar } from '@/components/space';
import { colors, radius, shadow, space } from '@/theme';

/** Botão "Socorro": exercícios guiados para a hora do aperto, sempre grátis. */
export default function Socorro() {
  const { track, ex } = useLocalSearchParams<{ track?: string; ex?: string }>();
  const ids = SOS_BY_TRACK[track ?? AQUECIMENTO] ?? SOS_BY_TRACK[AQUECIMENTO];
  const options = ids.map(exerciseById).filter((e) => e !== undefined);
  const [selected, setSelected] = useState<string | null>(ex ?? null);
  const [finished, setFinished] = useState(false);
  const log = useLogActivity();
  const current = selected ? exerciseById(selected) : undefined;

  return (
    <Screen padTop={false}>
      <TrackContextBar trackId={track ?? AQUECIMENTO} />
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Socorro</Txt>
        <Txt variant="hero">Respire. Você está seguro aqui.</Txt>
        <Txt>Escolha um exercício. Leva só alguns minutos e ajuda o corpo a sair do modo alerta.</Txt>
      </View>

      {current && !finished ? (
        <FadeIn key={current.id}>
          <ExercisePlayer
            exercises={[current]}
            onDone={() => {
              setFinished(true);
              log.mutate({ kind: 'foco', ref: `socorro-${current.id}`, minutes: 3 });
            }}
          />
        </FadeIn>
      ) : null}

      {finished ? (
        <View style={{ gap: space.md }}>
          <AfterCheck label="a sua tensão" onAnswer={() => undefined} />
          <Pressable onPress={() => { setFinished(false); setSelected(null); }} accessibilityRole="button">
            <Txt variant="small" style={{ textDecorationLine: 'underline' }}>Fazer outro exercício</Txt>
          </Pressable>
        </View>
      ) : null}

      {!current || finished ? (
        <View style={{ gap: space.sm }}>
          {(options.length ? options : EXERCISES).map((e) => (
            <Pressable
              key={e.id}
              onPress={() => {
                tap();
                setFinished(false);
                setSelected(e.id);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.option, shadow, { opacity: pressed ? 0.85 : 1 }]}>
              <View style={styles.icon}>
                <Icon name={e.kind === 'breath' ? 'wind' : 'list'} size={20} color={colors.coralText} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyStrong">{e.title}</Txt>
                <Txt variant="small">{e.subtitle}</Txt>
              </View>
              <Txt variant="small">{e.durationLabel}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Row gap={6}>
          <Icon name="alert-circle" size={16} color={colors.danger} />
          <Txt variant="bodyStrong">Se for mais do que dá para segurar</Txt>
        </Row>
        <Txt variant="small">
          Pensou em se machucar? Ligue 188 (CVV, gratuito, 24 horas). Dor forte no peito, falta de ar que não passa ou desmaio: 192 ou pronto-socorro.
        </Txt>
        <EmergencyCard compact />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
});
