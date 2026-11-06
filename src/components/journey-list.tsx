import { Pressable, StyleSheet, View } from 'react-native';

import type { Track } from '../data/types';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, space } from '../theme';
import { AREA_ICON } from './area-icons';
import { Icon, Row, Txt } from './ui';
import { FadeIn, TrackCover } from './visual';

export interface JourneyItemInfo {
  /** 0–100, só para quem assina. */
  percent?: number;
  subscribed?: boolean;
  lastVisit?: boolean;
}

/**
 * A jornada Vivah, do início ao fim, sempre na mesma ordem
 * (Respira → Ritmo → Move → Nutre → Prospera → Eleva). A trilha indicada
 * fica no lugar dela, com a etiqueta "Recomendada". Todas podem ser abertas.
 */
export function JourneyList({ tracks, recommendedId, info, onPick }: {
  tracks: Track[];
  recommendedId?: string | null;
  info?: Record<string, JourneyItemInfo>;
  onPick: (trackId: string) => void;
}) {
  const ordered = [...tracks].sort((a, b) => a.sort - b.sort);
  return (
    <View>
      {ordered.map((t, i) => {
        const rec = t.id === recommendedId;
        const it = info?.[t.id];
        const last = i === ordered.length - 1;
        return (
          <FadeIn key={t.id} delay={i * 50}>
            <View style={styles.row}>
              <View style={styles.rail}>
                <View style={[styles.dot, rec && styles.dotRec, it?.subscribed && styles.dotMine]}>
                  <Txt variant="bodyStrong" style={{ fontSize: 13, color: rec || it?.subscribed ? colors.deep : colors.textSubtle }}>{i + 1}</Txt>
                </View>
                {!last ? <View style={styles.line} /> : null}
              </View>
              <Pressable
                onPress={() => { tap(); onPick(t.id); }}
                accessibilityRole="button"
                accessibilityLabel={`Trilha ${i + 1}: ${t.title}${rec ? ', recomendada para você' : ''}`}
                style={({ pressed }) => [styles.card, rec && styles.cardRec, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
                <TrackCover area={t.area} style={styles.cover}>
                  <Icon name={AREA_ICON[t.area]} size={26} color={colors.coral} />
                </TrackCover>
                <View style={{ flex: 1, gap: 2, paddingVertical: space.sm }}>
                  <Row gap={6} style={{ flexWrap: 'wrap' }}>
                    <Txt variant="title" style={{ fontSize: 20, lineHeight: 26 }}>{t.title}</Txt>
                    {rec ? <View style={styles.tag}><Txt style={styles.tagText}>Recomendada</Txt></View> : null}
                    {it?.lastVisit && !rec ? <View style={[styles.tag, styles.tagSoft]}><Txt style={[styles.tagText, { color: colors.petrol }]}>Última visita</Txt></View> : null}
                  </Row>
                  <Txt variant="small" numberOfLines={1}>{t.areaLabel}</Txt>
                  {it?.subscribed ? (
                    <View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.max(4, it.percent ?? 0)}%` }]} /></View>
                  ) : null}
                </View>
                <Icon name={it?.subscribed ? 'chevron-right' : 'arrow-right'} size={20} color={rec ? colors.coralText : colors.textSubtle} />
              </Pressable>
            </View>
          </FadeIn>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  rail: { width: 30, alignItems: 'center' },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  dotRec: { backgroundColor: colors.coral },
  dotMine: { backgroundColor: colors.mint },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2, marginBottom: -22 },
  card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.sm, paddingRight: space.lg, marginBottom: space.sm },
  cardRec: { borderWidth: 2, borderColor: colors.coral },
  cover: { width: 64, height: 64, padding: 0, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tag: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  tagSoft: { backgroundColor: colors.mintSoft },
  tagText: { fontSize: 12, fontFamily: fonts.bodyHeavy, color: colors.deep },
  progress: { height: 5, borderRadius: 3, backgroundColor: colors.sand, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.mint },
});
