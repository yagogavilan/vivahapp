import { router } from 'expo-router';
import { setFirstTrack } from '@/lib/first-run';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { LifeTestQuestions, LifeTestResult } from '@/components/life-test';
import { Button, Field, Icon, Logo, Row, Screen, Txt } from '@/components/ui';
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
  // Quem criou a conta com nome pula a primeira etapa.
  const [step, setStep] = useState(profile?.fullName ? 1 : 0);
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
      <Row style={{ justifyContent: 'space-between' }}>
        <Logo height={32} />
        {step < 3 ? (
          <Row gap={6}>
            {[0, 1, 2].map((n) => <View key={n} style={{ width: n === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: n <= step ? colors.coral : colors.sand }} />)}
          </Row>
        ) : null}
      </Row>

      {step === 0 ? (
        <View style={{ gap: space.lg }}>
          <Txt variant="hero">Como podemos te chamar?</Txt>
          <Field label="Seu nome" value={name} onChangeText={setName} placeholder="Nome e sobrenome" autoComplete="name" textContentType="name" />
          <Button label="Continuar" onPress={() => setStep(1)} disabled={name.trim().length < 2} />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: space.lg }}>
          <View style={styles.bigIcon}><Icon name="heart" size={36} color={colors.coral} /></View>
          <Txt variant="hero">Acompanhar humor e sono?</Txt>
          <View style={{ gap: space.sm }}>
            {[['bar-chart-2', 'Você vê a sua evolução'], ['lock', 'Só você vê os seus dados'], ['trash-2', 'Desliga e apaga quando quiser']].map(([icon, text]) => (
              <Row key={text} gap={space.md}>
                <View style={styles.smallIcon}><Icon name={icon as 'lock'} size={16} color={colors.petrol} /></View>
                <Txt variant="bodyStrong" style={{ flex: 1 }}>{text}</Txt>
              </Row>
            ))}
          </View>
          <Txt variant="small" style={{ fontSize: 12 }}>São dados de saúde (LGPD): guardamos só com a sua autorização.</Txt>
          <Button label="Sim, quero acompanhar" icon="check" onPress={() => { setConsent(true); setStep(2); }} />
          <Button label="Agora não" variant="ghost" onPress={() => { setConsent(false); setStep(2); }} />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: space.lg }}>
          <View style={styles.bigIcon}><Icon name="compass" size={36} color={colors.coral} /></View>
          <Txt variant="hero">Em que momento da vida você está?</Txt>
          <Row gap={space.lg}>
            {[['help-circle', '14 perguntas'], ['clock', '3 minutos'], ['map', 'Sua trilha ideal']].map(([icon, text]) => (
              <View key={text} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={styles.smallIcon}><Icon name={icon as 'map'} size={18} color={colors.petrol} /></View>
                <Txt variant="small" style={{ textAlign: 'center', color: colors.text }}>{text}</Txt>
              </View>
            ))}
          </Row>
          <Button label="Começar o teste" onPress={() => setStep(3)} />
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
        <LifeTestResult result={result} tracks={library.data?.tracks ?? []} startLabel={update.isPending ? 'Entrando' : 'Começar'} onStart={finish} />
      ) : null}
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
  smallIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' },
});
