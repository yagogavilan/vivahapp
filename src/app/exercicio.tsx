import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AfterCheck, ExercisePlayer } from '@/components/care';
import { TrackContextBar } from '@/components/space';
import { Button, Empty, Screen, Txt } from '@/components/ui';
import { useLogActivity } from '@/data/hooks';
import { exerciseById } from '@/domain/exercises';
import { AQUECIMENTO } from '@/domain/spaces';
import { space } from '@/theme';

/** Exercício guiado da trilha (descarrego mental, relaxar o corpo…), fora do Socorro da Respira. */
export default function Exercicio() {
  const { ex = '', track = AQUECIMENTO } = useLocalSearchParams<{ ex?: string; track?: string }>();
  const exercise = exerciseById(ex);
  const [done, setDone] = useState(false);
  const log = useLogActivity();
  if (!exercise) return <Screen padTop={false}><Empty icon="activity" title="Exercício não encontrado" /></Screen>;
  return (
    <Screen padTop={false}>
      <TrackContextBar trackId={track} />
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Exercício · {exercise.durationLabel}</Txt>
        <Txt variant="hero">{exercise.title}</Txt>
        <Txt>{exercise.subtitle}</Txt>
      </View>
      {!done ? (
        <ExercisePlayer exercises={[exercise]} onDone={() => { setDone(true); log.mutate({ kind: 'foco', ref: `exercicio-${exercise.id}`, minutes: 3 }); }} />
      ) : (
        <View style={{ gap: space.md }}>
          <AfterCheck label="como você está" onAnswer={() => undefined} />
          <Button label="Voltar" variant="ghost" icon="arrow-left" onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/t/[track]', params: { track } }))} />
        </View>
      )}
    </Screen>
  );
}
