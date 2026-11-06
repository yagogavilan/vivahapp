/**
 * As mesmas regras de pontos do banco (função award da migração
 * 20261107000000), em memória, para o modo demonstração e para os testes.
 */
import { DAILY_CAP, POINTS, RULES, type PointKind } from '../domain/points';
import type { PointEvent, PointStatus } from './types';

export interface LedgerEvent extends PointEvent {
  userId: string;
  actorId: string | null;
  day: string;
  postId?: string;
  commentId?: string;
  thankId?: string;
  supportId?: string;
}

export interface AwardInput {
  userId: string;
  actorId: string | null;
  actorName: string | null;
  trackId: string;
  kind: PointKind;
  status: Exclude<PointStatus, 'recusado'>;
  day: string;
  now: string;
  refs?: Pick<LedgerEvent, 'postId' | 'commentId' | 'thankId' | 'supportId'>;
}

const DAY_MS = 86_400_000;

/** Aplica limites e devolve o evento (válido, pendente ou recusado com motivo). */
export function award(ledger: LedgerEvent[], input: AwardInput): LedgerEvent | null {
  const { userId, actorId, trackId, kind, day, now } = input;
  if (!userId || userId === actorId) return null;
  const points = POINTS[kind];
  const counted = ledger.filter(
    (e) => e.userId === userId && e.trackId === trackId && e.kind === kind && e.day === day && e.status !== 'recusado',
  );
  const usedToday = counted.reduce((s, e) => s + e.points, 0);
  const since = (days: number) => ledger.filter(
    (e) => e.userId === userId && e.actorId === actorId && e.kind === kind && e.status === 'valido' && Date.parse(now) - Date.parse(e.createdAt) < days * DAY_MS,
  ).length;

  let status: PointStatus = input.status;
  let reason: string | null = null;
  if (usedToday + points > DAILY_CAP[kind]) {
    status = 'recusado';
    reason = 'Limite diário desta atividade atingido.';
  } else if (kind === 'curtida' && since(30) >= RULES.curtidasDaMesmaPessoaPorMes) {
    status = 'recusado';
    reason = 'Curtidas da mesma pessoa contam até 10 vezes por mês.';
  } else if (kind === 'agradecimento' && since(30) >= RULES.agradecimentosDaMesmaPessoaPorMes) {
    status = 'recusado';
    reason = 'Agradecimentos da mesma pessoa contam até 3 vezes por mês.';
  } else if (kind === 'apoio' && since(7) >= RULES.apoioMesmaPessoaPorSemana) {
    status = 'recusado';
    reason = 'Apoio para a mesma pessoa conta uma vez por semana.';
  }
  return {
    id: Math.random().toString(36).slice(2, 10),
    userId,
    actorId,
    actorName: input.actorName,
    trackId,
    kind,
    points: status === 'recusado' ? 0 : points,
    status,
    reason,
    day,
    createdAt: now,
    ...input.refs,
  };
}

/** Pontos ganhos (válidos) e pessoas diferentes de alguém numa trilha. */
export function statsOf(ledger: LedgerEvent[], userId: string, trackId: string) {
  const valid = ledger.filter((e) => e.userId === userId && e.trackId === trackId && e.status === 'valido');
  return {
    earned: valid.reduce((s, e) => s + e.points, 0),
    givers: new Set(valid.map((e) => e.actorId).filter(Boolean)).size,
  };
}
