import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '../auth/session';
import { colors, radius, space } from '../theme';
import { Button, Empty, Icon, type IconName, Row, Screen, Txt } from './ui';

/** Só o time Vivah (role admin no perfil) vê as páginas de admin. */
export function AdminGate({ children }: { children: ReactNode }) {
  const { profile } = useSession();
  if (profile?.role !== 'admin') {
    return (
      <Screen padTop={false}>
        <Empty icon="lock" title="Área do time Vivah" text="Esta página é só para quem administra o catálogo." />
      </Screen>
    );
  }
  return <>{children}</>;
}

/** Linha de uma lista ordenável: toque para editar, setas para mudar a ordem. */
export function AdminRow({ index, title, subtitle, icon, onPress, onUp, onDown, busy }: {
  index?: number;
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress: () => void;
  onUp?: () => void;
  onDown?: () => void;
  busy?: boolean;
}) {
  return (
    <View style={[styles.row, busy && { opacity: 0.6 }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Editar ${title}`} style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.7 : 1 }]}>
        {index != null ? (
          <View style={styles.index}><Txt variant="bodyStrong" style={{ fontSize: 13, color: colors.petrol }}>{index}</Txt></View>
        ) : icon ? (
          <View style={styles.index}><Icon name={icon} size={14} color={colors.petrol} /></View>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodyStrong" numberOfLines={2}>{title}</Txt>
          {subtitle ? <Txt variant="small" numberOfLines={2}>{subtitle}</Txt> : null}
        </View>
        <Icon name="edit-2" size={16} color={colors.textSubtle} />
      </Pressable>
      {onUp || onDown ? (
        <View style={styles.arrows}>
          <ArrowButton icon="chevron-up" label={`Subir ${title}`} onPress={onUp} />
          <ArrowButton icon="chevron-down" label={`Descer ${title}`} onPress={onDown} />
        </View>
      ) : null}
    </View>
  );
}

function ArrowButton({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.arrow, { opacity: !onPress ? 0.25 : pressed ? 0.6 : 1 }]}>
      <Icon name={icon} size={18} color={colors.petrol} />
    </Pressable>
  );
}

/** Excluir em dois toques (sem pop-up, que trava no navegador). */
export function ConfirmDelete({ label, warning, onConfirm, loading }: { label: string; warning: string; onConfirm: () => void; loading?: boolean }) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <Button label={label} icon="trash-2" variant="ghost" onPress={() => setArmed(true)} />;
  return (
    <View style={styles.confirm}>
      <Txt variant="small" style={{ color: colors.danger }}>{warning}</Txt>
      <Row>
        <Button label="Sim, excluir" variant="danger" icon="trash-2" loading={loading} onPress={onConfirm} style={{ flex: 1 }} />
        <Button label="Cancelar" variant="ghost" onPress={() => setArmed(false)} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}

export function AdminSection({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="title">{title}</Txt>
          {hint ? <Txt variant="small">{hint}</Txt> : null}
        </View>
        {action}
      </Row>
      {children}
    </View>
  );
}

export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.add, { opacity: pressed ? 0.7 : 1 }]}>
      <Icon name="plus" size={16} color={colors.petrol} />
      <Txt variant="bodyStrong" style={{ color: colors.petrol, fontSize: 14 }}>{label}</Txt>
    </Pressable>
  );
}

export const backTo = (href: Parameters<typeof router.replace>[0]) => (router.canGoBack() ? router.back() : router.replace(href));

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingLeft: space.md },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingRight: space.sm },
  index: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
  arrows: { borderLeftWidth: 1, borderLeftColor: colors.border, alignSelf: 'stretch', justifyContent: 'center' },
  arrow: { paddingHorizontal: space.md, paddingVertical: 6 },
  confirm: { gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.surface },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.petrol, borderStyle: 'dashed' },
});
