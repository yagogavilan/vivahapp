-- Base de carga: 10 mil alunos com 3 meses de uso intenso.
-- Roda depois do run.sh (migração + seed). Uso: npm run db:load
-- Os gatilhos ficam desligados durante a carga (dados gerados direto nas tabelas).
\set ON_ERROR_STOP on
\timing off
set session_replication_role = replica;

-- Alunos
insert into auth.users (id, email, raw_user_meta_data)
select ('ca000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'aluno' || g || '@carga.vivah', '{}'::jsonb
  from generate_series(1::bigint, 10000) g;
insert into public.profiles (id, email, full_name, onboarded_at, health_consent_at)
select u.id, u.email, 'Aluno ' || split_part(u.email, '@', 1), now(), now()
  from auth.users u where u.email like '%@carga.vivah';

create temp table alunos as
select id, row_number() over (order by id) as n, email from public.profiles where email like '%@carga.vivah';

-- 60% assinam a Respira; 20% também outra trilha
insert into public.entitlements (email, course_id, product_id)
select a.email, pc.course_id, pc.product_id
  from alunos a join public.product_courses pc on pc.product_id = 'trilha-respira'
 where a.n % 10 < 6;
insert into public.entitlements (email, course_id, product_id)
select a.email, pc.course_id, pc.product_id
  from alunos a join public.product_courses pc
    on pc.product_id = (array['trilha-ritmo','trilha-eleva','trilha-prospera','trilha-move','trilha-nutre'])[1 + a.n % 5]
 where a.n % 10 < 2;

-- Progresso: 15 aulas por aluno (150 mil linhas)
insert into public.lesson_progress (user_id, lesson_id, position_sec, completed_at, updated_at)
select a.id, l.id, 300, now() - (l.rn || ' hours')::interval, now()
  from alunos a
  join lateral (select id, row_number() over (order by id) rn from public.lessons order by id limit 15) l on true;

-- Comunidade: 40 mil posts em 90 dias, 120 mil comentários, 400 mil curtidas, 60 mil agradecimentos
create temp table canais as select unnest(array['respira','ritmo','eleva','prospera','move','nutre']) as c;
insert into public.posts (id, channel, author_id, author_name, body, kind, feeling, created_at)
select gen_random_uuid(), (array['respira','respira','respira','ritmo','eleva','prospera','move','nutre'])[1 + g % 8],
       a.id, 'Aluno', 'Post de carga número ' || g || '. Hoje foi um dia de aprendizado e quero compartilhar com vocês.',
       (array['desabafo','conquista','apoio','dica'])[1 + g % 4], null, now() - ((g % 129600) || ' minutes')::interval
  from generate_series(1::bigint, 40000) g join alunos a on a.n = 1 + (g * 7919) % 10000;
create temp table pids as select id, row_number() over (order by created_at desc) as n, channel from public.posts;
insert into public.comments (post_id, author_id, author_name, body, created_at)
select p.id, a.id, 'Aluno', 'Comentário de carga ' || g, now() - ((g % 129000) || ' minutes')::interval
  from generate_series(1::bigint, 120000) g
  join pids p on p.n = 1 + (g * 31) % 40000
  join alunos a on a.n = 1 + (g * 104729) % 10000;
insert into public.post_reactions (post_id, user_id, kind, created_at)
select p.id, a.id, (array['like','abraco','forca','parabens'])[1 + g % 4], now()
  from generate_series(1::bigint, 400000) g
  join pids p on p.n = 1 + (g % 40000)
  join alunos a on a.n = 1 + ((g / 40000) * 997 + g * 7) % 10000
on conflict do nothing;
insert into public.thanks (giver_id, receiver_id, post_id, points, created_at)
select a.id, p.author_id, p.id, 2, now() - ((g % 100000) || ' minutes')::interval
  from generate_series(1::bigint, 60000) g
  join (select id, author_id, row_number() over (order by id) n from public.posts) p on p.n = 1 + (g * 17) % 40000
  join alunos a on a.n = 1 + (g * 3) % 10000
 where a.id <> p.author_id
on conflict do nothing;

-- Extrato de pontos: 1 milhão de eventos (100 por aluno em média, concentrados nos mais ativos)
insert into public.point_events (user_id, actor_id, track_id, kind, points, status, day, created_at)
select a.id, b.id, (array['respira','ritmo','eleva','prospera','move','nutre'])[1 + g % 6],
       (array['curtida','agradecimento','ajuda','conselho','apoio'])[1 + g % 5], 1 + g % 5,
       case when g % 11 = 0 then 'recusado' else 'valido' end,
       (now() - ((g % 90) || ' days')::interval)::date, now() - ((g % 90) || ' days')::interval
  from generate_series(1::bigint, 1000000) g
  join alunos a on a.n = 1 + ((g * g) % 10000)
  join alunos b on b.n = 1 + (g * 13) % 10000
 where a.id <> b.id;

-- Rotina: 30 dias de check-in, plano/fechamento e atividade por aluno
insert into public.checkins (user_id, day, mood, energy, sleep_hours, sleep_quality, track_id, answers, alert_level)
select a.id, current_date - d, 1 + (a.n + d) % 5, 1 + (a.n * d) % 5, 6.5, 3, 'respira', '{"ansiedade": 4}'::jsonb, 'bem'
  from alunos a cross join generate_series(0, 29) d;
insert into public.daily_logs (user_id, day, track_id, kind, data, score, valid)
select a.id, current_date - d, 'respira', k, '{"intencao": "uma coisa de cada vez"}'::jsonb, case when k = 'fechamento' then 50 + (a.n + d) % 50 end, true
  from alunos a cross join generate_series(0, 14) d cross join (values ('plano'), ('fechamento')) v(k);
insert into public.activity_log (user_id, day, kind, ref, minutes)
select a.id, current_date - d, 'escudo', 'escudo-' || (current_date - d), 5
  from alunos a cross join generate_series(0, 49) d;

-- Painel das trilhas: 30 dias de água, passos, peso, treino e gastos (1,5 milhão de registros)
insert into public.track_entries (user_id, track_id, metric, day, entry_key, value, data)
select a.id, m.track, m.metric, current_date - d, case when m.metric in ('treino', 'gasto') then 'k' || d else '' end,
       m.v + (a.n % 7) * 10, case when m.metric = 'treino' then '{"modalidade":"Funcional","duracao":40,"intensidade":"Moderada"}'::jsonb
                                  when m.metric = 'gasto' then '{"tipo":"Saída","valor":45,"categoria":"Mercado"}'::jsonb else '{}'::jsonb end
  from alunos a cross join generate_series(0, 29) d
  cross join (values ('move', 'agua', 1800), ('move', 'passos', 7000), ('move', 'peso', 80), ('move', 'treino', 40), ('prospera', 'gasto', 45)) m(track, metric, v);

set session_replication_role = origin;
select public.rebuild_point_totals();
analyze;

select relname as tabela, n_live_tup as linhas, pg_size_pretty(pg_total_relation_size(relid)) as tamanho
  from pg_stat_user_tables where schemaname = 'public' and n_live_tup > 1000 order by n_live_tup desc;
select pg_size_pretty(pg_database_size(current_database())) as banco_total;
