-- Um aluno abre o app: acessos, progresso, Hoje, feed e um post (pgbench, cliente aleatório).
\set u random(1, 10000)
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ca000000-0000-0000-0000-' || lpad(:u::text, 12, '0') || '","email":"aluno' || :u || '@carga.vivah","role":"authenticated"}', true);
select count(*) from public.my_course_ids();
select count(*) from public.lesson_progress where user_id = ('ca000000-0000-0000-0000-' || lpad(:u::text, 12, '0'))::uuid;
select count(*) from public.daily_logs where user_id = ('ca000000-0000-0000-0000-' || lpad(:u::text, 12, '0'))::uuid and track_id = 'respira' and day > current_date - 30;
select count(*) from (select * from public.posts_feed where channel = 'respira' order by created_at desc limit 50) f;
select * from public.points_stats(('ca000000-0000-0000-0000-' || lpad(:u::text, 12, '0'))::uuid, 'respira');
end;
