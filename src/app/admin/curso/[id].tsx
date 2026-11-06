import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AddButton, AdminGate, AdminRow, AdminSection, backTo, ConfirmDelete } from '@/components/admin';
import { TrackContextBar } from '@/components/space';
import { Button, Card, Chip, Empty, ErrorState, Icon, Row, Screen, Txt, Field } from '@/components/ui';
import { ScreenSkeleton } from '@/components/visual';
import { hasBlockingIssues, NotifyComposer } from '@/components/notify';
import { useAdmin, useLibrary, useSendNotification } from '@/data/hooks';
import { draftForCourse } from '@/domain/notifications';
import { confirm } from '@/lib/dialogs';
import type { Course, LowTicketFormat, Module } from '@/data/types';
import { isCheckoutUrl, moveId, slugId } from '@/domain/admin';
import { colors, fonts, radius, space } from '@/theme';

type Lib = NonNullable<ReturnType<typeof useLibrary>['data']>;

export default function AdminCourse() {
  return (
    <AdminGate>
      <AdminCourseBody />
    </AdminGate>
  );
}

function AdminCourseBody() {
  const params = useLocalSearchParams<{ id: string; track?: string; low?: string; sort?: string }>();
  const library = useLibrary();
  if (library.isPending) return <ScreenSkeleton />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  const isNew = params.id === 'novo';
  const course = isNew ? undefined : lib.courses.find((c) => c.id === params.id);
  if (!isNew && !course) return <Screen padTop={false}><Empty icon="book" title="Curso não encontrado" /></Screen>;
  const trackId = course?.trackId ?? params.track ?? '';
  const track = lib.trackById.get(trackId);
  if (!track) return <Screen padTop={false}><Empty icon="map" title="Escolha uma trilha primeiro" /></Screen>;

  return (
    <Screen padTop={false} refreshing={library.isRefetching} onRefresh={library.refetch}>
      <TrackContextBar trackId={track.id} />
      <View style={{ gap: 4 }}>
        <Txt variant="eyebrow">Administração · Trilha {track.title}</Txt>
        <Txt variant="hero">{course ? course.title : params.low ? 'Novo low ticket' : 'Novo curso'}</Txt>
      </View>
      <CourseForm
        key={course?.id ?? 'novo'}
        lib={lib}
        trackId={track.id}
        course={course}
        defaultLow={params.low === '1'}
        defaultSort={Number(params.sort) || Math.max(0, ...lib.courses.map((c) => c.sort)) + 1}
      />
      {course ? <ModulesEditor lib={lib} course={course} /> : null}
      {course ? <CourseNotice key={course.id} lib={lib} course={course} /> : null}
    </Screen>
  );
}

const FORMATS: { id: LowTicketFormat; label: string }[] = [
  { id: 'aula', label: 'Aula curta' },
  { id: 'planilha', label: 'Planilha' },
  { id: 'ferramenta', label: 'Ferramenta' },
];

