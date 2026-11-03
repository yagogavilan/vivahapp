import { router } from 'expo-router';
import { View } from 'react-native';

import { useAgenda, useAgendaMutations } from '../data/hooks';
import type { EscudoAudio, Live } from '../data/types';
import { formatCountdown, formatWhen } from '../domain/dates';
import { liveStatus } from '../domain/schedule';
import { colors, space } from '../theme';
import { Button, Card, Icon, Pill, Row, Txt } from './ui';

export function EscudoCard({ audio }: { audio: EscudoAudio }) {
  return (
    <Card tone="dark" onPress={() => router.push({ pathname: '/escudo/[id]', params: { id: audio.id } })} style={{ gap: space.md }}>
      <Row>
        <Icon name="shield" size={18} color={colors.coral} />
        <Txt variant="eyebrow" style={{ color: colors.coral }}>Escudo Anticrise de hoje</Txt>
      </Row>
      <Txt variant="title" style={{ color: colors.onDark }}>{audio.title}</Txt>
      <Txt style={{ color: colors.onDarkMuted }}>{audio.summary}</Txt>
      <Row gap={space.md}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="play" size={22} color={colors.deep} />
        </View>
        <Txt variant="bodyStrong" style={{ color: colors.onDark }}>Ouvir agora · {audio.durationMin} min</Txt>
      </Row>
    </Card>
  );
}

/** Botão de salvar a live na agenda do app. */
export function SaveLiveButton({ live }: { live: Live }) {
  const agenda = useAgenda();
  const { create } = useAgendaMutations();
  const saved = agenda.data?.some((e) => e.liveId === live.id);
  if (saved) return <Pill label="Na sua agenda" tone="mint" icon="check" />;
  return (
    <Button
      label="Salvar na agenda"
      icon="calendar"
      variant="ghost"
      loading={create.isPending}
      onPress={() =>
        create.mutate({ title: `Live: ${live.title}`, kind: 'live', startsAt: live.startsAt, endsAt: live.endsAt, liveId: live.id, notes: null })
      }
    />
  );
}

export function LiveCard({ live }: { live: Live }) {
  const status = liveStatus(live);
  return (
    <Card onPress={() => router.push({ pathname: '/live/[id]', params: { id: live.id } })} style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Icon name="radio" size={18} color={colors.coralText} />
          <Txt variant="eyebrow">{status === 'live' ? 'Ao vivo agora' : 'Próxima live gratuita'}</Txt>
        </Row>
        {status === 'live' ? <Pill label="AO VIVO" tone="coral" /> : <Pill label={formatCountdown(live.startsAt)} />}
      </Row>
      <Txt variant="title">{live.title}</Txt>
      <Txt>{formatWhen(live.startsAt)} · com {live.host}</Txt>
      <View style={{ alignSelf: 'flex-start' }}>
        {status === 'live' ? (
          <Button label="Assistir agora" icon="play" onPress={() => router.push({ pathname: '/live/[id]', params: { id: live.id } })} />
        ) : (
          <SaveLiveButton live={live} />
        )}
      </View>
    </Card>
  );
}
