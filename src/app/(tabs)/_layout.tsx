import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { colors, fonts, WIDE } from '@/theme';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: unknown }) => <Icon name={icon} size={22} color={String(color ?? colors.textSubtle)} />,
});

export default function TabsLayout() {
  // Desktop e tablet: menu lateral (o app da Hotmart é criticado por "abrir como celular" no Mac e no iPad).
  const wide = useWindowDimensions().width >= WIDE;
  return (
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
      <Tabs.Screen name="trilhas" options={tab('Trilhas', 'compass')} />
      <Tabs.Screen name="comunidade" options={tab('Comunidade', 'users')} />
      <Tabs.Screen name="agenda" options={tab('Agenda', 'calendar')} />
      <Tabs.Screen name="perfil" options={tab('Perfil', 'user')} />
    </Tabs>
  );
}
