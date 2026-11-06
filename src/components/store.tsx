import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { useSession } from '../auth/session';
import { useLibrary } from '../data/hooks';
import { checkoutLink } from '../domain/access';
import { storeItemsFor } from '../domain/store';
import { colors, radius, space } from '../theme';
import { Button, Icon, Row, Txt } from './ui';

/**
 * Produtos físicos à venda. Diferente dos cursos, produto físico pode ser vendido também
 * nos apps da Apple e do Google, desde que o pagamento seja fora do app (Apple 3.1.5;
 * política de pagamentos do Google Play): o botão abre a página de checkout.
 */
export function StoreProducts({ trackId }: { trackId: string }) {
  const library = useLibrary();
  const { user, profile } = useSession();
  const items = storeItemsFor(trackId, library.data?.storeItems ?? []);
  const buy = (url: string) => WebBrowser.openBrowserAsync(checkoutLink(url, user?.email, profile?.fullName)).catch(() => undefined);

  if (!items.length) {
    return <Txt variant="small">Nenhum produto à venda nesta trilha por enquanto.</Txt>;
  }
  return (
    <View style={{ gap: space.md }}>
      <Row gap={space.lg} style={{ flexWrap: 'wrap' }}>
        <Row gap={6}><Icon name="truck" size={14} color={colors.textSubtle} /><Txt variant="small">Entrega em casa</Txt></Row>
        <Row gap={6}><Icon name="shield" size={14} color={colors.textSubtle} /><Txt variant="small">Pagamento seguro</Txt></Row>
      </Row>
      <View style={styles.grid}>
        {items.map((i) => (
          <View key={i.id} style={styles.card}>
            {i.imageUrl ? (
              <Image source={{ uri: i.imageUrl }} style={styles.image} contentFit="cover" accessibilityLabel={i.title} />
            ) : (
              <View style={[styles.image, styles.placeholder]}><Icon name="package" size={32} color={colors.coralText} /></View>
            )}
            <View style={{ padding: space.md, gap: 4, flex: 1 }}>
              {i.trackId === null ? <Txt variant="small" style={{ fontSize: 11, color: colors.textSubtle }}>VIVAH</Txt> : null}
              <Txt variant="bodyStrong">{i.title}</Txt>
              <Txt variant="small" numberOfLines={3} style={{ flex: 1 }}>{i.description}</Txt>
              <Row style={{ justifyContent: 'space-between', marginTop: space.xs }}>
                <Txt variant="bodyStrong" style={{ color: colors.coralText }}>{i.priceLabel ?? ''}</Txt>
              </Row>
              {i.checkoutUrl ? (
                <Button label="Comprar" icon="shopping-bag" onPress={() => buy(i.checkoutUrl!)} />
              ) : (
                <Txt variant="small" style={{ color: colors.textSubtle }}>Em breve</Txt>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: { flexGrow: 1, flexBasis: 160, maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 4 / 3 },
  placeholder: { backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
});
