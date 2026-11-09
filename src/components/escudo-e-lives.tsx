import { router } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '../auth/session';
import { useAgenda, useAgendaMutations } from '../data/hooks';
import { scheduleLiveReminder } from '../lib/reminders';
import type { Live } from '../data/types';
import { formatCountdown, formatWhen } from '../domain/dates';
import { liveStatus } from '../domain/schedule';
import { colors, space } from '../theme';
import { Button, Card, Icon, Pill, Row, Txt } from './ui';

export function SaveLiveButton({ live }: { live: Live }) {
  const agenda = useAgenda();
  const { create } = useAgendaMutations();
  const { profile } = useSession();
  const saved = agenda.data?.some((e) => e.liveId === live.id);
  if (saved) return <Pill label="Na sua agenda" tone="mint" icon="check" />;
  return (
    <Button
      label="Salvar na agenda"
      icon="calendar"
      variant="ghost"
      loading={create.isPending}
      onPress={() =>
        create.mutate(
          { title: `Live: ${live.title}`, kind: 'live', startsAt: live.startsAt, endsAt: live.endsAt, liveId: live.id, notes: null },
          {
            // Aviso 15 min antes, se o aluno não desligou em Lembretes.
            onSuccess: () => {
              if (profile?.preferences?.liveReminders !== false) scheduleLiveReminder(live).catch(() => undefined);
            },
          },
        )
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
          <Txt variant="eyebrow">{status === 'live' ? 'Ao vivo agora' : 'Próxima live'}</Txt>
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
