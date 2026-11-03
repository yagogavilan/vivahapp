import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AREA_ICON, CourseRow, StateBadge } from '@/components/tracks';
import { Card, Empty, ErrorState, Icon, Loading, Row, Screen, Txt } from '@/components/ui';
import { useLibrary, useProgress } from '@/data/hooks';
import type { Course } from '@/data/types';
import { completion, trackState } from '@/domain/access';
import { colors, space } from '@/theme';

const GROUPS: { title: string; kinds: Course['kind'][] }[] = [
  { title: 'Comece por aqui', kinds: ['entrada', 'bonus'] },
  { title: 'Programas', kinds: ['programa'] },
  { title: 'Acompanhamento', kinds: ['acompanhamento'] },
];

export default function Trilha() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useLibrary();
  const progress = useProgress();

  if (library.isPending) return <Loading />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;
  const track = lib.trackById.get(id);
  if (!track) return <Screen padTop={false}><Empty icon="compass" title="Trilha não encontrada" /></Screen>;

  const courses = lib.courses.filter((c) => c.trackId === track.id).sort((a, b) => a.sort - b.sort);
  const state = trackState(track, courses, lib.access);

  return (
    <Screen padTop={false} refreshing={library.isRefetching} onRefresh={library.refetch}>
      <Card tone="dark" style={{ gap: space.md, padding: space.xl }}>
        <Row>
          <Icon name={AREA_ICON[track.area]} color={colors.coral} />
          <Txt variant="eyebrow" style={{ color: colors.coral }}>{track.areaLabel}</Txt>
        </Row>
        <Txt variant="hero" style={{ color: colors.onDark }}>{track.title}</Txt>
        <Txt variant="title" style={{ color: colors.coral, fontFamily: 'Fraunces_400Regular_Italic' }}>{track.promise}</Txt>
        <Txt style={{ color: colors.onDarkMuted }}>{track.description}</Txt>
        <Row style={{ flexWrap: 'wrap' }}>
          <StateBadge state={state} launchLabel={track.launchLabel} />
          <Txt variant="small" style={{ color: colors.onDarkMuted }}>Com {track.teacher}</Txt>
        </Row>
      </Card>

      {track.status === 'soon' ? (
        <Card tone="sand" style={{ gap: space.xs }}>
          <Txt variant="bodyStrong">Esta trilha chega em {track.launchLabel.toLowerCase()}.</Txt>
          <Txt variant="small">Veja abaixo o que vem por aí. Enquanto isso, as lives e o Escudo Anticrise seguem liberados.</Txt>
        </Card>
      ) : null}

      {GROUPS.map((g) => {
        const list = courses.filter((c) => g.kinds.includes(c.kind));
        if (!list.length) return null;
        return (
          <View key={g.title} style={{ gap: space.sm }}>
            <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>{g.title}</Txt>
            {list.map((c) => {
              const lessons = lib.lessons.filter((l) => l.courseId === c.id);
              return <CourseRow key={c.id} course={c} state={lib.stateOf(c)} percent={completion(lessons, progress.data ?? [])} />;
            })}
          </View>
        );
      })}
    </Screen>
  );
}
