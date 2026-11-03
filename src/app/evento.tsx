import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Chip, Field, Screen, Txt } from '@/components/ui';
import { useAgendaMutations } from '@/data/hooks';
import type { AgendaKind } from '@/data/types';
import { addDays, dayKey, formatDayLabel, spDateTime } from '@/domain/dates';
import { AGENDA_KIND } from '@/lib/agenda-kinds';
import { colors, space } from '@/theme';

const KINDS: AgendaKind[] = ['foco', 'treino', 'refeicao', 'aula', 'pessoal'];
const DURATIONS = [15, 30, 45, 60, 90, 120];

/** Novo compromisso na agenda do app. */
export default function NovoEvento() {
  const { create } = useAgendaMutations();
  const today = dayKey(new Date());
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<AgendaKind>('foco');
  const [day, setDay] = useState(today);
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  async function save() {
    setError(null);
    const startsAt = spDateTime(day, time);
    const endsAt = new Date(Date.parse(startsAt) + duration * 60_000).toISOString();
    try {
      await create.mutateAsync({ title: title.trim() || AGENDA_KIND[kind].label, kind, startsAt, endsAt, liveId: null, notes: notes.trim() || null });
      router.back();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen padTop={false}>
      <Txt variant="hero">Novo compromisso</Txt>
      <View style={{ gap: space.sm }}>
        <Txt variant="bodyStrong">Tipo</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {KINDS.map((k) => <Chip key={k} label={AGENDA_KIND[k].label} selected={kind === k} onPress={() => setKind(k)} />)}
        </View>
      </View>
      <Field label="Título" value={title} onChangeText={setTitle} placeholder={`Ex.: ${AGENDA_KIND[kind].label}`} maxLength={120} />
      <View style={{ gap: space.sm }}>
        <Txt variant="bodyStrong">Dia</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {days.map((d) => <Chip key={d} label={formatDayLabel(d, today)} selected={day === d} onPress={() => setDay(d)} />)}
        </ScrollView>
      </View>
      <Field
        label="Horário"
        value={time}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, 4);
          setTime(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
        }}
        placeholder="09:00"
        keyboardType="number-pad"
        maxLength={5}
        hint={validTime ? 'Horário de Brasília.' : 'Use o formato 09:00.'}
      />
      <View style={{ gap: space.sm }}>
        <Txt variant="bodyStrong">Duração</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {DURATIONS.map((m) => <Chip key={m} label={m < 60 ? `${m} min` : `${m / 60} h`} selected={duration === m} onPress={() => setDuration(m)} />)}
        </View>
      </View>
      <Field label="Anotações (opcional)" value={notes} onChangeText={setNotes} multiline maxLength={1000} />
      <Button label="Salvar na agenda" icon="check" onPress={save} loading={create.isPending} disabled={!validTime} />
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
    </Screen>
  );
}
