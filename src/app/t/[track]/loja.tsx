import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { KindnessSeal, LessonBadge, SealCaption } from '@/components/badges';
import { SpaceHeader, spaceIcon } from '@/components/space';
import { StoreProducts } from '@/components/store';
import { Button, Card, ErrorState, Icon, type IconName, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { FadeIn } from '@/components/visual';
import { useLibrary, usePointEvents, usePointsSummary, useProgress, useRedeem, useRedemptions } from '@/data/hooks';
import type { PointKind } from '@/data/types';
import { trackBadge } from '@/domain/badges';
import { formatShortDate } from '@/domain/dates';
import { COUNSELOR_LEVEL, levelInfo, progressToNext } from '@/domain/kindness';
import { DAILY_CAP, DAILY_COUNT, formatPoints, MAX_POINTS_PER_DAY, POINT_KINDS, POINTS, STATUS_LABEL } from '@/domain/points';
import { pointLabel } from '@/domain/programs';
import { monthsOf, rewardsOf, type TrackReward } from '@/domain/rewards';
import { AQUECIMENTO } from '@/domain/spaces';
import { confirm, notify } from '@/lib/dialogs';
import { success } from '@/lib/haptics';
import { useSpace } from '@/lib/space-context';
import { colors, fonts, radius, space } from '@/theme';

const KIND_ICON: Record<PointKind, IconName> = { curtida: 'heart', agradecimento: 'gift', ajuda: 'message-circle', conselho: 'edit-3', apoio: 'users' };
const REWARD_ICON: Record<TrackReward['kind'], IconName> = { digital: 'play-circle', experiencia: 'video', fisico: 'package', acesso: 'star' };

type Aba = 'produtos' | 'pontos';

/**
 * Loja da trilha, com duas partes que não se misturam:
 * - Produtos: itens físicos que a Vivah vende (pagamento fora do app);
 * - Resgatar com pontos: recompensas da bondade (saldo, selos, catálogo e extrato).
 */
export default function Loja() {
  const sp = useSpace();
  const { aba } = useLocalSearchParams<{ aba?: string }>();
  const tab: Aba = aba === 'pontos' ? 'pontos' : 'produtos';
  const library = useLibrary();
  const summary = usePointsSummary(sp.id);
  return (
    <Screen refreshing={library.isRefetching || summary.isRefetching} onRefresh={() => { library.refetch(); summary.refetch(); }}>
      <SpaceHeader space={sp} />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">Loja · {sp.title}</Txt>
        <Txt variant="hero">{tab === 'produtos' ? 'Produtos Vivah' : 'Sua bondade vale prêmios'}</Txt>
      </View>
      <View style={styles.segment} accessibilityRole="tablist">
        {([['produtos', 'Produtos', 'shopping-bag'], ['pontos', 'Resgatar pontos', 'gift']] as const).map(([id, label, icon]) => (
          <Pressable key={id} onPress={() => router.setParams({ aba: id })} accessibilityRole="tab" accessibilityState={{ selected: tab === id }}
            style={[styles.segmentItem, tab === id && styles.segmentOn]}>
            <Icon name={icon} size={16} color={tab === id ? colors.onDark : colors.petrol} />
            <Txt variant="bodyStrong" style={{ fontSize: 14, color: tab === id ? colors.onDark : colors.petrol }}>{label}</Txt>
          </Pressable>
        ))}
      </View>
      {tab === 'produtos' ? <StoreProducts trackId={sp.id} /> : <PointsRewards />}
    </Screen>
  );
}

/** Recompensas da trilha: saldo, selos, como pontuar, catálogo e extrato. */
function PointsRewards() {
  const sp = useSpace();
  const summary = usePointsSummary(sp.id);
  const events = usePointEvents(sp.id);
  const redemptions = useRedemptions();
  const redeem = useRedeem();
  const library = useLibrary();
  const progress = useProgress();
  const [showRefused, setShowRefused] = useState(false);

  if (summary.isPending || library.isPending) return <Txt variant="small">Carregando…</Txt>;
  if (summary.error || !summary.data) return <ErrorState error={summary.error} onRetry={summary.refetch} />;
  const s = summary.data;
  const prog = progressToNext(s.earned, s.givers);
  const lvl = levelInfo(Math.min(8, s.level));
  const mine = new Map((redemptions.data ?? []).filter((r) => r.status !== 'cancelado').map((r) => [r.rewardId, r]));
  const rewards = rewardsOf(sp.id).sort((a, b) => Number(a.kind === 'acesso') - Number(b.kind === 'acesso') || a.cost - b.cost);
  const badge = library.data && sp.id !== AQUECIMENTO ? trackBadge(sp.id, library.data.courses, library.data.lessons, progress.data ?? []) : null;
  const list = (events.data ?? []).filter((e) => showRefused || e.status !== 'recusado').slice(0, 30);

  const doRedeem = async (r: TrackReward) => {
    const msg = r.kind === 'fisico' ? 'A equipe Vivah fala com você pelo e-mail para combinar o envio.' : 'O conteúdo abre na hora em Cursos.';
    if (!(await confirm(`Resgatar por ${formatPoints(r.cost)} pontos?`, `${r.title}. ${msg}`, 'Resgatar'))) return;
    redeem.mutate(r.id, {
      onSuccess: () => {
        success();
        notify('Recompensa resgatada', r.title);
      },
      onError: (e) => notify('Não deu para resgatar', (e as Error).message),
    });
  };

  return (
    <>

      <FadeIn>
        <View style={styles.hero}>
          <Txt variant="eyebrow" style={{ color: colors.coral }}>Saldo para resgatar</Txt>
          <Txt style={styles.balance}>{formatPoints(s.balance)}</Txt>
          <Txt style={{ color: colors.onDarkMuted }}>pontos de bondade na {sp.title}</Txt>
          <Row gap={space.xl} style={{ marginTop: space.sm }}>
            <Stat label="ganhos" value={formatPoints(s.earned)} />
            <Stat label="pessoas" value={String(s.givers)} />
            <Stat label="nível" value={lvl.name} />
          </Row>
          {prog.next ? (
            <View style={{ alignSelf: 'stretch', gap: 6, marginTop: space.sm }}>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(2, prog.ratio * 100)}%` }]} /></View>
              <Txt variant="small" style={{ color: colors.onDarkMuted, textAlign: 'center' }}>
                Para {prog.next.name}: {prog.pointsLeft > 0 ? `faltam ${formatPoints(prog.pointsLeft)} pontos` : 'pontos completos'}
                {prog.giversLeft > 0 ? ` e ${prog.giversLeft} ${prog.giversLeft === 1 ? 'pessoa diferente' : 'pessoas diferentes'}` : ''}
              </Txt>
            </View>
          ) : null}
        </View>
      </FadeIn>

      <View style={{ gap: space.sm }}>
        <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Seus selos da {sp.title}</Txt>
        <Row gap={space.xl} style={{ justifyContent: 'center' }}>
          {badge ? (
            <View style={{ alignItems: 'center' }}>
              <LessonBadge badge={badge} icon={spaceIcon(sp)} />
              <SealCaption title={badge.complete ? 'Selo de aulas completo' : 'Selo de aulas'} sub={`${badge.piecesComplete} de ${badge.pieces.length} pedaços · ${badge.percent}%`} />
            </View>
          ) : null}
          <View style={{ alignItems: 'center' }}>
            <KindnessSeal level={s.level} />
            <SealCaption title={`Selo ${lvl.name}`} sub="Bondade nesta trilha" />
          </View>
        </Row>
        <Pressable onPress={() => router.push({ pathname: '/t/[track]/perfil', params: { track: sp.id } })}>
          <Txt variant="small" style={{ textAlign: 'center', textDecorationLine: 'underline' }}>Ver a coleção de selos de todas as trilhas</Txt>
        </Pressable>
      </View>

      <Card style={{ gap: space.md }}>
        <Txt variant="heading">Como ganhar pontos na {sp.title}</Txt>
        {POINT_KINDS.map((k) => (
          <Row key={k} gap={space.md}>
            <View style={styles.kindIcon}><Icon name={KIND_ICON[k]} size={16} color={colors.coralText} /></View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong" style={{ fontSize: 15 }}>{pointLabel(sp.id, k)}</Txt>
              <Txt variant="small" style={{ fontSize: 13 }}>
                Conta até {DAILY_COUNT[k]} {DAILY_COUNT[k] === 1 ? 'vez' : 'vezes'} por dia (máx. {DAILY_CAP[k]} pontos)
              </Txt>
            </View>
            <Txt variant="title" style={{ color: colors.coralText }}>+{POINTS[k]}</Txt>
          </Row>
        ))}
        <Txt variant="small">
          No máximo {MAX_POINTS_PER_DAY} pontos por dia nesta trilha. Mensagens e dicas passam por validação (tamanho, ajuda de verdade, nada de
          ofensa ou contato fora do app). Curtidas da mesma pessoa contam até 10 por mês e agradecimentos, até 3.
        </Txt>
      </Card>

      <View style={{ gap: space.md }}>
        <Txt variant="title">Recompensas da {sp.title}</Txt>
        <Txt variant="small">A mais barata pede um mês fazendo tudo, todos os dias. Resgatar não diminui o seu nível.</Txt>
        {rewards.map((r) => {
          const got = mine.get(r.id);
          const levelOk = s.level >= r.minLevel;
          const enough = s.balance >= r.cost;
          return (
            <View key={r.id} style={[styles.reward, got && { borderColor: colors.mint }]}>
              <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
                <View style={[styles.rewardIcon, { backgroundColor: got ? colors.mintSoft : colors.coralSoft }]}>
                  <Icon name={REWARD_ICON[r.kind]} size={20} color={got ? '#16614F' : colors.coralText} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="bodyStrong">{r.title}</Txt>
                  <Txt variant="small">{r.description}</Txt>
                </View>
              </Row>
              <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm }}>
                <Txt variant="bodyStrong" style={{ color: colors.text }}>
                  {r.kind === 'acesso' ? 'Grátis no nível' : `${formatPoints(r.cost)} pontos`}
                  <Txt variant="small">{r.kind === 'acesso' ? ` ${levelInfo(r.minLevel).name}` : ` · ${monthsOf(r.cost)} ${monthsOf(r.cost) === 1 ? 'mês' : 'meses'} de dedicação`}</Txt>
                </Txt>
                {r.minLevel > 1 && r.kind !== 'acesso' ? <Txt variant="small">Nível {levelInfo(r.minLevel).name}+</Txt> : null}
              </Row>
              {got ? (
                <Row gap={space.sm}>
                  <Icon name="check-circle" size={16} color="#16614F" />
                  <Txt variant="small" style={{ color: '#16614F', flex: 1 }}>
                    {got.status === 'liberado' ? 'Resgatado. Já está em Cursos.' : got.status === 'solicitado' ? 'Pedido feito. A equipe vai falar com você pelo e-mail.' : `Status: ${got.status}`}
                  </Txt>
                  {r.courseId ? <Button label="Abrir" variant="ghost" onPress={() => router.push({ pathname: '/curso/[id]', params: { id: r.courseId! } })} /> : null}
                </Row>
              ) : r.kind === 'acesso' ? (
                s.level >= COUNSELOR_LEVEL ? (
                  <Button label="Abrir meu espaço" variant="ghost" icon="star" onPress={() => router.push({ pathname: '/conselheiro', params: { track: sp.id } })} />
                ) : (
                  <Row gap={6}><Icon name="lock" size={14} color={colors.textSubtle} /><Txt variant="small">Abre no nível {levelInfo(r.minLevel).name}</Txt></Row>
                )
              ) : !levelOk ? (
                <Row gap={6}><Icon name="lock" size={14} color={colors.textSubtle} /><Txt variant="small">Liberado a partir do nível {levelInfo(r.minLevel).name}</Txt></Row>
              ) : !enough ? (
                <View style={{ gap: 4 }}>
                  <ProgressBar value={(s.balance / r.cost) * 100} color={colors.coral} />
                  <Txt variant="small">Faltam {formatPoints(r.cost - s.balance)} pontos</Txt>
                </View>
              ) : (
                <Button label="Resgatar" icon="gift" loading={redeem.isPending} onPress={() => doRedeem(r)} />
              )}
            </View>
          );
        })}
      </View>

      <View style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="title">Seus pontos</Txt>
          <Pressable onPress={() => setShowRefused(!showRefused)}>
            <Txt variant="small" style={{ textDecorationLine: 'underline' }}>{showRefused ? 'Esconder os que não pontuaram' : 'Mostrar os que não pontuaram'}</Txt>
          </Pressable>
        </Row>
        {list.length === 0 ? <Txt variant="small">Ainda sem pontos nesta trilha. Comece ajudando alguém na comunidade.</Txt> : null}
        {list.map((e) => (
          <Row key={e.id} gap={space.md} style={styles.event}>
            <Icon name={KIND_ICON[e.kind]} size={16} color={e.status === 'recusado' ? colors.textSubtle : colors.coralText} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong" style={{ fontSize: 14 }}>{pointLabel(sp.id, e.kind)}{e.actorName ? ` · ${e.actorName}` : ''}</Txt>
              <Txt variant="small" style={{ fontSize: 12 }}>
                {formatShortDate(e.createdAt)} · {STATUS_LABEL[e.status]}{e.reason && e.status !== 'valido' ? ` · ${e.reason}` : ''}
              </Txt>
            </View>
            <Txt variant="bodyStrong" style={{ color: e.status === 'valido' ? '#16614F' : colors.textSubtle }}>
              {e.status === 'recusado' ? '0' : `+${e.points}`}
            </Txt>
          </Row>
        ))}
      </View>

      <Card tone="dark" onPress={() => router.push({ pathname: '/conselheiros', params: { track: sp.id } })} style={{ gap: 4 }}>
        <Row gap={space.sm}>
          <Icon name="star" size={18} color="#F2C14E" />
          <Txt variant="bodyStrong" style={{ color: colors.onDark }}>Conselheiros da {sp.title}</Txt>
        </Row>
        <Txt variant="small" style={{ color: colors.onDarkMuted }}>No nível Farol você abre o seu espaço para aconselhar outras pessoas.</Txt>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Txt variant="bodyStrong" style={{ color: colors.onDark }}>{value}</Txt>
      <Txt variant="small" style={{ color: colors.onDarkMuted }}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: space.sm, borderRadius: radius.pill },
  segmentOn: { backgroundColor: colors.petrol },
  hero: { backgroundColor: colors.deep, borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: 2 },
  balance: { fontFamily: fonts.display, fontSize: 56, lineHeight: 64, color: colors.onDark },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.coral },
  kindIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
  reward: { gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg },
  rewardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  event: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md },
});
