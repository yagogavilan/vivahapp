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

-- ——— Comunidade: obrigado, níveis, prêmios e conselheiros ———
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000c', 'carla@exemplo.com', '{"full_name":"Carla Lima"}'),
  ('00000000-0000-0000-0000-00000000000d', 'duda@exemplo.com', '{"full_name":"Duda Reis"}');

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","email":"carla@exemplo.com","role":"authenticated"}';
insert into public.posts (channel, body, kind, feeling)
select 'aquecimento', 'Dica ' || g, 'dica', 'calma' from generate_series(1, 14) g;
commit;

-- 125 pessoas diferentes agradecem 3 posts da Carla; uma delas agradece um 4º (não conta: limite de 3 por mês).
begin;
set local request.jwt.claims = '{"role":"service_role"}';
insert into auth.users (id, email)
select ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'g' || g || '@exemplo.com' from generate_series(1, 125) g;
insert into public.thanks (giver_id, receiver_id, post_id, points)
select u.id, '00000000-0000-0000-0000-00000000000c', p.id, 10
  from auth.users u, public.posts p
 where u.email like 'g%@exemplo.com' and p.body in ('Dica 1', 'Dica 2', 'Dica 3');
insert into public.thanks (giver_id, receiver_id, post_id, points)
select '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', p.id, 10
  from public.posts p where p.body = 'Dica 14';
commit;

do $$ declare s record; begin
  select * into s from public.kindness_stats('00000000-0000-0000-0000-00000000000c');
  assert s.points = 3750, format('pontos da Carla deveriam ser 3750 (limite por pessoa), veio %s', s.points);
  assert s.givers = 125, 'Carla deveria ter 125 pessoas diferentes';
  assert public.kindness_level('00000000-0000-0000-0000-00000000000c') = 6, 'Carla deveria ser Farol (nível 6)';
  assert public.kindness_level('00000000-0000-0000-0000-00000000000d') = 1, 'Duda deveria ser Semente';
