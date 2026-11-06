import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { EmergencyCard } from '@/components/care';
import { CommentItem, Composer, PostCard } from '@/components/community';
import { SupportSection } from '@/components/support';
import { TrackContextBar } from '@/components/space';
import { programFor } from '@/domain/programs';
import { Empty, Loading, Screen, Txt } from '@/components/ui';
import { useComments, useCommunityMutations, usePost } from '@/data/hooks';
import { colors, space } from '@/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);
  const comments = useComments(id);
  const { createComment } = useCommunityMutations();

  if (post.isPending) return <Loading />;
  if (!post.data) return <Screen padTop={false}><Empty icon="message-circle" title="Publicação não encontrada" /></Screen>;
  const p = post.data;

  return (
    <Screen padTop={false} refreshing={comments.isRefetching} onRefresh={() => { post.refetch(); comments.refetch(); }}>
      <TrackContextBar trackId={p.channel} />
      <PostCard post={p} link={false} />
      <SupportSection post={p} />
      {p.kind === 'apoio' ? <EmergencyCard compact /> : null}
      <View style={{ gap: space.md }}>
        <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>
          {comments.data?.length ? `${comments.data.length} ${comments.data.length === 1 ? 'resposta' : 'respostas'}` : 'Ainda sem respostas'}
        </Txt>
        {(comments.data ?? []).map((c) => <CommentItem key={c.id} comment={c} postAuthorId={p.authorId} />)}
      </View>
      <Composer
        label={`${programFor(p.channel).community.ajuda} · +3 pontos se validada`}
        placeholder="Conte o que funcionou para você, ou só diga que está junto…"
        cta="Responder"
        busy={createComment.isPending}
        onSend={(body) => createComment.mutateAsync({ postId: id, body })}
      />
    </Screen>
  );
}
