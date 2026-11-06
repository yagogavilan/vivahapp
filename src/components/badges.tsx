import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import type { TrackBadge } from '../domain/badges';
import { levelInfo, TEAM_LEVEL } from '../domain/kindness';
import { colors, space } from '../theme';
import { Icon, type IconName, Txt } from './ui';

/** Selo de aulas: um arco por curso, preenchido conforme as aulas concluídas. */
export function LessonBadge({ badge, icon, size = 88, muted }: { badge: TrackBadge; icon: IconName; size?: number; muted?: boolean }) {
  const stroke = size * 0.11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const n = Math.max(1, badge.pieces.length);
  const gapDeg = n > 1 ? Math.min(14, 120 / n) : 0;
  const segDeg = 360 / n - gapDeg;
  const fill = badge.complete ? '#F2C14E' : colors.coral;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel={`Selo de aulas: ${badge.piecesComplete} de ${badge.pieces.length} cursos completos`}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {badge.pieces.map((p, i) => {
          const start = -90 + i * (360 / n) + gapDeg / 2;
          const segLen = (c * segDeg) / 360;
          return (
            <G key={p.courseId}>
              <Circle cx={size / 2} cy={size / 2} r={r} stroke={muted ? '#E3DCCD' : colors.sand} strokeWidth={stroke} fill="none"
                strokeDasharray={`${segLen} ${c}`} strokeLinecap="butt" transform={`rotate(${start} ${size / 2} ${size / 2})`} />
              {p.fraction > 0 ? (
                <Circle cx={size / 2} cy={size / 2} r={r} stroke={fill} strokeWidth={stroke} fill="none"
                  strokeDasharray={`${Math.max(1, segLen * p.fraction)} ${c}`} strokeLinecap="butt" transform={`rotate(${start} ${size / 2} ${size / 2})`} />
              ) : null}
            </G>
          );
        })}
      </Svg>
      <View style={{ width: size * 0.56, height: size * 0.56, borderRadius: size, alignItems: 'center', justifyContent: 'center',
        backgroundColor: badge.complete ? colors.deep : muted ? colors.sand : colors.petrol }}>
        <Icon name={badge.complete ? 'award' : icon} size={size * 0.24} color={badge.complete ? '#F2C14E' : muted ? colors.textSubtle : colors.onDark} />
      </View>
    </View>
  );
}

/** Selo de bondade do nível na trilha. */
export function KindnessSeal({ level, size = 88 }: { level: number; size?: number }) {
  const team = level === TEAM_LEVEL;
  const l = levelInfo(team ? 8 : level);
  const seed = level <= 1;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
      backgroundColor: seed ? colors.sand : l.color, borderWidth: size * 0.06, borderColor: seed ? '#E3DCCD' : 'rgba(255,255,255,0.6)' }}
      accessibilityLabel={`Selo de bondade: ${l.name}`}>
      <Icon name={level >= 6 ? 'star' : seed ? 'feather' : 'heart'} size={size * 0.34} color={seed ? colors.textSubtle : l.textColor} />
    </View>
  );
}

export function SealCaption({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2, marginTop: space.xs }}>
      <Txt variant="bodyStrong" style={{ fontSize: 13, textAlign: 'center' }}>{title}</Txt>
      <Txt variant="small" style={{ fontSize: 12, textAlign: 'center' }}>{sub}</Txt>
    </View>
  );
}
