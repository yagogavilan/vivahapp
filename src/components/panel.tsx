import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { useSession } from '../auth/session';
import { useTrackEntries, useTrackEntryMutations } from '../data/hooks';
import { dayKey } from '../domain/dates';
import { type Insight, metricOf, type Panel, type Tile } from '../domain/panels';
import { tap } from '../lib/haptics';
import { colors, radius, space } from '../theme';
import { Icon, Row, Txt } from './ui';

const TONE = {
  ok: { bg: colors.mintSoft, fg: '#16614F', icon: 'check-circle' },
  aviso: { bg: '#FCEFC7', fg: '#8A5A00', icon: 'alert-circle' },
  alerta: { bg: colors.coralSoft, fg: colors.coralText, icon: 'alert-triangle' },
} as const;

/** Cartão de uma métrica: valor de hoje, progresso e um botão de registro rápido. */
export function TileCard({ tile, trackId, locked }: { tile: Tile; trackId: string; locked?: boolean }) {
  const def = metricOf(trackId, tile.metric);
  const { add } = useTrackEntryMutations();
  const store = def?.store ?? trackId;
  const open = () => router.push({ pathname: '/painel/[metric]', params: { metric: tile.metric, track: trackId } });
  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${tile.label}: ${tile.value}`}
      style={({ pressed }) => [styles.tile, tile.tone && { borderColor: TONE[tile.tone].fg + '55' }, { opacity: pressed ? 0.85 : 1 }]}>
      <Row gap={6}>
        {def ? <Icon name={def.icon} size={14} color={colors.coralText} /> : null}
        <Txt variant="small" style={{ flex: 1, fontSize: 13 }} numberOfLines={1}>{tile.label}</Txt>
      </Row>
      <Txt variant="title" style={{ fontSize: 22, lineHeight: 28 }} numberOfLines={1}>{locked ? '—' : tile.value}</Txt>
      {locked ? (
        <Txt variant="small" style={{ fontSize: 12, color: colors.coralText }}>Ative o acompanhamento de saúde</Txt>
      ) : tile.detail ? (
        <Txt variant="small" style={{ fontSize: 12, lineHeight: 16, color: tile.tone ? TONE[tile.tone].fg : colors.textMuted }} numberOfLines={2}>{tile.detail}</Txt>
      ) : null}
      {!locked && tile.progress != null ? (
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(3, tile.progress)}%`, backgroundColor: tile.tone === 'ok' ? colors.mint : colors.coral }]} /></View>
      ) : null}
      {!locked && tile.quick ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            tap();
            add.mutate({ trackId: store, metric: tile.metric, delta: tile.quick!.delta });
          }}
          accessibilityRole="button"
          accessibilityLabel={`${tile.quick.label} em ${tile.label}`}
          hitSlop={6}
          style={({ pressed }) => [styles.quick, { opacity: pressed || add.isPending ? 0.6 : 1 }]}>
          <Icon name="plus" size={13} color={colors.petrol} />
          <Txt variant="bodyStrong" style={{ fontSize: 13, color: colors.petrol }}>{tile.quick.label.replace(/^\+\s*/, '')}</Txt>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function TileGrid({ tiles, trackId }: { tiles: Tile[]; trackId: string }) {
  const { profile } = useSession();
  return (
    <View style={styles.grid}>
      {tiles.map((t, i) => {
        const def = metricOf(trackId, t.metric);
        return <TileCard key={`${t.metric}-${i}`} tile={t} trackId={trackId} locked={Boolean(def?.health && !profile?.healthConsentAt)} />;
      })}
    </View>
  );
}

/** Painel no Hoje: os números do dia da trilha e o atalho para o painel completo. */
export function PanelSummary({ panel }: { panel: Panel }) {
  const entries = useTrackEntries(panel.trackId);
  const today = dayKey(new Date());
  const tiles = panel.tiles({ today, entries: entries.data ?? [] });
  return (
    <View style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>{panel.title}</Txt>
          <Txt variant="small" numberOfLines={1}>Toque para registrar</Txt>
        </View>
        <Pressable onPress={() => router.push({ pathname: '/painel', params: { track: panel.trackId } })} accessibilityRole="button" hitSlop={8}>
          <Row gap={2}>
            <Txt variant="bodyStrong" style={{ color: colors.coralText, fontSize: 14 }}>Painel completo</Txt>
            <Icon name="chevron-right" size={16} color={colors.coralText} />
          </Row>
        </Pressable>
      </Row>
      <TileGrid tiles={tiles} trackId={panel.trackId} />
    </View>
  );
}

