import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ErrorState, Icon, Loading, Row, Screen, Txt } from '@/components/ui';
import { FadeIn } from '@/components/visual';
import { useClaimReward, useKindness, useRewardClaims } from '@/data/hooks';
import {
  KINDNESS_LEVELS,
  type KindnessReward,
  levelInfo,
  PAIR_CAP_PER_MONTH,
  progressToNext,
  rewardsFor,
  THANK_POINTS,
  THANKS_PER_DAY,
} from '@/domain/kindness';
import { confirm, notify } from '@/lib/dialogs';
import { colors, fonts, radius, space } from '@/theme';

const KIND_ICON = { selo: 'award', conteudo: 'play-circle', fisico: 'gift', acesso: 'star' } as const;

/** Níveis de bondade: o reconhecimento de quem ajuda, com prêmios e conteúdos exclusivos. */
export default function Bondade() {
  const kindness = useKindness();
  const claims = useRewardClaims();
  const claim = useClaimReward();

  if (kindness.isPending) return <Loading />;
  if (kindness.error || !kindness.data) return <ErrorState error={kindness.error} onRetry={kindness.refetch} />;
  const k = kindness.data;
  const prog = progressToNext(k.points, k.givers);
  const me = levelInfo(k.level > 8 ? 8 : k.level);
  const claimed = new Set((claims.data ?? []).map((c) => c.rewardId));

  const action = (r: KindnessReward, unlocked: boolean) => {
    if (!unlocked) return null;
    if (r.kind === 'conteudo' && r.courseId) {
      return <Button label="Acessar" variant="ghost" icon="play" onPress={() => router.push({ pathname: '/curso/[id]', params: { id: r.courseId! } })} />;
    }
    if (r.kind === 'acesso') return <Button label="Abrir meu espaço" variant="ghost" icon="star" onPress={() => router.push('/conselheiro')} />;
    if (r.kind === 'fisico') {
      return claimed.has(r.id) ? (
        <Txt variant="small" style={{ color: '#16614F' }}>Pedido feito. A equipe vai falar com você pelo e-mail.</Txt>
      ) : (
        <Button
          label="Pedir meu prêmio"
          icon="gift"
          loading={claim.isPending}
          onPress={async () => {
            if (await confirm('Pedir o prêmio?', `${r.title}. A equipe Vivah entra em contato pelo seu e-mail para combinar o envio.`, 'Pedir')) {
              claim.mutate(r.id, { onError: (e) => notify('Não deu certo', (e as Error).message) });
            }
          }}
        />
      );
    }
    return <Txt variant="small" style={{ color: '#16614F' }}>Ativo</Txt>;
  };

  return (
    <Screen padTop={false} refreshing={kindness.isRefetching} onRefresh={() => { kindness.refetch(); claims.refetch(); }}>
      <FadeIn>
        <View style={[styles.hero, { backgroundColor: colors.deep }]}>
          <View style={[styles.medal, { backgroundColor: me.color }]}>
            <Icon name={me.level >= 6 ? 'star' : 'heart'} size={34} color={me.textColor} />
          </View>
          <Txt variant="eyebrow" style={{ color: colors.coral }}>Seu nível de bondade</Txt>
          <Txt style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.onDark }}>{me.name}</Txt>
          <Txt style={{ color: colors.onDarkMuted, textAlign: 'center' }}>{me.meaning}</Txt>
          <Row gap={space.xl}>
            <View style={{ alignItems: 'center' }}>
              <Txt variant="title" style={{ color: colors.onDark }}>{k.points}</Txt>
              <Txt variant="small" style={{ color: colors.onDarkMuted }}>pontos</Txt>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Txt variant="title" style={{ color: colors.onDark }}>{k.givers}</Txt>
              <Txt variant="small" style={{ color: colors.onDarkMuted }}>pessoas ajudadas</Txt>
            </View>
          </Row>
          {prog.next ? (
            <View style={{ alignSelf: 'stretch', gap: 6 }}>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(3, prog.ratio * 100)}%` }]} /></View>
              <Txt variant="small" style={{ color: colors.onDarkMuted, textAlign: 'center' }}>
                Para {prog.next.name}: {prog.pointsLeft > 0 ? `faltam ${prog.pointsLeft} pontos` : 'pontos completos'}
                {prog.giversLeft > 0 ? ` e ${prog.giversLeft} ${prog.giversLeft === 1 ? 'pessoa' : 'pessoas'} diferentes` : ''}
              </Txt>
            </View>
          ) : null}
        </View>
      </FadeIn>

      <Card style={{ gap: space.sm }}>
        <Txt variant="heading">Como funciona</Txt>
        <Rule icon="gift" text={`Alguém agradece o seu post ou comentário: ${THANK_POINTS.item} pontos.`} />
        <Rule icon="message-circle" text={`Quem pediu ajuda agradece a sua resposta: ${THANK_POINTS.fromPostAuthor} pontos.`} />
        <Rule icon="star" text={`Uma pessoa agradece o seu conselho (conselheiros): ${THANK_POINTS.advice} pontos.`} />
        <Rule icon="shield" text={`Para ser justo: cada pessoa agradece até ${THANKS_PER_DAY} vezes por dia, e de uma mesma pessoa contam ${PAIR_CAP_PER_MONTH} agradecimentos por mês. Cada nível pede pontos e também um número de pessoas diferentes.`} />
      </Card>

      <View style={{ gap: space.md }}>
        <Txt variant="title">Os oito níveis</Txt>
        {KINDNESS_LEVELS.map((l) => {
          const unlocked = k.level >= l.level;
          const rewards = rewardsFor(l.level);
          return (
            <View key={l.level} style={[styles.level, unlocked ? styles.levelOn : null]}>
              <Row gap={space.md}>
                <View style={[styles.levelIcon, { backgroundColor: unlocked ? l.color : colors.sand }]}>
                  <Icon name={unlocked ? (l.level >= 6 ? 'star' : 'heart') : 'lock'} size={18} color={unlocked ? l.textColor : colors.textSubtle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{l.level}. {l.name}</Txt>
                  <Txt variant="small">{l.meaning}</Txt>
                </View>
                {l.level > 1 ? <Txt variant="small" style={{ textAlign: 'right' }}>{l.minPoints} pts{'\n'}{l.minGivers} pessoas</Txt> : null}
              </Row>
              {rewards.map((r) => (
                <View key={r.id} style={styles.reward}>
                  <Icon name={KIND_ICON[r.kind]} size={16} color={unlocked ? colors.coralText : colors.textSubtle} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="bodyStrong" style={{ fontSize: 15 }}>{r.title}</Txt>
                    <Txt variant="small">{r.description}</Txt>
                    <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>{action(r, unlocked)}</View>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function Rule({ icon, text }: { icon: 'gift' | 'message-circle' | 'star' | 'shield'; text: string }) {
  return (
    <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
      <Icon name={icon} size={16} color={colors.coralText} />
      <Txt variant="small" style={{ flex: 1 }}>{text}</Txt>
    </Row>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.sm },
  medal: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)' },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.coral },
  level: { gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, opacity: 0.85 },
  levelOn: { opacity: 1, borderColor: colors.coral },
  levelIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reward: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', paddingLeft: space.xs },
});
