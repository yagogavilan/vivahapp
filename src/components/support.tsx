import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useSession } from '../auth/session';
import { useSupportActions, useSupportMutations } from '../data/hooks';
import type { Post, SupportAction } from '../data/types';
import { formatWhen } from '../domain/dates';
import { programFor } from '../domain/programs';
import { notify } from '../lib/dialogs';
import { success } from '../lib/haptics';
import { colors, radius, space } from '../theme';
import { Button, Icon, Row, Txt } from './ui';

const STATUS: Record<SupportAction['status'], string> = {
  oferecido: 'Aguardando resposta',
  aceito: 'Aceito',
  recusado: 'Não aceito',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

/** No pedido de apoio: o botão para ajudar (5 pontos) e os apoios oferecidos. */
export function SupportSection({ post }: { post: Post }) {
  const { user } = useSession();
  const actions = useSupportActions();
  const { setStatus } = useSupportMutations();
  const spec = programFor(post.channel).community.apoio;
  if (post.kind !== 'apoio') return null;
  const mine = post.authorId === user?.id;
  const list = (actions.data ?? []).filter((a) => a.postId === post.id);
  const myOffer = list.find((a) => a.helperId === user?.id && (a.status === 'oferecido' || a.status === 'aceito' || a.status === 'concluido'));

  const change = (a: SupportAction, status: SupportAction['status']) =>
    setStatus.mutate({ id: a.id, status }, {
      onSuccess: () => status === 'concluido' && success(),
      onError: (e) => notify('Não deu certo', (e as Error).message),
    });

  return (
    <View style={styles.box}>
      <Row gap={space.sm}>
        <Icon name="users" size={18} color={colors.coralText} />
        <Txt variant="heading" style={{ flex: 1 }}>{mine ? 'Apoios oferecidos a você' : spec.label}</Txt>
        {!mine ? <Txt variant="title" style={{ color: colors.coralText }}>+5</Txt> : null}
      </Row>

      {!mine && !myOffer ? (
        <>
          <Txt variant="small">{spec.hint}</Txt>
          {spec.disclaimer ? <Txt variant="small" style={{ fontStyle: 'italic' }}>{spec.disclaimer}</Txt> : null}
          <Button label={spec.label} icon={spec.mode === 'agenda' ? 'calendar' : 'clipboard'}
            onPress={() => router.push({ pathname: '/apoio', params: { post: post.id, track: post.channel } })} />
        </>
      ) : null}

      {(mine ? list : myOffer ? [myOffer] : []).map((a) => (
        <View key={a.id} style={styles.offer}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="bodyStrong">{mine ? a.helperName : 'O seu apoio'}</Txt>
            <Txt variant="small" style={{ color: a.status === 'concluido' ? '#16614F' : colors.textSubtle }}>{STATUS[a.status]}</Txt>
          </Row>
          {a.mode === 'agenda' && a.scheduledAt ? (
            <Row gap={6}><Icon name="calendar" size={14} color={colors.petrol} /><Txt variant="small" style={{ color: colors.text }}>{formatWhen(a.scheduledAt)} · 30 minutos</Txt></Row>
          ) : null}
          {a.items.length ? (
            <View style={{ gap: 4 }}>
              {a.items.map((it, i) => <Txt key={i} variant="small" style={{ color: colors.text }}>• {it}</Txt>)}
            </View>
          ) : null}
          {a.message ? <Txt variant="small">“{a.message}”</Txt> : null}

          {mine && a.status === 'oferecido' ? (
            <Row gap={space.sm}>
              <Button label="Aceitar" icon="check" onPress={() => change(a, 'aceito')} />
              <Button label="Agora não" variant="ghost" onPress={() => change(a, 'recusado')} />
            </Row>
          ) : null}
          {mine && a.status === 'aceito' ? (
            a.mode === 'agenda' && a.scheduledAt && new Date(a.scheduledAt) > new Date() ? (
              <Txt variant="small">Está na sua agenda. Depois da conversa, volte aqui e confirme que aconteceu.</Txt>
            ) : (
              <Button label={a.mode === 'agenda' ? 'Aconteceu e me ajudou' : 'Recebi e me ajudou'} icon="heart" onPress={() => change(a, 'concluido')} />
            )
          ) : null}
          {!mine && a.status === 'concluido' ? <Txt variant="small" style={{ color: '#16614F' }}>{a.helpedName} confirmou que ajudou. Os 5 pontos estão no seu extrato.</Txt> : null}
          {!mine && (a.status === 'oferecido' || a.status === 'aceito') ? (
            <Button label="Cancelar meu apoio" variant="ghost" onPress={() => change(a, 'cancelado')} />
          ) : null}
        </View>
      ))}
      {mine && list.length === 0 ? <Txt variant="small">Ainda ninguém ofereceu. Quando oferecerem, você aceita aqui.</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.coralSoft, padding: space.lg },
  offer: { gap: space.sm, backgroundColor: colors.cream, borderRadius: radius.md, padding: space.md },
});
