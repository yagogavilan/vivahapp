import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { CommentItem, Composer, PostItem } from '@/components/community';
import { Empty, Loading, Screen } from '@/components/ui';
import { useComments, useCommunityMutations, usePost } from '@/data/hooks';
import { space } from '@/theme';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);
  const comments = useComments(id);
  const { createComment } = useCommunityMutations();

  if (post.isPending) return <Loading />;
  if (!post.data) return <Screen padTop={false}><Empty icon="message-circle" title="Publicação não encontrada" /></Screen>;

  return (
    <Screen padTop={false} refreshing={comments.isRefetching} onRefresh={comments.refetch}>
      <PostItem post={post.data} link={false} />
      <View style={{ gap: space.md }}>
        {(comments.data ?? []).map((c) => <CommentItem key={c.id} comment={c} />)}
      </View>
      <Composer
        label="Responder"
        placeholder="Escreva um comentário gentil…"
        busy={createComment.isPending}
        onSend={(body) => createComment.mutateAsync({ postId: id, body })}
      />
    </Screen>
  );
}
