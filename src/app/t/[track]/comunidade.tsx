import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Avatar, CommunityRules, PostCard } from '@/components/community';
import { LevelBadge } from '@/components/feeling';
import { SpaceHeader } from '@/components/space';
import { Empty, ErrorState, Icon, Row, Screen, Txt } from '@/components/ui';
import { FadeIn, ScreenSkeleton } from '@/components/visual';
import { useKindness, usePosts, useTodayCheckin } from '@/data/hooks';
import type { Feeling, Post } from '@/data/types';
import { FEELING_ORDER, FEELINGS } from '@/domain/checkin-protocol';
import { progressToNext } from '@/domain/kindness';
import { tap } from '@/lib/haptics';
import { useSpace } from '@/lib/space-context';
import { colors, radius, shadow, space } from '@/theme';

type Filter = 'todos' | 'apoio' | 'semresposta' | 'conquista' | 'dica';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Tudo' },
  { id: 'apoio', label: 'Pedem apoio' },
  { id: 'semresposta', label: 'Sem resposta' },
  { id: 'conquista', label: 'Conquistas' },
  { id: 'dica', label: 'Dicas' },
];

function applyFilter(posts: Post[], filter: Filter, feeling: Feeling | null) {
  return posts.filter((p) => {
    if (feeling && p.feeling !== feeling) return false;
    if (filter === 'apoio') return p.kind === 'apoio';
    if (filter === 'semresposta') return p.commentCount === 0;
    if (filter === 'conquista') return p.kind === 'conquista';
    if (filter === 'dica') return p.kind === 'dica';
    return true;
  });
}

function Pill({ label, on, onPress, color, text }: { label: string; on: boolean; onPress: () => void; color?: string; text?: string }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[styles.pill, on && { backgroundColor: color ?? colors.petrol, borderColor: text ?? colors.petrol }]}>
      <Txt variant="bodyStrong" style={{ fontSize: 14, color: on ? text ?? colors.onDark : colors.text }}>{label}</Txt>
    </Pressable>
  );
}

/** Feed da trilha, no jeito de rede social, com filtros por sentimento. */
export default function Comunidade() {
  const sp = useSpace();
  const { profile } = useSession();
  const posts = usePosts(sp.channel);
  const kindness = useKindness();
  const { feelingToday } = useTodayCheckin(sp.id);
  const [filter, setFilter] = useState<Filter>('todos');
  const [feeling, setFeeling] = useState<Feeling | null>(null);

  if (posts.isPending) return <ScreenSkeleton />;
  if (posts.error) return <ErrorState error={posts.error} onRetry={posts.refetch} />;

  const list = applyFilter(posts.data ?? [], filter, feeling);
  const k = kindness.data;
  const prog = k ? progressToNext(k.points, k.givers) : undefined;
  const name = profile?.fullName?.split(' ')[0] ?? 'Você';
  const feelings = feelingToday ? [feelingToday, ...FEELING_ORDER.filter((f) => f !== feelingToday)] : FEELING_ORDER;

  return (
    <Screen refreshing={posts.isRefetching} onRefresh={() => { posts.refetch(); kindness.refetch(); }}>
      <SpaceHeader space={sp} />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">Comunidade {sp.title}</Txt>
        <Txt variant="hero">Ninguém evolui sozinho</Txt>
      </View>

      {/* Bondade: nível, progresso e atalho para os conselheiros. */}
      <Row gap={space.sm} style={{ alignItems: 'stretch' }}>
        <Pressable onPress={() => router.push('/bondade')} accessibilityRole="button" style={[styles.kind, shadow]}>
          <Row style={{ justifyContent: 'space-between' }}>
            <LevelBadge level={k?.level ?? 1} showSeed />
            <Icon name="chevron-right" size={16} color={colors.textSubtle} />
          </Row>
          <Txt variant="bodyStrong" style={{ fontSize: 15 }}>{k ? `${k.points} pontos de bondade` : 'Pontos de bondade'}</Txt>
          {prog?.next ? (
            <>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(3, prog.ratio * 100)}%` }]} /></View>
              <Txt variant="small" style={{ fontSize: 12 }}>Próximo: {prog.next.name}</Txt>
            </>
          ) : null}
        </Pressable>
        <Pressable onPress={() => router.push('/conselheiros')} accessibilityRole="button" style={[styles.counsel]}>
          <Icon name="star" size={20} color="#F2C14E" />
          <Txt variant="bodyStrong" style={{ color: colors.onDark, fontSize: 15 }}>Conselheiros</Txt>
          <Txt variant="small" style={{ color: colors.onDarkMuted, fontSize: 12 }}>Converse com quem já passou por isso</Txt>
        </Pressable>
      </Row>

      <Pressable onPress={() => router.push({ pathname: '/publicar', params: { channel: sp.channel, track: sp.id } })} accessibilityRole="button"
        style={[styles.composer, shadow]}>
        <Avatar name={name} level={k?.level ?? 1} size={34} />
        <Txt style={{ flex: 1 }}>Como você está, {name}? Compartilhe…</Txt>
        <Icon name="edit-3" size={18} color={colors.coralText} />
      </Pressable>

      <View style={{ gap: space.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {FILTERS.map((f) => <Pill key={f.id} label={f.label} on={filter === f.id} onPress={() => setFilter(f.id)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, alignItems: 'center' }}>
          <Txt variant="small">Sentindo:</Txt>
          {feelings.map((f) => (
            <Pill
              key={f}
              label={f === feelingToday ? `${FEELINGS[f].label} (como você)` : FEELINGS[f].label}
              on={feeling === f}
              color={FEELINGS[f].color}
              text={FEELINGS[f].text}
              onPress={() => setFeeling(feeling === f ? null : f)}
            />
          ))}
        </ScrollView>
        {!feelingToday ? (
          <Pressable onPress={() => router.push({ pathname: '/checkin', params: { track: sp.id } })}>
            <Txt variant="small" style={{ textDecorationLine: 'underline' }}>Faça o check-in para encontrar quem sente o mesmo que você hoje.</Txt>
          </Pressable>
        ) : null}
      </View>

      {list.length === 0 ? (
        <Empty icon="message-circle" title="Nada por aqui ainda" text="Mude o filtro ou seja a primeira pessoa a publicar." />
      ) : (
        <View style={{ gap: space.md }}>
          {list.map((p, i) => (
            <FadeIn key={p.id} delay={Math.min(i, 5) * 40}>
              <PostCard post={p} />
            </FadeIn>
          ))}
        </View>
      )}
      <CommunityRules />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kind: { flex: 1, gap: 6, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md },
  bar: { height: 5, borderRadius: 3, backgroundColor: colors.sand, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3, backgroundColor: colors.coral },
  counsel: { flex: 1, gap: 4, backgroundColor: colors.deep, borderRadius: radius.lg, padding: space.md, justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingVertical: space.sm, paddingLeft: space.sm, paddingRight: space.lg },
  pill: { borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, paddingVertical: 6, paddingHorizontal: space.md },
});
