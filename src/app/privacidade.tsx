import { useState } from 'react';
import { Platform, Share, Switch, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Button, Card, Icon, Row, Screen, Txt } from '@/components/ui';
import { api } from '@/data';
import { useUpdateProfile } from '@/data/hooks';
import { SUPPORT_EMAIL } from '@/lib/config';
import { confirm, notify } from '@/lib/dialogs';
import { colors, space } from '@/theme';

export default function Privacidade() {
  const { profile } = useSession();
  const update = useUpdateProfile();
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const consent = Boolean(profile?.healthConsentAt);

  async function toggleConsent(on: boolean) {
    if (!on && !(await confirm('Desligar o acompanhamento?', 'Todos os seus check-ins de humor e sono serão apagados.', 'Desligar e apagar', true))) return;
    update.mutate({ healthConsentAt: on ? new Date().toISOString() : null });
  }

  async function exportData() {
    setBusy('export');
    try {
      const data = JSON.stringify(await api.exportMyData(), null, 2);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'meus-dados-vivah.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: 'Meus dados Vivah', message: data });
      }
    } catch (e) {
      notify('Não foi possível exportar', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    const ok = await confirm(
      'Apagar a sua conta?',
      'Perfil, progresso, agenda, check-ins, diagnósticos e publicações serão apagados para sempre. Os cursos que você tem continuam ligados ao seu e-mail.',
      'Apagar conta',
      true,
    );
    if (!ok) return;
    setBusy('delete');
    try {
      await api.deleteAccount();
    } catch (e) {
      notify('Não foi possível apagar', (e as Error).message);
      setBusy(null);
    }
  }

  return (
    <Screen padTop={false}>
      <Txt variant="eyebrow">Privacidade</Txt>
      <Txt variant="hero">Seus dados, suas regras</Txt>

      <Card style={{ gap: space.md }}>
        <Row gap={space.md}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="heading">Acompanhamento de humor e sono</Txt>
            <Txt variant="small">
              Guarda os seus check-ins diários para mostrar a sua evolução. São dados de saúde (LGPD, art. 11): só você vê, e
              desligar apaga tudo.
            </Txt>
          </View>
          <Switch
            value={consent}
            onValueChange={toggleConsent}
            disabled={update.isPending}
            trackColor={{ true: colors.mint, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel="Acompanhamento de humor e sono"
          />
        </Row>
      </Card>

      <Card style={{ gap: space.md }}>
        <Txt variant="heading">Baixar meus dados</Txt>
        <Txt variant="small">Um arquivo com o seu perfil, acessos, progresso, agenda, diagnósticos, check-ins e publicações.</Txt>
        <View style={{ alignSelf: 'flex-start' }}>
          <Button label="Baixar" icon="download" variant="ghost" loading={busy === 'export'} onPress={exportData} />
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <Row>
          <Icon name="info" color={colors.petrol} />
          <Txt variant="heading">Sobre a Vivah</Txt>
        </Row>
        <Txt variant="small">
          A Vivah oferece educação para o bem-estar (psicoeducação, rotina, carreira, finanças, corpo e alimentação). Não
          substitui psicoterapia, consulta médica, nutricional ou de educação física. Em sofrimento intenso, ligue 188 (CVV).
        </Txt>
        <Txt variant="small">Dúvidas sobre privacidade: {SUPPORT_EMAIL}</Txt>
      </Card>

      <Card style={{ gap: space.md, borderColor: colors.danger }}>
        <Txt variant="heading" style={{ color: colors.danger }}>Apagar minha conta</Txt>
        <Txt variant="small">Remove a sua conta e os seus dados pessoais do app. Não dá para desfazer.</Txt>
        <View style={{ alignSelf: 'flex-start' }}>
          <Button label="Apagar conta" variant="danger" icon="trash-2" loading={busy === 'delete'} onPress={deleteAccount} />
        </View>
      </Card>
    </Screen>
  );
}
