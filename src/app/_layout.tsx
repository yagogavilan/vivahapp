import { Fraunces_400Regular_Italic, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/auth/session';
import { Loading } from '@/components/ui';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

// No celular, "foco" = app voltou para a frente: refaz as consultas (ex.: acesso recém-comprado).
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (s) => handleFocus(s === 'active'));
    return () => sub.remove();
  });
}

const detailHeader = {
  headerShown: true,
  headerTitle: '',
  headerBackTitle: 'Voltar',
  headerTintColor: colors.petrol,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.cream },
} as const;

function RootNavigator() {
  const { status, onboarded } = useSession();
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === 'loading') return <Loading />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="entrar" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="boas-vindas" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="trilha/[id]" options={detailHeader} />
        <Stack.Screen name="curso/[id]" options={detailHeader} />
        <Stack.Screen name="aula/[id]" options={detailHeader} />
        <Stack.Screen name="live/[id]" options={detailHeader} />
        <Stack.Screen name="escudo/[id]" options={detailHeader} />
        <Stack.Screen name="post/[id]" options={detailHeader} />
        <Stack.Screen name="diagnostico" options={detailHeader} />
        <Stack.Screen name="checkin" options={{ ...detailHeader, presentation: 'modal' }} />
        <Stack.Screen name="evento" options={{ ...detailHeader, presentation: 'modal' }} />
        <Stack.Screen name="privacidade" options={detailHeader} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
