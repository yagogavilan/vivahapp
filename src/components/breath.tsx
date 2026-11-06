import { type AudioPlayer, setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useEffectEvent, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { cycleSeconds, cyclesFor, type Exercise } from '../domain/exercises';
import { success, tap } from '../lib/haptics';
import { colors, fonts, radius, space } from '../theme';
import { Icon, type IconName, Row, Txt } from './ui';

const SOUNDS = {
  inspire: require('../../assets/sounds/inspire.wav'),
  segure: require('../../assets/sounds/segure.wav'),
  solte: require('../../assets/sounds/solte.wav'),
  fim: require('../../assets/sounds/fim.wav'),
  mar: require('../../assets/sounds/mar.wav'),
};

type Status = 'idle' | 'running' | 'paused' | 'done';
const NO_PHASES: NonNullable<Exercise['phases']> = [];

/** Toca em loop (o som do mar). Fica fora do componente porque configura o player. */
function playLoop(player: AudioPlayer, volume: number) {
  player.loop = true;
  player.volume = volume;
  player.play();
}

/**
 * Respiração guiada e interativa: o círculo enche e esvazia, a palavra da fase
 * aparece grande com a contagem, um som marca cada fase (tom que sobe para
 * inspirar, que desce para soltar, sino para segurar) e o celular vibra de leve.
 * Dá para ligar o som do mar ao fundo, pausar e escolher a duração.
 */
export function BreathSession({ exercise, onDone, compact, minutesOptions = [1, 2, 3, 5] }: {
  exercise: Exercise;
  onDone?: (minutes: number) => void;
  compact?: boolean;
  minutesOptions?: number[];
}) {
  const phases = exercise.phases ?? NO_PHASES;
  const defaultMinutes = Math.max(1, Math.round((cycleSeconds(exercise) * (exercise.cycles ?? 6)) / 60));
  const [minutes, setMinutes] = useState(compact ? 1 : Math.min(defaultMinutes, 5));
  const [status, setStatus] = useState<Status>('idle');
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState(phases[0]?.seconds ?? 4);
  const [soundOn, setSoundOn] = useState(true);
  const [sea, setSea] = useState(false);
  const [scale] = useState(() => new Animated.Value(0));
  const [idle] = useState(() => new Animated.Value(0));

  const inspire = useAudioPlayer(SOUNDS.inspire);
  const segure = useAudioPlayer(SOUNDS.segure);
  const solte = useAudioPlayer(SOUNDS.solte);
  const fim = useAudioPlayer(SOUNDS.fim);
  const mar = useAudioPlayer(SOUNDS.mar);

  const cycles = cyclesFor(exercise, minutes);
  const total = phases.length * cycles;
  const phase = phases[step % phases.length];
  const cycle = Math.floor(step / phases.length) + 1;
  const elapsed = (Math.floor(step / phases.length) * cycleSeconds(exercise)) + phases.slice(0, step % phases.length).reduce((s, p) => s + p.seconds, 0) + ((phase?.seconds ?? 0) - left);
  const progress = status === 'done' ? 1 : Math.min(1, elapsed / (cycles * cycleSeconds(exercise)));

  const cue = useEffectEvent((name: 'inspire' | 'segure' | 'solte' | 'fim') => {
    tap();
    if (!soundOn) return;
    const p = { inspire, segure, solte, fim }[name];
    p.seekTo(0).then(() => p.play()).catch(() => undefined);
  });
  const finished = useEffectEvent(() => {
    success();
    onDone?.(minutes);
  });

  // Fase nova: som, vibração e o círculo enchendo ou esvaziando no tempo da fase.
  useEffect(() => {
    if (status !== 'running' || !phase) return;
    cue(phase.cue);
    const anim = Animated.timing(scale, { toValue: phase.to, duration: phase.seconds * 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [status, step, phase, scale]);

  // Contagem regressiva da fase.
  useEffect(() => {
    if (status !== 'running') return;
    const t = setTimeout(() => {
      if (left > 1) return setLeft(left - 1);
      if (step + 1 >= total) {
        setStatus('done');
        cue('fim');
        finished();
        return;
      }
      setStep(step + 1);
      setLeft(phases[(step + 1) % phases.length].seconds);
    }, 1000);
    return () => clearTimeout(t);
  }, [status, left, step, total, phases]);

  // Som do mar ao fundo, só enquanto respira.
  useEffect(() => {
    if (status === 'running' && sea) playLoop(mar, 0.6);
    else mar.pause();
  }, [status, sea, mar]);

  // Antes de começar, o círculo "respira" sozinho, convidando ao toque.
  useEffect(() => {
    if (status !== 'idle') return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(idle, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(idle, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [status, idle]);

  const start = () => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    scale.setValue(0);
    setStep(0);
    setLeft(phases[0].seconds);
    setStatus('running');
  };
  const toggle = () => {
    tap();
    if (status === 'idle' || status === 'done') start();
    else setStatus(status === 'running' ? 'paused' : 'running');
  };

  const size = compact ? 200 : 260;
  const circle = status === 'idle'
    ? idle.interpolate({ inputRange: [0, 1], outputRange: [0.62, 0.72] })
    : scale.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <View style={[styles.box, compact && { padding: space.lg }]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong" style={{ color: colors.onDark, fontSize: 17 }}>{exercise.title}</Txt>
          <Txt variant="small" style={{ color: colors.onDarkMuted }} numberOfLines={2}>{exercise.subtitle}</Txt>
        </View>
        <Row gap={space.sm}>
          <Toggle icon={soundOn ? 'volume-2' : 'volume-x'} on={soundOn} label={soundOn ? 'Desligar os sons' : 'Ligar os sons'} onPress={() => setSoundOn((v) => !v)} />
          <Toggle icon="music" on={sea} label={sea ? 'Desligar o som do mar' : 'Ligar o som do mar'} onPress={() => setSea((v) => !v)} />
        </Row>
      </Row>

      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={status === 'running' ? 'Pausar' : 'Começar a respirar'}
        style={{ alignSelf: 'center', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ring size={size} progress={progress} />
        <Animated.View style={[styles.circle, { width: size - 24, height: size - 24, borderRadius: (size - 24) / 2, transform: [{ scale: circle }] }]} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          {status === 'idle' ? (
            <>
              <View style={{ marginLeft: 4, marginBottom: 4 }}><Icon name="play" size={34} color={colors.onDark} /></View>
              <Txt variant="bodyStrong" style={{ color: colors.onDark }}>Começar</Txt>
            </>
          ) : status === 'done' ? (
            <>
              <Icon name="check" size={40} color={colors.mint} />
              <Txt style={styles.word}>Pronto</Txt>
              <Txt variant="small" style={{ color: colors.onDarkMuted }}>toque para repetir</Txt>
            </>
          ) : (
            <>
              <Txt style={styles.word}>{status === 'paused' ? 'Pausa' : phase?.label}</Txt>
              <Txt style={styles.count}>{left}</Txt>
              {phase?.how && status === 'running' ? <Txt variant="small" style={{ color: colors.onDarkMuted }}>{phase.how}</Txt> : null}
            </>
          )}
        </View>
      </Pressable>

      {status === 'idle' ? (
        <View style={{ gap: space.sm, alignItems: 'center' }}>
          <Row gap={space.sm} style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {phases.map((p, k) => (
              <View key={k} style={styles.phasePill}>
                <Txt variant="small" style={{ color: colors.onDark, fontSize: 13 }}>{p.label} {p.seconds}s</Txt>
              </View>
            ))}
          </Row>
          <Row gap={space.sm} style={{ justifyContent: 'center' }}>
            {minutesOptions.map((m) => (
              <Pressable key={m} onPress={() => { tap(); setMinutes(m); }} accessibilityRole="button" accessibilityState={{ selected: minutes === m }}
                style={[styles.minute, minutes === m && styles.minuteOn]}>
                <Txt variant="bodyStrong" style={{ fontSize: 14, color: minutes === m ? colors.deep : colors.onDark }}>{m} min</Txt>
              </Pressable>
            ))}
          </Row>
        </View>
      ) : status === 'done' ? null : (
        <Row style={{ justifyContent: 'center' }} gap={space.lg}>
          <Txt variant="small" style={{ color: colors.onDarkMuted }}>Ciclo {cycle} de {cycles}</Txt>
          <Pressable onPress={() => { tap(); setStatus('idle'); }} accessibilityRole="button" hitSlop={8}>
            <Txt variant="small" style={{ color: colors.onDarkMuted, textDecorationLine: 'underline' }}>Encerrar</Txt>
          </Pressable>
        </Row>
      )}
    </View>
  );
}

function Toggle({ icon, on, label, onPress }: { icon: IconName; on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={6}
      style={[styles.toggle, on && styles.toggleOn]}>
      <Icon name={icon} size={18} color={on ? colors.deep : colors.onDarkMuted} />
    </Pressable>
  );
}

/** Anel do tempo total da sessão, em volta do círculo. */
function Ring({ size, progress }: { size: number; progress: number }) {
  const n = 48;
  const lit = Math.round(progress * n);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: n }, (_, k) => {
        const a = (k / n) * 2 * Math.PI - Math.PI / 2;
        const r = size / 2 - 4;
        return (
          <View key={k} style={{
            position: 'absolute', width: 4, height: 4, borderRadius: 2,
            left: size / 2 + r * Math.cos(a) - 2, top: size / 2 + r * Math.sin(a) - 2,
            backgroundColor: k < lit ? colors.coral : 'rgba(255,255,255,0.15)',
          }} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.deep, borderRadius: radius.lg, padding: space.xl, gap: space.lg },
  circle: { position: 'absolute', backgroundColor: 'rgba(69,194,164,0.28)', borderWidth: 2, borderColor: colors.mint },
  word: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.onDark, textAlign: 'center' },
  count: { fontFamily: fonts.bodyHeavy, fontSize: 40, lineHeight: 46, color: colors.coral },
  phasePill: { borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingVertical: 4, paddingHorizontal: space.md },
  minute: { borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: space.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  minuteOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  toggle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  toggleOn: { backgroundColor: colors.mint, borderColor: colors.mint },
});
