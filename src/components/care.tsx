import { useEffect, useEffectEvent, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import type { Exercise } from '../domain/exercises';
import { success, tap } from '../lib/haptics';
import { colors, fonts, radius, space } from '../theme';
import { BreathSession } from './breath';
import { Button, Icon, Row, Txt } from './ui';

/** Telefones de emergência. Sempre visíveis quando o estado está crítico. */
export function EmergencyCard({ compact = false }: { compact?: boolean }) {
  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => undefined);
  return (
    <View style={[styles.emergency, compact && { padding: space.md }]}>
      {!compact ? (
        <Txt variant="small" style={{ color: colors.text }}>
          A Vivah é conteúdo de desenvolvimento pessoal e não substitui terapia ou atendimento médico.
        </Txt>
      ) : null}
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        <Pressable onPress={() => call('188')} accessibilityRole="button" accessibilityLabel="Ligar para o CVV, 188" style={styles.phone}>
          <Icon name="phone" size={16} color={colors.onDark} />
          <Txt variant="bodyStrong" style={{ color: colors.onDark, fontSize: 14 }}>CVV 188 · 24 h</Txt>
        </Pressable>
        <Pressable onPress={() => call('192')} accessibilityRole="button" accessibilityLabel="Ligar para o SAMU, 192" style={[styles.phone, { backgroundColor: colors.danger }]}>
          <Icon name="plus-square" size={16} color="#fff" />
          <Txt variant="bodyStrong" style={{ color: '#fff', fontSize: 14 }}>SAMU 192</Txt>
        </Pressable>
      </Row>
    </View>
  );
}

/** Passo a passo: alguns passos têm tempo e avançam sozinhos. */
function StepsPlayer({ exercise, onDone }: { exercise: Exercise; onDone: () => void }) {
  const steps = exercise.steps!;
  const [i, setI] = useState(0);
  const [left, setLeft] = useState<number | null>(steps[0]?.seconds ?? null);
  const current = steps[i];
  const done = useEffectEvent(onDone);

  const next = () => {
    tap();
    if (i + 1 >= steps.length) onDone();
    else {
      setI(i + 1);
      setLeft(steps[i + 1]?.seconds ?? null);
    }
  };

  useEffect(() => {
    if (left === null) return;
    const t = setTimeout(() => {
      if (left <= 1) {
        if (i + 1 >= steps.length) done();
        else {
          setI(i + 1);
          setLeft(steps[i + 1]?.seconds ?? null);
        }
      } else setLeft(left - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [left, i, steps]);

  return (
    <View style={{ gap: space.lg, alignItems: 'center' }}>
      <Row gap={6}>
        {steps.map((_, k) => (
          <View key={k} style={[styles.dot, { backgroundColor: k <= i ? colors.coral : 'rgba(255,255,255,0.2)' }]} />
        ))}
      </Row>
      <Txt style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.onDark, textAlign: 'center' }}>{current?.title}</Txt>
      <Txt style={{ color: colors.onDarkMuted, textAlign: 'center', maxWidth: 420 }}>{current?.text}</Txt>
      {left !== null ? (
        <Txt style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 48, color: colors.coral }}>
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </Txt>
      ) : null}
      <Button label={i + 1 >= steps.length ? 'Concluir' : 'Próximo'} onPress={next} />
    </View>
  );
}

/** Toca uma sequência de exercícios, um depois do outro. */
export function ExercisePlayer({ exercises, onDone }: { exercises: Exercise[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const current = exercises[index];
  const finish = () => {
    if (index + 1 >= exercises.length) {
      success();
      onDone();
    } else setIndex(index + 1);
  };
  if (!current) return null;
  const header = exercises.length > 1 ? (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt variant="eyebrow" style={{ color: colors.coralText }}>{index + 1} de {exercises.length}</Txt>
      <Pressable onPress={finish} hitSlop={10} accessibilityRole="button"><Txt variant="small">Pular</Txt></Pressable>
    </Row>
  ) : null;
  if (current.kind === 'breath') {
    return (
      <View style={{ gap: space.sm }}>
        {header}
        <BreathSession key={current.id} exercise={current} onDone={finish} />
      </View>
    );
  }
  return (
    <View style={{ gap: space.sm }}>
      {header}
      <View style={styles.player}>
        <View style={{ gap: 4 }}>
          <Txt variant="title" style={{ color: colors.onDark }}>{current.title}</Txt>
          <Txt style={{ color: colors.onDarkMuted }}>{current.subtitle}</Txt>
        </View>
        <StepsPlayer key={current.id} exercise={current} onDone={finish} />
      </View>
    </View>
  );
}

/** "E agora, de 0 a 10?" depois do exercício, para a pessoa ver a diferença. */
export function AfterCheck({ before, label, onAnswer }: { before?: number; label: string; onAnswer: (v: number) => void }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <View style={[styles.after]}>
      <Txt variant="heading">E agora, como está {label.toLowerCase()} de 0 a 10?</Txt>
      <View style={styles.scale10}>
        {Array.from({ length: 11 }, (_, n) => (
          <Pressable
            key={n}
            onPress={() => {
              tap();
              setValue(n);
              onAnswer(n);
            }}
            accessibilityRole="button"
            accessibilityLabel={String(n)}
            style={[styles.scaleItem, value === n && { backgroundColor: colors.petrol, borderColor: colors.petrol }]}>
            <Txt variant="bodyStrong" style={{ color: value === n ? colors.onDark : colors.text }}>{n}</Txt>
          </Pressable>
        ))}
      </View>
      {value !== null && before !== undefined ? (
        <Txt variant="bodyStrong" style={{ color: value < before ? '#16614F' : colors.text }}>
          {value < before
            ? `Antes ${before}, agora ${value}. Seu corpo já respondeu.`
            : 'Tudo bem. Às vezes leva mais tempo. Repita o exercício ou fale com alguém de confiança.'}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emergency: { gap: space.md, backgroundColor: colors.coralSoft, borderRadius: radius.md, padding: space.lg },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.petrol, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: space.lg },
  player: { backgroundColor: colors.deep, borderRadius: radius.lg, padding: space.xl, gap: space.xl },
  dot: { width: 26, height: 5, borderRadius: 3 },
  after: { gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  scale10: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleItem: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});
