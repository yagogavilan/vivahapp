import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { SaveLiveButton } from '@/components/aquecimento';
import { Card, Empty, Icon, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { YouTubeEmbed } from '@/components/youtube-embed';
import { useLives, useLogActivity } from '@/data/hooks';
import { formatCountdown, formatTime, formatWhen } from '@/domain/dates';
import { liveStatus } from '@/domain/schedule';
import { colors, space } from '@/theme';

export default function LiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lives = useLives();
  const log = useLogActivity();
  const live = lives.data?.find((l) => l.id === id);
  const watching = Boolean(live?.youtubeId) && live !== undefined && ['live', 'replay'].includes(liveStatus(live));

  // Assistir à live (ou ao replay) conta como atividade do dia.
  useEffect(() => {
    if (watching && live) log.mutate({ kind: 'live', ref: live.id, minutes: 60 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watching, live?.id]);

  if (lives.isPending) return <Loading />;
  if (!live) return <Screen padTop={false}><Empty icon="radio" title="Live não encontrada" /></Screen>;

  const status = liveStatus(live);
  const canWatch = (status === 'live' || status === 'replay') && live.youtubeId;

  return (
    <Screen padTop={false}>
      <View style={{ gap: space.sm }}>
        <Row>
          <Icon name="radio" size={18} color={colors.coralText} />
          <Txt variant="eyebrow">Live gratuita</Txt>
          {status === 'live' ? <Pill label="AO VIVO" tone="coral" /> : null}
          {status === 'replay' ? <Pill label={`Replay até ${formatWhen(live.replayUntil!)}`} tone="mint" /> : null}
        </Row>
        <Txt variant="hero">{live.title}</Txt>
        <Txt>{formatWhen(live.startsAt)} às {formatTime(live.endsAt)} · com {live.host}</Txt>
      </View>

      {canWatch ? (
        <YouTubeEmbed videoId={live.youtubeId!} />
      ) : status === 'upcoming' ? (
        <Card tone="dark" style={{ gap: space.md, alignItems: 'flex-start' }}>
          <Txt variant="eyebrow" style={{ color: colors.coral }}>Começa {formatCountdown(live.startsAt)}</Txt>
          <Txt variant="title" style={{ color: colors.onDark }}>A transmissão aparece aqui na hora da live.</Txt>
          <Txt style={{ color: colors.onDarkMuted }}>Salve na agenda para receber o lembrete.</Txt>
        </Card>
      ) : (
        <Card tone="sand">
          <Txt>{status === 'ended' ? 'Esta live já terminou e o replay saiu do ar.' : 'O link da transmissão ainda não foi cadastrado.'}</Txt>
        </Card>
      )}

      <Txt>{live.description}</Txt>
      {status === 'upcoming' ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <SaveLiveButton live={live} />
        </View>
      ) : null}
    </Screen>
  );
}
