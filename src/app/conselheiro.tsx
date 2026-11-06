import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Chip, Field, Icon, Loading, Row, Screen, Txt } from '@/components/ui';
import { useMyCounselorProfile, usePointsSummary, useSaveCounselorProfile } from '@/data/hooks';
import { AQUECIMENTO } from '@/domain/spaces';
import type { CounselorProfile } from '@/data/types';
import { COUNSELOR_LEVEL, levelInfo } from '@/domain/kindness';
import { success } from '@/lib/haptics';
import { colors, space } from '@/theme';

const CODE = [
  'Eu escuto e compartilho a minha experiência. Não dou diagnóstico nem indico remédio.',
  'Não peço nem passo telefone, endereço ou redes sociais. A conversa fica no app.',
  'Se alguém falar em se machucar, oriento a ligar 188 (CVV) e aviso a equipe Vivah pelo botão Denunciar.',
  'Respeito o tempo e os limites da pessoa, e os meus também.',
];

/** Espaço do conselheiro: só abre no nível Farol, com o código de conduta aceito. */
export default function MeuEspaco() {
  const { track = AQUECIMENTO } = useLocalSearchParams<{ track?: string }>();
  const kindness = usePointsSummary(track);
  const profile = useMyCounselorProfile(track);
  if (kindness.isPending || profile.isPending) return <Loading />;
  const level = kindness.data?.level ?? 1;

  if (level < COUNSELOR_LEVEL) {
    return (
      <Screen padTop={false}>
        <Txt variant="hero">O espaço de conselheiro abre no nível {levelInfo(COUNSELOR_LEVEL).name}</Txt>
        <Txt>Continue acolhendo pessoas na comunidade. Cada obrigado que você recebe te aproxima.</Txt>
        <Button label="Ver os níveis" icon="award" onPress={() => router.replace({ pathname: '/t/[track]/recompensas', params: { track } })} />
      </Screen>
    );
  }
  return <Form trackId={track} initial={profile.data ?? null} />;
}

function Form({ trackId, initial }: { trackId: string; initial: CounselorProfile | null }) {
  const save = useSaveCounselorProfile(trackId);
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [topics, setTopics] = useState((initial?.topics ?? []).join(', '));
  const [open, setOpen] = useState(initial?.isOpen ?? true);
  const [accepted, setAccepted] = useState(Boolean(initial));
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen padTop={false}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Seu espaço de conselheiro</Txt>
        <Txt variant="hero">Obrigado por iluminar o caminho de alguém</Txt>
        <Txt>Antes de abrir, faça a Formação de Conselheiro (três aulas curtas).</Txt>
      </View>
      <Button label="Abrir a Formação de Conselheiro" variant="ghost" icon="play" onPress={() => router.push({ pathname: '/curso/[id]', params: { id: 'formacao-conselheiro' } })} />

      <Card style={{ gap: space.sm }}>
        <Txt variant="heading">Código do conselheiro</Txt>
        {CODE.map((c) => (
          <Row key={c} gap={space.sm} style={{ alignItems: 'flex-start' }}>
            <Icon name="check" size={16} color={colors.coralText} />
            <Txt variant="small" style={{ flex: 1 }}>{c}</Txt>
          </Row>
        ))}
        <Pressable onPress={() => setAccepted(!accepted)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }}>
          <Row gap={space.sm}>
            <Icon name={accepted ? 'check-square' : 'square'} size={20} color={colors.petrol} />
            <Txt variant="bodyStrong">Li e aceito o código</Txt>
          </Row>
        </Pressable>
      </Card>

      <Field label="Sobre você" value={bio} onChangeText={setBio} placeholder="O que você já viveu e em que pode ajudar" multiline maxLength={400} />
      <Field label="Assuntos (separados por vírgula)" value={topics} onChangeText={setTopics} placeholder="Ansiedade, sono, rotina" />
      <Row gap={space.sm}>
        <Chip label="Recebendo pedidos" selected={open} onPress={() => setOpen(true)} />
        <Chip label="Pausado" selected={!open} onPress={() => setOpen(false)} />
      </Row>
      <Button
        label="Salvar meu espaço"
        icon="check"
        loading={save.isPending}
        disabled={!accepted || !bio.trim()}
        onPress={async () => {
          setError(null);
          try {
            await save.mutateAsync({ bio, topics: topics.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6), isOpen: open });
            success();
            router.back();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
    </Screen>
  );
}
