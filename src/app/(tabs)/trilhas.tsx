import { View } from 'react-native';

import { TrackCard } from '@/components/tracks';
import { ErrorState, Loading, Screen, Txt } from '@/components/ui';
import { useLibrary } from '@/data/hooks';
import { trackState } from '@/domain/access';
import { space } from '@/theme';

export default function Trilhas() {
  const library = useLibrary();
  if (library.isPending) return <Loading />;
  if (library.error || !library.data) return <ErrorState error={library.error} onRetry={library.refetch} />;
  const lib = library.data;

  return (
    <Screen refreshing={library.isRefetching} onRefresh={library.refetch}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Trilhas Vivah</Txt>
        <Txt variant="hero">Seis trilhas, uma vida inteira</Txt>
        <Txt>Mente, tempo, carreira, dinheiro, corpo e alimentação. Comece por uma e siga no seu ritmo.</Txt>
      </View>
      <View style={{ gap: space.md }}>
        {lib.tracks.map((t) => {
          const courses = lib.courses.filter((c) => c.trackId === t.id);
          return <TrackCard key={t.id} track={t} state={trackState(t, courses, lib.access)} courseCount={courses.length} />;
        })}
      </View>
    </Screen>
  );
}
