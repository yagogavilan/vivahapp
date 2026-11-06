import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { STATUS_LABEL } from '@/components/advice';
import { EmergencyCard } from '@/components/care';
import { Composer, when } from '@/components/community';
import { Button, Empty, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { useAdviceMessages, useAdviceMutations, useAdviceRequests, useCommunityMutations } from '@/data/hooks';
import { confirm, notify } from '@/lib/dialogs';
import { success } from '@/lib/haptics';
import { colors, radius, space } from '@/theme';

export default function Conversa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const requests = useAdviceRequests();
  const messages = useAdviceMessages(id);
  const { setStatus, send } = useAdviceMutations();
  const { thank, report } = useCommunityMutations();

  if (requests.isPending) return <Loading />;
  const r = requests.data?.find((x) => x.id === id);
  if (!r) return <Screen padTop={false}><Empty icon="message-circle" title="Conversa não encontrada" /></Screen>;
  const iAmCounselor = r.counselorId === user?.id;
  const other = iAmCounselor ? r.requesterName : r.counselorName;

  return (
    <Screen padTop={false} refreshing={messages.isRefetching} onRefresh={() => { requests.refetch(); messages.refetch(); }}>
      <View style={{ gap: space.xs }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="eyebrow">{iAmCounselor ? 'Pedido de conselho' : 'Conversa com conselheiro'}</Txt>
          <Pill label={STATUS_LABEL[r.status].label} tone={STATUS_LABEL[r.status].tone} />
        </Row>
        <Txt variant="hero">{other}</Txt>
        <Txt variant="bodyStrong">{r.topic}</Txt>
      </View>

      <View style={{ gap: space.sm }}>
        <Bubble mine={!iAmCounselor} body={r.message} at={r.createdAt} />
        {(messages.data ?? []).map((m) => (
          <Bubble key={m.id} mine={m.senderId === user?.id} body={m.body} at={m.createdAt} />
        ))}
      </View>

      {iAmCounselor && r.status === 'pendente' ? (
        <Row gap={space.sm}>
          <Button label="Aceitar conversa" icon="check" onPress={() => setStatus.mutate({ id: r.id, status: 'aceito' })} />
          <Button label="Agora não" variant="ghost" onPress={() => setStatus.mutate({ id: r.id, status: 'recusado' })} />
        </Row>
      ) : null}
      {!iAmCounselor && r.status === 'pendente' ? (
        <Txt variant="small">Esperando {other} aceitar. Você recebe a resposta aqui.</Txt>
      ) : null}

      {r.status === 'aceito' ? (
        <Composer label="Mensagem" placeholder="Escreva com calma…" cta="Enviar" busy={send.isPending} onSend={(body) => send.mutateAsync({ requestId: r.id, body })} />
      ) : null}

      {!iAmCounselor && (r.status === 'aceito' || r.status === 'encerrado') ? (
        <View style={styles.thanks}>
          <Txt variant="bodyStrong">{other} te ajudou?</Txt>
          <Txt variant="small">O seu obrigado vale 30 pontos de bondade para quem aconselhou.</Txt>
          <Button
            label="Agradecer o conselho"
            icon="gift"
            loading={thank.isPending}
            onPress={() =>
              thank.mutate({ type: 'advice', id: r.id }, {
                onSuccess: () => { success(); notify('Obrigado enviado', `${other} vai saber que ajudou você.`); },
                onError: (e) => notify('Não deu para agradecer', (e as Error).message),
              })
            }
          />
        </View>
      ) : null}

      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {r.status === 'aceito' || (r.status === 'pendente' && !iAmCounselor) ? (
          <Button
            label="Encerrar conversa"
            variant="ghost"
            onPress={async () => {
              if (await confirm('Encerrar a conversa?', 'Vocês não poderão mais trocar mensagens aqui.', 'Encerrar')) setStatus.mutate({ id: r.id, status: 'encerrado' });
            }}
          />
        ) : null}
        <Button
          label="Denunciar"
          variant="danger"
          onPress={async () => {
            if (await confirm('Denunciar esta conversa?', 'A equipe Vivah vai revisar com cuidado.', 'Denunciar', true)) {
              report.mutate({ type: 'advice', id: r.id, reason: 'Denúncia pelo app' }, { onSuccess: () => notify('Obrigado por avisar') });
            }
          }}
        />
      </Row>
      <EmergencyCard compact />
    </Screen>
  );
}

function Bubble({ mine, body, at }: { mine: boolean; body: string; at: string }) {
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Txt style={{ color: mine ? colors.onDark : colors.text }}>{body}</Txt>
      <Txt variant="small" style={{ color: mine ? colors.onDarkMuted : colors.textSubtle, fontSize: 12 }}>{when(at)}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', borderRadius: radius.lg, padding: space.md, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.petrol, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  thanks: { gap: space.sm, backgroundColor: colors.coralSoft, borderRadius: radius.lg, padding: space.lg },
});
