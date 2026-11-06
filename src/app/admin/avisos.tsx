import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminGate } from '@/components/admin';
import { hasBlockingIssues, NotifyComposer } from '@/components/notify';
import { Button, Card, Chip, Empty, Icon, Row, Screen, Txt } from '@/components/ui';
import { ScreenSkeleton } from '@/components/visual';
import { useLibrary, useNotificationReach, useSendNotification, useSentNotifications } from '@/data/hooks';
import type { NotificationDraft, SentNotification, Track } from '@/data/types';
import { ANNOUNCEMENT_TARGETS, KIND_ICON, KIND_LABEL, openRate, relativeTime } from '@/domain/notifications';
import { confirm, notify } from '@/lib/dialogs';
import { colors, radius, space } from '@/theme';

const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Admin: escrever um aviso (push + sino) e ver o que já foi enviado. */
export default function AdminAvisos() {
  return (
    <AdminGate>
      <AdminAvisosBody />
    </AdminGate>
  );
}

const EMPTY: NotificationDraft = {
  kind: 'announcement', title: '', body: '', url: '/avisos', audience: 'all', trackId: null, courseId: null, lessonId: null,
};

function AdminAvisosBody() {
  const library = useLibrary();
  const history = useSentNotifications();
  if (library.isPending) return <ScreenSkeleton />;
  const tracks = library.data?.tracks ?? [];

  return (
    <Screen padTop={false} refreshing={history.isRefetching} onRefresh={history.refetch}>
      <View style={{ gap: 4 }}>
        <Txt variant="hero">Avisos e push</Txt>
        <Txt>Chega como notificação no celular de quem deixou ligado e fica no sino do app para todos do público.</Txt>
      </View>
      <Composer tracks={tracks} />
      <View style={{ gap: space.sm }}>
        <Txt variant="title">Enviados</Txt>
        {history.isPending ? <Txt variant="small">Carregando…</Txt> : null}
        {history.data?.length === 0 ? <Empty icon="bell" title="Nenhum aviso enviado ainda" /> : null}
        {history.data?.map((n) => <SentRow key={n.id} n={n} tracks={tracks} />)}
      </View>
    </Screen>
  );
}

