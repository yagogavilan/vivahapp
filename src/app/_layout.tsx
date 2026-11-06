import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
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
import { usePushRegistration } from '@/lib/push';
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
  const { status, onboarded, profile } = useSession();
  const isAdmin = profile?.role === 'admin';
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  // Push: registra o celular, atualiza o sino e abre a tela certa ao tocar no aviso
  // (também os lembretes locais, que levam o mesmo campo url).
  usePushRegistration(signedIn && onboarded);

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
        <Stack.Screen name="index" />
        <Stack.Screen name="t/[track]" />
        <Stack.Screen name="trilha/[id]" options={detailHeader} />
        <Stack.Screen name="curso/[id]" options={detailHeader} />
        <Stack.Screen name="aula/[id]" options={detailHeader} />
        <Stack.Screen name="live/[id]" options={detailHeader} />
        <Stack.Screen name="escudo/[id]" options={detailHeader} />
        <Stack.Screen name="post/[id]" options={detailHeader} />
        <Stack.Screen name="diagnostico" options={detailHeader} />
        <Stack.Screen name="checkin" options={detailHeader} />
        <Stack.Screen name="evento" options={{ ...detailHeader, presentation: 'modal' }} />
        <Stack.Screen name="privacidade" options={detailHeader} />
        <Stack.Screen name="foco" options={detailHeader} />
        <Stack.Screen name="buscar" options={detailHeader} />
        <Stack.Screen name="conquistas" options={detailHeader} />
        <Stack.Screen name="lembretes" options={{ ...detailHeader, title: 'Notificações' }} />
        <Stack.Screen name="avisos" options={{ ...detailHeader, title: 'Avisos' }} />
        <Stack.Screen name="favoritos" options={detailHeader} />
        <Stack.Screen name="certificado/[id]" options={detailHeader} />
        <Stack.Screen name="socorro" options={{ ...detailHeader, presentation: 'modal' }} />
        <Stack.Screen name="exercicio" options={{ ...detailHeader, presentation: 'modal' }} />
        <Stack.Screen name="publicar" options={{ ...detailHeader, presentation: 'modal' }} />
        <Stack.Screen name="agenda" options={detailHeader} />
        <Stack.Screen name="plano" options={detailHeader} />
        <Stack.Screen name="fechamento" options={detailHeader} />
        <Stack.Screen name="apoio" options={{ ...detailHeader, presentation: 'modal' }} />
        <Stack.Screen name="conselheiros" options={detailHeader} />
        <Stack.Screen name="conselheiro" options={detailHeader} />
        <Stack.Screen name="conselho/novo" options={{ ...detailHeader, presentation: 'modal' }} />
        <Stack.Screen name="conselho/[id]" options={detailHeader} />
        <Stack.Screen name="painel/index" options={detailHeader} />
        <Stack.Screen name="painel/[metric]" options={detailHeader} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded && isAdmin}>
        <Stack.Screen name="admin/index" options={{ ...detailHeader, title: 'Administração' }} />
        <Stack.Screen name="admin/trilha/[id]" options={{ ...detailHeader, title: 'Trilha' }} />
        <Stack.Screen name="admin/curso/[id]" options={{ ...detailHeader, title: 'Curso' }} />
        <Stack.Screen name="admin/aula/[id]" options={{ ...detailHeader, title: 'Aula' }} />
        <Stack.Screen name="admin/loja" options={{ ...detailHeader, title: 'Loja' }} />
        <Stack.Screen name="admin/avisos" options={{ ...detailHeader, title: 'Avisos e push' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_600SemiBold,
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
