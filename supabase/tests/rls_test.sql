-- Testes das regras de acesso. Cada bloco falha com mensagem clara se uma regra quebrar.
\set ON_ERROR_STOP on

-- Duas alunas: Ana comprou o Protocolo na Hotmart; Bia só tem a conta grátis.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'Ana@Exemplo.com', '{"full_name":"Ana Souza"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@exemplo.com', '{}');

-- O webhook (service role) libera o acesso pelo e-mail da compra.
insert into public.entitlements (email, course_id, product_id, hotmart_transaction)
select 'ana@exemplo.com', pc.course_id, pc.product_id, 'HP123'
  from public.product_courses pc where pc.product_id = 'protocolo-desligando-a-mente';

do $$ begin
  assert (select email from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'ana@exemplo.com',
    'perfil deveria ser criado com e-mail em minúsculas';
  assert (select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Ana Souza',
    'perfil deveria trazer o nome do cadastro';
end $$;

-- ——— Visitante sem login não lê nada ———
begin;
set local role anon;
do $$ declare blocked boolean := false; begin
  begin perform 1 from public.tracks; exception when others then blocked := true; end;
  assert blocked, 'anon não deveria ler o catálogo';
end $$;
rollback;

-- ——— Bia (conta grátis) ———
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","email":"bia@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; begin
  assert (select count(*) from public.tracks) = 6, 'Bia deveria ver as 6 trilhas na vitrine';
  assert (select count(*) from public.lessons where course_id = 'mente-silenciosa') > 0, 'Bia deveria ver os títulos das aulas';
  assert (select count(*) from public.my_course_ids()) = 0, 'Bia não deveria ter cursos';
  assert (select count(*) from public.lesson_media where lesson_id = 'protocolo-desligando-a-mente--m1--a1') = 1,
    'Bia deveria assistir a aula de amostra';
  assert (select count(*) from public.lesson_media where lesson_id = 'protocolo-desligando-a-mente--m1--a2') = 0,
    'Bia não deveria abrir aula paga';
  assert (select count(*) from public.lesson_media lm join public.lessons l on l.id = lm.lesson_id where l.course_id = 'ritmo') = 0,
    'nenhuma aula de trilha "em breve"';
  assert (select count(*) from public.entitlements) = 0, 'Bia não deveria ver acessos de outra pessoa';
  assert (select count(*) from public.escudo_audios where publish_date > (now() at time zone 'America/Sao_Paulo')::date) = 0,
    'áudios futuros do Escudo não deveriam aparecer';
  assert (select count(*) from public.lives) > 0, 'Bia deveria ver as lives';

  -- Comunidade: Bia publica no aquecimento, mas não no canal da trilha.
  insert into public.posts (channel, body, author_name) values ('aquecimento', 'Oi, pessoal!', 'Nome falso');
  assert (select author_name from public.posts where body = 'Oi, pessoal!') = 'Aluno Vivah',
    'o nome do autor deveria vir do perfil, não do app';
  blocked := false;
  begin insert into public.posts (channel, body) values ('respira', 'Tentando entrar'); exception when others then blocked := true; end;
  assert blocked, 'Bia não deveria publicar no canal da Respira';

  -- Progresso só em aula que ela pode ver.
  blocked := false;
  begin insert into public.lesson_progress (lesson_id, completed_at) values ('protocolo-desligando-a-mente--m1--a2', now());
  exception when others then blocked := true; end;
  assert blocked, 'Bia não deveria registrar progresso em aula bloqueada';
  insert into public.lesson_progress (lesson_id, completed_at) values ('protocolo-desligando-a-mente--m1--a1', now());

  -- Check-in só com consentimento.
  blocked := false;
  begin insert into public.checkins (day, mood, energy, sleep_hours, sleep_quality) values (current_date, 3, 3, 7, 3);
  exception when others then blocked := true; end;
  assert blocked, 'check-in sem consentimento deveria ser bloqueado';
  update public.profiles set health_consent_at = now() where id = auth.uid();
  insert into public.checkins (day, mood, energy, sleep_hours, sleep_quality) values (current_date, 4, 3, 6.5, 2);
  assert (select count(*) from public.checkins) = 1, 'check-in com consentimento deveria gravar';
  update public.profiles set health_consent_at = null where id = auth.uid();
  assert (select count(*) from public.checkins) = 0, 'retirar o consentimento deveria apagar os check-ins';

  -- Não vira admin sozinha.
  blocked := false;
  begin update public.profiles set role = 'admin' where id = auth.uid(); exception when others then blocked := true; end;
  assert blocked, 'aluna não deveria se promover a admin';

  -- Agenda e diagnóstico.
  insert into public.agenda_events (title, kind, starts_at, ends_at) values ('Treino', 'treino', now(), now() + interval '30 min');
  insert into public.diagnostic_results (answers, scores, recommended_track) values ('{}', '{}', 'respira');
  -- Atividade: o dia é sempre o de hoje (Brasília), mesmo se o app mandar outro.
  insert into public.activity_log (kind, ref, day) values ('escudo', 'escudo-x', '2020-01-01');
  assert (select day from public.activity_log where ref = 'escudo-x') = (now() at time zone 'America/Sao_Paulo')::date,
    'atividade deveria ser registrada no dia de hoje';
  -- Anotação só em aula liberada.
  insert into public.lesson_notes (lesson_id, body) values ('protocolo-desligando-a-mente--m1--a1', 'Ruminar ≠ resolver');
  blocked := false;
  begin insert into public.lesson_notes (lesson_id, body) values ('mente-silenciosa--m1--a1', 'tentando'); exception when others then blocked := true; end;
  assert blocked, 'anotação em aula bloqueada deveria falhar';
  insert into public.favorites (item_type, item_id) values ('escudo', 'escudo-x');
  update public.profiles set preferences = '{"showStreak": false}' where id = auth.uid();

  assert (public.export_my_data() -> 'perfil' ->> 'email') = 'bia@exemplo.com', 'exportação deveria trazer o perfil';
  assert jsonb_array_length(public.export_my_data() -> 'anotacoes') = 1, 'exportação deveria trazer as anotações';
  assert jsonb_array_length(public.export_my_data() -> 'agenda') = 1, 'exportação deveria trazer a agenda';
end $$;
commit;

-- ——— Ana (comprou o Protocolo) ———
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","email":"ana@exemplo.com","role":"authenticated"}';
do $$ begin
  assert public.has_course_access('protocolo-desligando-a-mente'), 'Ana deveria ter o Protocolo';
  assert not public.has_course_access('mente-silenciosa'), 'Ana não deveria ter o Mente Silenciosa';
  assert (select count(*) from public.lesson_media lm join public.lessons l on l.id = lm.lesson_id
           where l.course_id = 'protocolo-desligando-a-mente')
       = (select count(*) from public.lessons where course_id = 'protocolo-desligando-a-mente'),
    'Ana deveria abrir todas as aulas do Protocolo';
  assert (select count(*) from public.entitlements) = 1, 'Ana deveria ver o próprio acesso';
  assert (select count(*) from public.agenda_events) = 0, 'Ana não deveria ver a agenda da Bia';
  assert (select count(*) from public.lesson_progress) = 0, 'Ana não deveria ver o progresso da Bia';
  assert (select count(*) from public.activity_log) = 0, 'Ana não deveria ver a atividade da Bia';
  assert (select count(*) from public.lesson_notes) = 0, 'Ana não deveria ver as anotações da Bia';
  assert (select count(*) from public.favorites) = 0, 'Ana não deveria ver os favoritos da Bia';
  insert into public.posts (channel, body) values ('respira', 'Terminei o dia 7!');
  assert (select author_name from public.posts where body = 'Terminei o dia 7!') = 'Ana', 'nome do autor: primeiro nome';
  assert (select count(*) from public.posts_feed where channel = 'aquecimento') = 1, 'Ana deveria ver o post do aquecimento';
end $$;
commit;

-- ——— Reembolso: o acesso cai ———
update public.entitlements set status = 'revoked', revoked_at = now() where hotmart_transaction = 'HP123';
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","email":"ana@exemplo.com","role":"authenticated"}';
do $$ begin
  assert not public.has_course_access('protocolo-desligando-a-mente'), 'reembolso deveria tirar o acesso';
  assert not public.can_access_channel('respira'), 'sem acesso, Ana não deveria entrar no canal da Respira';
  assert (select count(*) from public.posts_feed where channel = 'respira' and author_id <> auth.uid()) = 0,
    'sem acesso, Ana só deveria ver os próprios posts da Respira';
end $$;
commit;

-- ——— Apagar a conta remove os dados pessoais em cascata ———
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 0, 'perfil deveria sumir';
  assert (select count(*) from public.agenda_events) = 0, 'agenda deveria sumir';
  assert (select count(*) from public.posts where channel = 'aquecimento') = 0, 'posts deveriam sumir';
end $$;

\echo 'RLS: todos os testes passaram'
