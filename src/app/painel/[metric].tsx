import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { FieldInput } from '@/components/form-fields';
import { Bars, TileGrid, TrendLine } from '@/components/panel';
import { TrackContextBar } from '@/components/space';
import { Button, Card, Empty, ErrorState, Icon, Row, Screen, Txt } from '@/components/ui';
import { ScreenSkeleton } from '@/components/visual';
import { useTrackEntries, useTrackEntryMutations } from '@/data/hooks';
import type { LogValues } from '@/data/types';
import { addDays, dayKey, formatDayLabel } from '@/domain/dates';
import {
  counterGoal,
  counterOn,
  dailySeries,
  describeEntry,
  type Entry,
  fmt,
  gad7Band,
  type MetricDef,
  metricOf,
  missingFields,
  ofMetric,
  panelFor,
  valueFor,
} from '@/domain/panels';
import { tap } from '@/lib/haptics';
import { colors, radius, space } from '@/theme';

const newKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Um registro do painel: contador, registro do dia, lista, dados de base ou questionário. */
export default function MetricaDoPainel() {
  const { track = '', metric = '' } = useLocalSearchParams<{ track?: string; metric?: string }>();
  const panel = panelFor(track);
  const def = metricOf(track, metric);
  const entries = useTrackEntries(track);
  const { profile } = useSession();

  if (!panel || !def) return <Screen padTop={false}><Empty icon="grid" title="Registro não encontrado" /></Screen>;
  if (entries.isPending) return <ScreenSkeleton />;
  if (entries.error) return <ErrorState error={entries.error} onRetry={entries.refetch} />;
  const today = dayKey(new Date());
  const store = def.store ?? track;
  const all = entries.data ?? [];
  const mine = ofMetric(all, def.id, store);
  const ctx = { today, entries: all };
  const tiles = panel.tiles(ctx).filter((t) => t.metric === def.id);
  const locked = def.health && !profile?.healthConsentAt;

  return (
    <Screen padTop={false} refreshing={entries.isRefetching} onRefresh={entries.refetch}>
      <TrackContextBar trackId={track} />
      <View style={{ gap: 4 }}>
        <Pressable onPress={() => router.push({ pathname: '/painel', params: { track } })}>
          <Txt variant="eyebrow">{panel.title}</Txt>
        </Pressable>
        <Row gap={space.sm}>
          <Icon name={def.icon} size={24} color={colors.coralText} />
          <Txt variant="hero" style={{ flex: 1 }}>{def.title}</Txt>
        </Row>
        <Txt variant="small">{def.about}</Txt>
        {def.source ? <Txt variant="small" style={{ fontSize: 12, color: colors.textSubtle }}>Referência: {def.source}</Txt> : null}
      </View>

      {locked ? (
        <Card tone="sand" style={{ gap: space.md }}>
          <Row gap={6}><Icon name="lock" size={16} color={colors.petrol} /><Txt variant="bodyStrong">Dado de saúde</Txt></Row>
          <Txt variant="small">Para guardar {def.title.toLowerCase()}, ative o acompanhamento de saúde. É o seu consentimento pela LGPD: você pode retirar quando quiser e os registros são apagados.</Txt>
          <Button label="Ativar em Privacidade" icon="shield" onPress={() => router.push('/privacidade')} />
        </Card>
      ) : (
        <>
          {tiles.length ? <TileGrid tiles={tiles} trackId={track} /> : null}
          {def.kind === 'counter' ? <CounterView def={def} track={track} store={store} entries={all} today={today} /> : null}
          {def.kind === 'daily' ? <DailyView key={`d-${mine.find((e) => e.day === today)?.id ?? 'novo'}`} def={def} store={store} mine={mine} today={today} /> : null}
          {def.kind === 'log' ? <LogView def={def} store={store} mine={mine} today={today} /> : null}
          {def.kind === 'item' ? <ItemView def={def} store={store} mine={mine} /> : null}
          {def.kind === 'profile' ? <ProfileView key={`p-${mine[0]?.id ?? 'novo'}`} def={def} store={store} mine={mine} /> : null}
          {def.kind === 'assessment' ? <AssessmentView def={def} store={store} mine={mine} today={today} /> : null}
        </>
      )}
    </Screen>
  );
}

