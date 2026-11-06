import { router } from 'expo-router';
import { View } from 'react-native';

import { AdminGate } from '@/components/admin';
import { Card, ErrorState, Icon, Pill, Row, Screen, Txt } from '@/components/ui';
import { ScreenSkeleton, TrackCover } from '@/components/visual';
import { useLibrary } from '@/data/hooks';
import { lowTicketsOf, trackCourses } from '@/domain/spaces';
import { colors, space } from '@/theme';

/** Administração: as trilhas, com o que cada uma tem e o que falta configurar. */
export default function AdminHome() {
  return (
    <AdminGate>
      <AdminTracks />
    </AdminGate>
  );
}

function AdminTracks() {
  const library = useLibrary();
  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;

  return (
    <Screen padTop={false} refreshing={library.isRefetching} onRefresh={library.refetch}>
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">Administração</Txt>
        <Txt variant="hero">Cursos e aulas por trilha</Txt>
        <Txt>Escolha a trilha para cadastrar cursos, módulos, aulas e low tickets, e para definir o preço e o link de pagamento. As mudanças valem na hora para os alunos.</Txt>
      </View>

      <Card onPress={() => router.push('/admin/loja')} style={{ gap: 4 }}>
        <Row gap={space.sm}>
          <Icon name="shopping-bag" size={18} color={colors.coralText} />
          <Txt variant="heading" style={{ flex: 1 }}>Loja: produtos físicos</Txt>
          <Icon name="chevron-right" size={18} color={colors.textSubtle} />
        </Row>
        <Txt variant="small">{lib.storeItems.length} produtos · {lib.storeItems.filter((i) => i.active && !i.checkoutUrl).length} sem link de pagamento</Txt>
      </Card>

      <Card onPress={() => router.push('/admin/avisos')} style={{ gap: 4 }}>
        <Row gap={space.sm}>
          <Icon name="bell" size={18} color={colors.coralText} />
          <Txt variant="heading" style={{ flex: 1 }}>Avisos e push</Txt>
          <Icon name="chevron-right" size={18} color={colors.textSubtle} />
        </Row>
        <Txt variant="small">Mande um recado, avise de live ou lançamento e veja quantos abriram.</Txt>
      </Card>

      {lib.tracks.map((t) => {
        const cs = trackCourses(t.id, lib.courses);
        const lows = lowTicketsOf(t.id, lib.courses);
        const lessons = lib.lessons.filter((l) => cs.some((c) => c.id === l.courseId)).length;
        const product = lib.products.find((p) => p.id === `trilha-${t.id}`);
        const pending = [!t.priceLabel && 'preço', !product?.checkoutUrl && 'link de pagamento', lessons === 0 && 'aulas'].filter(Boolean) as string[];
        return (
          <Card key={t.id} onPress={() => router.push({ pathname: '/admin/trilha/[id]', params: { id: t.id } })} style={{ gap: space.md, padding: 0, overflow: 'hidden' }}>
            <TrackCover area={t.area} style={{ padding: space.lg, gap: 2, borderRadius: 0 }}>
              <Txt variant="eyebrow" style={{ color: colors.coral }}>{t.areaLabel}</Txt>
              <Txt variant="heading" style={{ color: colors.onDark }}>{t.title}</Txt>
            </TrackCover>
            <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }}>
              <Row style={{ flexWrap: 'wrap' }}>
                <Pill label={t.status === 'live' ? 'No ar' : `Em breve · ${t.launchLabel}`} tone={t.status === 'live' ? 'mint' : 'sand'} />
                <Pill label={t.priceLabel ?? 'Sem preço'} tone="sand" icon="tag" />
              </Row>
              <Txt variant="small">{cs.length} cursos · {lessons} aulas · {lows.length} low tickets</Txt>
              {pending.length ? (
                <Row gap={6}>
                  <Icon name="alert-circle" size={14} color={colors.coralText} />
                  <Txt variant="small" style={{ color: colors.coralText }}>Falta: {pending.join(', ')}</Txt>
                </Row>
              ) : (
                <Row gap={6}>
                  <Icon name="check-circle" size={14} color="#16614F" />
                  <Txt variant="small" style={{ color: '#16614F' }}>Pronta para vender</Txt>
                </Row>
              )}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
