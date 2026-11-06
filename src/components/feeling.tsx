import { View } from 'react-native';

import type { Feeling } from '../data/types';
import { FEELINGS } from '../domain/checkin-protocol';
import { levelInfo, TEAM_LEVEL } from '../domain/kindness';
import { radius } from '../theme';
import { Icon, Txt } from './ui';

export function FeelingChip({ feeling, small }: { feeling: Feeling; small?: boolean }) {
  const f = FEELINGS[feeling];
  return (
    <View style={{ backgroundColor: f.color, borderRadius: radius.pill, paddingVertical: small ? 2 : 6, paddingHorizontal: small ? 8 : 12 }}>
      <Txt variant="bodyStrong" style={{ color: f.text, fontSize: small ? 12 : 14, lineHeight: small ? 18 : 20 }}>{f.label}</Txt>
    </View>
  );
}

/** Selo de bondade ao lado do nome. Semente não mostra selo (todo mundo começa assim). */
export function LevelBadge({ level, showSeed = false }: { level: number; showSeed?: boolean }) {
  if (level === TEAM_LEVEL) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#124F58', borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 }}>
        <Icon name="check-circle" size={11} color="#F6F2EA" />
        <Txt variant="bodyStrong" style={{ color: '#F6F2EA', fontSize: 11, lineHeight: 16 }}>Equipe Vivah</Txt>
      </View>
    );
  }
  if (level <= 1 && !showSeed) return null;
  const l = levelInfo(level);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: l.color, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 }}>
      <Icon name={level >= 6 ? 'star' : 'heart'} size={11} color={l.textColor} />
      <Txt variant="bodyStrong" style={{ color: l.textColor, fontSize: 11, lineHeight: 16 }}>{l.name}</Txt>
    </View>
  );
}
