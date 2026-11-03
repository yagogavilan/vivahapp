import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { Button, Card, Field, LinkText, Logo, Txt } from '@/components/ui';
import { DEMO_CODE, IS_DEMO } from '@/lib/config';
import { colors, space } from '@/theme';

export default function Entrar() {
  const { requestCode, verifyCode } = useSession();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      await requestCode(email);
      setStep('code');
    } catch (e) {
      setError((e as Error).message || 'Não foi possível enviar o código.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      await verifyCode(email, code);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.petrol }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + space.xxxl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Logo dark height={64} />
          <View style={{ gap: space.sm }}>
            <Txt variant="hero" style={{ color: colors.onDark }}>Mente, corpo e carreira, um passo por vez.</Txt>
            <Txt style={{ color: colors.onDarkMuted }}>
              Entre para acessar a Área de Aquecimento: lives, o Escudo Anticrise diário e as suas trilhas.
            </Txt>
          </View>

          <Card style={{ gap: space.lg }}>
            {step === 'email' ? (
              <>
                <Field
                  label="Seu e-mail"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="voce@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={() => validEmail && sendCode()}
                  hint="Já é aluno? Use o mesmo e-mail da inscrição para ver os seus cursos."
                />
                <Button label="Receber código" icon="mail" onPress={sendCode} loading={busy} disabled={!validEmail} />
              </>
            ) : (
              <>
                <Txt>
                  Enviamos um código de 6 dígitos para <Txt variant="bodyStrong">{email.trim().toLowerCase()}</Txt>. Confira
                  também a caixa de spam.
                </Txt>
                <Field
                  label="Código"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  style={{ letterSpacing: 8, fontSize: 24, textAlign: 'center' }}
                  onSubmitEditing={() => code.length === 6 && confirm()}
                />
                <Button label="Entrar" icon="log-in" onPress={confirm} loading={busy} disabled={code.length !== 6} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <LinkText label="Trocar e-mail" onPress={() => { setStep('email'); setCode(''); setError(null); }} />
                  <LinkText label="Reenviar código" onPress={sendCode} />
                </View>
              </>
            )}
            {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
          </Card>

          {IS_DEMO ? (
            <Txt variant="small" style={{ color: colors.onDarkMuted, textAlign: 'center' }}>
              Modo demonstração: use qualquer e-mail e o código {DEMO_CODE}.
            </Txt>
          ) : null}
          <Txt variant="small" style={{ color: colors.onDarkMuted, textAlign: 'center' }}>
            A Vivah é educação para o bem-estar e não substitui acompanhamento com profissional de saúde.
          </Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.xxxl },
  inner: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: space.xl },
});
