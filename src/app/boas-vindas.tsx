import { router } from 'expo-router';
import { setFirstTrack } from '@/lib/first-run';
import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/auth/session';
import { LifeTestQuestions, LifeTestResult } from '@/components/life-test';
import { Button, Card, Field, Icon, Logo, Row, Screen, Txt } from '@/components/ui';
import { AREA_LABEL } from '@/data/catalog';
import { useLibrary, useSaveDiagnostic, useUpdateProfile } from '@/data/hooks';
import type { LifeResult } from '@/domain/life-test';
import { colors, space } from '@/theme';

/**
 * Primeiro acesso: nome, consentimento para dados de saúde e o teste do
 * momento de vida, que indica por qual trilha começar.
 */
export default function BoasVindas() {
  const { profile } = useSession();
  const update = useUpdateProfile();
  const save = useSaveDiagnostic();
  const library = useLibrary();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.fullName ?? '');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<LifeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function finish(trackId: string) {
    setError(null);
    setFirstTrack(trackId);
    try {
      await update.mutateAsync({
        fullName: name.trim(),
        goal: result ? AREA_LABEL[result.goal] : null,
        healthConsentAt: consent ? new Date().toISOString() : null,
        onboardedAt: new Date().toISOString(),
        preferences: { ...(profile?.preferences ?? {}), lastSpace: trackId },
      });
      // Entra direto na trilha escolhida; as outras ficam na tela de escolha.
      router.replace({ pathname: '/t/[track]', params: { track: trackId } });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen>
      <Logo height={40} />
      {step < 2 ? <Txt variant="eyebrow">Passo {step + 1} de 3</Txt> : null}

      {step === 0 ? (
        <View style={{ gap: space.lg }}>
          <Txt variant="hero">Que bom ter você aqui. Como podemos te chamar?</Txt>
          <Field label="Seu nome" value={name} onChangeText={setName} placeholder="Nome e sobrenome" autoComplete="name" textContentType="name" />
          <Button label="Continuar" onPress={() => setStep(1)} disabled={name.trim().length < 2} />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: space.lg }}>
          <Txt variant="hero">Quer acompanhar o seu humor e o seu sono?</Txt>
          <Card style={{ gap: space.md }}>
            <Row>
              <Icon name="shield" color={colors.petrol} />
              <Txt variant="bodyStrong">Seus dados, suas regras</Txt>
            </Row>
            <Txt>
              Com o check-in diário, você registra humor, energia e sono e vê a sua evolução no app. Pela LGPD, esses são
              dados de saúde: só guardamos com a sua autorização, ninguém além de você vê, e você pode desligar e apagar tudo
              quando quiser em Perfil → Privacidade.
            </Txt>
          </Card>
          <Button label="Sim, quero acompanhar" icon="check" onPress={() => { setConsent(true); setStep(2); }} />
          <Button label="Agora não" variant="ghost" onPress={() => { setConsent(false); setStep(2); }} />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: space.lg }}>
          <Txt variant="eyebrow">Passo 3 de 3</Txt>
          <Txt variant="hero">Em que momento da vida você está?</Txt>
          <Txt>
            São 14 perguntas rápidas, umas 3 minutos. No fim, você vê o seu momento e a trilha mais indicada para começar. É uma
            indicação: todas as trilhas ficam abertas para você conhecer.
          </Txt>
          <Button label="Começar o teste" icon="arrow-right" onPress={() => setStep(3)} />
        </View>
      ) : null}

      {step === 3 ? (
        <LifeTestQuestions
          onDone={(answers, r) => {
            setResult(r);
            setStep(4);
            save.mutate({ answers, scores: r.needs, trackId: r.recommendedTrackId, moment: r.moment.id });
          }}
        />
      ) : null}

      {step === 4 && result ? (
        <LifeTestResult result={result} tracks={library.data?.tracks ?? []} startLabel={update.isPending ? 'Entrando…' : 'Começar por esta trilha'} onStart={finish} />
      ) : null}
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
    </Screen>
  );
}