function CourseForm({ lib, trackId, course, defaultLow, defaultSort }: { lib: Lib; trackId: string; course?: Course; defaultLow: boolean; defaultSort: number }) {
  const admin = useAdmin();
  const product = course ? lib.products.find((p) => p.id === course.id) : undefined;
  const [title, setTitle] = useState(course?.title ?? '');
  const [summary, setSummary] = useState(course?.summary ?? '');
  const [low, setLow] = useState(course?.lowTicket ?? defaultLow);
  const [format, setFormat] = useState<LowTicketFormat>(course?.format ?? 'aula');
  const [price, setPrice] = useState(course?.priceLabel ?? '');
  const [url, setUrl] = useState(product?.checkoutUrl ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = admin.saveCourse.isPending || admin.setCheckout.isPending;
  const urlOk = !url.trim() || isCheckoutUrl(url);
  const valid = title.trim().length >= 3 && summary.trim().length >= 3 && urlOk && (!low || price.trim().length > 0);

  const save = async () => {
    setSaved(false);
    setError(null);
    try {
      const id = course?.id ?? slugId(title, lib.courses.map((c) => c.id));
      await admin.saveCourse.mutateAsync({
        id,
        trackId,
        title: title.trim(),
        summary: summary.trim(),
        lowTicket: low,
        format: low ? format : null,
        priceLabel: low ? price.trim() : null,
        sort: course?.sort ?? defaultSort,
      });
      if (low && (url.trim() || product?.checkoutUrl)) await admin.setCheckout.mutateAsync({ productId: id, url: url.trim() || null });
      if (!course) {
        // Curso criado: abre a página dele para cadastrar módulos e aulas.
        router.replace({ pathname: '/admin/curso/[id]', params: { id } });
        return;
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Txt variant="bodyStrong">Tipo</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="Curso da trilha (assinatura)" selected={!low} onPress={() => setLow(false)} />
          <Chip label="Low ticket (à parte)" selected={low} onPress={() => setLow(true)} />
        </Row>
        <Txt variant="small">
          {low
            ? 'Vendido à parte, com preço próprio. Fica fora da sequência: o aluno usa quando quiser.'
            : 'Entra na assinatura anual da trilha e na sequência obrigatória das aulas.'}
        </Txt>
      </View>
      <Field label="Título" value={title} onChangeText={setTitle} placeholder={low ? 'Planilha de orçamento' : 'Nome do curso'} maxLength={80} />
      <Field label="Resumo (aparece no card)" value={summary} onChangeText={setSummary} multiline maxLength={300} placeholder="O que a pessoa vai conseguir fazer depois deste curso" />
      {low ? (
        <>
          <View style={{ gap: space.xs }}>
            <Txt variant="bodyStrong">Formato</Txt>
            <Row style={{ flexWrap: 'wrap' }}>
              {FORMATS.map((f) => <Chip key={f.id} label={f.label} selected={format === f.id} onPress={() => setFormat(f.id)} />)}
            </Row>
          </View>
          <Field label="Preço" value={price} onChangeText={setPrice} placeholder="R$ 27" maxLength={30} />
          <Field
            label="Link de pagamento"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://pay.suaplataforma.com/..."
            hint={urlOk ? 'Pode deixar em branco e preencher depois.' : 'Use um endereço que comece com https://'}
          />
        </>
      ) : null}
      {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
      <Button label={course ? (saved ? 'Salvo' : 'Salvar curso') : 'Criar e cadastrar as aulas'} icon={saved ? 'check' : 'save'} disabled={!valid} loading={busy} onPress={save} />
      {course ? (
        <ConfirmDelete
          label="Excluir curso"
          warning="Apaga o curso com todos os módulos e aulas. Curso que já tem alunos não pode ser apagado."
          loading={admin.deleteCourse.isPending}
          onConfirm={() =>
            admin.deleteCourse.mutate(course.id, {
              onSuccess: () => backTo({ pathname: '/admin/trilha/[id]', params: { id: course.trackId } }),
              onError: (e) => setError(e.message),
            })
          }
        />
      ) : null}
    </Card>
  );
}

/** Módulos e aulas do curso: renomear, ordenar, criar e apagar. */
function ModulesEditor({ lib, course }: { lib: Lib; course: Course }) {
  const admin = useAdmin();
  const [newModule, setNewModule] = useState('');
  const mods = lib.modules.filter((m) => m.courseId === course.id).sort((a, b) => a.sort - b.sort);

  const addModule = () => {
    const title = newModule.trim();
    if (!title) return;
    admin.saveModule.mutate(
      { id: slugId(title, lib.modules.map((m) => m.id), `${course.id}--`), courseId: course.id, title, sort: Math.max(0, ...mods.map((m) => m.sort)) + 1 },
      { onSuccess: () => setNewModule('') },
    );
  };

  return (
    <AdminSection title="Módulos e aulas" hint={course.lowTicket ? 'Organize o conteúdo em módulos.' : 'A ordem aqui é a ordem em que o aluno libera as aulas.'}>
      {mods.length === 0 ? <Txt variant="small">Crie o primeiro módulo para começar a cadastrar as aulas.</Txt> : null}
      {mods.map((m, i) => (
        <ModuleCard
          key={m.id}
          lib={lib}
          mod={m}
          index={i}
          onUp={i > 0 ? () => admin.reorder.mutate({ kind: 'modules', ids: moveId(mods.map((x) => x.id), m.id, -1) }) : undefined}
          onDown={i < mods.length - 1 ? () => admin.reorder.mutate({ kind: 'modules', ids: moveId(mods.map((x) => x.id), m.id, 1) }) : undefined}
        />
      ))}
      <Card tone="sand" style={{ gap: space.sm }}>
        <Txt variant="bodyStrong">Novo módulo</Txt>
        <Row>
          <TextInput
            value={newModule}
            onChangeText={setNewModule}
            placeholder={`Módulo ${mods.length + 1}: nome`}
            placeholderTextColor={colors.textSubtle}
            onSubmitEditing={addModule}
            maxLength={80}
            style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.md, paddingVertical: space.sm }}
          />
          <Button label="Criar" icon="plus" disabled={!newModule.trim()} loading={admin.saveModule.isPending} onPress={addModule} />
        </Row>
      </Card>
    </AdminSection>
  );
}

function ModuleCard({ lib, mod, index, onUp, onDown }: { lib: Lib; mod: Module; index: number; onUp?: () => void; onDown?: () => void }) {
  const admin = useAdmin();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(mod.title);
  const lessons = lib.lessons.filter((l) => l.moduleId === mod.id).sort((a, b) => a.sort - b.sort);
  const ids = lessons.map((l) => l.id);

  return (
    <Card style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="eyebrow" style={{ color: colors.textSubtle, flex: 1 }}>Módulo {index + 1}</Txt>
        <Row gap={4}>
          <Pressable onPress={onUp} disabled={!onUp} hitSlop={6} accessibilityRole="button" accessibilityLabel="Subir módulo" style={{ opacity: onUp ? 1 : 0.25, padding: 4 }}>
            <Icon name="chevron-up" size={18} color={colors.petrol} />
          </Pressable>
          <Pressable onPress={onDown} disabled={!onDown} hitSlop={6} accessibilityRole="button" accessibilityLabel="Descer módulo" style={{ opacity: onDown ? 1 : 0.25, padding: 4 }}>
            <Icon name="chevron-down" size={18} color={colors.petrol} />
          </Pressable>
          <Pressable onPress={() => setEditing((e) => !e)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Editar módulo" style={{ padding: 4 }}>
            <Icon name={editing ? 'x' : 'edit-2'} size={16} color={colors.petrol} />
          </Pressable>
        </Row>
      </Row>
      {editing ? (
        <View style={{ gap: space.sm }}>
          <Field label="Nome do módulo" value={title} onChangeText={setTitle} maxLength={80} />
          <Button
            label="Salvar nome"
            icon="save"
            disabled={!title.trim()}
            loading={admin.saveModule.isPending}
            onPress={() => admin.saveModule.mutate({ ...mod, title: title.trim() }, { onSuccess: () => setEditing(false) })}
          />
          <ConfirmDelete
            label="Excluir módulo"
            warning={`Apaga o módulo e as ${lessons.length} aulas dele, com o progresso dos alunos nessas aulas.`}
            loading={admin.deleteModule.isPending}
            onConfirm={() => admin.deleteModule.mutate(mod.id)}
          />
        </View>
      ) : (
        <Txt variant="heading">{mod.title}</Txt>
      )}
      <View style={{ gap: space.xs }}>
        {lessons.map((l, i) => (
          <AdminRow
            key={l.id}
            index={i + 1}
            title={l.title}
            subtitle={`${l.kind === 'video' ? 'Vídeo' : l.kind === 'audio' ? 'Áudio' : 'Texto'} · ${l.durationMin} min${l.isPreview ? ' · aula grátis' : ''}`}
            busy={admin.reorder.isPending}
            onPress={() => router.push({ pathname: '/admin/aula/[id]', params: { id: l.id } })}
            onUp={i > 0 ? () => admin.reorder.mutate({ kind: 'lessons', ids: moveId(ids, l.id, -1) }) : undefined}
            onDown={i < lessons.length - 1 ? () => admin.reorder.mutate({ kind: 'lessons', ids: moveId(ids, l.id, 1) }) : undefined}
          />
        ))}
      </View>
      <AddButton
        label="Nova aula"
        onPress={() => router.push({ pathname: '/admin/aula/[id]', params: { id: 'nova', module: mod.id, sort: String(Math.max(0, ...lessons.map((l) => l.sort)) + 1) } })}
      />
    </Card>
  );
}

/**
 * Avisar do curso ou do low ticket. Curso da trilha vai para quem assina.
 * Low ticket é oferta: só chega por push a quem aceitou lançamentos.
 */
function CourseNotice({ lib, course }: { lib: Lib; course: Course }) {
  const track = lib.trackById.get(course.trackId);
  const { send } = useSendNotification();
  const [draft, setDraft] = useState(() => draftForCourse(course, track));
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lessons = lib.lessons.filter((l) => l.courseId === course.id).length;
  const title = course.lowTicket ? 'Avisar do lançamento' : 'Avisar do curso novo';

  if (!lessons) {
    return (
      <AdminSection title={title} hint="Cadastre pelo menos uma aula antes de avisar.">
        {null}
      </AdminSection>
    );
  }

  const submit = async () => {
    setError(null);
    if (!(await confirm('Enviar agora?', 'Depois de enviado, não dá para apagar do celular das pessoas.', 'Enviar'))) return;
    send.mutate(draft, { onSuccess: () => setSent(true), onError: (e) => setError(e.message) });
  };

  return (
    <AdminSection
      title={title}
      hint={course.lowTicket
        ? 'Sem preço nem "compre": nos apps do celular a pessoa só conhece o material. Push só para quem aceitou lançamentos.'
        : 'Vai para quem assina a trilha. Opcional: envie quando o curso estiver pronto.'}>
      {course.lowTicket ? (
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="Todos que aceitaram ofertas" selected={draft.audience === 'all'} onPress={() => setDraft({ ...draft, audience: 'all' })} />
          <Chip label={`Só assinantes ${track?.title ?? ''}`} selected={draft.audience === 'track'} onPress={() => setDraft({ ...draft, audience: 'track' })} />
        </Row>
      ) : null}
      {sent ? (
        <Card tone="mint" style={{ gap: 4 }}>
          <Txt variant="bodyStrong">Aviso enviado</Txt>
          <Txt variant="small">Os números (entregues e abertos) aparecem em Administração, Avisos e push.</Txt>
        </Card>
      ) : (
        <>
          <NotifyComposer draft={draft} onChange={setDraft} />
          {error ? <Txt variant="small" style={{ color: colors.danger }}>{error}</Txt> : null}
          <Button label="Enviar aviso" icon="send" disabled={hasBlockingIssues(draft)} loading={send.isPending} onPress={submit} />
        </>
      )}
    </AdminSection>
  );
}
