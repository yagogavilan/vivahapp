import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { colors, fonts } from '@/theme';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: unknown }) => <Icon name={icon} size={22} color={String(color ?? colors.textSubtle)} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coralText,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === 'web' ? { height: 64, paddingBottom: 8, paddingTop: 6 } : null),
        },
      }}>
      <Tabs.Screen name="index" options={tab('Hoje', 'sun')} />
      <Tabs.Screen name="trilhas" options={tab('Trilhas', 'compass')} />
      <Tabs.Screen name="comunidade" options={tab('Comunidade', 'users')} />
      <Tabs.Screen name="agenda" options={tab('Agenda', 'calendar')} />
      <Tabs.Screen name="perfil" options={tab('Perfil', 'user')} />
    </Tabs>
  );
}