export function InsightList({ insights }: { insights: Insight[] }) {
  if (!insights.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      {insights.map((i, k) => (
        <View key={k} style={[styles.insight, { backgroundColor: TONE[i.level].bg }]}>
          <Icon name={TONE[i.level].icon} size={16} color={TONE[i.level].fg} />
          <Txt variant="small" style={{ flex: 1, color: colors.text }}>{i.text}</Txt>
        </View>
      ))}
    </View>
  );
}

/** Barras por dia (o dia de hoje em coral) com a linha da meta, se houver. */
export function Bars({ series, goal, height = 88, lowerIsBetter }: { series: { day: string; value: number | null }[]; goal?: number | null; height?: number; lowerIsBetter?: boolean }) {
  const max = Math.max(goal ?? 0, ...series.map((s) => s.value ?? 0), 1);
  const today = series.at(-1)?.day;
  return (
    <View style={{ gap: 4 }}>
      <View style={[styles.bars, { height }]}>
        {goal ? <View style={[styles.goal, { bottom: (goal / max) * height }]} /> : null}
        {series.map((s) => {
          const reached = goal ? (lowerIsBetter ? (s.value ?? 0) <= goal : (s.value ?? 0) >= goal) : false;
          return (
            <View key={s.day} style={styles.barCol}>
              <View style={{ height: s.value ? Math.max(4, (s.value / max) * height) : 3, borderRadius: 3,
                backgroundColor: !s.value ? colors.sand : s.day === today ? colors.coral : reached ? colors.mint : colors.petrolSoft }} />
            </View>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="small" style={{ fontSize: 11 }}>{series[0]?.day.slice(8, 10)}/{series[0]?.day.slice(5, 7)}</Txt>
        <Txt variant="small" style={{ fontSize: 11 }}>hoje</Txt>
      </Row>
    </View>
  );
}

/** Linha da evolução (peso, cintura, eficiência do sono…), só com os dias registrados. */
export function TrendLine({ points, height = 110, unit }: { points: { day: string; value: number }[]; height?: number; unit?: string }) {
  if (points.length < 2) {
    return <Txt variant="small">{points.length ? 'Registre mais um dia para ver a linha da evolução.' : 'Sem registros ainda.'}</Txt>;
  }
  const W = 300;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const pad = 8;
  const xy = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * (W - pad * 2),
    y: pad + (1 - (p.value - min) / span) * (height - pad * 2),
  }));
  const fmtv = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return (
    <View style={{ gap: 4 }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        <Line x1={pad} x2={W - pad} y1={height - pad} y2={height - pad} stroke={colors.border} strokeWidth={1} />
        <Polyline points={xy.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.petrol} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {xy.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={i === xy.length - 1 ? 4.5 : 3} fill={i === xy.length - 1 ? colors.coral : colors.petrol} />)}
      </Svg>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="small" style={{ fontSize: 11 }}>{points[0].day.slice(8, 10)}/{points[0].day.slice(5, 7)} · {fmtv(points[0].value)}{unit ? ` ${unit}` : ''}</Txt>
        <Txt variant="small" style={{ fontSize: 11 }}>mín {fmtv(min)} · máx {fmtv(max)}</Txt>
        <Txt variant="small" style={{ fontSize: 11 }}>{fmtv(points.at(-1)!.value)}{unit ? ` ${unit}` : ''}</Txt>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { flexGrow: 1, flexBasis: 150, minWidth: 140, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: 4 },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.sand, overflow: 'hidden', marginTop: 2 },
  fill: { height: 5, borderRadius: 3 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.petrol },
  insight: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, position: 'relative' },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  goal: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.coralText, opacity: 0.6 },
});
