/**
 * Lembretes locais (no próprio celular, sem servidor de push):
 * - lembrete diário do Escudo Anticrise no horário que o aluno escolher;
 * - lembrete 15 minutos antes de cada live salva na agenda.
 * Na web não há lembrete: as funções viram no-op.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const REMINDERS_SUPPORTED = Platform.OS !== 'web';

const DAILY_ID = 'vivah-escudo-diario';
const CHANNEL = 'lembretes';

if (REMINDERS_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let channelReady = false;
async function ensureChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Lembretes',
    importance: 5 as Notifications.AndroidImportance, // DEFAULT
  });
  channelReady = true;
}

/** Pede permissão se ainda não pediu. Retorna se pode notificar. */
export async function ensurePermission(): Promise<boolean> {
  if (!REMINDERS_SUPPORTED) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Agenda (ou reagenda) o lembrete diário. `time` = "07:30"; null desliga. */
export async function setDailyReminder(time: string | null): Promise<boolean> {
  if (!REMINDERS_SUPPORTED) return false;
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined);
  if (!time) return true;
  if (!(await ensurePermission())) return false;
  await ensureChannel();
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: {
      title: 'Seu Escudo Anticrise de hoje',
      body: 'Cinco minutos para começar o dia com a mente mais leve.',
      data: { url: '/' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
  return true;
}

const liveId = (id: string) => `vivah-live-${id}`;

/** Lembrete 15 min antes da live (se ainda der tempo). */
export async function scheduleLiveReminder(live: { id: string; title: string; startsAt: string }): Promise<void> {
  if (!REMINDERS_SUPPORTED) return;
  const at = Date.parse(live.startsAt) - 15 * 60_000;
  if (at <= Date.now() + 60_000) return;
  if (!(await ensurePermission())) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: liveId(live.id),
    content: {
      title: 'A live começa em 15 minutos',
      body: live.title,
      data: { url: `/live/${live.id}` },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
  });
}

export async function cancelLiveReminder(id: string): Promise<void> {
  if (!REMINDERS_SUPPORTED) return;
  await Notifications.cancelScheduledNotificationAsync(liveId(id)).catch(() => undefined);
}

/** Aviso no fim de um bloco de foco, mesmo com o app em segundo plano. */
export async function scheduleFocusEnd(endsAt: number): Promise<string | null> {
  if (!REMINDERS_SUPPORTED || !(await ensurePermission())) return null;
  await ensureChannel();
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Bloco de foco concluído', body: 'Respire, alongue e volte quando quiser.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endsAt, channelId: CHANNEL },
  });
}

export async function cancelById(id: string | null): Promise<void> {
  if (REMINDERS_SUPPORTED && id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
