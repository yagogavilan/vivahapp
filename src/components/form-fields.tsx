import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { LogValues } from '../data/types';
import type { Check, Field } from '../domain/programs';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, space } from '../theme';
import { Icon, Row, Txt } from './ui';

/** Campo do plano ou do fechamento do dia. */
export function FieldInput({ field, value, onChange, planValues }: {
  field: Field;
  value: LogValues[string];
  onChange: (v: LogValues[string]) => void;
  planValues?: LogValues;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ gap: 2 }}>
        <Txt variant="bodyStrong">{field.label}{field.optional ? <Txt variant="small"> (opcional)</Txt> : null}</Txt>
        {field.hint ? <Txt variant="small">{field.hint}</Txt> : null}
      </View>
      <Control field={field} value={value} onChange={onChange} planValues={planValues} />
    </View>
  );
}

function Control({ field, value, onChange, planValues }: Parameters<typeof FieldInput>[0]) {
  switch (field.type) {
    case 'text':
      return <TextInput style={styles.input} value={typeof value === 'string' ? value : ''} onChangeText={onChange} placeholder={field.placeholder} placeholderTextColor={colors.textSubtle} maxLength={300} />;
    case 'time':
      return (
        <TextInput
          style={[styles.input, { width: 120 }]}
          value={typeof value === 'string' ? value : ''}
          onChangeText={(t) => onChange(formatTime(t))}
          placeholder={field.placeholder ?? '00:00'}
          placeholderTextColor={colors.textSubtle}
          keyboardType="number-pad"
          maxLength={5}
        />
      );
    case 'number':
      return (
        <Row gap={space.sm}>
          {field.unit === 'R$' ? <Txt variant="bodyStrong">R$</Txt> : null}
          <TextInput
            style={[styles.input, { width: 140 }]}
            value={value === undefined || value === '' ? '' : String(value)}
            onChangeText={(t) => {
              const clean = t.replace(/[^\d.,]/g, '');
              if (clean === '') return onChange(undefined);
              const n = Number(clean.replace(',', '.'));
              onChange(Number.isNaN(n) ? undefined : Math.min(n, field.max ?? n));
            }}
            placeholder="0"
            placeholderTextColor={colors.textSubtle}
            keyboardType="decimal-pad"
          />
          {field.unit && field.unit !== 'R$' ? <Txt variant="small">{field.unit}</Txt> : null}
        </Row>
      );
    case 'yesno':
      return (
        <Row gap={space.sm}>
          {[['Sim', true], ['Não', false]].map(([label, v]) => (
            <Pick key={String(label)} label={String(label)} on={value === v} onPress={() => onChange(v as boolean)} />
          ))}
        </Row>
      );
    case 'choice':
      return (
        <View style={styles.wrap}>
          {field.options?.map((o) => <Pick key={o} label={o} on={value === o} onPress={() => onChange(o)} />)}
        </View>
      );
    case 'multi': {
      const sel = Array.isArray(value) ? (value as string[]) : [];
      return (
        <View style={styles.wrap}>
          {field.options?.map((o) => (
            <Pick key={o} label={o} on={sel.includes(o)} onPress={() => onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o])} />
          ))}
        </View>
      );
    }
    case 'scale5':
      return (
        <Row gap={space.sm}>
          {[1, 2, 3, 4, 5].map((n) => <Pick key={n} label={String(n)} on={value === n} onPress={() => onChange(n)} round />)}
        </Row>
      );
    case 'scale10':
      return (
        <View style={styles.wrap}>
          {Array.from({ length: 11 }, (_, n) => <Pick key={n} label={String(n)} on={value === n} onPress={() => onChange(n)} round />)}
        </View>
      );
    case 'list': {
      const items = Array.isArray(value) ? (value as string[]) : [];
      const max = field.max ?? 3;
      const rows = Math.min(max, Math.max(1, items.filter((x) => x.trim()).length + 1));
      return (
        <View style={{ gap: space.sm }}>
          {Array.from({ length: rows }, (_, i) => (
            <Row key={i} gap={space.sm}>
              <Txt variant="bodyStrong" style={{ width: 18 }}>{i + 1}.</Txt>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={items[i] ?? ''}
                onChangeText={(t) => {
                  const next = [...items];
                  next[i] = t;
                  onChange(next);
                }}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSubtle}
                maxLength={160}
              />
            </Row>
          ))}
        </View>
      );
    }
    case 'checklist': {
      const options = (Array.isArray(planValues?.[field.from ?? '']) ? (planValues![field.from!] as string[]) : []).filter((x) => x.trim());
      const sel = Array.isArray(value) ? (value as number[]) : [];
      if (!options.length) return <Txt variant="small">Sem plano hoje: faça a programação do dia amanhã para medir isso.</Txt>;
      return (
        <View style={{ gap: space.sm }}>
          {options.map((o, i) => (
            <Pressable key={o} onPress={() => { tap(); onChange(sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]); }}
              accessibilityRole="checkbox" accessibilityState={{ checked: sel.includes(i) }} style={[styles.check, sel.includes(i) && styles.checkOn]}>
              <Icon name={sel.includes(i) ? 'check-square' : 'square'} size={20} color={sel.includes(i) ? colors.onDark : colors.textSubtle} />
              <Txt variant="bodyStrong" style={{ flex: 1, color: sel.includes(i) ? colors.onDark : colors.text }}>{o}</Txt>
            </Pressable>
          ))}
        </View>
      );
    }
  }
}

function Pick({ label, on, onPress, round }: { label: string; on: boolean; onPress: () => void; round?: boolean }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={[round ? styles.round : styles.pick, on && styles.pickOn]}>
      <Txt variant="bodyStrong" style={{ color: on ? colors.onDark : colors.text, fontSize: 15 }}>{label}</Txt>
    </Pressable>
  );
}

/** "0930" → "09:30" enquanto a pessoa digita. */
function formatTime(t: string) {
  const d = t.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** Lista da validação: o que está ok, o que vale ajustar e o que impede salvar. */
export function ValidationList({ checks }: { checks: Check[] }) {
  return (
    <View style={{ gap: space.sm }}>
      {checks.map((c) => (
        <Row key={c.text} gap={space.sm} style={{ alignItems: 'flex-start' }}>
          <Icon
            name={c.level === 'ok' ? 'check-circle' : c.level === 'aviso' ? 'alert-circle' : 'x-circle'}
            size={18}
            color={c.level === 'ok' ? '#16614F' : c.level === 'aviso' ? '#B07A12' : colors.danger}
          />
          <Txt variant="small" style={{ flex: 1, color: colors.text }}>{c.text}</Txt>
        </Row>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pick: { borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, paddingVertical: 10, paddingHorizontal: space.lg },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pickOn: { backgroundColor: colors.petrol, borderColor: colors.petrol },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: space.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  checkOn: { backgroundColor: colors.petrol, borderColor: colors.petrol },
});
