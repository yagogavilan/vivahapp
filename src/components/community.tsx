import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '../auth/session';
import { useCommunityMutations, useReact } from '../data/hooks';
import type { Comment, Post, PostKind, ReactionKind } from '../data/types';
import { formatShortDate, formatTime } from '../domain/dates';
import { levelInfo, TEAM_LEVEL } from '../domain/kindness';
import { programFor } from '../domain/programs';
import { confirm, notify } from '../lib/dialogs';
import { success, tap } from '../lib/haptics';
import { colors, radius, space } from '../theme';
import { FeelingChip, LevelBadge } from './feeling';
import { Button, Card, Field, Icon, Row, Txt } from './ui';

export function when(iso: string) {
  const diffMin = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffMin < 24 * 60) return `há ${Math.round(diffMin / 60)} h`;
  return `${formatShortDate(iso)}, ${formatTime(iso)}`;
}

export const KIND_INFO: Record<PostKind, { label: string; bg: string; fg: string }> = {
  apoio: { label: 'Pede apoio', bg: colors.coralSoft, fg: colors.coralText },
  desabafo: { label: 'Desabafo', bg: colors.sand, fg: colors.textMuted },
  conquista: { label: 'Conquista', bg: colors.mintSoft, fg: '#16614F' },
  dica: { label: 'Dica', bg: '#FCEFC7', fg: '#6B5212' },
};

export const EMOJI: Record<Exclude<ReactionKind, 'like'>, { emoji: string; label: string }> = {
  abraco: { emoji: '🤗', label: 'Abraço' },
  forca: { emoji: '💪', label: 'Força' },
  parabens: { emoji: '👏', label: 'Parabéns' },
  tocou: { emoji: '🥹', label: 'Me tocou' },
};

/** Avatar com o anel na cor do nível de bondade. */
export function Avatar({ name, level = 1, size = 40 }: { name: string; level?: number; size?: number }) {
  const ring = level === TEAM_LEVEL ? colors.petrol : level > 1 ? levelInfo(level).color : 'transparent';
  return (
    <View style={{ width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, borderWidth: 3, borderColor: ring, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Txt variant="bodyStrong" style={{ color: colors.petrol, fontSize: size * 0.4 }}>{name.charAt(0).toUpperCase()}</Txt>
      </View>
    </View>
  );
}

function ActionButton({ icon, label, active, onPress, color }: { icon: Parameters<typeof Icon>[0]['name']; label: string; active?: boolean; onPress: () => void; color?: string }) {
  const c = active ? color ?? colors.coralText : colors.textSubtle;
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }, active && { backgroundColor: colors.coralSoft }]}>
      <Icon name={icon} size={17} color={c} />
      <Txt variant="small" style={{ color: c, fontSize: 13 }}>{label}</Txt>
    </Pressable>
  );
}

