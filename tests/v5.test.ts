import { beforeEach, describe, expect, it, vi } from 'vitest';

// O app lê a plataforma (react-native) na configuração; aqui basta o código da demonstração.
vi.mock('../src/lib/config', () => ({ DEMO_CODE: '123456' }));

import { courses, lessons, modules, products } from '../src/data/catalog';
import { demoApi } from '../src/data/demo-api';
import { deriveProducts, isCheckoutUrl, moveId, slugId } from '../src/domain/admin';
import { LIFE_TEST, scoreLifeTest } from '../src/domain/life-test';
import { sequenceInfo, trackSequence } from '../src/domain/sequence';
import { lowTicketsOf, trackCourses } from '../src/domain/spaces';
import { tracks } from '../src/data/catalog';

const answers = (base: number, over: Record<string, number> = {}) => ({
  ...Object.fromEntries(LIFE_TEST.filter((q) => q.id !== 'objetivo').map((q) => [q.id, base])),
  objetivo: 0,
  ...over,
});

describe('teste do primeiro acesso', () => {
  it('mente em alerta indica a Respira, qualquer que seja o objetivo', () => {
    const r = scoreLifeTest(answers(0, { ansiedade: 3, preocupacao: 3, sono: 2, objetivo: 5 }));
    expect(r.moment.id).toBe('reequilibrio');
    expect(r.recommendedTrackId).toBe('respira');
    expect(r.path[0]).toBe('respira');
    expect(new Set(r.path).size).toBe(6);
  });

  it('mente ok e rotina bagunçada indica a base, respeitando o objetivo', () => {
    const r = scoreLifeTest(answers(0, { prioridades: 3, rotina: 3, movimento: 2, disposicao: 2, objetivo: 2 }));
    expect(r.moment.id).toBe('organizacao');
    expect(r.recommendedTrackId).toBe('move');
    const r2 = scoreLifeTest(answers(0, { prioridades: 3, rotina: 3, objetivo: 4 }));
    expect(r2.recommendedTrackId).toBe('ritmo');
  });

  it('base em ordem e aperto financeiro indica a Prospera', () => {
    const r = scoreLifeTest(answers(0, { mes: 3, dinheiro: 3 }));
    expect(r.moment.id).toBe('estabilidade');
    expect(r.recommendedTrackId).toBe('prospera');
  });

  it('quem chega pela carreira com a base razoável segue a jornada técnica', () => {
    const r = scoreLifeTest(answers(1, { carreira: 3, plano: 3, objetivo: 5 }));
    expect(r.recommendedTrackId).toBe('eleva');
    expect(r.journey).toBe('carreira');
    expect(r.path.slice(0, 3)).toEqual(['eleva', 'ritmo', 'prospera']);
  });

  it('tudo em ordem: momento de crescimento', () => {
    const r = scoreLifeTest(answers(0));
    expect(r.moment.id).toBe('crescimento');
    expect(r.needs.mente).toBe(0);
  });
});

