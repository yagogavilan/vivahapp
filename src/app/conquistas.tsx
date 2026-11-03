import { View } from 'react-native';

import { AchievementGrid, WeekStrip } from '@/components/engagement';
import { Card, Loading, Row, Screen, Txt } from '@/components/ui';
import { useActivity, useCheckins, useLatestDiagnostic, useLibrary, useProgress, useStreak } from '@/data/hooks';
import { computeAchievements } from '@/domain/achievements';
import { streakMessage } from '@/domain/streak';
import { colors, fonts, space } from '@/theme';

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Txt style={{ fontFamily: fonts.display, fontSize: 30, color: colors.text }}>{value}</Txt>
      <Txt variant="small" style={{ textAlign: 'center', fontSize: 13 }}>{label}</Txt>
    </View>
  );
}

export default function Conquistas() {
  const activity = useActivity(400);
  const progress = useProgress();
  const library = useLibrary();
  const checkins = useCheckins(400);
  const diagnostic = useLatestDiagnostic();
  const streak = useStreak();

  if (!streak || !library.data || !activity.data) return <Loading />;

  const items = computeAchievements({
    activity: activity.data,
    progress: progress.data ?? [],
    lessons: library.data.lessons,
    checkins: checkins.data ?? [],
    diagnosticDone: Boolean(diagnostic.data),
    streak,
  });
  const earned = items.filter((a) => a.earned).length;
  const lessonsDone = (progress.data ?? []).filter((p) => p.completedAt).length;
  const minutes = activity.data.reduce((s, a) => s + a.minutes, 0);

  return (
    <Screen padTop={false}>
      <View style={{ gap: space.xs }}>
        <Txt variant="eyebrow">Sua jornada</Txt>
        <Txt variant="hero">Conquistas</Txt>
        <Txt>{streakMessage(streak)}</Txt>
      </View>

      <Card style={{ gap: space.lg }}>
        <Row>
          <Stat value={streak.current} label="dias seguidos" />
          <Stat value={streak.best} label="melhor sequência" />
          <Stat value={lessonsDone} label="aulas concluídas" />
          <Stat value={minutes} label="minutos de prática" />
        </Row>
        <WeekStrip streak={streak} />
        <Txt variant="small">
          Qualquer atividade conta para a sequência: ouvir o Escudo, uma aula, um check-in, um bloco de foco ou uma live.
          Você tem 1 dia de folga por semana sem perder a sequência.
        </Txt>
      </Card>

      <View style={{ gap: space.md }}>
        <Txt variant="title">{earned} de {items.length} conquistas</Txt>
        <AchievementGrid items={items} />
      </View>
    </Screen>
  );
}
