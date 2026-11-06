/**
 * Push no celular: permissão, token da Expo e o que acontece ao tocar no aviso.
 *
 * - O token só é pedido depois que a pessoa aceita (nada de pedir permissão
 *   na primeira tela: o convite aparece no Hoje, com "Agora não").
 * - O token fica ligado à conta; ao sair, ele é desligado da conta.
 * - Tocar no aviso abre a tela certa e marca o aviso como lido, inclusive
 *   quando o app estava fechado.
 * - Na web não há push: os avisos ficam no sino.
 *
 * Precisa do projectId do EAS em app.json (extra.eas.projectId), criado com
 * `npx eas-cli@latest init`. Sem ele, o app funciona e só não registra o token.
 */
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api } from '../data';
import { setDemoPushPresenter } from '../data/demo-api';
import { ANDROID_CHANNEL } from '../../supabase/functions/_shared/push';
import './reminders'; // define como o aviso aparece com o app aberto

export const PUSH_SUPPORTED = Platform.OS !== 'web';

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

// Valores dos enums da expo-notifications (o lint não enxerga os enums reexportados).
const IOS_PROVISIONAL = 3 as Notifications.IosAuthorizationStatus; // IosAuthorizationStatus.PROVISIONAL
const ANDROID_DEFAULT = 5 as Notifications.AndroidImportance; // AndroidImportance.DEFAULT

let currentToken: string | null = null;
let lastHandledResponse: string | null = null;

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function pushPermission(): Promise<PushPermission> {
  if (!PUSH_SUPPORTED) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === IOS_PROVISIONAL) return 'granted';
  return p.canAskAgain === false || p.status === 'denied' ? 'denied' : 'undetermined';
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  // Precisa existir antes de pedir o token (Android 13+) e antes do aviso chegar.
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'Avisos da Vivah',
    description: 'Aulas novas, lives e recados da equipe',
    importance: ANDROID_DEFAULT,
  });
}

/** Liga este celular à conta. Só chama com a permissão já dada. */
export async function registerDevice(): Promise<boolean> {
  if (!PUSH_SUPPORTED) return false;
  await ensureChannel();
  const id = projectId();
  if (!id && api.mode === 'supabase') {
    console.warn('[push] Falta extra.eas.projectId no app.json: rode npx eas-cli@latest init.');
    return false;
  }
  try {
    const token = id
      ? (await Notifications.getExpoPushTokenAsync({ projectId: id })).data
      : `ExponentPushToken[demo-${Platform.OS}]`;
    currentToken = token;
    await api.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    return true;
  } catch (e) {
    console.warn('[push] Não foi possível registrar o celular:', (e as Error).message);
    return false;
  }
}

/** Pede a permissão (uma vez) e registra. */
export async function enablePush(): Promise<PushPermission> {
  if (!PUSH_SUPPORTED) return 'unsupported';
  let status = await pushPermission();
  if (status === 'undetermined') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.granted || asked.ios?.status === IOS_PROVISIONAL ? 'granted' : 'denied';
  }
  if (status === 'granted') await registerDevice();
  return status;
}

/** Ao sair da conta: este celular para de receber os avisos dela. */
export async function unregisterDevice(): Promise<void> {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await api.unregisterPushToken(token).catch(() => undefined);
}

function openFromNotification(response: Notifications.NotificationResponse | null) {
  if (!response) return;
  const key = response.notification.request.identifier;
  if (key === lastHandledResponse) return;
  lastHandledResponse = key;
  const data = response.notification.request.content.data ?? {};
  if (typeof data.notificationId === 'string') api.markInboxRead([data.notificationId]).catch(() => undefined);
  if (typeof data.url === 'string' && data.url.startsWith('/')) router.push(data.url as never);
}

/**
 * Liga tudo quando a pessoa está logada: registra o celular (se já deu
 * permissão), acompanha troca de token, atualiza o sino quando chega aviso
 * e abre a tela certa ao tocar.
 */
export function usePushRegistration(signedIn: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!PUSH_SUPPORTED || !signedIn) return;
    pushPermission().then((p) => p === 'granted' && registerDevice());
    const tokenSub = Notifications.addPushTokenListener(() => {
      registerDevice();
    });
    const received = Notifications.addNotificationReceivedListener(() => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('inbox') });
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    // App aberto pelo toque no aviso (estava fechado).
    Notifications.getLastNotificationResponseAsync().then(openFromNotification).catch(() => undefined);
    return () => {
      tokenSub.remove();
      received.remove();
      tapped.remove();
    };
  }, [signedIn, qc]);
}

// Demonstração: o aviso enviado pelo admin aparece como notificação neste celular.
if (PUSH_SUPPORTED) {
  setDemoPushPresenter((n) => {
    pushPermission().then((p) => {
      if (p !== 'granted') return;
      ensureChannel().then(() =>
        Notifications.scheduleNotificationAsync({
          content: { title: n.title, body: n.body, data: { url: n.url ?? '/avisos', notificationId: n.id } },
          trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : null,
        }),
      );
    });
  });
}
