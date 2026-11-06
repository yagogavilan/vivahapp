import { Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import type { LifeArea, Track } from '../data/types';
import { AREA_LABEL } from '../data/catalog';
import { type LifeResult, LIFE_TEST, MOMENTS, scoreLifeTest } from '../domain/life-test';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, space } from '../theme';
import { AREA_ICON } from './area-icons';
import { Button, Icon, ProgressBar, Row, Txt } from './ui';
import { FadeIn } from './visual';

/** As perguntas, uma por tela. */
export function LifeTestQuestions({ onDone }: { onDone: (answers: Record<string, number>, result: LifeResult) => void }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const q = LIFE_TEST[i];
  return (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="eyebrow">Teste Vivah · seu momento</Txt>
          <Txt variant="small">{i + 1} de {LIFE_TEST.length}</Txt>
        </Row>
        <ProgressBar value={((i + 1) / LIFE_TEST.length) * 100} color={colors.coral} />
      </View>
      <FadeIn key={q.id} style={{ gap: space.lg }}>
        {q.area !== 'objetivo' ? (
          <Row gap={6}>
            <Icon name={AREA_ICON[q.area]} size={16} color={colors.coralText} />
            <Txt variant="small" style={{ color: colors.coralText }}>{AREA_LABEL[q.area]}</Txt>
          </Row>
        ) : null}
        <Txt variant="hero">{q.prompt}</Txt>
        <View style={{ gap: space.sm }}>
          {q.options.map((o) => (
            <Pressable
              key={o.label}
              accessibilityRole="button"
              onPress={() => {
                tap();
                const next = { ...answers, [q.id]: o.score };
                setAnswers(next);
                if (i < LIFE_TEST.length - 1) setI(i + 1);
                else onDone(next, scoreLifeTest(next));
              }}
              style={[styles.option, answers[q.id] === o.score && styles.optionOn]}>
              <Txt variant="bodyStrong" style={{ color: answers[q.id] === o.score ? colors.onDark : colors.text }}>{o.label}</Txt>
            </Pressable>
          ))}
        </View>
      </FadeIn>
      {i > 0 ? (
        <Pressable onPress={() => setI(i - 1)} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <Row gap={6}><Icon name="arrow-left" size={16} color={colors.textSubtle} /><Txt variant="small">Voltar</Txt></Row>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Resultado: momento de vida, trilha indicada e o caminho sugerido. */
export function LifeTestResult({ result, tracks, onStart, startLabel }: {
  result: LifeResult;
  tracks: Track[];
  onStart: (trackId: string) => void;
  startLabel: string;
}) {
  const rec = tracks.find((t) => t.id === result.recommendedTrackId);
  const areas = Object.entries(result.needs).sort((a, b) => b[1] - a[1]) as [LifeArea, number][];
  return (
    <View style={{ gap: space.lg }}>
      <FadeIn>
        <View style={styles.moment}>
          <Txt variant="eyebrow" style={{ color: colors.coral }}>Seu momento de vida · degrau {result.moment.step} de 4</Txt>
          <Txt style={styles.momentTitle}>{result.moment.title}</Txt>
          <Txt style={{ color: colors.onDarkMuted }}>{result.moment.text}</Txt>
          <Row gap={6} style={{ marginTop: space.sm }}>
            {Object.values(MOMENTS).map((m) => (
              <View key={m.id} style={[styles.stepDot, { backgroundColor: m.step <= result.moment.step ? colors.coral : 'rgba(255,255,255,0.18)' }]} />
            ))}
          </Row>
        </View>
      </FadeIn>

      {rec ? (
        <FadeIn delay={100}>
          <View style={styles.rec}>
            <Txt variant="eyebrow">Trilha indicada para você</Txt>
            <Row gap={space.md}>
              <View style={styles.recIcon}><Icon name={AREA_ICON[rec.area]} size={24} color={colors.coral} /></View>
              <View style={{ flex: 1 }}>
                <Txt variant="title">{rec.title}</Txt>
                <Txt variant="small">{rec.subtitle}</Txt>
              </View>
            </Row>
            <Txt>{rec.promise}</Txt>
            {rec.status === 'soon' ? <Txt variant="small" style={{ color: colors.coralText }}>Os cursos chegam em {rec.launchLabel.toLowerCase()}. As ferramentas do dia já estão abertas.</Txt> : null}
            <Button label={startLabel} icon="arrow-right" onPress={() => onStart(rec.id)} />
          </View>
        </FadeIn>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Txt variant="heading">O caminho sugerido</Txt>
        <Txt variant="small">
          {result.journey === 'carreira'
            ? 'Você chega pela carreira: depois dela, tempo e dinheiro. A mente fica de apoio quando o estresse subir.'
            : 'As trilhas seguem uma ordem: primeiro a mente, depois a base da rotina, o dinheiro e então a carreira.'}
        </Txt>
        {result.path.map((id, k) => {
          const t = tracks.find((x) => x.id === id);
          if (!t) return null;
          return (
            <Row key={id} gap={space.md} style={styles.pathRow}>
              <View style={[styles.num, k === 0 && { backgroundColor: colors.coral }]}><Txt variant="bodyStrong" style={{ color: k === 0 ? colors.deep : colors.text, fontSize: 14 }}>{k + 1}</Txt></View>
              <Txt variant="bodyStrong" style={{ flex: 1 }}>{t.title}</Txt>
              <Txt variant="small">{t.areaLabel}</Txt>
            </Row>
          );
        })}
        <Txt variant="small">É uma indicação: você pode começar por qualquer trilha.</Txt>
      </View>

      <View style={{ gap: space.sm }}>
        <Txt variant="heading">Como está cada área</Txt>
        {areas.map(([a, v]) => (
          <View key={a} style={{ gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="small" style={{ color: colors.text }}>{AREA_LABEL[a]}</Txt>
              <Txt variant="small">{v >= 55 ? 'Pede atenção' : v >= 30 ? 'Dá para melhorar' : 'Em dia'}</Txt>
            </Row>
            <ProgressBar value={Math.max(4, v)} color={v >= 55 ? colors.coral : v >= 30 ? '#E9CF7A' : colors.mint} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  option: { minHeight: 56, justifyContent: 'center', paddingHorizontal: space.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  optionOn: { backgroundColor: colors.petrol, borderColor: colors.petrol },
  moment: { backgroundColor: colors.deep, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  momentTitle: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.onDark },
  stepDot: { flex: 1, height: 6, borderRadius: 3 },
  rec: { gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.coral, padding: space.xl },
  recIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.petrol, alignItems: 'center', justifyContent: 'center' },
  pathRow: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
});
