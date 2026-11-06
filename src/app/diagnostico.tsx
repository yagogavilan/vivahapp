import { router } from 'expo-router';
import { useState } from 'react';

import { LifeTestQuestions, LifeTestResult } from '@/components/life-test';
import { Loading, Screen } from '@/components/ui';
import { useLibrary, useLogActivity, useSaveDiagnostic } from '@/data/hooks';
import type { LifeResult } from '@/domain/life-test';

/** Refazer o teste do momento de vida (o primeiro é feito no primeiro acesso). */
export default function Diagnostico() {
  const library = useLibrary();
  const save = useSaveDiagnostic();
  const log = useLogActivity();
  const [result, setResult] = useState<LifeResult | null>(null);
  if (library.isPending) return <Loading />;

  return (
    <Screen padTop={false}>
      {result ? (
        <LifeTestResult
          result={result}
          tracks={library.data?.tracks ?? []}
          startLabel="Ir para"
          onStart={(id) => router.replace({ pathname: '/t/[track]', params: { track: id } })}
        />
      ) : (
        <LifeTestQuestions
          onDone={(answers, r) => {
            setResult(r);
            save.mutate({ answers, scores: r.needs, trackId: r.recommendedTrackId, moment: r.moment.id });
            log.mutate({ kind: 'diagnostico', minutes: 3 });
          }}
        />
      )}
    </Screen>
  );
}
