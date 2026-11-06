import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CommunityRules, KIND_INFO } from '@/components/community';
import { Button, Field, Row, Screen, Txt } from '@/components/ui';
import { useCommunityMutations, useTodayCheckin } from '@/data/hooks';
import type { Feeling, PostKind } from '@/data/types';
import { FEELING_ORDER, FEELINGS } from '@/domain/checkin-protocol';
import { AQUECIMENTO } from '@/domain/spaces';
import { success, tap } from '@/lib/haptics';
import { colors, radius, space } from '@/theme';

const PLACEHOLDER: Record<PostKind, string> = {
  apoio: 'Conte o que está acontecendo e em que a comunidade pode ajudar…',
  desabafo: 'Pode colocar para fora. Aqui ninguém julga…',
  conquista: 'O que deu certo? Toda vitória conta…',
  dica: 'O que funcionou para você e pode ajudar alguém…',
};

export default function Publicar() {
  const { channel = AQUECIMENTO, track = AQUECIMENTO } = useLocalSearchParams<{ channel?: string; track?: string }>();
  const { feelingToday } = useTodayCheckin(track);
  const { createPost } = useCommunityMutations();
  const [kind, setKind] = useState<PostKind>('desabafo');
  const [feeling, setFeeling] = useState<Feeling | null | undefined>(undefined);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Sem escolha explícita, usa o sentimento do check-in de hoje.
  const chosen = feeling === undefined ? feelingToday : feeling;

  return (
    <Screen padTop={false}>
      <Txt variant="hero">Nova publicação</Txt>

      <View style={{ gap: space.sm }}>
        <Txt variant="bodyStrong">O que você quer compartilhar?</Txt>
        <View style={styles.wrap}>
          {(Object.keys(KIND_INFO) as PostKind[]).map((k) => (
            <Pressable key={k} onPress={() => { tap(); setKind(k); }} accessibilityRole="button" accessibilityState={{ selected: kind === k }}
              style={[styles.choice, { backgroundColor: kind === k ? KIND_INFO[k].bg : colors.surface, borderColor: kind === k ? KIND_INFO[k].fg : colors.border }]}>
              <Txt variant="bodyStrong" style={{ color: kind === k ? KIND_INFO[k].fg : colors.text }}>{KIND_INFO[k].label === 'Pede apoio' ? 'Pedir apoio' : KIND_INFO[k].label}</Txt>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <Txt variant="bodyStrong">Como você está se sentindo?</Txt>
        <Txt variant="small">Ajuda quem sente o mesmo a encontrar o seu post.</Txt>
        <View style={styles.wrap}>
          {FEELING_ORDER.map((f) => (
            <Pressable key={f} onPress={() => { tap(); setFeeling(chosen === f ? null : f); }} accessibilityRole="button" accessibilityState={{ selected: chosen === f }}
              style={[styles.choice, { backgroundColor: FEELINGS[f].color, borderColor: chosen === f ? FEELINGS[f].text : 'transparent' }]}>
              <Txt variant="bodyStrong" style={{ color: FEELINGS[f].text }}>{FEELINGS[f].label}</Txt>
            </Pressable>
          ))}
        </View>
      </View>

      <Field label="Sua mensagem" value={body} onChangeText={setBody} placeholder={PLACEHOLDER[kind]} multiline maxLength={2000} />
      <Row style={{ justifyContent: 'flex-end' }}>
        <Button
          label="Publicar"
          icon="send"
          loading={createPost.isPending}
          disabled={!body.trim()}
          onPress={async () => {
            setError(null);
            try {
              await createPost.mutateAsync({ channel, body, kind, feeling: chosen ?? null });
              success();
              router.back();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </Row>
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
      <CommunityRules />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: { borderRadius: radius.pill, borderWidth: 2, paddingVertical: 10, paddingHorizontal: space.lg },
});
