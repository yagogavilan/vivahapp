import { Redirect, Tabs, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { useSession } from '@/auth/session';
import { Icon, type IconName } from '@/components/ui';
import { ScreenSkeleton } from '@/components/visual';
import { useLibrary, useUpdateProfile } from '@/data/hooks';
import { spaceFor } from '@/domain/spaces';
import { SpaceProvider } from '@/lib/space-context';
import { colors, fonts, WIDE } from '@/theme';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: unknown }) => <Icon name={icon} size={22} color={String(color ?? colors.textSubtle)} />,
});

/** O app moldado para uma trilha: Hoje, Cursos e Comunidade só dela, mais Agenda e Perfil. */
export default function SpaceLayout() {
  const { track } = useLocalSearchParams<{ track: string }>();
  const library = useLibrary();
  const { profile } = useSession();
  const updateProfile = useUpdateProfile();
  const wide = useWindowDimensions().width >= WIDE;

  const lastSpace = profile?.preferences?.lastSpace;
  useEffect(() => {
    // Só guarda trilhas que existem (um link antigo para a Área de Aquecimento volta para o início).
    if (!profile || !track || lastSpace === track || !library.data?.tracks.some((t) => t.id === track)) return;
    updateProfile.mutate({ preferences: { ...profile.preferences, lastSpace: track } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, lastSpace, library.data]);

  if (library.isPending) return <ScreenSkeleton />;
  const lib = library.data;
  const space = lib ? spaceFor(track ?? '', lib.tracks) : undefined;
  // Todas as trilhas abrem para o aluno conhecer; os cursos e a comunidade pedem assinatura.
  if (!lib || !space) return <Redirect href="/" />;

  return (
    <SpaceProvider space={space}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarPosition: wide ? 'left' : 'bottom',
          tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
          tabBarActiveTintColor: colors.coralText,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: wide ? 15 : 11 },
          tabBarActiveBackgroundColor: wide ? colors.coralSoft : 'transparent',
          tabBarItemStyle: wide ? { borderRadius: 12, marginHorizontal: 12, marginVertical: 2, paddingHorizontal: 8 } : undefined,
          tabBarStyle: wide
            ? { backgroundColor: colors.surface, borderRightColor: colors.border, width: 220, paddingTop: 32 }
            : {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                ...(Platform.OS === 'web' ? { height: 64, paddingBottom: 8, paddingTop: 6 } : null),
              },
        }}>
        <Tabs.Screen name="index" options={tab('Hoje', 'sun')} />
        <Tabs.Screen name="cursos" options={tab('Cursos', 'play-circle')} />
        <Tabs.Screen name="comunidade" options={tab('Comunidade', 'users')} />
        <Tabs.Screen name="loja" options={tab('Loja', 'shopping-bag')} />
        <Tabs.Screen name="perfil" options={tab('Perfil', 'user')} />
      </Tabs>
    </SpaceProvider>
  );
}
