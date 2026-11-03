import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useSession } from '@/auth/session';
import { CheckinStrip, DiagnosticBars } from '@/components/charts';
import { Button, Card, Icon, type IconName, LinkText, Row, Screen, Txt } from '@/components/ui';
import { useCheckins, useLatestDiagnostic, useLibrary } from '@/data/hooks';
import { formatShortDate } from '@/domain/dates';
import { confirm } from '@/lib/dialogs';
import { colors, space } from '@/theme';

function MenuItem({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Row gap={space.md} style={{ paddingVertical: space.sm }}>
        <Icon name={icon} color={colors.petrol} />
        <Txt variant="bodyStrong" style={{ flex: 1 }}>{label}</Txt>
        <Icon name="chevron-right" color={colors.textSubtle} />
      </Row>
    </Pressable>
  );
}

export default function Perfil() {
  const { profile, user, signOut } = useSession();
  const library = useLibrary();
  const diagnostic = useLatestDiagnostic();
  const checkins = useCheckins(14);

  const myCourses = library.data?.courses.filter((c) => !c.isFree && library.data!.access.has(c.id)) ?? [];

  return (
    <Screen refreshing={library.isRefetching} onRefresh={library.refetch}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Perfil</Txt>
        <Txt variant="hero">{profile?.fullName || 'Aluno Vivah'}</Txt>
        <Txt>{user?.email}</Txt>
      </View>

      <Card style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Meus cursos</Txt>
          <LinkText label={library.isRefetching ? 'Atualizando…' : 'Atualizar'} onPress={() => library.refetch()} />
        </Row>
        {myCourses.length ? (
          myCourses.map((c) => (
            <Pressable key={c.id} onPress={() => router.push({ pathname: '/curso/[id]', params: { id: c.id } })}>
              <Row gap={space.md}>
                <Icon name="play-circle" color={colors.coralText} />
                <Txt variant="bodyStrong" style={{ flex: 1 }}>{c.title}</Txt>
              </Row>
            </Pressable>
          ))
        ) : (
          <Txt variant="small">
            Você está na Área de Aquecimento, com as lives e o Escudo Anticrise liberados. Os cursos aparecem aqui quando o
            acesso é liberado para o seu e-mail.
          </Txt>
        )}
      </Card>

      <Card style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Minha evolução</Txt>
          {profile?.healthConsentAt ? <LinkText label="Check-in" onPress={() => router.push('/checkin')} /> : null}
        </Row>
        {profile?.healthConsentAt ? (
          <CheckinStrip checkins={checkins.data ?? []} />
        ) : (
          <View style={{ gap: space.sm }}>
            <Txt variant="small">Ative o check-in de humor e sono para ver a sua evolução aqui.</Txt>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button label="Ativar" variant="ghost" onPress={() => router.push('/privacidade')} />
            </View>
          </View>
        )}
      </Card>

      <Card style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">Diagnóstico</Txt>
          <LinkText label={diagnostic.data ? 'Refazer' : 'Fazer'} onPress={() => router.push('/diagnostico')} />
        </Row>
        {diagnostic.data ? (
          <>
            <Txt variant="small">Feito em {formatShortDate(diagnostic.data.createdAt)}. Refaça a cada 30 dias para comparar.</Txt>
            <DiagnosticBars scores={diagnostic.data.scores} />
          </>
        ) : (
          <Txt variant="small">12 perguntas para saber por qual trilha começar.</Txt>
        )}
      </Card>

      <Card style={{ gap: 0 }}>
        <MenuItem icon="shield" label="Privacidade e meus dados" onPress={() => router.push('/privacidade')} />
        <MenuItem
          icon="log-out"
          label="Sair"
          onPress={async () => {
            if (await confirm('Sair da conta?', 'Você pode entrar de novo com o seu e-mail.', 'Sair')) signOut();
          }}
        />
      </Card>
    </Screen>
  );
}
