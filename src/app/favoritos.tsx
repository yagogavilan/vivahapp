import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card, Empty, Icon, Loading, Row, Screen, Txt } from '@/components/ui';
import { useEscudo, useFavorites, useLibrary } from '@/data/hooks';
import { colors, space } from '@/theme';

export default function Favoritos() {
  const favorites = useFavorites();
  const library = useLibrary();
  const escudo = useEscudo();
  if (favorites.isPending || library.isPending) return <Loading />;

  const items = (favorites.data ?? [])
    .map((f) => {
      if (f.itemType === 'lesson') {
        const l = library.data?.lessons.find((x) => x.id === f.itemId);
        const c = l && library.data?.courses.find((x) => x.id === l.courseId);
        return l ? { key: `l-${l.id}`, title: l.title, subtitle: c?.title ?? '', icon: 'play-circle' as const, go: () => router.push({ pathname: '/aula/[id]', params: { id: l.id } }) } : null;
      }
      const a = escudo.data?.find((x) => x.id === f.itemId);
      return a ? { key: `e-${a.id}`, title: a.title, subtitle: 'Escudo Anticrise', icon: 'shield' as const, go: () => router.push({ pathname: '/escudo/[id]', params: { id: a.id } }) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <Screen padTop={false}>
      <Txt variant="hero">Favoritos</Txt>
      {items.length === 0 ? (
        <Empty icon="heart" title="Nada salvo ainda" text="Toque no coração de uma aula ou de um áudio do Escudo para guardar aqui." />
      ) : (
        <Card style={{ gap: 0, paddingVertical: space.xs }}>
          {items.map((it, i) => (
            <Pressable key={it.key} onPress={it.go} style={{ paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <Row gap={space.md}>
                <Icon name={it.icon} color={colors.coralText} />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{it.title}</Txt>
                  <Txt variant="small">{it.subtitle}</Txt>
                </View>
                <Icon name="chevron-right" color={colors.textSubtle} />
              </Row>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}
