import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CourseRow } from '@/components/tracks';
import { Card, Chip, Empty, Field, Icon, Row, Screen, Txt } from '@/components/ui';
import { useLibrary } from '@/data/hooks';
import { lessonOpen } from '@/domain/access';
import { searchCatalog } from '@/domain/search';
import { colors, space } from '@/theme';

const SUGGESTIONS = ['ansiedade', 'sono', 'rotina', 'clientes', 'dívidas', 'treino', 'cardápio'];

export default function Buscar() {
  const library = useLibrary();
  const [q, setQ] = useState('');
  const lib = library.data;
  const results = lib ? searchCatalog(lib, q) : { tracks: [], courses: [], lessons: [] };
  const total = results.tracks.length + results.courses.length + results.lessons.length;

  return (
    <Screen padTop={false}>
      <Txt variant="hero">Buscar</Txt>
      <Field label="O que você procura?" value={q} onChangeText={setQ} placeholder="Ex.: ansiedade, sono, vendas" autoFocus returnKeyType="search" />
      {q.trim().length < 2 ? (
        <View style={{ gap: space.sm }}>
          <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Sugestões</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {SUGGESTIONS.map((s) => <Chip key={s} label={s} selected={false} onPress={() => setQ(s)} />)}
          </View>
        </View>
      ) : total === 0 ? (
        <Empty icon="search" title="Nada encontrado" text="Tente outra palavra, como o tema ou o nome da trilha." />
      ) : (
        <>
          {results.tracks.length ? (
            <View style={{ gap: space.sm }}>
              <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Trilhas</Txt>
              {results.tracks.map((t) => (
                <Card key={t.id} onPress={() => router.push({ pathname: '/trilha/[id]', params: { id: t.id } })} style={{ gap: 2 }}>
                  <Txt variant="bodyStrong">{t.title} · {t.areaLabel}</Txt>
                  <Txt variant="small">{t.subtitle}</Txt>
                </Card>
              ))}
            </View>
          ) : null}
          {results.courses.length ? (
            <View style={{ gap: space.sm }}>
              <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Cursos</Txt>
              {results.courses.map((c) => <CourseRow key={c.id} course={c} state={lib!.stateOf(c)} />)}
            </View>
          ) : null}
          {results.lessons.length ? (
            <View style={{ gap: space.sm }}>
              <Txt variant="eyebrow" style={{ color: colors.textSubtle }}>Aulas</Txt>
              <Card style={{ gap: 0, paddingVertical: space.xs }}>
                {results.lessons.map((l, i) => {
                  const course = lib!.courses.find((c) => c.id === l.courseId)!;
                  const open = lessonOpen(l, lib!.stateOf(course));
                  return (
                    <Pressable
                      key={l.id}
                      onPress={() =>
                        open
                          ? router.push({ pathname: '/aula/[id]', params: { id: l.id } })
                          : router.push({ pathname: '/curso/[id]', params: { id: course.id } })
                      }
                      style={{ paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                      <Row gap={space.md}>
                        <Icon name={open ? 'play-circle' : 'lock'} color={open ? colors.coralText : colors.textSubtle} />
                        <View style={{ flex: 1 }}>
                          <Txt variant="bodyStrong">{l.title}</Txt>
                          <Txt variant="small" numberOfLines={1}>{course.title} · {l.durationMin} min</Txt>
                        </View>
                      </Row>
                    </Pressable>
                  );
                })}
              </Card>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
