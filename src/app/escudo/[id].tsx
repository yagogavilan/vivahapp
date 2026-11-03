import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AudioPlayer, MediaPlaceholder } from '@/components/media';
import { Button, Card, Empty, Icon, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { useActivity, useEscudo, useFavorites, useLogActivity, useToggleFavorite } from '@/data/hooks';
import { success } from '@/lib/haptics';
import { dayKey, formatDayLabel } from '@/domain/dates';
import { colors, space } from '@/theme';

export default function Escudo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const escudo = useEscudo();
  const activity = useActivity();
  const log = useLogActivity();
  const favorites = useFavorites();
  const toggleFav = useToggleFavorite();
  if (escudo.isPending) return <Loading />;
  const audio = escudo.data?.find((a) => a.id === id);
  if (!audio) return <Screen padTop={false}><Empty icon="shield" title="Áudio não encontrado" /></Screen>;
  const today = dayKey(new Date());
  const listened = (activity.data ?? []).some((a) => a.kind === 'escudo' && a.ref === audio.id);
  const isFav = (favorites.data ?? []).some((f) => f.itemType === 'escudo' && f.itemId === audio.id);
  const markListened = () => {
    if (listened) return;
    success();
    log.mutate({ kind: 'escudo', ref: audio.id, minutes: audio.durationMin });
  };
  const others = (escudo.data ?? []).filter((a) => a.id !== audio.id).slice(0, 6);

  return (
    <Screen padTop={false}>
      <Card tone="dark" style={{ gap: space.md, padding: space.xl }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <Icon name="shield" color={colors.coral} />
            <Txt variant="eyebrow" style={{ color: colors.coral }}>Escudo Anticrise · {formatDayLabel(audio.publishDate, today)}</Txt>
          </Row>
          <Pressable
            onPress={() => toggleFav.mutate({ itemType: 'escudo', itemId: audio.id, on: !isFav })}
            accessibilityRole="button"
            accessibilityLabel={isFav ? 'Tirar dos favoritos' : 'Salvar nos favoritos'}
            hitSlop={10}>
            <Icon name="heart" size={22} color={isFav ? colors.coral : colors.onDarkMuted} />
          </Pressable>
        </Row>
        <Txt variant="hero" style={{ color: colors.onDark }}>{audio.title}</Txt>
        <Txt style={{ color: colors.onDarkMuted }}>{audio.summary}</Txt>
        {audio.audioUrl ? (
          <AudioPlayer url={audio.audioUrl} title={`Escudo Anticrise: ${audio.title}`} onPlay={markListened} />
        ) : (
          <MediaPlaceholder kind="audio" durationMin={audio.durationMin} />
        )}
        {listened ? (
          <Pill label="Ouvido · conta na sua sequência" tone="mint" icon="check" />
        ) : !audio.audioUrl ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Button label="Marcar como ouvido" variant="light" icon="check" onPress={markListened} />
          </View>
        ) : null}
      </Card>

      <Txt variant="small">Um áudio novo todo dia. Ouça de manhã, antes de abrir as mensagens, ou quando a mente acelerar.</Txt>

      {others.length ? (
        <View style={{ gap: space.sm }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Dias anteriores</Txt>
          <Card style={{ gap: 0, paddingVertical: space.xs }}>
            {others.map((a, i) => (
              <Pressable
                key={a.id}
                onPress={() => router.replace({ pathname: '/escudo/[id]', params: { id: a.id } })}
                style={{ paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <Row gap={space.md}>
                  <Icon name="headphones" color={colors.coralText} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">{a.title}</Txt>
                    <Txt variant="small">{formatDayLabel(a.publishDate, today)}</Txt>
                  </View>
                </Row>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