end $$;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","email":"carla@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; begin
  insert into public.counselors (bio, topics, code_accepted_at) values ('Já passei por crises de ansiedade.', '{ansiedade,sono}', now());
  assert (select display_name from public.counselors where user_id = auth.uid()) = 'Carla', 'conselheira com o primeiro nome';
  assert 'formacao-conselheiro' in (select public.my_course_ids()), 'Farol deveria abrir a Formação de Conselheiro';
  assert 'escuta-que-acolhe' in (select public.my_course_ids()), 'Farol deveria abrir os exclusivos dos níveis anteriores';
  assert 'mentoria-porto-seguro' not in (select public.my_course_ids()), 'Farol não deveria abrir o exclusivo do nível 7';
  assert not public.can_access_channel('respira'), 'exclusivo de bondade não deveria abrir o canal da Respira';
  insert into public.reward_claims (reward_id) values ('copo-ponte');
  blocked := false;
  begin insert into public.reward_claims (reward_id) values ('kit-porto'); exception when others then blocked := true; end;
  assert blocked, 'prêmio do nível 7 não deveria ser liberado para o nível 6';
  blocked := false;
  begin insert into public.reward_claims (reward_id) values ('conteudo-escuta'); exception when others then blocked := true; end;
  assert blocked, 'só prêmio físico pode ser pedido';
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","email":"duda@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; v_post uuid; v_req uuid; f record; begin
  insert into public.posts (channel, body, kind, feeling) values ('aquecimento', 'Hoje foi difícil', 'apoio', 'ansiedade') returning id into v_post;
  blocked := false;
  begin insert into public.thanks (post_id) values (v_post); exception when others then blocked := true; end;
  assert blocked, 'ninguém agradece o próprio post';

  insert into public.thanks (post_id, points, receiver_id)
  select id, 999, '00000000-0000-0000-0000-00000000000d' from public.posts where body = 'Dica 4';
  assert (select points from public.thanks where giver_id = auth.uid()) = 10, 'o banco decide os pontos';
  assert (select receiver_id from public.thanks where giver_id = auth.uid()) = '00000000-0000-0000-0000-00000000000c',
    'o banco decide quem recebe';
  blocked := false;
  begin insert into public.thanks (post_id) select id from public.posts where body = 'Dica 4'; exception when others then blocked := true; end;
  assert blocked, 'um obrigado por item';

  insert into public.post_reactions (post_id, kind) select id, 'like' from public.posts where body = 'Dica 4';
  insert into public.post_reactions (post_id, kind) select id, 'abraco' from public.posts where body = 'Dica 4';
  select * into f from public.posts_feed where body = 'Dica 4';
  assert f.author_level = 6, 'feed deveria trazer o nível da autora';
  assert f.reactions = '{"like": 1, "abraco": 1}'::jsonb, format('reações erradas: %s', f.reactions);
  assert f.my_reactions @> '{like,abraco}', 'feed deveria marcar as minhas reações';
  assert f.i_thanked, 'feed deveria marcar que eu agradeci';
  assert f.thanks_count = 1, format('Dica 4 deveria ter 1 agradecimento, veio %s', f.thanks_count);
  assert (select count(*) from public.thanks) = 1, 'Duda só vê os próprios agradecimentos';

  blocked := false;
  begin insert into public.counselors (code_accepted_at) values (now()); exception when others then blocked := true; end;
  assert blocked, 'Semente não pode ser conselheira';
  blocked := false;
  begin insert into public.reward_claims (reward_id) values ('broche-coracao'); exception when others then blocked := true; end;
  assert blocked, 'Semente não pode pedir o broche';

  assert (select count(*) from public.list_counselors()) = 1, 'Duda deveria ver a Carla na lista de conselheiros';
  insert into public.advice_requests (counselor_id, topic, message)
  values ('00000000-0000-0000-0000-00000000000c', 'Ansiedade à noite', 'Acordo de madrugada com a cabeça a mil.') returning id into v_req;
  assert (select status from public.advice_requests where id = v_req) = 'pendente', 'pedido começa pendente';
  assert (select requester_name from public.advice_requests where id = v_req) = 'Duda', 'nome de quem pede vem do perfil';
  blocked := false;
  begin insert into public.advice_messages (request_id, body) values (v_req, 'Oi'); exception when others then blocked := true; end;
  assert blocked, 'conversa só abre depois que a conselheira aceita';
  blocked := false;
  begin update public.advice_requests set status = 'aceito' where id = v_req; exception when others then blocked := true; end;
  assert blocked, 'quem pede não pode aceitar o próprio pedido';
  blocked := false;
  begin insert into public.thanks (advice_id) values (v_req); exception when others then blocked := true; end;
  assert blocked, 'não dá para agradecer conselho antes da conversa começar';

  update public.profiles set health_consent_at = now() where id = auth.uid();
  insert into public.checkins (day, track_id, mood, energy, sleep_hours, sleep_quality, answers, feeling, alert_level)
  values (current_date, 'respira', 2, 2, 5, 2, '{"anxiety": 9}', 'ansiedade', 'critico'),
         (current_date, 'aquecimento', 3, 3, 7, 3, '{}', 'calma', 'bem');
  assert (select count(*) from public.checkins) = 2, 'um check-in por trilha no mesmo dia';
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","email":"carla@exemplo.com","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.advice_requests) = 1, 'Carla deveria ver o pedido da Duda';
  update public.advice_requests set status = 'aceito';
  insert into public.advice_messages (request_id, body) select id, 'Oi, Duda. Estou aqui.' from public.advice_requests;
  assert (select count(*) from public.checkins) = 0, 'Carla não vê check-ins de ninguém';
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","email":"duda@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; begin
  assert (select count(*) from public.advice_messages) = 1, 'Duda deveria ler a resposta';
  insert into public.advice_messages (request_id, body) select id, 'Obrigada!' from public.advice_requests;
  insert into public.thanks (advice_id) select id from public.advice_requests;
  assert (select points from public.thanks where advice_id is not null) = 30, 'conselho vale 30 pontos';
  insert into public.thanks (post_id)
  select id from public.posts where body in ('Dica 5', 'Dica 6', 'Dica 7', 'Dica 8', 'Dica 9', 'Dica 10', 'Dica 11', 'Dica 12');
  assert (select count(*) from public.thanks) = 10, 'Duda deu 10 agradecimentos hoje';
  blocked := false;
  begin insert into public.thanks (post_id) select id from public.posts where body = 'Dica 13'; exception when others then blocked := true; end;
  assert blocked, 'limite de 10 agradecimentos por dia';
  blocked := false;
  begin update public.advice_requests set topic = 'Outro'; exception when others then blocked := true; end;
  assert blocked, 'só o status do pedido pode mudar';
  update public.advice_requests set status = 'encerrado';
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","email":"bia@exemplo.com","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.advice_requests) = 0, 'Bia não vê conselhos dos outros';
  assert (select count(*) from public.advice_messages) = 0, 'Bia não lê a conversa dos outros';
  assert (select count(*) from public.reward_claims) = 0, 'Bia não vê prêmios dos outros';
end $$;
commit;

-- ——— Apagar a conta remove os dados pessoais em cascata ———
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 0, 'perfil deveria sumir';
  assert (select count(*) from public.agenda_events) = 0, 'agenda deveria sumir';
  assert (select count(*) from public.posts where author_id = '00000000-0000-0000-0000-00000000000b') = 0, 'posts deveriam sumir';
end $$;

\echo 'RLS: todos os testes passaram'
