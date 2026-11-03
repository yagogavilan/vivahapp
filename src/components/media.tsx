import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme';
import { Icon, ProgressBar, Txt } from './ui';

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let audioModeSet = false;

const RATES = [0.75, 1, 1.25, 1.5, 2];

/** Velocidade de reprodução (o player do Hotmart também oferece; aqui vale para áudio e vídeo). */
function SpeedControl({ rate, onChange, dark }: { rate: number; onChange: (r: number) => void; dark: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }} accessibilityLabel="Velocidade de reprodução">
      {RATES.map((r) => {
        const on = r === rate;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: on ? colors.coral : dark ? colors.petrol : colors.border,
              backgroundColor: on ? colors.coral : 'transparent',
            }}>
            <Txt variant="small" style={{ fontSize: 13, color: on ? colors.deep : dark ? colors.onDarkMuted : colors.textSubtle }}>
              {String(r).replace('.', ',')}x
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Player de áudio com tocar/pausar, voltar 15 s e barra de progresso. */
export function AudioPlayer({
  url,
  title,
  startAt = 0,
  onProgress,
  onFinish,
  onPlay,
  tone = 'dark',
}: {
  url: string;
  title: string;
  startAt?: number;
  onProgress?: (positionSec: number) => void;
  onFinish?: () => void;
  /** Primeira vez que o aluno aperta play (registra a atividade do dia). */
  onPlay?: () => void;
  tone?: 'dark' | 'light';
}) {
  const player = useAudioPlayer(url, { updateInterval: 1000 });
  const [rate, setRate] = useState(1);
  const played = useRef(false);
  const status = useAudioPlayerStatus(player);
  const lastSaved = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    if (!audioModeSet) {
      audioModeSet = true;
      setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (status.isLoaded && startAt > 0 && status.currentTime === 0) player.seekTo(startAt).catch(() => undefined);
    // Só no carregamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.isLoaded]);

  useEffect(() => {
    if (!status.isLoaded) return;
    if (Math.abs(status.currentTime - lastSaved.current) >= 10) {
      lastSaved.current = status.currentTime;
      onProgress?.(status.currentTime);
    }
    if (status.didJustFinish && !finished.current) {
      finished.current = true;
      onFinish?.();
    }
  }, [status.currentTime, status.didJustFinish, status.isLoaded, onFinish, onProgress]);

  const toggle = () => {
    if (status.playing) {
      player.pause();
      onProgress?.(status.currentTime);
    } else {
      if (status.duration > 0 && status.currentTime >= status.duration - 0.5) player.seekTo(0).catch(() => undefined);
      player.setActiveForLockScreen?.(true, { title, artist: 'Vivah' });
      player.play();
      if (!played.current) {
        played.current = true;
        onPlay?.();
      }
    }
  };

  const changeRate = (r: number) => {
    setRate(r);
    player.setPlaybackRate(r);
  };

  const dark = tone === 'dark';
  const fg = dark ? colors.onDark : colors.text;
  const percent = status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;

  return (
    <View style={[styles.audio, { backgroundColor: dark ? colors.petrolSoft : colors.sand }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <Pressable
          onPress={() => player.seekTo(Math.max(0, status.currentTime - 15)).catch(() => undefined)}
          accessibilityRole="button"
          accessibilityLabel="Voltar 15 segundos"
          hitSlop={8}>
          <Icon name="rotate-ccw" size={22} color={fg} />
        </Pressable>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pausar' : 'Tocar'}
          style={styles.play}>
          <Icon name={status.playing ? 'pause' : 'play'} size={28} color={colors.deep} />
        </Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <ProgressBar value={percent} color={colors.coral} track={dark ? colors.petrol : colors.border} />
          <Txt variant="small" style={{ color: dark ? colors.onDarkMuted : colors.textSubtle }}>
            {status.isLoaded ? `${fmt(status.currentTime)} / ${fmt(status.duration)}` : 'Carregando…'}
          </Txt>
        </View>
      </View>
      <View style={{ marginTop: space.md }}>
        <SpeedControl rate={rate} onChange={changeRate} dark={dark} />
      </View>
    </View>
  );
}

/** Player de vídeo das aulas, com retomada de onde o aluno parou. */
export function VideoPlayer({
  url,
  startAt = 0,
  onProgress,
  onFinish,
  onPlay,
}: {
  url: string;
  startAt?: number;
  onProgress?: (positionSec: number) => void;
  onFinish?: () => void;
  onPlay?: () => void;
}) {
  const lastSaved = useRef(0);
  const played = useRef(false);
  const [rate, setRate] = useState(1);
  const player = useVideoPlayer(url, (p) => {
    p.timeUpdateEventInterval = 5;
    if (startAt > 0) p.currentTime = startAt;
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (Math.abs(currentTime - lastSaved.current) >= 10) {
      lastSaved.current = currentTime;
      onProgress?.(currentTime);
    }
  });
  useEventListener(player, 'playToEnd', () => onFinish?.());
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (isPlaying && !played.current) {
      played.current = true;
      onPlay?.();
    }
  });

  useEffect(() => () => onProgress?.(player.currentTime), [player, onProgress]);

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.video}>
        <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} />
      </View>
      <SpeedControl
        rate={rate}
        dark={false}
        onChange={(r) => {
          setRate(r);
          applyRate(player, r);
        }}
      />
    </View>
  );
}

/** Fora do componente: o React Compiler não aceita mutar o retorno de um hook dentro do render. */
function applyRate(player: { playbackRate: number }, rate: number) {
  player.playbackRate = rate;
}

/** Quando o vídeo ou o áudio ainda não foi cadastrado. */
export function MediaPlaceholder({ kind, durationMin }: { kind: 'video' | 'audio'; durationMin: number }) {
  return (
    <View style={[styles.placeholder, kind === 'video' ? styles.video : null]}>
      <Icon name={kind === 'video' ? 'film' : 'headphones'} size={30} color={colors.coral} />
      <Txt variant="bodyStrong" style={{ color: colors.onDark }}>
        {kind === 'video' ? 'Vídeo em produção' : 'Áudio em produção'}
      </Txt>
      <Txt variant="small" style={{ color: colors.onDarkMuted, textAlign: 'center' }}>
        Este conteúdo ({durationMin} min) entra aqui assim que for gravado.
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  audio: { borderRadius: radius.lg, padding: space.lg },
  play: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.deep },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.petrol,
  },
});