/** Cartão do feed: autor com selo, tipo, sentimento, texto, reações e ações. */
export function PostCard({ post, link = true }: { post: Post; link?: boolean }) {
  const { user } = useSession();
  const { deletePost, thank, report } = useCommunityMutations();
  const react = useReact(post.channel);
  const [picker, setPicker] = useState(false);
  const mine = post.authorId === user?.id;
  const liked = post.myReactions.includes('like');
  const open = () => router.push({ pathname: '/post/[id]', params: { id: post.id } });
  const emojiCounts = (Object.keys(EMOJI) as (keyof typeof EMOJI)[]).filter((k) => (post.reactions[k] ?? 0) > 0);
  const kind = post.kind === 'dica' ? { ...KIND_INFO.dica, label: programFor(post.channel).community.dicaPost } : KIND_INFO[post.kind];

  const toggle = (k: ReactionKind) => {
    tap();
    react.mutate({ postId: post.id, kind: k, on: !post.myReactions.includes(k) });
  };

  const menu = async () => {
    if (mine) {
      if (await confirm('Apagar publicação?', 'Ela some para todo mundo.', 'Apagar', true)) {
        deletePost.mutate(post.id, { onSuccess: () => !link && router.back() });
      }
    } else if (await confirm('Denunciar publicação?', 'A equipe Vivah vai revisar. Quem escreveu não fica sabendo que foi você.', 'Denunciar', true)) {
      report.mutate({ type: 'post', id: post.id, reason: 'Denúncia pelo app' }, { onSuccess: () => notify('Obrigado por avisar', 'A equipe vai olhar com cuidado.') });
    }
  };

  return (
    <View style={styles.card}>
      <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
        <Avatar name={post.authorName} level={post.authorLevel} />
        <View style={{ flex: 1, gap: 2 }}>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            <Txt variant="bodyStrong">{post.authorName}</Txt>
            <LevelBadge level={post.authorLevel} />
          </Row>
          <Txt variant="small">{when(post.createdAt)}</Txt>
        </View>
        <Pressable hitSlop={10} onPress={menu} accessibilityRole="button" accessibilityLabel={mine ? 'Apagar publicação' : 'Denunciar publicação'}>
          <Icon name={mine ? 'trash-2' : 'more-horizontal'} size={18} color={colors.textSubtle} />
        </Pressable>
      </Row>

      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <View style={[styles.tag, { backgroundColor: kind.bg }]}>
          <Txt variant="bodyStrong" style={{ color: kind.fg, fontSize: 12, lineHeight: 18 }}>{kind.label}</Txt>
        </View>
        {post.feeling ? <FeelingChip feeling={post.feeling} small /> : null}
      </Row>

      <Pressable onPress={link ? open : undefined} disabled={!link}>
        <Txt style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{post.body}</Txt>
      </Pressable>

      {emojiCounts.length || post.thanksCount ? (
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {emojiCounts.map((k) => (
            <Pressable key={k} onPress={() => toggle(k)} accessibilityRole="button" accessibilityLabel={`${EMOJI[k].label}: ${post.reactions[k]}`}
              style={[styles.emojiCount, post.myReactions.includes(k) && { borderColor: colors.coral, backgroundColor: colors.coralSoft }]}>
              <Txt style={{ fontSize: 14 }}>{EMOJI[k].emoji}</Txt>
              <Txt variant="small" style={{ fontSize: 13 }}>{post.reactions[k]}</Txt>
            </Pressable>
          ))}
          {post.thanksCount ? <Txt variant="small" style={{ fontSize: 13 }}>· {post.thanksCount} {post.thanksCount === 1 ? 'pessoa agradeceu' : 'pessoas agradeceram'}</Txt> : null}
        </Row>
      ) : null}

      {post.kind === 'apoio' && post.commentCount === 0 && !mine ? (
        <Pressable onPress={open} style={styles.nudge}>
          <Icon name="message-circle" size={16} color={colors.coralText} />
          <Txt variant="small" style={{ color: colors.coralText, flex: 1 }}>Ninguém respondeu ainda. Que tal ser a primeira pessoa a acolher?</Txt>
        </Pressable>
      ) : null}

      {picker ? (
        <Row gap={space.sm} style={styles.picker}>
          {(Object.keys(EMOJI) as (keyof typeof EMOJI)[]).map((k) => (
            <Pressable key={k} onPress={() => { toggle(k); setPicker(false); }} accessibilityRole="button" accessibilityLabel={EMOJI[k].label}
              style={[styles.pickerItem, post.myReactions.includes(k) && { backgroundColor: colors.coralSoft }]}>
              <Txt style={{ fontSize: 24, lineHeight: 30 }}>{EMOJI[k].emoji}</Txt>
              <Txt variant="small" style={{ fontSize: 11 }}>{EMOJI[k].label}</Txt>
            </Pressable>
          ))}
        </Row>
      ) : null}

      <View style={styles.actions}>
        <ActionButton icon="heart" label={post.reactions.like ? String(post.reactions.like) : 'Curtir'} active={liked} onPress={() => toggle('like')} />
        <ActionButton icon="smile" label="Reagir" active={picker} onPress={() => { tap(); setPicker(!picker); }} />
        <ActionButton icon="message-circle" label={post.commentCount ? String(post.commentCount) : 'Comentar'} onPress={open} />
        {!mine ? (
          <ActionButton
            icon="gift"
            label={post.iThanked ? 'Agradecido' : 'Agradecer'}
            active={post.iThanked}
            onPress={() => {
              if (post.iThanked) return;
              thank.mutate(
                { type: 'post', id: post.id },
                {
                  onSuccess: () => {
                    success();
                    notify('Obrigado enviado', `${post.authorName} vai saber que ajudou você.`);
                  },
                  onError: (e) => notify('Não deu para agradecer', (e as Error).message),
                },
              );
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

/** Comentário com selo e o botão "Isso me ajudou" (vale mais quando vem de quem pediu ajuda). */
export function CommentItem({ comment, postAuthorId }: { comment: Comment; postAuthorId: string }) {
  const { user } = useSession();
  const { thank } = useCommunityMutations();
  const mine = comment.authorId === user?.id;
  const iAmAsker = postAuthorId === user?.id;
  return (
    <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
      <Avatar name={comment.authorName} level={comment.authorLevel} size={32} />
      <View style={styles.comment}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6} style={{ flexWrap: 'wrap', flex: 1 }}>
            <Txt variant="bodyStrong">{comment.authorName}</Txt>
            <LevelBadge level={comment.authorLevel} />
          </Row>
          <Txt variant="small">{when(comment.createdAt)}</Txt>
        </Row>
        <Txt style={{ color: colors.text }}>{comment.body}</Txt>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="small" style={{ fontSize: 13 }}>
            {comment.thanksCount ? `${comment.thanksCount} ${comment.thanksCount === 1 ? 'agradecimento' : 'agradecimentos'}` : ''}
          </Txt>
          {!mine ? (
            <Pressable
              disabled={comment.iThanked}
              onPress={() =>
                thank.mutate({ type: 'comment', id: comment.id }, {
                  onSuccess: () => success(),
                  onError: (e) => notify('Não deu para agradecer', (e as Error).message),
                })
              }
              accessibilityRole="button"
              style={[styles.thank, comment.iThanked && { backgroundColor: colors.coralSoft, borderColor: colors.coralSoft }]}>
              <Icon name="gift" size={14} color={colors.coralText} />
              <Txt variant="small" style={{ color: colors.coralText, fontSize: 13 }}>
                {comment.iThanked ? 'Agradecido' : iAmAsker ? 'Isso me ajudou' : 'Agradecer'}
              </Txt>
            </Pressable>
          ) : null}
        </Row>
      </View>
    </Row>
  );
}

export function Composer({ placeholder, label, onSend, busy, cta = 'Publicar' }: { placeholder: string; label: string; onSend: (text: string) => Promise<unknown>; busy: boolean; cta?: string }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: space.sm }}>
      <Field label={label} value={text} onChangeText={setText} placeholder={placeholder} multiline maxLength={2000} />
      <View style={{ alignSelf: 'flex-end' }}>
        <Button
          label={cta}
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

export function CommunityRules() {
  return (
    <Card tone="sand" style={{ gap: 4 }}>
      <Txt variant="bodyStrong">Combinados da comunidade</Txt>
      <Txt variant="small">
        Acolha sem julgar, compartilhe a sua experiência (não diagnósticos) e nunca peça contato fora do app. Em risco, ligue 188 (CVV).
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.md },
  tag: { borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  emojiCount: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 2, paddingHorizontal: 8 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.cream, borderRadius: radius.md, padding: space.md },
  picker: { backgroundColor: colors.cream, borderRadius: radius.md, padding: space.sm, justifyContent: 'space-around' },
  pickerItem: { alignItems: 'center', paddingVertical: 4, paddingHorizontal: space.sm, borderRadius: radius.md },
  actions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.sm, marginTop: -space.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: radius.pill },
  comment: { flex: 1, gap: 6, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.border },
  thank: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: 4, paddingHorizontal: 10 },
});
