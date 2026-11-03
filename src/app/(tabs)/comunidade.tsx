import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Composer, PostItem } from '@/components/community';
import { Card, Chip, Empty, ErrorState, Loading, Screen, Txt } from '@/components/ui';
import { useCommunityMutations, useLibrary, usePosts } from '@/data/hooks';
import { space } from '@/theme';

export default function Comunidade() {
  const library = useLibrary();
  const [channel, setChannel] = useState('aquecimento');
  const posts = usePosts(channel);
  const { createPost } = useCommunityMutations();

  // Canal da trilha só para quem tem algum curso pago dela.
  const channels = [
    { id: 'aquecimento', label: 'Aquecimento' },
    ...(library.data?.tracks ?? [])
      .filter((t) => library.data!.courses.some((c) => c.trackId === t.id && !c.isFree && library.data!.access.has(c.id)))
      .map((t) => ({ id: t.id, label: `Turma ${t.title}` })),
  ];

  return (
    <Screen refreshing={posts.isRefetching} onRefresh={posts.refetch}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Comunidade</Txt>
        <Txt variant="hero">Ninguém evolui sozinho</Txt>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {channels.map((c) => (
          <Chip key={c.id} label={c.label} selected={channel === c.id} onPress={() => setChannel(c.id)} />
        ))}
      </ScrollView>

      <Composer
        label="Compartilhe com a turma"
        placeholder="Uma conquista, uma dúvida, um agradecimento…"
        busy={createPost.isPending}
        onSend={(body) => createPost.mutateAsync({ channel, body })}
      />

      {posts.isPending ? (
        <Loading />
      ) : posts.error ? (
        <ErrorState error={posts.error} onRetry={posts.refetch} />
      ) : posts.data?.length ? (
        <View style={{ gap: space.md }}>
          {posts.data.map((p) => <PostItem key={p.id} post={p} />)}
        </View>
      ) : (
        <Empty icon="message-circle" title="Ainda não há publicações aqui" text="Que tal ser a primeira pessoa a escrever?" />
      )}

      <Card tone="sand" style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Combinados da comunidade</Txt>
        <Txt variant="small">
          Acolha, não julgue. Não compartilhe dados de outras pessoas. A comunidade não substitui atendimento profissional:
          em sofrimento intenso, ligue 188 (CVV, 24 h, gratuito) ou procure um serviço de saúde.
        </Txt>
      </Card>
    </Screen>
  );
}
