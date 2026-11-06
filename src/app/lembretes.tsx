import { type ReactNode, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { useSession } from '@/auth/session';
import { usePushPermission } from '@/components/inbox';
import { Button, Chip, Icon, type IconName, Row, Screen, Txt } from '@/components/ui';
import { useAgenda, useLibrary, useLives, usePushSettings, useSavePushSettings, useUpdateProfile } from '@/data/hooks';
import type { Preferences, PushSettings } from '@/data/types';
import { CATEGORY_INFO, DEFAULT_PUSH_SETTINGS } from '@/domain/notifications';
import { notify } from '@/lib/dialogs';
import { tap } from '@/lib/haptics';
import { enablePush, PUSH_SUPPORTED } from '@/lib/push';
import { cancelLiveReminder, REMINDERS_SUPPORTED, scheduleLiveReminder, setDailyReminder } from '@/lib/reminders';
import { colors, radius, space } from '@/theme';

const TIMES = ['06:30', '07:00', '07:30', '08:00', '12:30', '20:00', '21:30'];

/** Notificações: o que chega por push, de quais trilhas, e os lembretes do celular. */
export default function Notificacoes() {
  return (
    <Screen padTop={false}>
      <Txt variant="hero">Notificações</Txt>
      <PushSection />
      <RemindersSection />
    </Screen>
  );
}

function PushSection() {
  const settings = usePushSettings();
  const save = useSavePushSettings();
  const library = useLibrary();
  const [perm, recheck] = usePushPermission();
  const [asking, setAsking] = useState(false);
  const s: PushSettings = settings.data ?? DEFAULT_PUSH_SETTINGS;
  const set = (patch: Partial<PushSettings>) => save.mutate({ ...s, ...patch });
  const tracks = library.data?.tracks ?? [];

  return (
    <View style={{ gap: space.md }}>
      <Txt variant="title">Avisos da Vivah</Txt>

      {/* Estado do celular: sem permissão, nada chega, mesmo com tudo ligado aqui. */}
      {!PUSH_SUPPORTED ? (
        <Banner icon="smartphone" text="No app do celular, os avisos chegam como notificação. Aqui na web, eles ficam no sino." />
      ) : perm === 'denied' ? (
        <Banner icon="bell-off" text="As notificações da Vivah estão desligadas no celular.">
          <Button label="Abrir ajustes do celular" variant="secondary" onPress={() => Linking.openSettings()} />
        </Banner>
      ) : perm === 'undetermined' ? (
        <Banner icon="bell" text="Ative para receber os avisos no celular.">
          <Button
            label="Ativar notificações"
            icon="bell"
            loading={asking}
            onPress={async () => {
              setAsking(true);
              try {
                await enablePush();
              } finally {
                setAsking(false);
                recheck();
              }
            }}
          />
        </Banner>
      ) : null}

      <View style={styles.group}>
        <SwitchRow
          icon="bell"
          title="Receber notificações"
          value={s.pushEnabled}
          onChange={(v) => set({ pushEnabled: v })}
          strong
        />
        {(['newLessons', 'announcements', 'launches'] as const).map((k) => (
          <SwitchRow
            key={k}
            icon={CATEGORY_INFO[k].icon}
            title={CATEGORY_INFO[k].title}
            hint={CATEGORY_INFO[k].hint}
            value={s.pushEnabled && s[k]}
            disabled={!s.pushEnabled}
            onChange={(v) => set({ [k]: v })}
          />
        ))}
      </View>

      {s.pushEnabled && tracks.length ? (
        <View style={{ gap: space.sm }}>
          <Txt variant="bodyStrong">Receber das trilhas</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {tracks.map((t) => {
              const on = !s.mutedTracks.includes(t.id);
              return (
                <Chip
                  key={t.id}
                  label={t.title}
                  selected={on}
                  onPress={() => set({ mutedTracks: on ? [...s.mutedTracks, t.id] : s.mutedTracks.filter((x) => x !== t.id) })}
                />
              );
            })}
          </View>
        </View>
      ) : null}
      {save.error ? <Txt variant="small" style={{ color: colors.danger }}>Não salvou. Confira a internet e tente de novo.</Txt> : null}
    </View>
  );
}

function RemindersSection() {
  const { profile } = useSession();
  const update = useUpdateProfile();
  const agenda = useAgenda();
  const lives = useLives();
  const prefs: Preferences = { showStreak: true, liveReminders: true, dailyReminder: null, ...profile?.preferences };
  const [busy, setBusy] = useState(false);

  async function save(patch: Partial<Preferences>) {
    setBusy(true);
    try {
      const next = { ...prefs, ...patch };
      if ('dailyReminder' in patch) {
        const ok = await setDailyReminder(next.dailyReminder ?? null);
        if (!ok && next.dailyReminder && REMINDERS_SUPPORTED) {
          notify('Notificações desligadas', 'Libere as notificações da Vivah nos ajustes do celular para receber o lembrete.');
          return;
        }
      }
      if ('liveReminders' in patch) {
        const saved = (agenda.data ?? []).filter((e) => e.liveId);
        for (const e of saved) {
          const live = lives.data?.find((l) => l.id === e.liveId);
          if (!live) continue;
          if (next.liveReminders) await scheduleLiveReminder(live);
          else await cancelLiveReminder(live.id);
        }
      }
      await update.mutateAsync({ preferences: next });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <Txt variant="title">Lembretes</Txt>
      <View style={styles.group}>
        <SwitchRow
          icon="sun"
          title="Escudo Anticrise do dia"
          hint={REMINDERS_SUPPORTED ? 'Um lembrete por dia, no horário que você escolher.' : 'Só no app do celular.'}
          value={Boolean(prefs.dailyReminder)}
          disabled={!REMINDERS_SUPPORTED || busy}
          onChange={(on) => save({ dailyReminder: on ? '07:30' : null })}
        />
        {prefs.dailyReminder ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md }}>
            {TIMES.map((t) => <Chip key={t} label={t} selected={prefs.dailyReminder === t} onPress={() => save({ dailyReminder: t })} />)}
          </View>
        ) : null}
        <SwitchRow
          icon="video"
          title="15 minutos antes das lives"
          hint={REMINDERS_SUPPORTED ? 'Das lives que você salvar na agenda.' : 'Só no app do celular.'}
          value={prefs.liveReminders !== false}
          disabled={!REMINDERS_SUPPORTED || busy}
          onChange={(on) => save({ liveReminders: on })}
        />
        <SwitchRow
          icon="zap"
          title="Mostrar a sequência de dias"
          hint="Se a contagem te pressiona, pode esconder."
          value={prefs.showStreak !== false}
          disabled={busy}
          onChange={(on) => save({ showStreak: on })}
        />
      </View>
    </View>
  );
}

function Banner({ icon, text, children }: { icon: IconName; text: string; children?: ReactNode }) {
  return (
    <View style={styles.banner}>
      <Row gap={space.md}>
        <Icon name={icon} size={20} color={colors.coralText} />
        <Txt variant="bodyStrong" style={{ flex: 1 }}>{text}</Txt>
      </Row>
      {children}
    </View>
  );
}

/** Linha com ícone, texto e interruptor. A linha toda é tocável. */
function SwitchRow({ icon, title, hint, value, disabled, onChange, strong }: {
  icon: IconName;
  title: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  strong?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        tap();
        onChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={title}
      style={[styles.row, { opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.rowIcon, strong && { backgroundColor: colors.petrol }]}>
        <Icon name={icon} size={18} color={strong ? colors.onDark : colors.petrol} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodyStrong">{title}</Txt>
        {hint ? <Txt variant="small">{hint}</Txt> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: colors.mint, false: colors.border }}
        thumbColor={colors.surface}
        accessibilityLabel={title}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: colors.sand },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' },
  banner: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.coralSoft },
});
