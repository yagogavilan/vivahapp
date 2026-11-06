import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { InsightList, TileGrid } from '@/components/panel';
import { TrackContextBar } from '@/components/space';
import { Empty, ErrorState, Icon, Row, Screen, Txt } from '@/components/ui';
import { ScreenSkeleton } from '@/components/visual';
import { useTrackEntries } from '@/data/hooks';
import { dayKey } from '@/domain/dates';
import { panelFor } from '@/domain/panels';
import { colors, radius, space } from '@/theme';

const KIND_LABEL = { counter: 'Toque rápido', daily: 'Um por dia', log: 'Registros', item: 'Lista', profile: 'Seus dados', assessment: 'Questionário' } as const;

/** Painel completo da trilha: números de hoje, o que os registros mostram e cada registro. */
export default function PainelDaTrilha() {
  const { track = '' } = useLocalSearchParams<{ track?: string }>();
  const panel = panelFor(track);
  const entries = useTrackEntries(track);

  if (!panel) return <Screen padTop={false}><Empty icon="grid" title="Esta trilha não tem painel" /></Screen>;
  if (entries.isPending) return <ScreenSkeleton />;
  if (entries.error) return <ErrorState error={entries.error} onRetry={entries.refetch} />;
  const ctx = { today: dayKey(new Date()), entries: entries.data ?? [] };

  return (
    <Screen padTop={false} refreshing={entries.isRefetching} onRefresh={entries.refetch}>
      <TrackContextBar trackId={track} />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">{panel.title}</Txt>
        <Txt variant="hero">Seus números de hoje</Txt>
        <Txt variant="small">{panel.subtitle}</Txt>
      </View>
      <TileGrid tiles={panel.tiles(ctx)} trackId={track} />
      <View style={{ gap: space.sm }}>
        <Txt variant="title">O que os seus registros mostram</Txt>
        <InsightList insights={panel.insights(ctx)} />
      </View>
      <View style={{ gap: space.sm }}>
        <Txt variant="title">Registros</Txt>
        {panel.metrics.map((m) => (
          <Pressable key={m.id} onPress={() => router.push({ pathname: '/painel/[metric]', params: { metric: m.id, track } })} accessibilityRole="button"
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}>
            <View style={styles.icon}><Icon name={m.icon} size={18} color={colors.coralText} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Row gap={6}>
                <Txt variant="bodyStrong">{m.title}</Txt>
                {m.health ? <Icon name="lock" size={12} color={colors.textSubtle} /> : null}
              </Row>
              <Txt variant="small" numberOfLines={2}>{m.about}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Txt variant="small" style={{ fontSize: 11 }}>{KIND_LABEL[m.kind]}</Txt>
              <Icon name="chevron-right" size={18} color={colors.textSubtle} />
            </View>
          </Pressable>
        ))}
      </View>
      <Txt variant="small" style={{ color: colors.textSubtle }}>
        Os itens com cadeado são dados de saúde: só ficam guardados com o seu consentimento e somem se você o retirar em Privacidade. O painel orienta hábitos e não substitui médico, nutricionista, educador físico, psicólogo ou planejador financeiro.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
});
