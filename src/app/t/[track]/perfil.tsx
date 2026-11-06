import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useSession } from '@/auth/session';
import { CheckinStrip, DiagnosticBars } from '@/components/charts';
import { Button, Card, Icon, type IconName, LinkText, Row, Screen, Txt } from '@/components/ui';
import { WeekStrip } from '@/components/engagement';
import { useAllPointsSummaries, useCheckins, useLatestDiagnostic, useLibrary, usePointsSummary, useProgress, useStreak } from '@/data/hooks';
import { KindnessSeal, LessonBadge } from '@/components/badges';
import { spaceIcon } from '@/components/space';
import { trackBadge } from '@/domain/badges';
import { levelInfo } from '@/domain/kindness';
import { AQUECIMENTO, spaceAccess, spaceFor } from '@/domain/spaces';
import { formatShortDate } from '@/domain/dates';
import { confirm } from '@/lib/dialogs';
import { useSpace } from '@/lib/space-context';
import { LevelBadge } from '@/components/feeling';
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
  const sp = useSpace();
  const kindness = usePointsSummary(sp.id);
  const library = useLibrary();
  const diagnostic = useLatestDiagnostic();
  const checkins = useCheckins(14);
  const streak = useStreak();
  const progress = useProgress();
  const lessonsDone = (progress.data ?? []).filter((p) => p.completedAt).length;

  const spaceIds = [AQUECIMENTO, ...(library.data?.tracks ?? []).slice().sort((a, b) => a.sort - b.sort).map((t) => t.id)];
  const summaries = useAllPointsSummaries(spaceIds);

  const myCourses = library.data?.courses.filter((c) => !c.isFree && library.data!.access.has(c.id)) ?? [];

  return (
    <Screen refreshing={library.isRefetching} onRefresh={library.refetch}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Perfil · {sp.title}</Txt>
        <Txt variant="hero">{profile?.fullName || 'Aluno Vivah'}</Txt>
        <Txt>{user?.email}</Txt>
        <View style={{ alignSelf: 'flex-start', marginTop: space.xs }}>
          <LevelBadge level={kindness.data?.level ?? 1} showSeed />
        </View>
      </View>

      {library.data ? (
        <Card style={{ gap: space.md }}>
          <View style={{ gap: 2 }}>
            <Txt variant="heading">Coleção de selos</Txt>
            <Txt variant="small">
              Cada trilha tem dois selos: o de aulas, que se completa pedaço por pedaço a cada curso concluído, e o de bondade, que sobe
              conforme você ajuda as pessoas daquela comunidade.
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {spaceIds.map((id, i) => {
              const s = spaceFor(id, library.data!.tracks)!;
              const lvl = summaries[i]?.data?.level ?? 1;
              const badge = id === AQUECIMENTO ? null : trackBadge(id, library.data!.courses, library.data!.lessons, progress.data ?? []);
              const owned = spaceAccess(id, library.data!.tracks, library.data!.courses, library.data!.access) === 'open';
              return (
                <View key={id} style={{ width: 150, alignItems: 'center', gap: 6, paddingVertical: space.sm }}>
                  <Txt variant="bodyStrong">{s.title}</Txt>
                  <Row gap={space.sm}>
                    {badge ? <LessonBadge badge={badge} icon={spaceIcon(s)} size={58} muted={!owned} /> : null}
                    <KindnessSeal level={lvl} size={badge ? 44 : 58} />
                  </Row>
                  <Txt variant="small" style={{ fontSize: 12, textAlign: 'center' }}>
                    {badge ? `${badge.piecesComplete}/${badge.pieces.length} cursos · ` : ''}{levelInfo(Math.min(8, lvl)).name}
                  </Txt>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      {streak ? (
        <Card onPress={() => router.push('/conquistas')} style={{ gap: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="heading">Sua constância</Txt>
            <LinkText label="Conquistas" onPress={() => router.push('/conquistas')} />
          </Row>
          <Row style={{ justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Txt variant="title">{streak.current}</Txt>
              <Txt variant="small">dias seguidos</Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Txt variant="title">{streak.best}</Txt>
              <Txt variant="small">melhor sequência</Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Txt variant="title">{lessonsDone}</Txt>
              <Txt variant="small">aulas</Txt>
            </View>
          </Row>
          <WeekStrip streak={streak} />
        </Card>
      ) : null}

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
          {profile?.healthConsentAt ? <LinkText label="Check-in" onPress={() => router.push({ pathname: '/checkin', params: { track: sp.id } })} /> : null}
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
        <MenuItem icon="repeat" label="Trocar de trilha" onPress={() => router.push('/')} />
        <MenuItem icon="award" label="Níveis de bondade e prêmios" onPress={() => router.push('/bondade')} />
        <MenuItem icon="star" label="Conselheiros" onPress={() => router.push('/conselheiros')} />
        <MenuItem icon="heart" label="Favoritos" onPress={() => router.push('/favoritos')} />
        <MenuItem icon="bell" label="Lembretes e sequência" onPress={() => router.push('/lembretes')} />
        <MenuItem icon="target" label="Bloco de foco" onPress={() => router.push('/foco')} />
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
