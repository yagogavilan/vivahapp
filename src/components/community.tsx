import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useSession } from '../auth/session';
import { useCommunityMutations } from '../data/hooks';
import type { Comment, Post } from '../data/types';
import { formatShortDate, formatTime } from '../domain/dates';
import { confirm } from '../lib/dialogs';
import { colors, radius, space } from '../theme';
import { Button, Card, Field, Icon, Row, Txt } from './ui';

export function when(iso: string) {
  const diffMin = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffMin < 24 * 60) return `há ${Math.round(diffMin / 60)} h`;
  return `${formatShortDate(iso)}, ${formatTime(iso)}`;
}

function Avatar({ name }: { name: string }) {
  return (
    <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Txt variant="bodyStrong" style={{ color: colors.petrol }}>{name.charAt(0).toUpperCase()}</Txt>
    </View>
  );
}

export function PostItem({ post, link = true }: { post: Post; link?: boolean }) {
  const { user } = useSession();
  const { deletePost } = useCommunityMutations();
  const mine = post.authorId === user?.id;
  const open = () => router.push({ pathname: '/post/[id]', params: { id: post.id } });

  return (
    <Card onPress={link ? open : undefined} style={{ gap: space.md }}>
      <Row gap={space.md}>
        <Avatar name={post.authorName} />
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong">{post.authorName}</Txt>
          <Txt variant="small">{when(post.createdAt)}</Txt>
        </View>
        {mine ? (
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Apagar publicação"
            onPress={async () => {
              if (await confirm('Apagar publicação?', 'Ela some para todo mundo.', 'Apagar', true)) {
                deletePost.mutate(post.id, { onSuccess: () => !link && router.back() });
              }
            }}>
            <Icon name="trash-2" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </Row>
      <Txt style={{ color: colors.text }}>{post.body}</Txt>
      {link ? (
        <Row>
          <Icon name="message-circle" size={16} color={colors.textSubtle} />
          <Txt variant="small">{post.commentCount === 0 ? 'Comentar' : `${post.commentCount} ${post.commentCount === 1 ? 'comentário' : 'comentários'}`}</Txt>
        </Row>
      ) : null}
    </Card>
  );
}

export function CommentItem({ comment }: { comment: Comment }) {
  return (
    <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
      <Avatar name={comment.authorName} />
      <View style={{ flex: 1, gap: 2, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.border }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="bodyStrong">{comment.authorName}</Txt>
          <Txt variant="small">{when(comment.createdAt)}</Txt>
        </Row>
        <Txt style={{ color: colors.text }}>{comment.body}</Txt>
      </View>
    </Row>
  );
}

export function Composer({ placeholder, label, onSend, busy }: { placeholder: string; label: string; onSend: (text: string) => Promise<unknown>; busy: boolean }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: space.sm }}>
      <Field label={label} value={text} onChangeText={setText} placeholder={placeholder} multiline maxLength={2000} />
      <View style={{ alignSelf: 'flex-end' }}>
        <Button
          label="Publicar"
          icon="send"
          loading={busy}
          disabled={!text.trim()}
          onPress={async () => {
            setError(null);
            try {
              await onSend(text);
              setText('');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </View>
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
    </View>
  );
}
