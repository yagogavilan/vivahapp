import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { EmergencyCard } from '@/components/care';
import { CommentItem, Composer, PostCard } from '@/components/community';
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
      <PostCard post={p} link={false} />
      {p.kind === 'apoio' ? <EmergencyCard compact /> : null}
      <View style={{ gap: space.md }}>
        <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>
          {comments.data?.length ? `${comments.data.length} ${comments.data.length === 1 ? 'resposta' : 'respostas'}` : 'Ainda sem respostas'}
        </Txt>
        {(comments.data ?? []).map((c) => <CommentItem key={c.id} comment={c} postAuthorId={p.authorId} />)}
      </View>
      <Composer
        label="Responder com acolhimento"
        placeholder="Conte o que funcionou para você, ou só diga que está junto…"
        cta="Responder"
        busy={createComment.isPending}
        onSend={(body) => createComment.mutateAsync({ postId: id, body })}
      />
    </Screen>
  );
}
