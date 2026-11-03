/// <reference types="node" />
/**
 * Gera supabase/seed.sql a partir de src/data/catalog.ts.
 * Uso: npm run seed:generate
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  courses,
  diagnosticQuestions,
  lessonMedia,
  lessons,
  modules,
  products,
  tracks,
} from '../src/data/catalog';
import { buildEscudo, buildLives } from '../src/domain/schedule';

/** Primeira live: quarta, 02/12/2026, dia seguinte ao lançamento. */
const FIRST_LIVE_DAY = '2026-12-02';
/** O Escudo Anticrise começa no beta (23/11) e o seed cobre os primeiros 60 dias. */
const ESCUDO_FROM = '2026-11-23';

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

function insert(table: string, rows: Record<string, unknown>[], conflict = 'id'): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const values = rows.map((r) => `  (${cols.map((c) => lit(r[c])).join(', ')})`).join(',\n');
  const updates = cols
    .filter((c) => !conflict.split(',').map((x) => x.trim()).includes(c))
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  const onConflict = updates ? `do update set ${updates}` : 'do nothing';
  return `insert into public.${table} (${cols.join(', ')}) values\n${values}\non conflict (${conflict}) ${onConflict};\n`;
}

const sql = [
  '-- Gerado por scripts/generate-seed.ts a partir de src/data/catalog.ts. Não edite à mão.',
  '-- Pode rodar de novo: atualiza o catálogo sem apagar compras, progresso ou posts.',
  '',
  insert('tracks', tracks.map((t) => ({
    id: t.id, title: t.title, area: t.area, area_label: t.areaLabel, subtitle: t.subtitle,
    description: t.description, promise: t.promise, teacher: t.teacher, status: t.status,
    launch_label: t.launchLabel, sort: t.sort,
  }))),
  insert('courses', courses.map((c) => ({
    id: c.id, track_id: c.trackId, title: c.title, kind: c.kind, summary: c.summary,
    price_label: c.priceLabel, sort: c.sort, in_subscription: c.inSubscription, is_free: c.isFree,
  }))),
  insert('modules', modules.map((m) => ({ id: m.id, course_id: m.courseId, title: m.title, sort: m.sort }))),
  insert('lessons', lessons.map((l) => ({
    id: l.id, module_id: l.moduleId, course_id: l.courseId, title: l.title, summary: l.summary,
    kind: l.kind, duration_min: l.durationMin, sort: l.sort, is_preview: l.isPreview,
  }))),
  // Não sobrescreve links de mídia já cadastrados no painel.
  insert('lesson_media', lessonMedia.map((m) => ({ lesson_id: m.lessonId, media_url: m.mediaUrl, body: m.body })), 'lesson_id')
    .replace(/on conflict \(lesson_id\) do update set .*;/, 'on conflict (lesson_id) do nothing;'),
  // Produtos: mantém o id e o checkout da Hotmart que o time já preencheu.
  insert('products', products.map((p) => ({ id: p.id, name: p.name })), 'id'),
  insert('product_courses', products.flatMap((p) => p.courseIds.map((courseId) => ({ product_id: p.id, course_id: courseId }))), 'product_id, course_id'),
  insert('diagnostic_questions', diagnosticQuestions.map((q) => ({
    id: q.id, area: q.area, prompt: q.prompt, options: q.options, sort: q.sort,
  }))),
  insert('lives', buildLives(FIRST_LIVE_DAY).map((l) => ({
    id: l.id, title: l.title, description: l.description, track_id: l.trackId, host: l.host,
    starts_at: l.startsAt, ends_at: l.endsAt, youtube_id: l.youtubeId, replay_until: l.replayUntil,
  }))),
  insert('escudo_audios', buildEscudo(ESCUDO_FROM, 60).map((a) => ({
    id: a.id, publish_date: a.publishDate, title: a.title, summary: a.summary, duration_min: a.durationMin,
  }))),
].join('\n');

const out = join(__dirname, '..', 'supabase', 'seed.sql');
writeFileSync(out, sql);
console.log(`seed.sql: ${tracks.length} trilhas, ${courses.length} cursos, ${lessons.length} aulas, ${products.length} produtos`);
