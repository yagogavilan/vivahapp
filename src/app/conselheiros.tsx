import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { EmergencyCard } from '@/components/care';
import { STATUS_LABEL } from '@/components/advice';
import { Avatar } from '@/components/community';
import { LevelBadge } from '@/components/feeling';
import { Button, Card, Empty, Icon, Loading, Pill, Row, Screen, Txt } from '@/components/ui';
import { FadeIn } from '@/components/visual';
import { useAdviceRequests, useCounselors, usePointsSummary } from '@/data/hooks';
import { AQUECIMENTO } from '@/domain/spaces';
import { COUNSELOR_LEVEL, levelInfo } from '@/domain/kindness';
import { TrackContextBar } from '@/components/space';
import { colors, radius, space } from '@/theme';


export default function Conselheiros() {
  const { user } = useSession();
  const { track = AQUECIMENTO } = useLocalSearchParams<{ track?: string }>();
  const counselors = useCounselors(track);
  const requests = useAdviceRequests();
  const kindness = usePointsSummary(track);

  if (counselors.isPending) return <Loading />;
  const canCounsel = (kindness.data?.level ?? 1) >= COUNSELOR_LEVEL;
  const mine = (requests.data ?? []).filter((r) => r.trackId === track);
  const list = (counselors.data ?? []).filter((c) => c.userId !== user?.id);

  return (
    <Screen padTop={false} refreshing={counselors.isRefetching} onRefresh={() => { counselors.refetch(); requests.refetch(); }}>
      <TrackContextBar trackId={track} />
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Conselheiros Vivah</Txt>
        <Txt variant="hero">Converse com quem já passou por isso</Txt>
        <Txt>
          Conselheiros são alunos que chegaram ao nível {levelInfo(COUNSELOR_LEVEL).name} nesta trilha ajudando outras pessoas e fizeram a
          Formação de Conselheiro. Eles compartilham experiência: não fazem terapia nem diagnóstico.
        </Txt>
      </View>

      {mine.length ? (
        <View style={{ gap: space.sm }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Suas conversas</Txt>
          {mine.map((r) => {
            const other = r.requesterId === user?.id ? r.counselorName : r.requesterName;
            return (
              <Card key={r.id} onPress={() => router.push({ pathname: '/conselho/[id]', params: { id: r.id } })} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="bodyStrong">{other}</Txt>
                  <Pill label={STATUS_LABEL[r.status].label} tone={STATUS_LABEL[r.status].tone} />
                </Row>
                <Txt variant="small">{r.requesterId === user?.id ? 'Você pediu' : 'Pediu a você'}: {r.topic}</Txt>
              </Card>
            );
          })}
        </View>
      ) : null}

      <Card tone={canCounsel ? 'dark' : 'sand'} onPress={() => (canCounsel ? router.push({ pathname: '/conselheiro', params: { track } }) : router.push({ pathname: '/t/[track]/recompensas', params: { track } }))} style={{ gap: 4 }}>
        <Row gap={space.sm}>
          <Icon name="star" size={18} color={canCounsel ? '#F2C14E' : colors.coralText} />
          <Txt variant="bodyStrong" style={canCounsel ? { color: colors.onDark } : undefined}>
            {canCounsel ? 'Seu espaço de conselheiro' : 'Quer ser conselheiro um dia?'}
          </Txt>
        </Row>
        <Txt variant="small" style={canCounsel ? { color: colors.onDarkMuted } : undefined}>
          {canCounsel
            ? 'Abra ou feche o seu espaço, escreva sobre você e veja quem pediu conselho.'
            : `Ajude pessoas na comunidade. No nível ${levelInfo(COUNSELOR_LEVEL).name} você pode abrir o seu espaço.`}
        </Txt>
      </Card>

      <View style={{ gap: space.md }}>
        <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Disponíveis agora</Txt>
        {list.length === 0 ? <Empty icon="star" title="Nenhum conselheiro disponível agora" text="Volte mais tarde." /> : null}
        {list.map((c, i) => (
          <FadeIn key={c.userId} delay={i * 60}>
            <View style={styles.card}>
              <Row gap={space.md}>
                <Avatar name={c.name} level={c.level} size={48} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt variant="heading">{c.name}</Txt>
                  <LevelBadge level={c.level} />
                </View>
              </Row>
              <Txt style={{ color: colors.text }}>{c.bio}</Txt>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {c.topics.map((t) => <Pill key={t} label={t} />)}
              </Row>
              <Button label="Pedir conselho" icon="message-circle" onPress={() => router.push({ pathname: '/conselho/novo', params: { c: c.userId, name: c.name, track } })} />
            </View>
          </FadeIn>
        ))}
      </View>
      <EmergencyCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg },
});