// ——— contador ———

function CounterView({ def, track, store, entries, today }: { def: MetricDef; track: string; store: string; entries: Entry[]; today: string }) {
  const { add } = useTrackEntryMutations();
  const [last, setLast] = useState<number | null>(null);
  const value = counterOn(entries, def.id, today, store);
  const goal = counterGoal(track, def.id, entries, today);
  const series = dailySeries(entries, def.id, today, 14, store);
  const press = (delta: number) => {
    tap();
    setLast(delta);
    add.mutate({ trackId: store, metric: def.id, delta });
  };
  return (
    <Card style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Txt variant="small">Hoje</Txt>
          <Txt variant="hero">{def.id === 'agua' ? `${fmt(value)} ml` : `${fmt(value)}${def.unit ? ` ${def.unit}` : ''}`}</Txt>
        </View>
        {goal ? <Txt variant="small">meta {def.id === 'agua' ? `${fmt(goal)} ml` : `${fmt(goal)}${def.unit ? ` ${def.unit}` : ''}`}</Txt> : null}
      </Row>
      <View style={styles.quickRow}>
        {def.quick?.map((q) => (
          <Pressable key={q.label} onPress={() => press(q.delta)} accessibilityRole="button" style={({ pressed }) => [styles.quickBig, { opacity: pressed ? 0.7 : 1 }]}>
            <Txt variant="bodyStrong" style={{ color: colors.onDark }}>{q.label}</Txt>
          </Pressable>
        ))}
      </View>
      {last !== null && value > 0 ? (
        <Pressable onPress={() => { press(-last); setLast(null); }} accessibilityRole="button">
          <Txt variant="small" style={{ textDecorationLine: 'underline' }}>Desfazer o último ({last > 0 ? '+' : ''}{fmt(last)})</Txt>
        </Pressable>
      ) : null}
      <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Últimos 14 dias</Txt>
      <Bars series={series} goal={goal} lowerIsBetter={def.lowerIsBetter} />
    </Card>
  );
}

// ——— formulário genérico ———

