import { useState } from 'react';
import { Switch, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Card, Chip, Row, Screen, Txt } from '@/components/ui';
import { useAgenda, useLives, useUpdateProfile } from '@/data/hooks';
import type { Preferences } from '@/data/types';
import { notify } from '@/lib/dialogs';
import { cancelLiveReminder, REMINDERS_SUPPORTED, scheduleLiveReminder, setDailyReminder } from '@/lib/reminders';
import { colors, space } from '@/theme';

const TIMES = ['06:30', '07:00', '07:30', '08:00', '12:30', '20:00', '21:30'];

export default function Lembretes() {
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
          notify('Notificações desativadas', 'Libere as notificações da Vivah nos ajustes do celular para receber o lembrete.');
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
    <Screen padTop={false}>
      <Txt variant="eyebrow">Ajustes</Txt>
      <Txt variant="hero">Lembretes e sequência</Txt>

      {!REMINDERS_SUPPORTED ? (
        <Card tone="sand">
          <Txt variant="small">Os lembretes funcionam no app de celular. Na versão web, você ajusta só a exibição da sequência.</Txt>
        </Card>
      ) : null}

      <Card style={{ gap: space.md, opacity: REMINDERS_SUPPORTED ? 1 : 0.6 }}>
        <Row gap={space.md}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="heading">Lembrete do Escudo Anticrise</Txt>
            <Txt variant="small">Um aviso por dia, no horário que você escolher.</Txt>
          </View>
          <Switch
            value={Boolean(prefs.dailyReminder)}
            disabled={!REMINDERS_SUPPORTED || busy}
            onValueChange={(on) => save({ dailyReminder: on ? '07:30' : null })}
            trackColor={{ true: colors.mint, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel="Lembrete diário do Escudo Anticrise"
          />
        </Row>
        {prefs.dailyReminder ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {TIMES.map((t) => (
              <Chip key={t} label={t} selected={prefs.dailyReminder === t} onPress={() => save({ dailyReminder: t })} />
            ))}
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: space.md, opacity: REMINDERS_SUPPORTED ? 1 : 0.6 }}>
        <Row gap={space.md}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="heading">Aviso antes das lives</Txt>
            <Txt variant="small">15 minutos antes de cada live que você salvar na agenda.</Txt>
          </View>
          <Switch
            value={prefs.liveReminders !== false}
            disabled={!REMINDERS_SUPPORTED || busy}
            onValueChange={(on) => save({ liveReminders: on })}
            trackColor={{ true: colors.mint, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel="Aviso antes das lives"
          />
        </Row>
      </Card>

      <Card style={{ gap: space.md }}>
        <Row gap={space.md}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="heading">Mostrar a sequência de dias</Txt>
            <Txt variant="small">Se a contagem te pressiona, pode esconder. Suas conquistas continuam em Perfil.</Txt>
          </View>
          <Switch
            value={prefs.showStreak !== false}
            disabled={busy}
            onValueChange={(on) => save({ showStreak: on })}
            trackColor={{ true: colors.mint, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel="Mostrar a sequência de dias"
          />
        </Row>
      </Card>
    </Screen>
  );
}
