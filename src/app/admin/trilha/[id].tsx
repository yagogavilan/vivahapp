import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AddButton, AdminGate, AdminRow, AdminSection } from '@/components/admin';
import { Button, Card, Chip, Empty, ErrorState, Field, Row, Screen, Txt } from '@/components/ui';
import { ScreenSkeleton, TrackCover } from '@/components/visual';
import { useAdmin, useLibrary } from '@/data/hooks';
import type { Course, Product, Track } from '@/data/types';
import { isCheckoutUrl, moveId } from '@/domain/admin';
import { lowTicketsOf, trackCourses } from '@/domain/spaces';
import { colors, space } from '@/theme';

const FORMAT_LABEL = { aula: 'Aula curta', planilha: 'Planilha', ferramenta: 'Ferramenta' } as const;

export default function AdminTrack() {
  return (
    <AdminGate>
      <AdminTrackBody />
    </AdminGate>
  );
}

function AdminTrackBody() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useLibrary();
  const admin = useAdmin();
  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  const track = lib.trackById.get(id);
  if (!track) return <Screen padTop={false}><Empty icon="map" title="Trilha não encontrada" /></Screen>;

  const courses = trackCourses(track.id, lib.courses);
  const lows = lowTicketsOf(track.id, lib.courses);
  const product = lib.products.find((p) => p.id === `trilha-${track.id}`);
  const describe = (c: Course) => {
    const mods = lib.modules.filter((m) => m.courseId === c.id).length;
    const ls = lib.lessons.filter((l) => l.courseId === c.id);
    return `${mods} ${mods === 1 ? 'módulo' : 'módulos'} · ${ls.length} ${ls.length === 1 ? 'aula' : 'aulas'} · ${ls.reduce((a, l) => a + l.durationMin, 0)} min`;
  };
  const move = (list: Course[], courseId: string, dir: -1 | 1) => {
    admin.reorder.mutate({ kind: 'courses', ids: moveId(list.map((c) => c.id), courseId, dir) });
  };
  const edit = (c: Course) => router.push({ pathname: '/admin/curso/[id]', params: { id: c.id } });
  const nextSort = Math.max(0, ...lib.courses.map((c) => c.sort)) + 1;

  return (
    <Screen padTop={false} refreshing={library.isRefetching} onRefresh={library.refetch}>
      <TrackCover area={track.area} style={{ padding: space.xl, gap: 4 }}>
        <Txt variant="eyebrow" style={{ color: colors.coral }}>Administração · {track.areaLabel}</Txt>
        <Txt variant="hero" style={{ color: colors.onDark }}>Trilha {track.title}</Txt>
        <Txt style={{ color: colors.onDarkMuted }}>{track.subtitle}</Txt>
      </TrackCover>

      <TrackSaleForm key={track.id} track={track} product={product} />

      <AdminSection
        title="Cursos da trilha"
        hint="O aluno faz nesta ordem: a próxima aula só abre quando ele conclui a anterior. Use as setas para mudar a ordem."
        action={null}>
        {courses.length ? (
          courses.map((c, i) => (
            <AdminRow
              key={c.id}
              index={i + 1}
              title={c.title}
              subtitle={describe(c)}
              busy={admin.reorder.isPending}
              onPress={() => edit(c)}
              onUp={i > 0 ? () => move(courses, c.id, -1) : undefined}
              onDown={i < courses.length - 1 ? () => move(courses, c.id, 1) : undefined}
            />
          ))
        ) : (
          <Txt variant="small">Nenhum curso ainda.</Txt>
        )}
        <AddButton label="Novo curso" onPress={() => router.push({ pathname: '/admin/curso/[id]', params: { id: 'novo', track: track.id, sort: String(nextSort) } })} />
      </AdminSection>

      <AdminSection title="Low tickets" hint="Aulas curtas, planilhas e ferramentas vendidas à parte, cada uma com o seu preço. Ficam fora da sequência.">
        {lows.length ? (
          lows.map((c, i) => (
            <AdminRow
              key={c.id}
              icon={c.format === 'planilha' ? 'grid' : c.format === 'ferramenta' ? 'tool' : 'play-circle'}
              title={c.title}
              subtitle={`${FORMAT_LABEL[c.format ?? 'aula']} · ${c.priceLabel ?? 'sem preço'} · ${lib.products.find((p) => p.id === c.id)?.checkoutUrl ? 'link ok' : 'sem link de pagamento'}`}
              busy={admin.reorder.isPending}
              onPress={() => edit(c)}
              onUp={i > 0 ? () => move(lows, c.id, -1) : undefined}
              onDown={i < lows.length - 1 ? () => move(lows, c.id, 1) : undefined}
            />
          ))
        ) : (
          <Txt variant="small">Nenhum low ticket ainda.</Txt>
        )}
        <AddButton label="Novo low ticket" onPress={() => router.push({ pathname: '/admin/curso/[id]', params: { id: 'novo', track: track.id, low: '1', sort: String(nextSort) } })} />
      </AdminSection>
    </Screen>
  );
}

