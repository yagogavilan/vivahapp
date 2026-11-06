import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { Button, Card, Icon, LinkText, Logo, Row, Txt } from '@/components/ui';
import { passwordProblems, passwordStrength, validEmail } from '@/domain/auth';
import { DEMO_CODE, IS_DEMO } from '@/lib/config';
import { tap } from '@/lib/haptics';
import { colors, fonts, radius, space } from '@/theme';

type Mode = 'entrar' | 'criar' | 'confirmar' | 'esqueci' | 'nova-senha';

/** Entrar com e-mail e senha, criar conta (com código de confirmação) e recuperar a senha. */
export default function Entrar() {
  const { auth } = useSession();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const go = (m: Mode) => { setMode(m); setError(null); setInfo(null); setCode(''); };
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message || 'Não deu certo. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  const pwProblems = passwordProblems(password);
  const strength = passwordStrength(password);
  const emailOk = validEmail(email);
  const canSignIn = emailOk && password.length > 0;
  const canSignUp = name.trim().length >= 2 && emailOk && !pwProblems.length && confirm === password && terms;
  const canReset = code.length === 6 && !pwProblems.length && confirm === password;

  const signIn = () => run(async () => {
    try {
      await auth.signIn(email, password);
    } catch (e) {
      if ((e as Error).message.startsWith('Confirme')) {
        await auth.resendSignUpCode(email).catch(() => undefined);
        go('confirmar');
        setInfo('Sua conta ainda não foi confirmada. Enviamos um novo código.');
        return;
      }
      throw e;
    }
  });
  const signUp = () => run(async () => {
    const r = await auth.signUp(name, email, password);
    if (r.needsCode) go('confirmar');
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.petrol }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + space.xxl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Logo dark height={56} />
          <Txt variant="hero" style={{ color: colors.onDark }}>Um passo de cada vez.</Txt>

          <Card style={{ gap: space.lg }}>
            {mode === 'entrar' || mode === 'criar' ? (
              <View style={styles.tabs} accessibilityRole="tablist">
                {([['entrar', 'Entrar'], ['criar', 'Criar conta']] as const).map(([m, label]) => (
                  <Pressable key={m} onPress={() => { tap(); go(m); }} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}
                    style={[styles.tab, mode === m && styles.tabOn]}>
                    <Txt variant="bodyStrong" style={{ color: mode === m ? colors.onDark : colors.petrol }}>{label}</Txt>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable onPress={() => go(mode === 'confirmar' ? 'criar' : 'entrar')} accessibilityRole="button" hitSlop={8}>
                <Row gap={6}><Icon name="arrow-left" size={18} color={colors.petrol} /><Txt variant="bodyStrong">Voltar</Txt></Row>
              </Pressable>
            )}

            {mode === 'entrar' ? (
              <>
                <Input icon="mail" label="E-mail" value={email} onChange={setEmail} kind="email" onSubmit={() => canSignIn && signIn()} />
                <PasswordInput label="Senha" value={password} onChange={setPassword} autoComplete="current-password" onSubmit={() => canSignIn && signIn()} />
                <Button label="Entrar" icon="log-in" onPress={signIn} loading={busy} disabled={!canSignIn} />
                <Row style={{ justifyContent: 'center' }}>
                  <LinkText label="Esqueci a senha" onPress={() => go('esqueci')} />
                </Row>
              </>
            ) : null}

            {mode === 'criar' ? (
              <>
                <Input icon="user" label="Nome" value={name} onChange={setName} kind="name" />
                <Input icon="mail" label="E-mail" value={email} onChange={setEmail} kind="email" hint="Já comprou? Use o mesmo e-mail da compra." />
                <PasswordInput label="Senha" value={password} onChange={setPassword} autoComplete="new-password" />
                {password ? (
                  <View style={{ gap: 4 }}>
                    <Row gap={4}>
                      {[1, 2, 3].map((n) => (
                        <View key={n} style={[styles.meter, { backgroundColor: strength >= n ? (strength === 1 ? colors.coral : strength === 2 ? '#E9B949' : colors.mint) : colors.sand }]} />
                      ))}
                    </Row>
                    <Txt variant="small" style={{ fontSize: 12, color: pwProblems.length ? colors.coralText : '#16614F' }}>
                      {pwProblems.length ? `Falta: ${pwProblems.join(', ')}` : strength === 3 ? 'Senha forte' : 'Senha boa'}
                    </Txt>
                  </View>
                ) : null}
                <PasswordInput label="Repita a senha" value={confirm} onChange={setConfirm} autoComplete="new-password"
                  error={confirm && confirm !== password ? 'As senhas não são iguais' : undefined} />
                <Pressable onPress={() => setTerms((t) => !t)} accessibilityRole="checkbox" accessibilityState={{ checked: terms }} style={styles.terms}>
                  <Icon name={terms ? 'check-square' : 'square'} size={20} color={terms ? colors.petrol : colors.textSubtle} />
                  <Txt variant="small" style={{ flex: 1 }}>Aceito os termos de uso e a política de privacidade (LGPD).</Txt>
                </Pressable>
                <Button label="Criar conta" icon="user-plus" onPress={signUp} loading={busy} disabled={!canSignUp} />
              </>
            ) : null}

            {mode === 'confirmar' ? (
              <>
                <View style={{ gap: 4 }}>
                  <Txt variant="title">Confirme o e-mail</Txt>
                  <Txt variant="small">Código enviado para <Txt variant="bodyStrong" style={{ fontSize: 14 }}>{email.trim().toLowerCase()}</Txt></Txt>
                </View>
                <CodeInput value={code} onChange={setCode} onSubmit={() => code.length === 6 && run(() => auth.confirmSignUp(email, code))} />
                <Button label="Confirmar e entrar" icon="check" onPress={() => run(() => auth.confirmSignUp(email, code))} loading={busy} disabled={code.length !== 6} />
                <Row style={{ justifyContent: 'center' }}>
                  <LinkText label="Reenviar código" onPress={() => run(async () => { await auth.resendSignUpCode(email); setInfo('Novo código enviado.'); })} />
                </Row>
              </>
            ) : null}

            {mode === 'esqueci' ? (
              <>
                <Txt variant="title">Recuperar a senha</Txt>
                <Input icon="mail" label="E-mail da conta" value={email} onChange={setEmail} kind="email" />
                <Button label="Enviar código" icon="send" onPress={() => run(async () => { await auth.requestPasswordReset(email); go('nova-senha'); })} loading={busy} disabled={!emailOk} />
              </>
            ) : null}

            {mode === 'nova-senha' ? (
              <>
                <View style={{ gap: 4 }}>
                  <Txt variant="title">Nova senha</Txt>
                  <Txt variant="small">Código enviado para <Txt variant="bodyStrong" style={{ fontSize: 14 }}>{email.trim().toLowerCase()}</Txt></Txt>
                </View>
                <CodeInput value={code} onChange={setCode} />
                <PasswordInput label="Nova senha" value={password} onChange={setPassword} autoComplete="new-password"
                  error={password && pwProblems.length ? `Falta: ${pwProblems.join(', ')}` : undefined} />
                <PasswordInput label="Repita a nova senha" value={confirm} onChange={setConfirm} autoComplete="new-password"
                  error={confirm && confirm !== password ? 'As senhas não são iguais' : undefined} />
                <Button label="Salvar e entrar" icon="check" onPress={() => run(() => auth.resetPassword(email, code, password))} loading={busy} disabled={!canReset} />
              </>
            ) : null}

            {info ? <Row gap={6}><Icon name="info" size={16} color={colors.petrol} /><Txt variant="small" style={{ flex: 1 }}>{info}</Txt></Row> : null}
            {error ? <Row gap={6}><Icon name="alert-circle" size={16} color={colors.danger} /><Txt variant="small" style={{ flex: 1, color: colors.danger }}>{error}</Txt></Row> : null}
          </Card>

          {IS_DEMO ? (
            <Txt variant="small" style={{ color: colors.onDarkMuted, textAlign: 'center' }}>
              Demonstração: entre com ana@exemplo.com e a senha vivah1234, ou crie uma conta (código {DEMO_CODE}).
            </Txt>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ icon, label, value, onChange, kind, hint, onSubmit }: {
  icon: 'mail' | 'user';
  label: string;
  value: string;
  onChange: (v: string) => void;
  kind: 'email' | 'name';
  hint?: string;
  onSubmit?: () => void;
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.input}>
        <Icon name={icon} size={18} color={colors.textSubtle} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={label}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={label}
          style={styles.inputText}
          onSubmitEditing={onSubmit}
          {...(kind === 'email'
            ? { keyboardType: 'email-address' as const, autoCapitalize: 'none' as const, autoComplete: 'email' as const, textContentType: 'emailAddress' as const }
            : { autoCapitalize: 'words' as const, autoComplete: 'name' as const, textContentType: 'name' as const })}
        />
      </View>
      {hint ? <Txt variant="small" style={{ fontSize: 12 }}>{hint}</Txt> : null}
    </View>
  );
}

function PasswordInput({ label, value, onChange, autoComplete, error, onSubmit }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string;
  onSubmit?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <View style={[styles.input, error ? { borderColor: colors.danger } : null]}>
        <Icon name="lock" size={18} color={colors.textSubtle} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={label}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={label}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete={autoComplete}
          textContentType={autoComplete === 'new-password' ? 'newPassword' : 'password'}
          style={styles.inputText}
          onSubmitEditing={onSubmit}
        />
        <Pressable onPress={() => setShow((s) => !s)} accessibilityRole="button" accessibilityLabel={show ? 'Esconder senha' : 'Mostrar senha'} hitSlop={10}>
          <Icon name={show ? 'eye-off' : 'eye'} size={18} color={colors.textSubtle} />
        </Pressable>
      </View>
      {error ? <Txt variant="small" style={{ fontSize: 12, color: colors.danger }}>{error}</Txt> : null}
    </View>
  );
}

function CodeInput({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit?: () => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000"
      placeholderTextColor={colors.border}
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={6}
      accessibilityLabel="Código de 6 dígitos"
      onSubmitEditing={onSubmit}
      style={styles.code}
    />
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.xxxl },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: space.xl },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.pill, backgroundColor: colors.sand },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  tabOn: { backgroundColor: colors.petrol },
  input: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 52, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  // Na web, o contorno de foco fica no campo inteiro (borda), não no texto de dentro.
  inputText: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, paddingVertical: space.sm, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  meter: { flex: 1, height: 5, borderRadius: 3 },
  terms: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  code: { fontFamily: fonts.bodyBold, fontSize: 28, letterSpacing: 10, textAlign: 'center', color: colors.text, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
});
