import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '../auth/session';
import { useMarkInboxRead, useUnreadCount, useUpdateProfile } from '../data/hooks';
import type { InboxItem } from '../data/types';
import { KIND_ICON, relativeTime } from '../domain/notifications';
import { tap } from '../lib/haptics';
import { enablePush, PUSH_SUPPORTED, pushPermission, type PushPermission } from '../lib/push';
import { colors, fonts, radius, space } from '../theme';
import { Button, Icon, Row, Txt } from './ui';

/** Sino com o número de avisos não lidos. */
export function BellButton({ onDark }: { onDark?: boolean }) {
  const unread = useUnreadCount();
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push('/avisos');
      }}
      accessibilityRole="button"
      accessibilityLabel={unread ? `Avisos: ${unread} não lidos` : 'Avisos'}
      hitSlop={6}
      style={({ pressed }) => [styles.bell, onDark && styles.bellDark, { opacity: pressed ? 0.8 : 1 }]}>
      <Icon name="bell" size={20} color={onDark ? colors.onDark : colors.petrol} />
      {unread ? (
        <View style={styles.badge}>
          <Txt style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Uma linha da caixa de avisos. */
export function InboxRow({ item }: { item: InboxItem }) {
  const markRead = useMarkInboxRead();
  const unread = !item.readAt;
  const opens = item.url && item.url !== '/avisos';
  return (
    <Pressable
      onPress={() => {
        tap();
        if (unread) markRead.mutate([item.id]);
        if (opens) router.push(item.url as never);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Não lido. ' : ''}${item.title}. ${item.body}`}
      style={({ pressed }) => [styles.row, unread && styles.rowUnread, { opacity: pressed ? 0.9 : 1 }]}>
      <View style={[styles.kind, unread && { backgroundColor: colors.petrol }]}>
        <Icon name={KIND_ICON[item.kind]} size={18} color={unread ? colors.onDark : colors.petrol} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Row gap={6} style={{ alignItems: 'flex-start' }}>
          <Txt variant="bodyStrong" style={{ flex: 1 }}>{item.title}</Txt>
          <Txt variant="small" style={{ fontSize: 12 }}>{relativeTime(item.sentAt)}</Txt>
        </Row>
        <Txt variant="small" style={{ color: colors.textMuted }}>{item.body}</Txt>
      </View>
      {opens ? <Icon name="chevron-right" size={18} color={colors.textSubtle} /> : null}
    </Pressable>
  );
}

/** Permissão de notificação do celular, atualizada quando o app volta para a frente (ex.: voltou dos ajustes). */
export function usePushPermission(): [PushPermission | null, () => void] {
  const [perm, setPerm] = useState<PushPermission | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    pushPermission().then((p) => alive && setPerm(p));
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') pushPermission().then((p) => alive && setPerm(p));
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [tick]);
  return [perm, () => setTick((t) => t + 1)];
}

/**
 * Convite para ativar as notificações, no Hoje. Só no celular, só se a pessoa
 * ainda não respondeu: o pedido do sistema aparece depois do "Ativar", nunca
 * de surpresa (a Apple só deixa pedir uma vez).
 */
export function PushInvite() {
  const { profile } = useSession();
  const update = useUpdateProfile();
  const [perm, recheck] = usePushPermission();
  const [busy, setBusy] = useState(false);
  if (!PUSH_SUPPORTED || perm !== 'undetermined' || profile?.preferences.pushPromptAt) return null;

  const answer = () => update.mutate({ preferences: { ...(profile?.preferences ?? {}), pushPromptAt: new Date().toISOString() } });

  return (
    <View style={styles.invite}>
      <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
        <View style={styles.inviteIcon}><Icon name="bell" size={20} color={colors.coralText} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="heading">Avisar quando sair aula nova?</Txt>
          <Txt variant="small">Você escolhe o que recebe e pode desligar em Perfil.</Txt>
        </View>
      </Row>
      <Row gap={space.sm}>
        <View style={{ flex: 1 }}>
          <Button
            label="Ativar"
            icon="bell"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              try {
                await enablePush();
                answer();
              } finally {
                setBusy(false);
                recheck();
              }
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Agora não" variant="ghost" onPress={answer} />
        </View>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 48,
    alignSelf: 'stretch',
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'transparent' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 10, lineHeight: 12, color: '#FFFFFF' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: { borderColor: colors.petrol },
  kind: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' },
  invite: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.coralSoft },
  inviteIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
