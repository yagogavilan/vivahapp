import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/auth/session';
import { AREA_ICON } from '@/components/tracks';
import { Button, Card, Field, Icon, Logo, Row, Screen, Txt } from '@/components/ui';
import { AREA_LABEL } from '@/data/catalog';
import { useUpdateProfile } from '@/data/hooks';
import type { LifeArea } from '@/data/types';
import { AREAS } from '@/domain/diagnostic';
import { colors, radius, space } from '@/theme';

/** Primeiro acesso: nome, objetivo e consentimento para dados de humor e sono. */
export default function BoasVindas() {
  const { profile } = useSession();
  const update = useUpdateProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.fullName ?? '');
  const [goals, setGoals] = useState<LifeArea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggle = (a: LifeArea) => setGoals((g) => (g.includes(a) ? g.filter((x) => x !== a) : [...g, a]));

  async function finish(consent: boolean) {
    setError(null);
    try {
      await update.mutateAsync({
        fullName: name.trim(),
        goal: goals.map((g) => AREA_LABEL[g]).join(', ') || null,
        healthConsentAt: consent ? new Date().toISOString() : null,
        onboardedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen>
      <Logo height={40} />
      <Txt variant="eyebrow">Passo {step + 1} de 3</Txt>

      {step === 0 ? (
        <View style={{ gap: space.lg }}>
          <Txt variant="hero">Que bom ter você aqui. Como podemos te chamar?</Txt>
          <Field label="Seu nome" value={name} onChangeText={setName} placeholder="Nome e sobrenome" autoComplete="name" textContentType="name" />
          <Button label="Continuar" onPress={() => setStep(1)} disabled={name.trim().length < 2} />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: space.lg }}>
          <Txt variant="hero">O que você quer cuidar primeiro?</Txt>
          <Txt>Escolha quantas quiser. A gente usa isso para sugerir o seu próximo passo.</Txt>
          <View style={{ gap: space.sm }}>
            {AREAS.map((a) => {
              const on = goals.includes(a);
              return (
                <Card key={a} onPress={() => toggle(a)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, borderColor: on ? colors.petrol : colors.border, borderWidth: on ? 2 : 1 }}>
                  <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: on ? colors.petrol : colors.sand, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={AREA_ICON[a]} color={on ? colors.coral : colors.textSubtle} />
                  </View>
                  <Txt variant="bodyStrong" style={{ flex: 1 }}>{AREA_LABEL[a]}</Txt>
                  <Icon name={on ? 'check-circle' : 'circle'} color={on ? colors.petrol : colors.border} />
                </Card>
              );
            })}
          </View>
          <Button label="Continuar" onPress={() => setStep(2)} />
        </View>
      ) : null}

      {step === 2 ? (
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
          <Button label="Sim, quero acompanhar" icon="check" onPress={() => finish(true)} loading={update.isPending} />
          <Button label="Agora não" variant="ghost" onPress={() => finish(false)} disabled={update.isPending} />
          {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
        </View>
      ) : null}
    </Screen>
  );
}