/** Preço da assinatura anual, link de pagamento e status de lançamento. */
function TrackSaleForm({ track, product }: { track: Track; product: Product | undefined }) {
  const admin = useAdmin();
  const [price, setPrice] = useState(track.priceLabel ?? '');
  const [url, setUrl] = useState(product?.checkoutUrl ?? '');
  const [status, setStatus] = useState(track.status);
  const [launch, setLaunch] = useState(track.launchLabel);
  const [saved, setSaved] = useState(false);
  const urlOk = !url.trim() || isCheckoutUrl(url);
  const dirty = price !== (track.priceLabel ?? '') || url !== (product?.checkoutUrl ?? '') || status !== track.status || launch !== track.launchLabel;
  const busy = admin.updateTrack.isPending || admin.setCheckout.isPending;

  const save = async () => {
    setSaved(false);
    await admin.updateTrack.mutateAsync({ id: track.id, patch: { priceLabel: price.trim() || null, status, launchLabel: launch.trim() || track.launchLabel } });
    if (product) await admin.setCheckout.mutateAsync({ productId: product.id, url: url.trim() || null });
    setSaved(true);
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Txt variant="title">Assinatura anual</Txt>
        <Txt variant="small">O preço e o botão de pagamento aparecem só na versão web. Nos apps das lojas o aluno vê que o conteúdo é para assinantes.</Txt>
      </View>
      <Field label="Preço (como aparece para o aluno)" value={price} onChangeText={setPrice} placeholder="R$ 397 por ano" maxLength={40} />
      <Field
        label="Link de pagamento"
        value={url}
        onChangeText={setUrl}
        placeholder="https://pay.suaplataforma.com/..."
        autoCapitalize="none"
        keyboardType="url"
        hint={urlOk ? 'O e-mail do aluno vai preenchido. Quando a plataforma avisar o pagamento, o acesso abre sozinho.' : 'Use um endereço que comece com https://'}
      />
      <View style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Situação</Txt>
        <Row>
          <Chip label="No ar" selected={status === 'live'} onPress={() => setStatus('live')} />
          <Chip label="Em breve" selected={status === 'soon'} onPress={() => setStatus('soon')} />
        </Row>
      </View>
      {status === 'soon' ? <Field label="Quando chega" value={launch} onChangeText={setLaunch} placeholder="Fevereiro" maxLength={30} /> : null}
      {admin.updateTrack.error || admin.setCheckout.error ? (
        <Txt variant="small" style={{ color: colors.danger }}>{String((admin.updateTrack.error ?? admin.setCheckout.error)?.message)}</Txt>
      ) : null}
      <Button label={saved && !dirty ? 'Salvo' : 'Salvar'} icon={saved && !dirty ? 'check' : 'save'} disabled={!dirty || !urlOk} loading={busy} onPress={save} />
    </Card>
  );
}
