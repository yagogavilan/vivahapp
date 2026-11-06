import { Pressable, StyleSheet, View } from 'react-native';

import { tap } from '../lib/haptics';
import { colors, radius, space } from '../theme';
import { Icon, type IconName, Txt } from './ui';

export const MOODS: { value: number; label: string; icon: IconName; color: string }[] = [
  { value: 1, label: 'Muito mal', icon: 'frown', color: '#E57B5F' },
  { value: 2, label: 'Mal', icon: 'frown', color: '#F0A35E' },
  { value: 3, label: 'Ok', icon: 'meh', color: '#E9CF7A' },
  { value: 4, label: 'Bem', icon: 'smile', color: '#9BD5B9' },
  { value: 5, label: 'Ótimo', icon: 'smile', color: '#45C2A4' },
];

/** Humor em um toque: cinco carinhas coloridas. */
export function MoodPicker({ onPick, dark }: { onPick: (mood: number) => void; dark?: boolean }) {
  return (
    <View style={styles.row}>
      {MOODS.map((m) => (
        <Pressable key={m.value} onPress={() => { tap(); onPick(m.value); }} accessibilityRole="button" accessibilityLabel={`Estou ${m.label.toLowerCase()}`}
          style={({ pressed }) => [styles.item, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
          <View style={[styles.face, { backgroundColor: m.color }]}>
            <Icon name={m.icon} size={26} color={colors.deep} />
          </View>
          <Txt variant="small" style={{ fontSize: 12, color: dark ? colors.onDarkMuted : colors.textMuted }}>{m.label}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.xs },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  face: { width: 50, height: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
