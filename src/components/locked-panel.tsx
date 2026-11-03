import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { useSession } from '../auth/session';
import { checkoutLink, productForCourse } from '../domain/access';
import { SUBSCRIPTION_PRICE_LABEL } from '../data/catalog';
import { useLibrary } from '../data/hooks';
import type { Course } from '../data/types';
import { CAN_SELL_IN_APP } from '../lib/config';
import { colors, space } from '../theme';
import { Button, Card, Icon, Row, Txt } from './ui';

/**
 * Painel de curso bloqueado.
 * - Web: mostra o preço e leva ao checkout da Hotmart com o e-mail preenchido.
 * - Apps da Apple Store e da Play Store: sem preço, botão ou link de compra
 *   (regra das lojas). Só explica como o acesso chega e permite atualizar.
 */
export function LockedPanel({ course }: { course: Course }) {
  const { user, profile } = useSession();
  const library = useLibrary();
  const products = library.data?.products ?? [];

  if (!CAN_SELL_IN_APP) {
    return (
      <Card tone="sand" style={{ gap: space.md }}>
        <Row>
          <Icon name="lock" size={18} color={colors.petrol} />
          <Txt variant="bodyStrong">Conteúdo para alunos Vivah</Txt>
        </Row>
        <Txt>
          Já é aluno? O acesso aparece aqui automaticamente quando você entra com o mesmo e-mail usado na inscrição
          {user?.email ? ` (${user.email})` : ''}.
        </Txt>
        <Button
          label="Atualizar meus acessos"
          icon="refresh-cw"
          variant="ghost"
          loading={library.isRefetching}
          onPress={() => library.refetch()}
        />
      </Card>
    );
  }

  const product = productForCourse(course.id, products);
  const subscription = products.find((p) => p.id === 'assinatura-vivah');
  const open = (url: string) =>
    WebBrowser.openBrowserAsync(checkoutLink(url, user?.email, profile?.fullName)).catch(() => undefined);

  return (
    <Card tone="dark" style={{ gap: space.md }}>
      <Row>
        <Icon name="lock" size={18} color={colors.coral} />
        <Txt variant="bodyStrong" style={{ color: colors.onDark }}>Libere este conteúdo</Txt>
      </Row>
      {product?.checkoutUrl ? (
        <>
          <Txt style={{ color: colors.onDarkMuted }}>
            A compra é feita na Hotmart com o seu e-mail ({user?.email}). Assim que o pagamento for aprovado, o acesso
            aparece aqui, no computador e no celular.
          </Txt>
          <Button label={`Quero acessar${course.priceLabel ? ` · ${course.priceLabel}` : ''}`} icon="arrow-right" onPress={() => open(product.checkoutUrl!)} />
          {course.inSubscription && subscription?.checkoutUrl ? (
            <Button
              label={`Ou assine tudo · ${SUBSCRIPTION_PRICE_LABEL}`}
              variant="light"
              onPress={() => open(subscription.checkoutUrl!)}
            />
          ) : null}
        </>
      ) : (
        <Txt style={{ color: colors.onDarkMuted }}>As inscrições para este conteúdo abrem em breve. Fique de olho nas lives.</Txt>
      )}
      <View style={{ height: 1, backgroundColor: colors.petrolSoft }} />
      <Button
        label="Já comprei: atualizar acessos"
        variant="light"
        icon="refresh-cw"
        loading={library.isRefetching}
        onPress={() => library.refetch()}
      />
    </Card>
  );
}
