import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { DiagnosticBars } from '@/components/charts';
import { Button, Card, ErrorState, Icon, Loading, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { AREA_LABEL } from '@/data/catalog';
import { useDiagnosticQuestions, useLibrary, useSaveDiagnostic } from '@/data/hooks';
import type { LifeArea } from '@/data/types';
import { recommendationCopy, recommendTrack, scoreDiagnostic } from '@/domain/diagnostic';
import { colors, radius, space } from '@/theme';

export default function Diagnostico() {
  const questions = useDiagnosticQuestions();
  const library = useLibrary();
  const save = useSaveDiagnostic();
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ scores: Record<LifeArea, number>; trackId: string } | null>(null);

  if (questions.isPending) return <Loading />;
  if (questions.error || !questions.data) return <ErrorState error={questions.error} onRetry={questions.refetch} />;
  const qs = [...questions.data].sort((a, b) => a.sort - b.sort);

  async function answer(questionId: string, score: number) {
    const next = { ...answers, [questionId]: score };
    setAnswers(next);
    if (step < qs.length - 1) {
      setStep(step + 1);
      return;
    }
    const scores = scoreDiagnostic(qs, next);
    const trackId = recommendTrack(scores);
    setResult({ scores, trackId });
    save.mutate({ answers: next, scores, trackId });
  }

  if (result) {
    const { track, waiting } = recommendationCopy(result.trackId, library.data?.tracks ?? []);
    return (
      <Screen padTop={false}>
        <Txt variant="eyebrow">Seu resultado</Txt>
        <Txt variant="hero">{track ? `Comece pela trilha ${track.title}` : 'Pronto!'}</Txt>
        {track ? (
          <Card tone="dark" style={{ gap: space.sm }}>
            <Txt variant="eyebrow" style={{ color: colors.coral }}>{AREA_LABEL[track.area]}</Txt>
            <Txt variant="title" style={{ color: colors.onDark }}>{track.promise}</Txt>
            <Txt style={{ color: colors.onDarkMuted }}>
              {waiting
                ? `Essa trilha chega em ${track.launchLabel.toLowerCase()}. Enquanto isso, a Respira ajuda a ter cabeça para o resto.`
                : track.description}
            </Txt>
            <View style={{ alignSelf: 'flex-start', marginTop: space.sm }}>
              <Button label="Ver a trilha" variant="light" icon="arrow-right" onPress={() => router.replace({ pathname: '/trilha/[id]', params: { id: track.id } })} />
            </View>
          </Card>
        ) : null}
        <Card style={{ gap: space.md }}>
          <Txt variant="heading">Onde está a sua atenção agora</Txt>
          <DiagnosticBars scores={result.scores} />
        </Card>
        <Txt variant="small">
          Este diagnóstico é uma autoavaliação para orientar os seus estudos. Não é teste psicológico nem avaliação de saúde.
        </Txt>
      </Screen>
    );
  }

  if (step === -1) {
    return (
      <Screen padTop={false}>
        <Txt variant="eyebrow">Diagnóstico Vivah</Txt>
        <Txt variant="hero">Por onde começar?</Txt>
        <Txt>
          São 12 perguntas, duas para cada área da vida: mente, tempo, carreira, dinheiro, corpo e alimentação. Leva uns 3
          minutos. No fim, você vê onde está a sua atenção e qual trilha faz mais sentido agora.
        </Txt>
        <Card tone="sand">
          <Txt variant="small">É uma autoavaliação para orientar os seus estudos, não um teste psicológico ou de saúde.</Txt>
        </Card>
        <Button label="Começar" icon="arrow-right" onPress={() => setStep(0)} />
      </Screen>
    );
  }

  const q = qs[step];
  return (
    <Screen padTop={false}>
      <View style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="eyebrow">{AREA_LABEL[q.area]}</Txt>
          <Txt variant="small">{step + 1} de {qs.length}</Txt>
        </Row>
        <ProgressBar value={((step + 1) / qs.length) * 100} color={colors.coral} />
      </View>
      <Txt variant="hero">{q.prompt}</Txt>
      <View style={{ gap: space.sm }}>
        {q.options.map((o) => {
          const selected = answers[q.id] === o.score;
          return (
            <Pressable
              key={o.label}
              onPress={() => answer(q.id, o.score)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                padding: space.lg,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: selected ? colors.petrol : colors.border,
                backgroundColor: pressed ? colors.sand : colors.surface,
              })}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="bodyStrong" style={{ flex: 1 }}>{o.label}</Txt>
                {selected ? <Icon name="check" color={colors.petrol} /> : null}
              </Row>
            </Pressable>
          );
        })}
      </View>
      {step > 0 ? <Button label="Voltar" variant="ghost" icon="arrow-left" onPress={() => setStep(step - 1)} /> : null}
    </Screen>
  );
}
