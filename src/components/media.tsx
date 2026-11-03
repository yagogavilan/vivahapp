import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '../theme';
import { Icon, ProgressBar, Txt } from './ui';

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let audioModeSet = false;

/** Player de áudio com tocar/pausar, voltar 15 s e barra de progresso. */
export function AudioPlayer({
  url,
  title,
  startAt = 0,
  onProgress,
  onFinish,
  tone = 'dark',
}: {
  url: string;
  title: string;
  startAt?: number;
  onProgress?: (positionSec: number) => void;
  onFinish?: () => void;
  tone?: 'dark' | 'light';
}) {
  const player = useAudioPlayer(url, { updateInterval: 1000 });
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
    }
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
    </View>
  );
}

/** Player de vídeo das aulas, com retomada de onde o aluno parou. */
export function VideoPlayer({
  url,
  startAt = 0,
  onProgress,
  onFinish,
}: {
  url: string;
  startAt?: number;
  onProgress?: (positionSec: number) => void;
  onFinish?: () => void;
}) {
  const lastSaved = useRef(0);
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

  useEffect(() => () => onProgress?.(player.currentTime), [player, onProgress]);

  return (
    <View style={styles.video}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} />
    </View>
  );
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
