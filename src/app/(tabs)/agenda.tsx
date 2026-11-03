import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Card, Empty, ErrorState, Icon, Loading, Row, Screen, Txt } from '@/components/ui';
import { useAgenda, useAgendaMutations, useLives } from '@/data/hooks';
import { dayKey, formatDayLabel, formatTime } from '@/domain/dates';
import { agendaDays } from '@/domain/schedule';
import { AGENDA_KIND as KIND } from '@/lib/agenda-kinds';
import { confirm } from '@/lib/dialogs';
import { colors, space } from '@/theme';

export default function Agenda() {
  const agenda = useAgenda();
  const lives = useLives();
  const { remove } = useAgendaMutations();

  if (agenda.isPending || lives.isPending) return <Loading />;
  if (agenda.error) return <ErrorState error={agenda.error} onRetry={agenda.refetch} />;

  const today = dayKey(new Date());
  const days = agendaDays(lives.data ?? [], agenda.data ?? [], new Date(), 14);

  return (
    <Screen refreshing={agenda.isRefetching} onRefresh={() => { agenda.refetch(); lives.refetch(); }}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Agenda</Txt>
        <Txt variant="hero">Os próximos 14 dias</Txt>
        <Txt>Lives, aulas, treinos, refeições e blocos de foco num lugar só.</Txt>
      </View>
      <View style={{ alignSelf: 'flex-start' }}>
        <Button label="Novo compromisso" icon="plus" onPress={() => router.push('/evento')} />
      </View>

      {days.length === 0 ? (
        <Empty icon="calendar" title="Agenda livre" text="Adicione um compromisso ou salve a próxima live." />
      ) : (
        days.map(({ day, items }) => (
          <View key={day} style={{ gap: space.sm }}>
            <Txt variant="eyebrow" style={{ color: day === today ? colors.coralText : colors.textSubtle }}>
              {formatDayLabel(day, today)}
            </Txt>
            <Card style={{ gap: space.md }}>
              {items.map((item) => (
                <Row key={item.key} gap={space.md}>
                  <Txt variant="bodyStrong" style={{ width: 52 }}>{formatTime(item.startsAt)}</Txt>
                  <Icon name={KIND[item.kind].icon} size={18} color={item.kind === 'live' ? colors.coralText : colors.petrol} />
                  <Pressable
                    style={{ flex: 1 }}
                    disabled={!item.liveId}
                    onPress={() => item.liveId && router.push({ pathname: '/live/[id]', params: { id: item.liveId } })}>
                    <Txt style={{ color: colors.text }}>{item.title}</Txt>
                    <Txt variant="small">até {formatTime(item.endsAt)}</Txt>
                  </Pressable>
                  {item.eventId ? (
                    <Pressable
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${item.title}`}
                      onPress={async () => {
                        if (await confirm('Remover da agenda?', item.title, 'Remover', true)) remove.mutate(item.eventId!);
                      }}>
                      <Icon name="x" size={18} color={colors.textSubtle} />
                    </Pressable>
                  ) : null}
                </Row>
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}
