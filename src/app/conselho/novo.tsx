import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Field, Screen, Txt } from '@/components/ui';
import { useAdviceMutations } from '@/data/hooks';
import { success } from '@/lib/haptics';
import { colors, space } from '@/theme';

export default function NovoConselho() {
  const { c, name, track = 'aquecimento' } = useLocalSearchParams<{ c: string; name?: string; track?: string }>();
  const { request } = useAdviceMutations();
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen padTop={false}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Pedir conselho</Txt>
        <Txt variant="hero">Converse com {name ?? 'o conselheiro'}</Txt>
        <Txt>Conte o que está acontecendo. Quando {name ?? 'o conselheiro'} aceitar, a conversa abre aqui no app.</Txt>
      </View>
      <Field label="Assunto" value={topic} onChangeText={setTopic} placeholder="Ex.: ansiedade antes de dormir" maxLength={80} />
      <Field label="Sua mensagem" value={message} onChangeText={setMessage} placeholder="O que você gostaria de conversar?" multiline maxLength={1000} />
      <Card tone="sand" style={{ gap: 4 }}>
        <Txt variant="bodyStrong">Combinados</Txt>
        <Txt variant="small">
          A conversa fica só entre vocês dois, dentro do app. Não passe telefone, endereço ou redes sociais. Conselheiro não substitui
          terapia: em risco, ligue 188 (CVV).
        </Txt>
      </Card>
      <Button
        label="Enviar pedido"
        icon="send"
        loading={request.isPending}
        disabled={topic.trim().length < 2 || !message.trim()}
        onPress={async () => {
          setError(null);
          try {
            const id = await request.mutateAsync({ counselorId: c, trackId: track, topic, message });
            success();
            router.replace({ pathname: '/conselho/[id]', params: { id } });
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
    </Screen>
  );
}
