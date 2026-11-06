import { useState } from 'react';
import { View } from 'react-native';

import { AddButton, AdminGate, AdminRow, AdminSection, ConfirmDelete } from '@/components/admin';
import { Button, Card, Chip, ErrorState, Field, Row, Screen, Txt } from '@/components/ui';
import { ScreenSkeleton } from '@/components/visual';
import { useAdmin, useLibrary } from '@/data/hooks';
import type { StoreItem, Track } from '@/data/types';
import { isCheckoutUrl, moveId, slugId } from '@/domain/admin';
import { colors, space } from '@/theme';

/** Administração da loja: produtos físicos (separados das recompensas de pontos). */
export default function AdminLoja() {
  return (
    <AdminGate>
      <AdminLojaBody />
    </AdminGate>
  );
}

function AdminLojaBody() {
  const library = useLibrary();
  const admin = useAdmin();
  const [editing, setEditing] = useState<StoreItem | 'novo' | null>(null);
  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const { storeItems, tracks } = library.data;
  const items = [...storeItems].sort((a, b) => a.sort - b.sort);
  const trackName = (id: string | null) => (id ? tracks.find((t) => t.id === id)?.title ?? id : 'Todas as trilhas');

  return (
    <Screen padTop={false} refreshing={library.isRefetching} onRefresh={library.refetch}>
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">Administração</Txt>
        <Txt variant="hero">Loja: produtos físicos</Txt>
        <Txt>Camisetas, garrafas, planners… Aparecem em Loja → Produtos, em todas as versões do app, inclusive iPhone e Android: produto físico pode ser vendido com pagamento fora do app. As recompensas trocadas por pontos são outra coisa e ficam em “Resgatar pontos”.</Txt>
      </View>

      {editing ? (
        <ItemForm
          key={editing === 'novo' ? 'novo' : editing.id}
          item={editing === 'novo' ? undefined : editing}
          tracks={tracks}
          taken={items.map((i) => i.id)}
          nextSort={Math.max(0, ...items.map((i) => i.sort)) + 1}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <AdminSection title={`Produtos (${items.length})`} hint="A ordem aqui é a ordem na loja. Produtos de uma trilha aparecem antes dos produtos gerais.">
        {items.map((i, k) => (
          <AdminRow
            key={i.id}
            icon="package"
            title={`${i.title}${i.active ? '' : ' (oculto)'}`}
            subtitle={`${trackName(i.trackId)} · ${i.priceLabel ?? 'sem preço'} · ${i.checkoutUrl ? 'link ok' : 'sem link de pagamento'}`}
            busy={admin.saveStoreItem.isPending}
            onPress={() => setEditing(i)}
            onUp={k > 0 ? () => reorder(admin, items, i.id, -1) : undefined}
            onDown={k < items.length - 1 ? () => reorder(admin, items, i.id, 1) : undefined}
          />
        ))}
        {!editing ? <AddButton label="Novo produto" onPress={() => setEditing('novo')} /> : null}
      </AdminSection>
    </Screen>
  );
}

function reorder(admin: ReturnType<typeof useAdmin>, items: StoreItem[], id: string, dir: -1 | 1) {
  const ids = moveId(items.map((i) => i.id), id, dir);
  ids.forEach((x, n) => {
    const it = items.find((i) => i.id === x)!;
    if (it.sort !== n + 1) admin.saveStoreItem.mutate({ ...it, sort: n + 1 });
  });
}

function ItemForm({ item, tracks, taken, nextSort, onClose }: { item?: StoreItem; tracks: Track[]; taken: string[]; nextSort: number; onClose: () => void }) {
  const admin = useAdmin();
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item?.priceLabel ?? '');
  const [image, setImage] = useState(item?.imageUrl ?? '');
  const [url, setUrl] = useState(item?.checkoutUrl ?? '');
  const [trackId, setTrackId] = useState<string | null>(item?.trackId ?? null);
  const [active, setActive] = useState(item?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const urlOk = !url.trim() || isCheckoutUrl(url);
  const imageOk = !image.trim() || /^https:\/\/\S+$/.test(image.trim());
  const valid = title.trim().length >= 2 && urlOk && imageOk;

  const save = () =>
    admin.saveStoreItem.mutate(
      {
        id: item?.id ?? slugId(title, taken),
        trackId,
        title: title.trim(),
        description: description.trim(),
        priceLabel: price.trim() || null,
        imageUrl: image.trim() || null,
        checkoutUrl: url.trim() || null,
        active,
        sort: item?.sort ?? nextSort,
      },
      { onSuccess: onClose, onError: (e) => setError(e.message) },
    );

  return (
    <Card style={{ gap: space.md }}>
      <Txt variant="title">{item ? 'Editar produto' : 'Novo produto'}</Txt>
      <Field label="Nome" value={title} onChangeText={setTitle} maxLength={80} placeholder="Ex.: Garrafa Move 1 litro" />
      <Field label="Descrição" value={description} onChangeText={setDescription} multiline maxLength={400} placeholder="Material, tamanho, o que vem no kit" />
      <Field label="Preço (como aparece)" value={price} onChangeText={setPrice} maxLength={40} placeholder="R$ 59" />
      <Field label="Foto (link https)" value={image} onChangeText={setImage} autoCapitalize="none" keyboardType="url" placeholder="https://..." hint={imageOk ? 'Pode ser do Storage do Supabase ou da sua loja.' : 'Use um endereço que comece com https://'} />
      <Field label="Link de pagamento" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" placeholder="https://pay.suaplataforma.com/..." hint={urlOk ? 'Sem link, o produto aparece como “em breve”. O e-mail do aluno vai preenchido.' : 'Use um endereço que comece com https://'} />
      <View style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Em qual trilha aparece</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="Todas" selected={trackId === null} onPress={() => setTrackId(null)} />
          {tracks.map((t) => <Chip key={t.id} label={t.title} selected={trackId === t.id} onPress={() => setTrackId(t.id)} />)}
        </Row>
      </View>
      <View style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Situação</Txt>
        <Row>
          <Chip label="À venda" selected={active} onPress={() => setActive(true)} />
          <Chip label="Oculto" selected={!active} onPress={() => setActive(false)} />
        </Row>
      </View>
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
      <Row>
        <Button label="Salvar" icon="save" disabled={!valid} loading={admin.saveStoreItem.isPending} onPress={save} style={{ flex: 1 }} />
        <Button label="Cancelar" variant="ghost" onPress={onClose} />
      </Row>
      {item ? (
        <ConfirmDelete label="Excluir produto" warning="Some da loja para todos. Para só esconder, use “Oculto”." loading={admin.deleteStoreItem.isPending}
          onConfirm={() => admin.deleteStoreItem.mutate(item.id, { onSuccess: onClose, onError: (e) => setError(e.message) })} />
      ) : null}
    </Card>
  );
}
