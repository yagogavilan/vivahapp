import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { useSession } from '../auth/session';
import { checkoutLink, productForCourse } from '../domain/access';
import { useLibrary } from '../data/hooks';
import type { Course, Track } from '../data/types';
import { CAN_SELL_IN_APP } from '../lib/config';
import { colors, space } from '../theme';
import { Button, Card, Icon, Row, Txt } from './ui';

/**
 * Conteúdo bloqueado. Duas formas de liberar:
 * - assinatura anual da trilha (todos os cursos da trilha, em sequência);
 * - low ticket (mini produto vendido à parte).
 * Na web mostra o preço e leva ao pagamento com o e-mail preenchido. Nos apps
 * das lojas não há preço, botão nem link de compra (regra da Apple e do Google).
 */
export function LockedPanel({ course }: { course: Course }) {
  const library = useLibrary();
  const track = library.data?.trackById.get(course.trackId);
  if (course.lowTicket) return <BuyPanel title={course.title} priceLabel={course.priceLabel} productId={course.id} course={course} />;
  if (!track) return null;
  return <TrackSubscribePanel track={track} />;
}

export function TrackSubscribePanel({ track, reason }: { track: Track; reason?: string }) {
  const library = useLibrary();
  const product = library.data ? productForCourse({ id: '', trackId: track.id, lowTicket: false }, library.data.products) : undefined;
  return (
    <BuyPanel
      title={`Trilha ${track.title}`}
      priceLabel={track.priceLabel}
      productId={product?.id ?? `trilha-${track.id}`}
      cta="Assinar a trilha"
      reason={reason ?? 'A assinatura anual libera todos os cursos da trilha, a comunidade e o espaço de conselheiros.'}
      soon={track.status === 'soon' ? track.launchLabel : undefined}
    />
  );
}

function BuyPanel({ title, priceLabel, productId, cta = 'Comprar', reason, soon, course }: {
  title: string;
  priceLabel: string | null;
  productId: string;
  cta?: string;
  reason?: string;
  soon?: string;
  course?: Course;
}) {
  const { user, profile } = useSession();
  const library = useLibrary();
  const product = library.data?.products.find((p) => p.id === productId) ?? (course && library.data ? productForCourse(course, library.data.products) : undefined);

  if (!CAN_SELL_IN_APP) {
    return (
      <Card tone="sand" style={{ gap: space.md }}>
        <Row>
          <Icon name="lock" size={18} color={colors.petrol} />
          <Txt variant="bodyStrong" style={{ flex: 1 }}>{title}: conteúdo para assinantes</Txt>
        </Row>
        {reason ? <Txt variant="small">{reason}</Txt> : null}
        <Txt>
          Já assinou? O acesso aparece aqui automaticamente quando você entra com o mesmo e-mail da compra
          {user?.email ? ` (${user.email})` : ''}.
        </Txt>
        <Button label="Atualizar meus acessos" icon="refresh-cw" variant="ghost" loading={library.isRefetching} onPress={() => library.refetch()} />
      </Card>
    );
  }

  const open = (url: string) => WebBrowser.openBrowserAsync(checkoutLink(url, user?.email, profile?.fullName)).catch(() => undefined);
  return (
    <Card tone="dark" style={{ gap: space.md }}>
      <Row>
        <Icon name="lock" size={18} color={colors.coral} />
        <Txt variant="bodyStrong" style={{ color: colors.onDark, flex: 1 }}>{title}</Txt>
        {priceLabel ? <Txt variant="bodyStrong" style={{ color: colors.coral }}>{priceLabel}</Txt> : null}
      </Row>
      {reason ? <Txt style={{ color: colors.onDarkMuted }}>{reason}</Txt> : null}
      {soon ? (
        <Txt style={{ color: colors.onDarkMuted }}>Os cursos chegam em {soon.toLowerCase()}. As ferramentas do dia já estão abertas.</Txt>
      ) : product?.checkoutUrl ? (
        <>
          <Button label={`${cta}${priceLabel ? ` · ${priceLabel}` : ''}`} onPress={() => open(product.checkoutUrl!)} />
          <Txt variant="small" style={{ color: colors.onDarkMuted }}>
            O pagamento usa o seu e-mail ({user?.email}). Aprovado o pagamento, o acesso aparece aqui, no computador e no celular.
          </Txt>
        </>
      ) : (
        <Txt style={{ color: colors.onDarkMuted }}>As vendas abrem em breve. Fique de olho nas lives.</Txt>
      )}
      <View style={{ height: 1, backgroundColor: colors.petrolSoft }} />
      <Button label="Já paguei: atualizar acessos" variant="light" icon="refresh-cw" loading={library.isRefetching} onPress={() => library.refetch()} />
    </Card>
  );
}
