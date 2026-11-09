-- Um aluno interage: curte um post (pontos validados no banco) e salva progresso de aula.
\set u random(1, 10000)
\set p random(1, 40000)
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ca000000-0000-0000-0000-' || lpad(:u::text, 12, '0') || '","email":"aluno' || :u || '@carga.vivah","role":"authenticated"}', true);
insert into public.post_reactions (post_id, kind)
  select id, 'abraco' from public.posts where channel = 'respira' order by created_at desc offset (:p % 4000) limit 1
  on conflict do nothing;
insert into public.activity_log (kind, ref, minutes) values ('escudo', 'escudo-carga', 5) on conflict do nothing;
end;