describe('sequência obrigatória da trilha', () => {
  const seq = trackSequence('respira', courses, modules, lessons);

  it('junta só os cursos da assinatura, em ordem, sem low tickets nem prêmios', () => {
    const ids = new Set(seq.map((l) => l.courseId));
    expect(ids.has('protocolo-desligando-a-mente')).toBe(true);
    expect(ids.has('calma-em-5-minutos')).toBe(false);
    expect([...ids].every((id) => trackCourses('respira', courses).some((c) => c.id === id))).toBe(true);
  });

  it('trava a próxima aula até concluir a anterior (atravessando cursos)', () => {
    const none = sequenceInfo(seq, []);
    expect(none.locked.has(seq[0].id)).toBe(false);
    expect(none.locked.has(seq[1].id)).toBe(true);
    const done = seq.slice(0, -1).map((l) => ({ lessonId: l.id, positionSec: 0, completedAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z' }));
    expect(sequenceInfo(seq, done).locked.size).toBe(0);
    const firstOfSecondCourse = seq.findIndex((l) => l.courseId !== seq[0].courseId);
    const upTo = done.slice(0, firstOfSecondCourse - 1);
    expect(sequenceInfo(seq, upTo).locked.has(seq[firstOfSecondCourse].id)).toBe(true);
  });

  it('cada trilha tem uma seção de low tickets com preço próprio', () => {
    for (const t of ['respira', 'ritmo', 'prospera']) {
      const lows = lowTicketsOf(t, courses);
      expect(lows.length).toBeGreaterThan(0);
      expect(lows.every((c) => c.priceLabel && c.format)).toBe(true);
    }
  });
});

describe('admin', () => {
  it('gera ids legíveis e únicos', () => {
    expect(slugId('Planilha de Orçamento!', [])).toBe('planilha-de-orcamento');
    expect(slugId('Planilha de Orçamento', ['planilha-de-orcamento'])).toBe('planilha-de-orcamento-2');
    expect(slugId('Módulo 1', [], 'curso--')).toBe('curso--modulo-1');
  });

  it('move itens na lista sem sair das pontas', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
  });

  it('os produtos nascem dos cursos: assinatura anual por trilha + um por low ticket', () => {
    expect(deriveProducts(tracks, courses, {})).toEqual(products);
    expect(products.some((p) => p.id === 'assinatura-vivah')).toBe(false);
    expect(isCheckoutUrl('https://pay.exemplo.com/x')).toBe(true);
    expect(isCheckoutUrl('http://pay.exemplo.com/x')).toBe(false);
  });
});

describe('demonstração: admin cadastra e aluno segue a ordem', () => {
  beforeEach(async () => {
    await demoApi.signOut();
  });

  it('loja: produtos físicos da trilha primeiro, depois os gerais; recompensas de pontos ficam fora', async () => {
    const { storeItemsFor } = await import('../src/domain/store');
    const { storeItems } = await import('../src/data/catalog');
    const move = storeItemsFor('move', storeItems).map((i) => i.id);
    expect(move.slice(0, 2)).toEqual(['garrafa-move', 'kit-elasticos']);
    expect(move).toContain('camiseta-vivah');
    expect(move).not.toContain('kit-marmitas');
  });

  it('aluno não edita o catálogo', async () => {
    await demoApi.requestCode('ana@exemplo.com');
    await demoApi.verifyCode('ana@exemplo.com', '123456');
    await demoApi.getProfile();
    await expect(demoApi.adminUpdateTrack('respira', { priceLabel: 'R$ 1' })).rejects.toThrow();
  });

  it('aluno só abre a aula seguinte depois de concluir a anterior', async () => {
    await demoApi.requestCode('ana@exemplo.com');
    await demoApi.verifyCode('ana@exemplo.com', '123456');
    await demoApi.getProfile();
    const seq = trackSequence('respira', courses, modules, lessons);
    expect(await demoApi.getLessonMedia(seq[1].id)).toBeNull();
    await demoApi.saveProgress(seq[0].id, 60, true);
    expect(await demoApi.getLessonMedia(seq[1].id)).not.toBeNull();
  });

  it('admin cria curso, módulo e aula; o curso entra na assinatura da trilha', async () => {
    await demoApi.requestCode('admin@vivah.com.br');
    await demoApi.verifyCode('admin@vivah.com.br', '123456');
    expect((await demoApi.getProfile()).role).toBe('admin');
    await demoApi.adminSaveCourse({ id: 'curso-teste', trackId: 'ritmo', title: 'Curso teste', summary: 'Resumo', lowTicket: false, format: null, priceLabel: null, sort: 999 });
    await demoApi.adminSaveModule({ id: 'curso-teste--m1', courseId: 'curso-teste', title: 'Módulo 1', sort: 1 });
    await demoApi.adminSaveLesson({
      id: 'curso-teste--m1--a1', moduleId: 'curso-teste--m1', courseId: 'curso-teste', title: 'Aula 1', summary: '',
      kind: 'video', durationMin: 12, sort: 1, isPreview: false, mediaUrl: 'https://exemplo.com/v.mp4', body: null,
    });
    await demoApi.adminSetCheckout('trilha-ritmo', 'https://pay.exemplo.com/ritmo');
    await demoApi.adminUpdateTrack('ritmo', { priceLabel: 'R$ 297 por ano' });
    const cat = await demoApi.getCatalog();
    expect(cat.products.find((p) => p.id === 'trilha-ritmo')?.courseIds).toContain('curso-teste');
    expect(cat.products.find((p) => p.id === 'trilha-ritmo')?.checkoutUrl).toBe('https://pay.exemplo.com/ritmo');
    expect(cat.tracks.find((t) => t.id === 'ritmo')?.priceLabel).toBe('R$ 297 por ano');
    expect((await demoApi.getLessonMedia('curso-teste--m1--a1'))?.mediaUrl).toBe('https://exemplo.com/v.mp4');
    await demoApi.adminSaveStoreItem({ id: 'garrafa', trackId: 'move', title: 'Garrafa', description: '', priceLabel: 'R$ 59', imageUrl: null, checkoutUrl: 'https://pay.exemplo.com/g', active: true, sort: 99 });
    expect((await demoApi.getCatalog()).storeItems.find((i) => i.id === 'garrafa')?.checkoutUrl).toBe('https://pay.exemplo.com/g');
    await demoApi.adminDeleteStoreItem('garrafa');
    await demoApi.adminDeleteCourse('curso-teste');
    expect((await demoApi.getCatalog()).courses.some((c) => c.id === 'curso-teste')).toBe(false);
  });
});
