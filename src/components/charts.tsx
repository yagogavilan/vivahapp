import { View } from 'react-native';

import type { Checkin, LifeArea } from '../data/types';
import { AREA_LABEL } from '../data/catalog';
import { addDays, dayKey } from '../domain/dates';
import { attentionLabel, rankAreas } from '../domain/diagnostic';
import { colors, radius, space } from '../theme';
import { ProgressBar, Row, Txt } from './ui';

/** Barras de atenção por área do diagnóstico, da que mais precisa para a que menos precisa. */
export function DiagnosticBars({ scores }: { scores: Record<LifeArea, number> }) {
  return (
    <View style={{ gap: space.md }}>
      {rankAreas(scores).map((area) => (
        <View key={area} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="bodyStrong">{AREA_LABEL[area]}</Txt>
            <Txt variant="small">{attentionLabel(scores[area])}</Txt>
          </Row>
          <ProgressBar value={Math.max(4, scores[area])} color={scores[area] >= 67 ? colors.coral : scores[area] >= 34 ? colors.mint : colors.petrol} />
        </View>
      ))}
    </View>
  );
}

/** Humor (barra) e horas de sono (número) dos últimos 14 dias. */
export function CheckinStrip({ checkins, days = 14 }: { checkins: Checkin[]; days?: number }) {
  const today = dayKey(new Date());
  const series = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1)).map((d) => ({
    day: d,
    c: checkins.find((x) => x.day === d),
  }));
  const withData = checkins.filter((c) => series.some((s) => s.day === c.day));
  const avg = (f: (c: Checkin) => number) =>
    withData.length ? (withData.reduce((s, c) => s + f(c), 0) / withData.length).toFixed(1).replace('.', ',') : '—';

  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 }} accessibilityLabel={`Humor dos últimos ${days} dias`}>
        {series.map(({ day, c }) => (
          <View
            key={day}
            style={{
              flex: 1,
              height: c ? 12 + (c.mood / 5) * 68 : 6,
              backgroundColor: c ? (c.mood >= 4 ? colors.mint : c.mood === 3 ? colors.petrolSoft : colors.coral) : colors.sand,
              borderRadius: radius.sm / 2,
            }}
          />
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="small">Humor médio: {avg((c) => c.mood)}/5</Txt>
        <Txt variant="small">Sono médio: {avg((c) => c.sleepHours)} h</Txt>
        <Txt variant="small">{withData.length} de {days} dias</Txt>
      </Row>
    </View>
  );
}
