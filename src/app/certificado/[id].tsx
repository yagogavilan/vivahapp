import { useLocalSearchParams } from 'expo-router';
import { Platform, Share, View } from 'react-native';

import { useSession } from '@/auth/session';
import { Button, Card, Empty, Loading, Logo, Screen, Txt } from '@/components/ui';
import { useLibrary, useProgress } from '@/data/hooks';
import { completion } from '@/domain/access';
import { formatShortDate } from '@/domain/dates';
import { colors, fonts, radius, space } from '@/theme';

/** Certificado de conclusão: aparece quando todas as aulas do curso estão concluídas. */
export default function Certificado() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const library = useLibrary();
  const progress = useProgress();
  if (library.isPending || progress.isPending) return <Loading />;

  const course = library.data?.courses.find((c) => c.id === id);
  const lessons = library.data?.lessons.filter((l) => l.courseId === id) ?? [];
  if (!course || completion(lessons, progress.data ?? []) < 100) {
    return (
      <Screen padTop={false}>
        <Empty icon="award" title="Certificado ainda não liberado" text="Conclua todas as aulas do curso para receber o seu certificado." />
      </Screen>
    );
  }

  const last = (progress.data ?? [])
    .filter((p) => p.completedAt && lessons.some((l) => l.id === p.lessonId))
    .map((p) => p.completedAt!)
    .sort()
    .pop()!;
  const hours = Math.max(1, Math.round(lessons.reduce((s, l) => s + l.durationMin, 0) / 60));
  const code = `VIV-${course.id.slice(0, 4).toUpperCase()}-${(profile?.id ?? '').replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const name = profile?.fullName || 'Aluno Vivah';

  return (
    <Screen padTop={false}>
      <Card style={{ padding: space.xxl, gap: space.lg, alignItems: 'center', borderWidth: 3, borderColor: colors.coral, borderRadius: radius.lg }}>
        <Logo height={44} />
        <Txt variant="eyebrow">Certificado de conclusão</Txt>
        <Txt variant="small" style={{ textAlign: 'center' }}>Certificamos que</Txt>
        <Txt style={{ fontFamily: fonts.display, fontSize: 34, color: colors.text, textAlign: 'center' }}>{name}</Txt>
        <Txt style={{ textAlign: 'center' }}>concluiu o curso</Txt>
        <Txt variant="title" style={{ textAlign: 'center' }}>{course.title}</Txt>
        <Txt variant="small" style={{ textAlign: 'center' }}>
          {lessons.length} aulas · carga de {hours} h · concluído em {formatShortDate(last)}
        </Txt>
        <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
        <Txt variant="small" style={{ textAlign: 'center' }}>Código de verificação: {code}</Txt>
      </Card>
      <Button
        label={Platform.OS === 'web' ? 'Imprimir ou salvar em PDF' : 'Compartilhar'}
        icon={Platform.OS === 'web' ? 'printer' : 'share-2'}
        onPress={() => {
          if (Platform.OS === 'web') window.print();
          else Share.share({ message: `Concluí o curso "${course.title}" na Vivah! 🌱` }).catch(() => undefined);
        }}
      />
    </Screen>
  );
}
