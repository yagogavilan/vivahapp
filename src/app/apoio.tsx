import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Field, Loading, Row, Screen, Txt } from '@/components/ui';
import { usePost, useSupportMutations } from '@/data/hooks';
import { addDays, dayKey, formatDayLabel, spDateTime } from '@/domain/dates';
import { programFor } from '@/domain/programs';
import { success, tap } from '@/lib/haptics';
import { colors, fonts, radius, space } from '@/theme';

const TIMES = ['07:00', '08:00', '12:00', '13:00', '18:00', '19:00', '20:00', '21:00'];

/** Oferecer o apoio da trilha: marcar um horário ou montar algo para a pessoa. */
export default function Apoio() {
  const { post: postId, track = 'aquecimento' } = useLocalSearchParams<{ post: string; track?: string }>();
  const post = usePost(postId);
  const spec = programFor(track).community.apoio;
  const { offer } = useSupportMutations();
  const today = dayKey(new Date());
  const [day, setDay] = useState(addDays(today, 1));
  const [time, setTime] = useState('19:00');
  const [items, setItems] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (post.isPending) return <Loading />;
  const lines = items.split('\n').map((l) => l.trim()).filter(Boolean);
  const ready = spec.mode === 'agenda' ? Boolean(day && time) : lines.length >= 2;

  return (
    <Screen padTop={false}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Apoio · +5 pontos quando confirmado</Txt>
        <Txt variant="hero">{spec.label}</Txt>
        <Txt>{spec.hint}</Txt>
      </View>
      {post.data ? (
        <Card tone="sand" style={{ gap: 4 }}>
          <Txt variant="bodyStrong">{post.data.authorName} pediu:</Txt>
          <Txt variant="small" numberOfLines={4}>{post.data.body}</Txt>
        </Card>
      ) : null}

      {spec.mode === 'agenda' ? (
        <View style={{ gap: space.md }}>
          <Txt variant="bodyStrong">Dia</Txt>
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => (
              <Pick key={d} label={formatDayLabel(d, today)} on={day === d} onPress={() => setDay(d)} />
            ))}
          </Row>
          <Txt variant="bodyStrong">Horário (30 minutos)</Txt>
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            {TIMES.map((t) => <Pick key={t} label={t} on={time === t} onPress={() => setTime(t)} />)}
          </Row>
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <Txt variant="bodyStrong">{spec.itemsLabel}</Txt>
          <TextInput
            style={styles.area}
            value={items}
            onChangeText={setItems}
            placeholder={spec.placeholder}
            placeholderTextColor={colors.textSubtle}
            multiline
          />
          <Txt variant="small">{lines.length} {lines.length === 1 ? 'item' : 'itens'} · de 2 a 12</Txt>
        </View>
      )}
      <Field label="Recado para a pessoa (opcional)" value={message} onChangeText={setMessage} placeholder="Uma palavra de incentivo" multiline maxLength={1000} />
      {spec.disclaimer ? <Txt variant="small" style={{ fontStyle: 'italic' }}>{spec.disclaimer}</Txt> : null}
      <Button
        label="Oferecer apoio"
        icon="send"
        disabled={!ready}
        loading={offer.isPending}
        onPress={async () => {
          setError(null);
          try {
            await offer.mutateAsync({
              postId,
              mode: spec.mode,
              message,
              items: spec.mode === 'plano' ? lines : [],
              scheduledAt: spec.mode === 'agenda' ? spDateTime(day, time) : null,
            });
            success();
            router.back();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
    </Screen>
  );
}

function Pick({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[styles.pick, on && { backgroundColor: colors.petrol, borderColor: colors.petrol }]}>
      <Txt variant="bodyStrong" style={{ color: on ? colors.onDark : colors.text, fontSize: 14 }}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: { minHeight: 140, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, padding: space.md, fontFamily: fonts.body, fontSize: 16, color: colors.text, textAlignVertical: 'top' },
  pick: { borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, paddingVertical: 8, paddingHorizontal: space.md },
});
