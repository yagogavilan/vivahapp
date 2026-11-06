import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, Icon, Row, Screen, Txt } from '@/components/ui';
import { ProgressRing } from '@/components/visual';
import { useLogActivity, useTrackEntryMutations } from '@/data/hooks';
import { success } from '@/lib/haptics';
import { cancelById, scheduleFocusEnd } from '@/lib/reminders';
import { colors, fonts, space } from '@/theme';

const DURATIONS = [15, 25, 50];

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Bloco de foco (técnica pomodoro). O fim é guardado como horário, então o
 * relógio continua certo mesmo se o app for para segundo plano; no celular,
 * um aviso local toca quando o tempo acaba.
 */
export default function Foco() {
  const log = useLogActivity();
  const panel = useTrackEntryMutations();
  const [minutes, setMinutes] = useState(25);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const total = minutes * 60_000;
  const left = pausedLeft ?? (endsAt ? endsAt - now : total);
  const running = endsAt !== null && pausedLeft === null;

  // O próprio relógio encerra o bloco quando o tempo acaba (sem setState dentro de efeito).
  useEffect(() => {
    if (!running || !endsAt) return;
    const t = setInterval(() => {
      const current = Date.now();
      if (current < endsAt) {
        setNow(current);
        return;
      }
      clearInterval(t);
      setEndsAt(null);
      setFinished(true);
      success();
      log.mutate({ kind: 'foco', ref: new Date(endsAt).toISOString(), minutes });
      // O bloco concluído entra nos minutos de foco do painel do Ritmo.
      panel.add.mutate({ trackId: 'ritmo', metric: 'foco', delta: minutes });
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, endsAt]);

  async function start(fromLeft = total) {
    const end = Date.now() + fromLeft;
    setFinished(false);
    setPausedLeft(null);
    setEndsAt(end);
    setNow(Date.now());
    setNotificationId(await scheduleFocusEnd(end));
  }

  async function pause() {
    setPausedLeft(left);
    await cancelById(notificationId);
    setNotificationId(null);
  }

  async function stop() {
    setEndsAt(null);
    setPausedLeft(null);
    await cancelById(notificationId);
    setNotificationId(null);
  }

  const idle = endsAt === null && pausedLeft === null;

  return (
    <Screen padTop={false}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Trilha Ritmo · gestão do tempo</Txt>
        <Txt variant="hero">Bloco de foco</Txt>
        <Txt>Escolha uma tarefa, silencie as notificações e fique só nela até o tempo acabar.</Txt>
      </View>

      <Card tone="dark" style={{ alignItems: 'center', gap: space.xl, paddingVertical: space.xxl }}>
        <ProgressRing value={1 - left / total} size={220} stroke={14} track={colors.petrolSoft}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 64, color: colors.onDark }}>{mmss(left)}</Txt>
          <Txt variant="small" style={{ color: colors.onDarkMuted }}>
            {finished ? 'Concluído!' : running ? 'Focando' : pausedLeft !== null ? 'Pausado' : `${minutes} minutos`}
          </Txt>
        </ProgressRing>

        {idle ? (
          <Row gap={space.sm}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d} min`} selected={minutes === d} onDark onPress={() => { setMinutes(d); setFinished(false); }} />
            ))}
          </Row>
        ) : null}

        <Row gap={space.md}>
          {idle ? <Button label={finished ? 'Mais um bloco' : 'Começar'} icon="play" onPress={() => start()} /> : null}
          {running ? <Button label="Pausar" icon="pause" variant="light" onPress={pause} /> : null}
          {pausedLeft !== null ? <Button label="Continuar" icon="play" onPress={() => start(pausedLeft)} /> : null}
          {!idle ? <Button label="Parar" icon="square" variant="light" onPress={stop} /> : null}
        </Row>
      </Card>

      {finished ? (
        <Card tone="sand" style={{ gap: space.xs }}>
          <Row>
            <Icon name="check-circle" color={colors.petrol} />
            <Txt variant="bodyStrong">Bloco registrado no seu dia.</Txt>
          </Row>
          <Txt variant="small">Faça uma pausa de 5 minutos: levante, beba água, olhe para longe.</Txt>
        </Card>
      ) : (
        <Card tone="sand" style={{ gap: space.xs }}>
          <Txt variant="bodyStrong">Dica</Txt>
          <Txt variant="small">Anote num papel o que aparecer na cabeça durante o bloco e volte para a tarefa. Você resolve depois.</Txt>
        </Card>
      )}
    </Screen>
  );
}
