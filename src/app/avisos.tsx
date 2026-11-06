import { router } from 'expo-router';
import { View } from 'react-native';

import { InboxRow } from '@/components/inbox';
import { Empty, ErrorState, LinkText, Row, Screen, Txt } from '@/components/ui';
import { ScreenSkeleton } from '@/components/visual';
import { useInbox, useMarkInboxRead } from '@/data/hooks';
import { space } from '@/theme';

/** Caixa de avisos: aulas novas, lives e recados. Vale no celular e na web. */
export default function Avisos() {
  const inbox = useInbox();
  const markRead = useMarkInboxRead();
  if (inbox.isPending) return <ScreenSkeleton />;
  if (inbox.error) return <ErrorState error={inbox.error} onRetry={inbox.refetch} />;
  const items = inbox.data ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <Screen padTop={false} refreshing={inbox.isRefetching} onRefresh={inbox.refetch}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ gap: 2 }}>
          <Txt variant="hero">Avisos</Txt>
          <Txt variant="small">{unread ? `${unread} ${unread === 1 ? 'novo' : 'novos'}` : 'Tudo lido'}</Txt>
        </View>
        {unread ? <LinkText label="Marcar todos como lidos" onPress={() => markRead.mutate(undefined)} /> : null}
      </Row>

      {items.length ? (
        <View style={{ gap: space.sm }}>
          {items.map((n) => <InboxRow key={n.id} item={n} />)}
        </View>
      ) : (
        <Empty icon="bell" title="Nenhum aviso por enquanto" text="Aulas novas, lives e recados da equipe aparecem aqui." />
      )}

      <LinkText label="Escolher o que recebo" onPress={() => router.push('/lembretes')} />
    </Screen>
  );
}