function EntryForm({ def, initial, submitLabel, onSubmit, busy, error, onCancel }: {
  def: MetricDef;
  initial?: LogValues;
  submitLabel: string;
  onSubmit: (data: LogValues) => void;
  busy?: boolean;
  error?: string | null;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<LogValues>(initial ?? {});
  const missing = missingFields(def, values);
  const [tried, setTried] = useState(false);
  return (
    <View style={{ gap: space.lg }}>
      {def.fields?.map((f) => (
        <FieldInput key={f.id} field={f} value={values[f.id]} onChange={(v) => setValues((s) => ({ ...s, [f.id]: v }))} />
      ))}
      {tried && missing.length ? <Txt variant="small" style={{ color: colors.coralText }}>Falta preencher: {missing.join(', ')}.</Txt> : null}
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
      <Row>
        <Button label={submitLabel} icon="check" loading={busy} onPress={() => { setTried(true); if (!missing.length) onSubmit(values); }} style={{ flex: 1 }} />
        {onCancel ? <Button label="Cancelar" variant="ghost" onPress={onCancel} /> : null}
      </Row>
    </View>
  );
}

function HistoryList({ def, items, onEdit }: { def: MetricDef; items: Entry[]; onEdit?: (e: Entry) => void }) {
  const { remove } = useTrackEntryMutations();
  const today = dayKey(new Date());
  if (!items.length) return null;
  return (
    <Card style={{ gap: 0, paddingVertical: space.xs }}>
      {items.map((e, i) => (
        <View key={e.id} style={[styles.hist, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <Pressable style={{ flex: 1, gap: 2 }} disabled={!onEdit} onPress={() => onEdit?.(e)} accessibilityRole={onEdit ? 'button' : undefined}>
            <Txt variant="small" style={{ fontSize: 12 }}>{formatDayLabel(e.day, today)}</Txt>
            <Txt variant="bodyStrong" style={{ fontSize: 15 }}>{describeEntry(def, e) || '—'}</Txt>
          </Pressable>
          <Pressable onPress={() => remove.mutate(e.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Apagar registro">
            <Icon name="trash-2" size={16} color={colors.textSubtle} />
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

// ——— um registro por dia (peso, medidas, sono, reserva) ———

function DailyView({ def, store, mine, today }: { def: MetricDef; store: string; mine: Entry[]; today: string }) {
  const { save } = useTrackEntryMutations();
  const todays = mine.find((e) => e.day === today);
  const [done, setDone] = useState(false);
  const points = mine.filter((e) => e.value != null && e.day >= addDays(today, -90)).sort((a, b) => a.day.localeCompare(b.day)).map((e) => ({ day: e.day, value: e.value! }));
  return (
    <>
      <Card style={{ gap: space.md }}>
        <Txt variant="title">{todays ? 'Registro de hoje' : 'Registrar hoje'}</Txt>
        <EntryForm
          def={def}
          initial={todays?.data as LogValues | undefined}
          submitLabel={done ? 'Salvo' : todays ? 'Atualizar' : 'Salvar'}
          busy={save.isPending}
          error={save.error?.message}
          onSubmit={(data) => save.mutate({ id: todays?.id, trackId: store, metric: def.id, value: valueFor(def, data), data }, { onSuccess: () => setDone(true) })}
        />
      </Card>
      <Card style={{ gap: space.md }}>
        <Txt variant="title">Evolução</Txt>
        <TrendLine points={points} unit={def.unit} />
      </Card>
      <HistoryList def={def} items={[...mine].sort((a, b) => b.day.localeCompare(a.day)).slice(0, 20)} />
    </>
  );
}

// ——— vários registros (treinos, refeições, gastos, conquistas…) ———

function LogView({ def, store, mine, today }: { def: MetricDef; store: string; mine: Entry[]; today: string }) {
  const { save } = useTrackEntryMutations();
  const [open, setOpen] = useState(!mine.some((e) => e.day === today));
  const [formKey, setFormKey] = useState(0);
  const recent = [...mine].sort((a, b) => (a.day === b.day ? b.createdAt.localeCompare(a.createdAt) : b.day.localeCompare(a.day))).slice(0, 40);
  const series = dailySeries(mine, def.id, today, 14, undefined, def.valueField ? 'sum' : 'count');
  return (
    <>
      <Card style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="title">Novo registro</Txt>
          {!open ? <Button label="Adicionar" icon="plus" variant="ghost" onPress={() => setOpen(true)} /> : null}
        </Row>
        {open ? (
          <EntryForm
            key={formKey}
            def={def}
            submitLabel="Salvar"
            busy={save.isPending}
            error={save.error?.message}
            onCancel={() => setOpen(false)}
            onSubmit={(data) =>
              save.mutate(
                { trackId: store, metric: def.id, key: newKey(), value: valueFor(def, data), data },
                { onSuccess: () => { setFormKey((k) => k + 1); setOpen(false); } },
              )
            }
          />
        ) : null}
      </Card>
      {mine.length ? (
        <Card style={{ gap: space.sm }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>{def.valueField ? `${def.unit === 'R$' ? 'Valor' : 'Total'} por dia · 14 dias` : 'Registros por dia · 14 dias'}</Txt>
          <Bars series={series} />
        </Card>
      ) : null}
      <HistoryList def={def} items={recent} />
    </>
  );
}

// ——— listas que se editam (dívidas, metas) ———

function ItemView({ def, store, mine }: { def: MetricDef; store: string; mine: Entry[] }) {
  const { save } = useTrackEntryMutations();
  const [editing, setEditing] = useState<Entry | 'novo' | null>(mine.length ? null : 'novo');
  return (
    <>
      {editing ? (
        <Card style={{ gap: space.md }}>
          <Txt variant="title">{editing === 'novo' ? 'Adicionar' : 'Editar'}</Txt>
          <EntryForm
            key={editing === 'novo' ? 'novo' : editing.id}
            def={def}
            initial={editing === 'novo' ? undefined : (editing.data as LogValues)}
            submitLabel="Salvar"
            busy={save.isPending}
            error={save.error?.message}
            onCancel={mine.length ? () => setEditing(null) : undefined}
            onSubmit={(data) =>
              save.mutate(
                { id: editing === 'novo' ? undefined : editing.id, trackId: store, metric: def.id, key: editing === 'novo' ? newKey() : undefined, value: valueFor(def, data), data },
                { onSuccess: () => setEditing(null) },
              )
            }
          />
        </Card>
      ) : (
        <Button label="Adicionar" icon="plus" variant="ghost" onPress={() => setEditing('novo')} />
      )}
      <HistoryList def={def} items={mine} onEdit={(e) => setEditing(e)} />
      {mine.length ? <Txt variant="small" style={{ color: colors.textSubtle }}>Toque num item para atualizar.</Txt> : null}
    </>
  );
}

// ——— dados de base (altura, renda…) ———

function ProfileView({ def, store, mine }: { def: MetricDef; store: string; mine: Entry[] }) {
  const { save } = useTrackEntryMutations();
  const current = mine[0];
  const [done, setDone] = useState(false);
  return (
    <Card style={{ gap: space.md }}>
      <EntryForm
        def={def}
        initial={current?.data as LogValues | undefined}
        submitLabel={done ? 'Salvo' : 'Salvar'}
        busy={save.isPending}
        error={save.error?.message}
        onSubmit={(data) => save.mutate({ id: current?.id, trackId: store, metric: def.id, key: 'perfil', value: null, data }, { onSuccess: () => setDone(true) })}
      />
    </Card>
  );
}

// ——— questionário (GAD-7, revisão semanal, habilidades) ———

function AssessmentView({ def, store, mine, today }: { def: MetricDef; store: string; mine: Entry[]; today: string }) {
  const { save } = useTrackEntryMutations();
  const sorted = [...mine].sort((a, b) => a.day.localeCompare(b.day));
  const last = sorted.at(-1);
  const [answering, setAnswering] = useState(!last || last.day <= addDays(today, -7));
  const points = sorted.filter((e) => e.value != null).map((e) => ({ day: e.day, value: e.value! }));
  const band = def.id === 'gad7' && last?.value != null ? gad7Band(last.value) : null;
  return (
    <>
      {last && !answering ? (
        <Card tone={band?.tone === 'alerta' ? 'sand' : 'light'} style={{ gap: space.sm }}>
          <Txt variant="small">Último resultado · {formatDayLabel(last.day, today)}</Txt>
          <Txt variant="hero">{describeEntry(def, last)}</Txt>
          {band ? <Txt>{band.advice}</Txt> : null}
          {band && band.tone === 'alerta' ? (
            <Txt variant="small">Em crise ou com pensamentos de se machucar: ligue 188 (CVV, gratuito, 24 horas).</Txt>
          ) : null}
          <Button label={last.day === today ? 'Refazer hoje' : 'Responder de novo'} icon="refresh-cw" variant="ghost" onPress={() => setAnswering(true)} />
        </Card>
      ) : (
        <Card style={{ gap: space.md }}>
          <EntryForm
            def={def}
            initial={def.id === 'habilidades' && last ? (last.data as LogValues) : undefined}
            submitLabel="Ver meu resultado"
            busy={save.isPending}
            error={save.error?.message}
            onCancel={last ? () => setAnswering(false) : undefined}
            onSubmit={(data) =>
              save.mutate({ trackId: store, metric: def.id, value: valueFor(def, data), data }, { onSuccess: () => setAnswering(false) })
            }
          />
        </Card>
      )}
      {points.length ? (
        <Card style={{ gap: space.md }}>
          <Txt variant="title">Evolução</Txt>
          <TrendLine points={points} />
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  quickBig: { flexGrow: 1, alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: colors.petrol },
  hist: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});
