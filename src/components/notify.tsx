import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useNotificationReach } from '../data/hooks';
import type { NotificationDraft } from '../data/types';
import { BODY_MAX, isQuietHour, pushCopyIssues, TITLE_MAX } from '../domain/notifications';
import { tap } from '../lib/haptics';
import { colors, fonts, radius, space } from '../theme';
import { Field, Icon, Row, Txt } from './ui';

const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Como o aviso aparece na tela bloqueada do celular. */
export function PhonePreview({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.phone} accessibilityLabel="Prévia da notificação no celular">
      <View style={styles.notif}>
        <Row gap={space.sm}>
          <View style={styles.appIcon}><Txt style={styles.appLetter}>V</Txt></View>
          <Txt style={styles.appName}>Vivah</Txt>
          <Txt style={[styles.appName, { marginLeft: 'auto' }]}>agora</Txt>
        </Row>
        <Txt style={styles.notifTitle} numberOfLines={1}>{title.trim() || 'Título do aviso'}</Txt>
        <Txt style={styles.notifBody} numberOfLines={4}>{body.trim() || 'A mensagem aparece aqui.'}</Txt>
      </View>
    </View>
  );
}

/** Título e mensagem, com contador, prévia, problemas de texto e o alcance. */
export function NotifyComposer({ draft, onChange }: { draft: NotificationDraft; onChange: (d: NotificationDraft) => void }) {
  const issues = pushCopyIssues(draft.kind, draft.title, draft.body);
  const reach = useNotificationReach(draft);
  return (
    <View style={{ gap: space.md }}>
      <Field
        label={`Título (${draft.title.trim().length}/${TITLE_MAX})`}
        value={draft.title}
        onChangeText={(title) => onChange({ ...draft, title })}
        placeholder="Ex.: Live hoje às 20h"
        maxLength={TITLE_MAX + 10}
      />
      <Field
        label={`Mensagem (${draft.body.trim().length}/${BODY_MAX})`}
        value={draft.body}
        onChangeText={(body) => onChange({ ...draft, body })}
        placeholder="O que a pessoa precisa saber, em uma ou duas frases"
        maxLength={BODY_MAX + 20}
        multiline
      />
      <PhonePreview title={draft.title} body={draft.body} />
      {issues.map((i) => (
        <Row key={i.message} gap={6} style={{ alignItems: 'flex-start' }}>
          <Icon name={i.blocking ? 'x-circle' : 'alert-triangle'} size={16} color={i.blocking ? colors.danger : colors.coralText} />
          <Txt variant="small" style={{ flex: 1, color: i.blocking ? colors.danger : colors.coralText }}>{i.message}</Txt>
        </Row>
      ))}
      <Row gap={6}>
        <Icon name="users" size={16} color={colors.petrol} />
        <Txt variant="small" style={{ flex: 1, color: colors.text }}>
          {reach.data
            ? `${fmt(reach.data.recipients)} ${reach.data.recipients === 1 ? 'pessoa recebe' : 'pessoas recebem'} no sino. ${fmt(reach.data.pushTargets)} também por push (quem deixou ligado).`
            : reach.isPending ? 'Calculando o alcance…' : 'Não deu para calcular o alcance.'}
        </Txt>
      </Row>
      {isQuietHour() ? (
        <Row gap={6}>
          <Icon name="moon" size={16} color={colors.coralText} />
          <Txt variant="small" style={{ flex: 1, color: colors.coralText }}>Agora é noite no Brasil. Pense em enviar depois das 8h.</Txt>
        </Row>
      ) : null}
    </View>
  );
}

export function hasBlockingIssues(d: NotificationDraft) {
  return pushCopyIssues(d.kind, d.title, d.body).some((i) => i.blocking);
}

/**
 * "Avisar os alunos" opcional, para usar ao salvar uma aula ou um curso.
 * Desligado por padrão. Quando liga, mostra o texto pronto para editar.
 */
export function NotifyToggle({ label, draft, onChange, on, onToggle }: {
  label: string;
  draft: NotificationDraft;
  onChange: (d: NotificationDraft) => void;
  on: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <View style={[styles.toggle, on && styles.toggleOn]}>
      <Pressable
        onPress={() => {
          tap();
          onToggle(!on);
        }}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={label}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={[styles.toggleIcon, on && { backgroundColor: colors.petrol }]}><Icon name="bell" size={18} color={on ? colors.onDark : colors.petrol} /></View>
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong">{label}</Txt>
          <Txt variant="small">{on ? 'Vai junto ao salvar.' : 'Opcional. Você também pode avisar depois, em Avisos e push.'}</Txt>
        </View>
        <Switch value={on} onValueChange={onToggle} trackColor={{ true: colors.mint, false: colors.border }} thumbColor={colors.surface} accessibilityLabel={label} />
      </Pressable>
      {on ? <NotifyComposer draft={draft} onChange={onChange} /> : null}
    </View>
  );
}

/** Estado local do aviso opcional (texto editável a partir de um rascunho pronto). */
export function useOptionalNotice(initial: () => NotificationDraft) {
  const [on, setOn] = useState(false);
  const [draft, setDraft] = useState<NotificationDraft>(initial);
  return { on, setOn, draft, setDraft };
}

const styles = StyleSheet.create({
  phone: { backgroundColor: '#1F3A40', borderRadius: radius.lg, padding: space.md },
  notif: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: space.md, gap: 2 },
  appIcon: { width: 20, height: 20, borderRadius: 5, backgroundColor: colors.petrol, alignItems: 'center', justifyContent: 'center' },
  appLetter: { fontFamily: fonts.display, fontSize: 13, lineHeight: 16, color: colors.coral },
  appName: { fontFamily: fonts.body, fontSize: 11, color: '#5C6B6E', letterSpacing: 0.2 },
  notifTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 20, color: '#111820', marginTop: 4 },
  notifBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: '#1E2A2E' },
  toggle: { gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  toggleOn: { borderColor: colors.petrol },
  toggleIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' },
});
