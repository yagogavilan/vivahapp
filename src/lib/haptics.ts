import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS === 'ios' || Platform.OS === 'android';

/** Toque leve em botões e seleções. */
export const tap = () => on && Haptics.selectionAsync().catch(() => undefined);
/** Confirmação de algo concluído (aula, check-in, passo do dia). */
export const success = () => on && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
