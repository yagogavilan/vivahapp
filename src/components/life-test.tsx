import { Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import type { LifeArea, Track } from '../data/types';
import { AREA_LABEL } from '../data/catalog';
import { type LifeResult, LIFE_TEST, MOMENTS, scoreLifeTest } from '../domain/life-test';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, space } from '../theme';
import { AREA_ICON } from './area-icons';
import { JourneyList } from './journey-list';
import { Button, Icon, ProgressBar, Row, Txt } from './ui';
import { FadeIn } from './visual';

const GOAL_ICON: LifeArea[] = ['mente', 'tempo', 'corpo', 'alimentacao', 'financas', 'carreira'];

/** Intensidade da resposta em 4 barrinhas (0 = está bem, 3 = pede atenção). */
function Level({ n, on }: { n: number; on: boolean }) {
  return (
    <Row gap={3} style={{ alignItems: 'flex-end' }}>
      {[0, 1, 2, 3].map((k) => (
        <View key={k} style={{ width: 5, height: 6 + k * 4, borderRadius: 2, backgroundColor: k <= n ? (on ? colors.coral : colors.petrol) : on ? 'rgba(255,255,255,0.25)' : colors.sand }} />
      ))}
    </Row>
  );
}

/** As perguntas, uma por tela: toque na resposta e já vai para a próxima. */
export function LifeTestQuestions({ onDone }: { onDone: (answers: Record<string, number>, result: LifeResult) => void }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const q = LIFE_TEST[i];
  return (
    <View style={{ gap: space.lg }}>
      <Row gap={space.md}>
        {i > 0 ? (
          <Pressable onPress={() => setI(i - 1)} accessibilityRole="button" accessibilityLabel="Pergunta anterior" hitSlop={10}>
            <Icon name="arrow-left" size={22} color={colors.petrol} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}><ProgressBar value={((i + 1) / LIFE_TEST.length) * 100} color={colors.coral} /></View>
        <Txt variant="small">{i + 1}/{LIFE_TEST.length}</Txt>
      </Row>
      <FadeIn key={q.id} style={{ gap: space.lg }}>
        {q.area !== 'objetivo' ? (
          <View style={styles.area}>
            <Icon name={AREA_ICON[q.area]} size={16} color={colors.coralText} />
            <Txt variant="bodyStrong" style={{ color: colors.coralText, fontSize: 14 }}>{AREA_LABEL[q.area]}</Txt>
          </View>
        ) : null}
        <Txt variant="hero">{q.prompt}</Txt>
        <View style={{ gap: space.sm }}>
          {q.options.map((o) => {
            const on = answers[q.id] === o.score;
            return (
              <Pressable
                key={o.label}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  tap();
                  const next = { ...answers, [q.id]: o.score };
                  setAnswers(next);
                  if (i < LIFE_TEST.length - 1) setI(i + 1);
                  else onDone(next, scoreLifeTest(next));
                }}
                style={({ pressed }) => [styles.option, on && styles.optionOn, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                {q.area === 'objetivo' ? (
                  <View style={[styles.goalIcon, on && { backgroundColor: colors.coral }]}>
                    <Icon name={AREA_ICON[GOAL_ICON[o.score]]} size={18} color={on ? colors.deep : colors.coralText} />
                  </View>
                ) : (
                  <Level n={o.score} on={on} />
                )}
                <Txt variant="bodyStrong" style={{ flex: 1, color: on ? colors.onDark : colors.text }}>{o.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </FadeIn>
    </View>
  );
}

/** Resultado: o momento de vida e a jornada inteira, na ordem, com a trilha recomendada marcada. */
export function LifeTestResult({ result, tracks, onStart, startLabel }: {
  result: LifeResult;
  tracks: Track[];
  onStart: (trackId: string) => void;
  startLabel: string;
}) {
  const rec = tracks.find((t) => t.id === result.recommendedTrackId);
  return (
    <View style={{ gap: space.xl }}>
      <FadeIn>
        <View style={styles.moment}>
          <Txt variant="eyebrow" style={{ color: colors.coral }}>Seu momento</Txt>
          <Txt style={styles.momentTitle}>{result.moment.title.replace('Momento de ', '')}</Txt>
          <Txt style={{ color: colors.onDarkMuted }}>{result.moment.text}</Txt>
          <Row gap={6} style={{ marginTop: space.sm }}>
            {Object.values(MOMENTS).map((m) => (
              <View key={m.id} style={{ flex: 1, gap: 4 }}>
                <View style={[styles.stepDot, { backgroundColor: m.step <= result.moment.step ? colors.coral : 'rgba(255,255,255,0.18)' }]} />
                <Txt style={{ fontSize: 11, color: m.step === result.moment.step ? colors.onDark : colors.onDarkMuted }} numberOfLines={1}>
                  {m.title.replace('Momento de ', '')}
                </Txt>
              </View>
            ))}
          </Row>
        </View>
      </FadeIn>

      <View style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          <Txt variant="title">Sua jornada</Txt>
          <Txt variant="small">Do 1 ao 6. Comece pela recomendada ou escolha outra.</Txt>
        </View>
        <JourneyList tracks={tracks} recommendedId={result.recommendedTrackId} onPick={onStart} />
      </View>

      {rec ? <Button label={`${startLabel}: ${rec.title}`} icon="arrow-right" onPress={() => onStart(rec.id)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  area: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.coralSoft, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: space.md },
  option: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  optionOn: { backgroundColor: colors.petrol, borderColor: colors.petrol },
  goalIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
  moment: { backgroundColor: colors.deep, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  momentTitle: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.onDark, textTransform: 'capitalize' },
  stepDot: { height: 6, borderRadius: 3 },
});