function Composer({ tracks }: { tracks: Track[] }) {
  const { send } = useSendNotification();
  const [draft, setDraft] = useState<NotificationDraft>(EMPTY);
  const [target, setTarget] = useState('avisos');
  const [error, setError] = useState<string | null>(null);
  const reach = useNotificationReach(draft);
  const set = (patch: Partial<NotificationDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const pickTarget = (id: string, trackId = draft.trackId) => {
    setTarget(id);
    set({ url: ANNOUNCEMENT_TARGETS.find((t) => t.id === id)!.url(trackId) });
  };

  const submit = async () => {
    setError(null);
    const who = reach.data ? `${fmt(reach.data.recipients)} pessoas` : 'o público escolhido';
    const ok = await confirm('Enviar agora?', `Vai para ${who}. Depois de enviado, não dá para apagar do celular das pessoas.`, 'Enviar');
    if (!ok) return;
    send.mutate(draft, {
      onSuccess: () => {
        setDraft(EMPTY);
        setTarget('avisos');
        notify('Enviando', 'O aviso está saindo. Os números aparecem na lista em alguns segundos.');
      },
      onError: (e) => setError(e.message),
    });
  };

  return (
    <Card style={{ gap: space.lg }}>
      <View style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Tipo</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="Aviso" selected={draft.kind === 'announcement'} onPress={() => set({ kind: 'announcement' })} />
          <Chip label="Lançamento ou oferta" selected={draft.kind === 'launch'} onPress={() => set({ kind: 'launch' })} />
        </Row>
        <Txt variant="small">
          {draft.kind === 'launch'
            ? 'Só chega por push a quem aceitou receber lançamentos (regra da Apple). Os outros veem no sino.'
            : 'Lives, horários, mudanças e recados. Para vender algo, use Lançamento.'}
        </Txt>
      </View>

      <View style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Para quem</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="Todos os alunos" selected={draft.audience === 'all'} onPress={() => { set({ audience: 'all', trackId: null }); pickTarget(target, null); }} />
          {tracks.map((t) => (
            <Chip
              key={t.id}
              label={`Assinantes ${t.title}`}
              selected={draft.audience === 'track' && draft.trackId === t.id}
              onPress={() => { set({ audience: 'track', trackId: t.id }); pickTarget(target, t.id); }}
            />
          ))}
        </Row>
      </View>

      <View style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Ao tocar, abre</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          {ANNOUNCEMENT_TARGETS.filter((t) => draft.trackId || !['hoje', 'loja', 'comunidade'].includes(t.id)).map((t) => (
            <Chip key={t.id} label={t.label} selected={target === t.id} onPress={() => pickTarget(t.id)} />
          ))}
        </Row>
      </View>

      <NotifyComposer draft={draft} onChange={setDraft} />
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
      <Button label="Enviar aviso" icon="send" disabled={hasBlockingIssues(draft)} loading={send.isPending} onPress={submit} />
    </Card>
  );
}

const STATUS: Record<SentNotification['status'], { label: string; color: string; bg: string }> = {
  draft: { label: 'Não enviado', color: colors.textMuted, bg: colors.sand },
  sending: { label: 'Enviando', color: colors.petrol, bg: colors.mintSoft },
  sent: { label: 'Enviado', color: '#16614F', bg: colors.mintSoft },
  failed: { label: 'Falhou', color: colors.danger, bg: colors.coralSoft },
};

function SentRow({ n, tracks }: { n: SentNotification; tracks: Track[] }) {
  const { retry } = useSendNotification();
  const st = STATUS[n.status];
  const audience = n.audience === 'all' ? 'Todos' : n.audience === 'track' ? `Assinantes ${tracks.find((t) => t.id === n.trackId)?.title ?? ''}` : 'Quem tem o curso';
  return (
    <View style={styles.sent}>
      <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
        <View style={styles.kind}><Icon name={KIND_ICON[n.kind]} size={18} color={colors.petrol} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodyStrong">{n.title}</Txt>
          <Txt variant="small" numberOfLines={2}>{n.body}</Txt>
          <Txt variant="small" style={{ fontSize: 12 }}>{KIND_LABEL[n.kind]}, {audience.toLowerCase()}, {relativeTime(n.sentAt ?? n.createdAt)}</Txt>
        </View>
        <View style={[styles.status, { backgroundColor: st.bg }]}><Txt variant="small" style={{ fontSize: 12, color: st.color }}>{st.label}</Txt></View>
      </Row>
      {n.status === 'sent' || n.status === 'sending' ? (
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          <Stat value={fmt(n.recipients)} label="no sino" />
          <Stat value={fmt(n.pushOk)} label="push entregues" />
          <Stat value={`${openRate(n)}%`} label="abriram" />
        </Row>
      ) : null}
      {n.pushFailed > 0 && n.status === 'sent' ? (
        <Txt variant="small" style={{ fontSize: 12 }}>{fmt(n.pushFailed)} celulares não receberam (app apagado ou sem internet). Os que não existem mais saem da lista.</Txt>
      ) : null}
      {n.status === 'failed' || n.status === 'draft' ? (
        <View style={{ gap: space.xs }}>
          {n.error ? <Txt variant="small" style={{ color: colors.danger }}>{n.error}</Txt> : null}
          <Button label="Tentar de novo" variant="secondary" icon="refresh-cw" loading={retry.isPending} onPress={() => retry.mutate(n.id)} />
        </View>
      ) : null}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Txt variant="bodyStrong">{value}</Txt>
      <Txt variant="small" style={{ fontSize: 12 }}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  sent: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  kind: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' },
  status: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2 },
  stat: { flex: 1, minWidth: 90, padding: space.sm, borderRadius: radius.md, backgroundColor: colors.cream },
});
