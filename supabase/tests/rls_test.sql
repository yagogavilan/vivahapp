-- Testes das regras de acesso. Cada bloco falha com mensagem clara se uma regra quebrar.
\set ON_ERROR_STOP on

-- Duas alunas: Ana assinou a trilha Respira (anual); Bia só tem a conta grátis.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'Ana@Exemplo.com', '{"full_name":"Ana Souza"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@exemplo.com', '{}');

-- O webhook (service role) libera o acesso pelo e-mail da compra.
insert into public.entitlements (email, course_id, product_id, hotmart_transaction)
select 'ana@exemplo.com', pc.course_id, pc.product_id, 'HP123'
  from public.product_courses pc where pc.product_id = 'trilha-respira';

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

-- ——— Ana (assinou a trilha Respira) ———
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","email":"ana@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; begin
  assert public.has_course_access('protocolo-desligando-a-mente'), 'Ana deveria ter o Protocolo';
  assert public.has_course_access('mente-silenciosa'), 'a assinatura da trilha deveria abrir todos os cursos dela';
  assert not public.has_course_access('calma-em-5-minutos'), 'low ticket é vendido à parte, fora da assinatura';
  assert not public.has_course_access('roteiro-one-on-one'), 'Ana não deveria ter cursos de outra trilha';
  assert public.can_access_channel('respira'), 'assinante entra na comunidade da trilha';

  -- Sequência: a aula 2 só abre depois de concluir a aula 1.
  assert (select count(*) from public.lesson_media where lesson_id = 'protocolo-desligando-a-mente--m1--a1') = 1, 'primeira aula aberta';
  assert (select count(*) from public.lesson_media where lesson_id = 'protocolo-desligando-a-mente--m1--a2') = 0,
    'a segunda aula só abre com a primeira concluída';
  blocked := false;
  begin insert into public.lesson_progress (lesson_id, completed_at) values ('protocolo-desligando-a-mente--m1--a2', now());
  exception when others then blocked := true; end;
  assert blocked, 'não dá para marcar como concluída uma aula fora da ordem';
  insert into public.lesson_progress (lesson_id, position_sec) values ('protocolo-desligando-a-mente--m1--a1', 30);
  assert (select count(*) from public.lesson_media where lesson_id = 'protocolo-desligando-a-mente--m1--a2') = 0,
    'aula começada não basta: precisa concluir';
  update public.lesson_progress set completed_at = now() where lesson_id = 'protocolo-desligando-a-mente--m1--a1';
  assert (select count(*) from public.lesson_media where lesson_id = 'protocolo-desligando-a-mente--m1--a2') = 1,
    'concluída a primeira, a segunda abre';
  assert (select count(*) from public.lesson_media where lesson_id = 'protocolo-desligando-a-mente--m2--a1') = 0,
    'a terceira continua fechada';
  assert (select count(*) from public.lesson_media where lesson_id = 'mente-silenciosa--m1--a1') = 0,
    'o curso seguinte da trilha só abre depois do anterior';
  assert public.previous_lesson_in_track('desafio-21-dias--m1--a1') is not null, 'cursos da trilha formam uma sequência só';
  assert public.previous_lesson_in_track('calma-em-5-minutos--m1--a1') is null, 'low ticket fica fora da sequência';

  assert (select count(*) from public.entitlements) > 1, 'Ana deveria ver os próprios acessos';
  assert (select count(*) from public.agenda_events) = 0, 'Ana não deveria ver a agenda da Bia';
  assert (select count(*) from public.lesson_progress where user_id <> auth.uid()) = 0, 'Ana não deveria ver o progresso da Bia';
  assert (select count(*) from public.activity_log) = 0, 'Ana não deveria ver a atividade da Bia';
  assert (select count(*) from public.lesson_notes) = 0, 'Ana não deveria ver as anotações da Bia';
  assert (select count(*) from public.favorites) = 0, 'Ana não deveria ver os favoritos da Bia';

  -- Aluna não escreve no catálogo.
  update public.courses set title = 'hackeado' where id = 'mente-silenciosa';
  assert (select title from public.courses where id = 'mente-silenciosa') <> 'hackeado', 'aluna não edita cursos';
  blocked := false;
  begin insert into public.modules (id, course_id, title) values ('x', 'mente-silenciosa', 'x'); exception when others then blocked := true; end;
  assert blocked, 'aluna não cria módulos';

  insert into public.posts (channel, body) values ('respira', 'Terminei o dia 7!');
  assert (select author_name from public.posts where body = 'Terminei o dia 7!') = 'Ana', 'nome do autor: primeiro nome';
  assert (select count(*) from public.posts_feed where channel = 'aquecimento') = 1, 'Ana deveria ver o post do aquecimento';
end $$;
commit;

-- ——— Low ticket não abre a comunidade nem os cursos da trilha ———
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000e', 'eva@exemplo.com');
insert into public.entitlements (email, course_id, product_id) values ('eva@exemplo.com', 'calma-em-5-minutos', 'calma-em-5-minutos');
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","email":"eva@exemplo.com","role":"authenticated"}';
do $$ begin
  assert public.has_course_access('calma-em-5-minutos'), 'Eva comprou o low ticket';
  assert (select count(*) from public.lesson_media lm join public.lessons l on l.id = lm.lesson_id where l.course_id = 'calma-em-5-minutos')
       = (select count(*) from public.lessons where course_id = 'calma-em-5-minutos'), 'low ticket abre todas as aulas, sem sequência';
  assert not public.has_course_access('mente-silenciosa'), 'low ticket não abre os cursos da trilha';
  assert not public.can_access_channel('respira'), 'low ticket não abre a comunidade da trilha';
end $$;
commit;

-- ——— Admin gerencia cursos, módulos e aulas pelo app ———
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ad', 'admin@vivah.com.br');
begin;
set local request.jwt.claims = '{"role":"service_role"}';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';
commit;
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@vivah.com.br","role":"authenticated"}';
do $$ declare blocked boolean; begin
  insert into public.courses (id, track_id, title, kind, summary, sort) values ('curso-novo', 'respira', 'Curso novo', 'programa', 'Teste', 999);
  insert into public.modules (id, course_id, title, sort) values ('curso-novo--m1', 'curso-novo', 'Módulo 1', 1);
  insert into public.lessons (id, module_id, course_id, title, kind, duration_min, sort)
    values ('curso-novo--m1--a1', 'curso-novo--m1', 'curso-novo', 'Aula 1', 'video', 10, 1);
  insert into public.lesson_media (lesson_id, media_url) values ('curso-novo--m1--a1', 'https://exemplo.com/v.mp4');
  assert exists (select 1 from public.product_courses where product_id = 'trilha-respira' and course_id = 'curso-novo'),
    'curso novo entra sozinho na assinatura da trilha';
  insert into public.courses (id, track_id, title, kind, summary, sort, low_ticket, format, price_label)
    values ('lt-novo', 'respira', 'Planilha nova', 'bonus', 'Teste', 1000, true, 'planilha', 'R$ 19');
  assert exists (select 1 from public.products where id = 'lt-novo' and active), 'low ticket novo vira produto próprio';
  assert not exists (select 1 from public.product_courses where product_id = 'trilha-respira' and course_id = 'lt-novo'),
    'low ticket não entra na assinatura';
  update public.tracks set price_label = 'R$ 497 por ano' where id = 'respira';
  update public.products set checkout_url = 'https://pay.exemplo.com/respira' where id = 'trilha-respira';
  assert (select checkout_url from public.products where id = 'trilha-respira') is not null, 'admin cadastra o link de pagamento';
  assert public.can_read_lesson('mente-silenciosa--m1--a4'), 'admin abre qualquer aula, sem sequência';
  insert into public.store_items (id, track_id, title, price_label, checkout_url) values ('garrafa-teste', 'move', 'Garrafa', 'R$ 59', 'https://pay.exemplo.com/garrafa');
  update public.store_items set active = false where id = 'camiseta-vivah';
  blocked := false;
  begin delete from public.courses where id = 'protocolo-desligando-a-mente'; exception when others then blocked := true; end;
  assert blocked, 'curso já vendido não pode ser apagado';
  delete from public.courses where id = 'lt-novo';
end $$;
commit;

do $$ begin
  assert (select price_label from public.tracks where id = 'respira') = 'R$ 497 por ano', 'preço editado pelo admin fica salvo';
end $$;

-- A Ana, assinante, recebe o curso novo sem comprar de novo.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","email":"ana@exemplo.com","role":"authenticated"}';
do $$ begin
  assert public.has_course_access('curso-novo'), 'assinante recebe os cursos novos da trilha';
  assert exists (select 1 from public.store_items where id = 'garrafa-teste'), 'aluna vê o produto novo da loja';
  assert not exists (select 1 from public.store_items where id = 'camiseta-vivah'), 'produto oculto não aparece para a aluna';
  update public.store_items set price_label = 'R$ 1' where id = 'garrafa-teste';
  assert (select price_label from public.store_items where id = 'garrafa-teste') = 'R$ 59', 'aluna não muda preço da loja';
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

-- ——— Comunidade: pontos validados no servidor, níveis por trilha, resgates, apoio e conselheiros ———
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000c', 'carla@exemplo.com', '{"full_name":"Carla Lima"}'),
  ('00000000-0000-0000-0000-00000000000d', 'duda@exemplo.com', '{"full_name":"Duda Reis"}');

-- Carla publica 14 dicas: só a primeira do dia entra para validação (4 pontos); as outras não pontuam.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","email":"carla@exemplo.com","role":"authenticated"}';
insert into public.posts (channel, body, kind, feeling)
select 'aquecimento', 'Dica ' || g, 'dica', 'calma' from generate_series(1, 14) g;
commit;

do $$ begin
  assert (select count(*) from public.point_events where user_id = '00000000-0000-0000-0000-00000000000c' and kind = 'conselho' and status = 'pendente' and points = 4) = 1,
    'só um conselho por dia entra para validação';
  assert (select count(*) from public.point_events where user_id = '00000000-0000-0000-0000-00000000000c' and kind = 'conselho' and status = 'recusado' and points = 0) = 13,
    'os outros conselhos do dia ficam registrados sem pontos';
end $$;

-- 150 pessoas curtem: 10 curtidas pontuam hoje (limite diário), o resto fica registrado sem pontos.
-- E um histórico de meses de apoio (inserido pelo servidor) leva a Carla ao nível Farol.
begin;
set local request.jwt.claims = '{"role":"service_role"}';
insert into auth.users (id, email)
select ('10000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'g' || g || '@exemplo.com' from generate_series(1, 150) g;
insert into public.post_reactions (post_id, user_id, kind)
select p.id, u.id, 'like' from auth.users u, public.posts p where u.email like 'g%@exemplo.com' and p.body = 'Dica 1';
insert into public.point_events (user_id, actor_id, track_id, kind, points, status, day, created_at)
select '00000000-0000-0000-0000-00000000000c', u.id, 'aquecimento', 'apoio', 5, 'valido', current_date - (d * 7), now() - (d * interval '7 days')
  from auth.users u, generate_series(1, 10) d where u.email like 'g%@exemplo.com';
commit;

do $$ declare s record; begin
  assert (select count(*) from public.point_events where kind = 'curtida' and status = 'valido' and user_id = '00000000-0000-0000-0000-00000000000c') = 10,
    'só 10 curtidas por dia pontuam';
  assert (select count(*) from public.point_events where kind = 'curtida' and status = 'recusado') = 140, 'o resto das curtidas fica sem pontos';
  select * into s from public.points_stats('00000000-0000-0000-0000-00000000000c', 'aquecimento');
  assert s.earned = 7510, format('Carla deveria ter 7510 pontos, veio %s', s.earned);
  assert s.givers = 150, 'Carla deveria ter 150 pessoas diferentes';
  assert public.kindness_level('00000000-0000-0000-0000-00000000000c', 'aquecimento') = 6, 'Carla é Farol no Aquecimento';
  assert public.kindness_level('00000000-0000-0000-0000-00000000000c', 'respira') = 1, 'nível é por trilha: na Respira, Semente';
end $$;

-- Descurtir tira o ponto.
begin;
set local request.jwt.claims = '{"role":"service_role"}';
delete from public.post_reactions where user_id = '10000000-0000-0000-0000-000000000001';
commit;
do $$ begin
  assert (select count(*) from public.point_events where kind = 'curtida' and actor_id = '10000000-0000-0000-0000-000000000001') = 0,
    'descurtir remove o ponto';
end $$;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","email":"carla@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; begin
  insert into public.counselors (track_id, bio, topics, code_accepted_at) values ('aquecimento', 'Já passei por crises de ansiedade.', '{ansiedade,sono}', now());
  assert (select display_name from public.counselors where user_id = auth.uid()) = 'Carla', 'conselheira com o primeiro nome';
  blocked := false;
  begin insert into public.counselors (track_id, code_accepted_at) values ('respira', now()); exception when others then blocked := true; end;
  assert blocked, 'conselheira só na trilha em que é Farol';
  assert 'formacao-conselheiro' in (select public.my_course_ids()), 'Farol abre a Formação de Conselheiro';
  assert 'premio-aquecimento-r1' not in (select public.my_course_ids()), 'recompensa só abre depois do resgate';
  perform public.redeem_reward('aquecimento-r1');
  assert 'premio-aquecimento-r1' in (select public.my_course_ids()), 'resgate abre o conteúdo';
  assert (select status from public.reward_redemptions where reward_id = 'aquecimento-r1') = 'liberado', 'digital fica liberado';
  assert (select spent from public.points_stats(auth.uid(), 'aquecimento')) = 1140, 'resgate gasta 1.140 pontos';
  assert public.kindness_level(auth.uid(), 'aquecimento') = 6, 'gastar pontos não baixa o nível';
  perform public.redeem_reward('aquecimento-r3');
  assert (select status from public.reward_redemptions where reward_id = 'aquecimento-r3') = 'solicitado', 'físico fica solicitado';
  blocked := false;
  begin perform public.redeem_reward('aquecimento-r1'); exception when others then blocked := true; end;
  assert blocked, 'não dá para resgatar duas vezes';
  blocked := false;
  begin perform public.redeem_reward('respira-r1'); exception when others then blocked := true; end;
  assert blocked, 'pontos do Aquecimento não pagam recompensa da Respira';
  blocked := false;
  begin insert into public.reward_redemptions (reward_id, track_id, cost, status) values ('aquecimento-r2', 'aquecimento', 0, 'liberado'); exception when others then blocked := true; end;
  assert blocked, 'resgate só pela função (que confere o saldo)';
  blocked := false;
  begin insert into public.point_events (user_id, track_id, kind, points) values (auth.uid(), 'aquecimento', 'apoio', 5); exception when others then blocked := true; end;
  assert blocked, 'ninguém escreve pontos direto no extrato';
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","email":"duda@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; v_post uuid; v_req uuid; f record; begin
  insert into public.posts (channel, body, kind, feeling) values ('aquecimento', 'Hoje foi difícil, alguém me ajuda?', 'apoio', 'ansiedade') returning id into v_post;
  blocked := false;
  begin insert into public.thanks (post_id) values (v_post); exception when others then blocked := true; end;
  assert blocked, 'ninguém agradece o próprio post';

  insert into public.thanks (post_id, points, receiver_id)
  select id, 999, '00000000-0000-0000-0000-00000000000d' from public.posts where body = 'Dica 4';
  assert (select points from public.thanks where giver_id = auth.uid()) = 2, 'agradecimento vale 2';
  assert (select receiver_id from public.thanks where giver_id = auth.uid()) = '00000000-0000-0000-0000-00000000000c', 'o banco decide quem recebe';

  insert into public.comments (post_id, body) select id, 'Carla, obrigada pela dica! Vou tentar hoje à noite e te conto.' from public.posts where body = 'Dica 4';
  insert into public.comments (post_id, body) select id, 'Mais uma coisa: funcionou demais ontem, estou mais calma.' from public.posts where body = 'Dica 4';
  assert (select count(*) from public.point_events where user_id <> auth.uid()) = 0, 'Duda não vê o extrato dos outros';
  assert (select count(*) from public.point_events where user_id = auth.uid()) = 2, 'Duda vê as duas mensagens no próprio extrato';

  insert into public.post_reactions (post_id, kind) select id, 'abraco' from public.posts where body = 'Dica 4';
  select * into f from public.posts_feed where body = 'Dica 4';
  assert f.author_level = 6, 'feed traz o nível da autora na trilha do post';
  assert f.i_thanked, 'feed marca que eu agradeci';

  blocked := false;
  begin insert into public.counselors (track_id, code_accepted_at) values ('aquecimento', now()); exception when others then blocked := true; end;
  assert blocked, 'Semente não pode ser conselheira';
  blocked := false;
  begin perform public.redeem_reward('aquecimento-r1'); exception when others then blocked := true; end;
  assert blocked, 'sem saldo não resgata';

  assert (select count(*) from public.list_counselors('aquecimento')) = 1, 'Duda vê a Carla como conselheira do Aquecimento';
  assert (select count(*) from public.list_counselors('respira')) = 0, 'conselheiros são por trilha';
  insert into public.advice_requests (counselor_id, track_id, topic, message)
  values ('00000000-0000-0000-0000-00000000000c', 'aquecimento', 'Ansiedade à noite', 'Acordo de madrugada com a cabeça a mil.') returning id into v_req;
  assert (select status from public.advice_requests where id = v_req) = 'pendente', 'pedido começa pendente';

  insert into public.daily_logs (day, track_id, kind, data, score) values ('2020-01-01', 'ritmo', 'plano', '{"prioridades":["Enviar a proposta"]}', null);
  assert (select day from public.daily_logs) = (now() at time zone 'America/Sao_Paulo')::date, 'plano sempre no dia de hoje';

  update public.profiles set health_consent_at = now() where id = auth.uid();
  insert into public.checkins (day, track_id, mood, energy, sleep_hours, sleep_quality, answers, feeling, alert_level)
  values (current_date, 'respira', 2, 2, 5, 2, '{"anxiety": 9}', 'ansiedade', 'critico'),
         (current_date, 'aquecimento', 3, 3, 7, 3, '{}', 'calma', 'bem');
  assert (select count(*) from public.checkins) = 2, 'um check-in por trilha no mesmo dia';
end $$;
commit;

do $$ begin
  assert (select count(*) from public.point_events where kind = 'agradecimento' and status = 'valido' and points = 2
           and user_id = '00000000-0000-0000-0000-00000000000c') = 1, 'Carla ganhou 2 pontos pelo agradecimento';
  assert (select count(*) from public.point_events where kind = 'ajuda' and status = 'pendente' and points = 3
           and user_id = '00000000-0000-0000-0000-00000000000d') = 1, 'a primeira mensagem de ajuda da Duda vai para validação';
  assert (select count(*) from public.point_events where kind = 'ajuda' and status = 'recusado'
           and user_id = '00000000-0000-0000-0000-00000000000d') = 1, 'a segunda mensagem no mesmo post não pontua';
end $$;

-- Carla oferece dois apoios no pedido da Duda: um planejamento e um horário.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","email":"carla@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; begin
  insert into public.support_actions (post_id, mode, message, items)
  select id, 'plano', 'Montei para você', '{"Respiração 4-6 ao acordar","Horário da preocupação às 18h"}' from public.posts where kind = 'apoio';
  assert (select helped_name from public.support_actions) = 'Duda', 'apoio vai para a autora do pedido';
  blocked := false;
  begin
    insert into public.support_actions (post_id, mode, items) select id, 'plano', '{"a","b"}' from public.posts where kind = 'apoio';
  exception when others then blocked := true; end;
  assert blocked, 'um apoio aberto por pedido';
  blocked := false;
  begin insert into public.support_actions (post_id, mode, items) select id, 'plano', '{"x","y"}' from public.posts where body = 'Dica 2';
  exception when others then blocked := true; end;
  assert blocked, 'apoio só em pedido de apoio';
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","email":"duda@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; begin
  blocked := false;
  begin update public.support_actions set status = 'concluido'; exception when others then blocked := true; end;
  assert blocked, 'precisa aceitar antes de concluir';
  update public.support_actions set status = 'aceito';
  update public.support_actions set status = 'concluido';
end $$;
commit;

do $$ begin
  assert (select count(*) from public.point_events where kind = 'apoio' and status = 'valido' and points = 5
           and user_id = '00000000-0000-0000-0000-00000000000c' and day = (now() at time zone 'America/Sao_Paulo')::date) = 1,
    'apoio concluído vale 5 para quem ajudou';
end $$;

begin;
set local request.jwt.claims = '{"role":"service_role"}';
insert into public.support_actions (post_id, helper_id, helped_id, track_id, mode, scheduled_at, status)
select id, '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d', 'aquecimento', 'agenda', now() + interval '2 hours', 'oferecido'
  from public.posts where kind = 'apoio';
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","email":"duda@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; begin
  update public.support_actions set status = 'aceito' where mode = 'agenda';
  assert (select count(*) from public.agenda_events where support_id is not null) = 1, 'horário aceito entra na agenda da Duda';
  blocked := false;
  begin update public.support_actions set status = 'concluido' where mode = 'agenda'; exception when others then blocked := true; end;
  assert blocked, 'horário só se confirma depois que acontece';
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","email":"bia@exemplo.com","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.advice_requests) = 0, 'Bia não vê conselhos dos outros';
  assert (select count(*) from public.support_actions) = 0, 'Bia não vê apoios dos outros';
  assert (select count(*) from public.reward_redemptions) = 0, 'Bia não vê resgates dos outros';
  assert (select count(*) from public.daily_logs) = 0, 'Bia não vê planos dos outros';
end $$;
commit;

-- ——— Painel da trilha: hábitos livres, dados de saúde só com consentimento ———
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'fabio@exemplo.com');
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","email":"fabio@exemplo.com","role":"authenticated"}';
do $$ declare blocked boolean; v numeric; begin
  -- Água e treino não são dado de saúde: registra sem consentimento.
  v := public.track_counter_add('move', 'agua', 250);
  v := public.track_counter_add('move', 'agua', 500);
  assert v = 750, 'o contador soma os toques do dia';
  v := public.track_counter_add('move', 'agua', -1000);
  assert v = 0, 'desfazer não deixa o contador negativo';
  insert into public.track_entries (track_id, metric, entry_key, value, data, day)
    values ('move', 'treino', 'a1', 50, '{"modalidade":"Funcional","duracao":50}', current_date + 3);
  assert (select day from public.track_entries where entry_key = 'a1') = (now() at time zone 'America/Sao_Paulo')::date,
    'registro no futuro vira o dia de hoje';
  -- Peso é dado de saúde: sem consentimento, não grava.
  blocked := false;
  begin insert into public.track_entries (track_id, metric, value) values ('move', 'peso', 82.4); exception when others then blocked := true; end;
  assert blocked, 'peso sem consentimento deveria ser bloqueado';
  update public.profiles set health_consent_at = now() where id = auth.uid();
  insert into public.track_entries (track_id, metric, value) values ('move', 'peso', 82.4);
  insert into public.track_entries (track_id, metric, value, data) values ('respira', 'gad7', 8, '{"q1":"Vários dias"}');
  assert (select count(*) from public.track_entries) = 4, 'Fábio vê os próprios registros';
  blocked := false;
  begin insert into public.track_entries (track_id, metric, value) values ('aquecimento', 'agua', 1); exception when others then blocked := true; end;
  assert blocked, 'só trilhas com painel';
  -- Retirar o consentimento apaga peso e GAD-7, mas mantém água e treinos.
  update public.profiles set health_consent_at = null where id = auth.uid();
  assert (select count(*) from public.track_entries) = 2, 'retirar o consentimento apaga os dados de saúde do painel';
  assert jsonb_array_length(public.export_my_data() -> 'painel_das_trilhas') = 2, 'exportação traz o painel';
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","email":"ana@exemplo.com","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.track_entries) = 0, 'Ana não vê o painel do Fábio';
  update public.track_entries set value = 1;
  delete from public.track_entries;
end $$;
commit;
do $$ begin
  assert (select count(*) from public.track_entries where user_id = '00000000-0000-0000-0000-0000000000f1') = 2, 'Ana não altera nem apaga o painel do Fábio';
  assert (select count(*) from public.tracks where status = 'live') = 6, 'todas as trilhas no ar';
end $$;

-- ——— Notificações: tokens, preferências, público e caixa de avisos ———
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'eva.push@exemplo.com', '{"full_name":"Eva Rocha"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'gil.push@exemplo.com', '{"full_name":"Gil Prado"}');
insert into public.entitlements (email, course_id, product_id, hotmart_transaction)
select 'eva.push@exemplo.com', pc.course_id, pc.product_id, 'HP-EVA' from public.product_courses pc where pc.product_id = 'trilha-move';

-- Eva (assina a Move) registra o celular; Gil registra o dele e desliga os avisos da Move.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","email":"eva.push@exemplo.com","role":"authenticated"}';
select public.register_push_token('ExponentPushToken[eva-1]', 'ios');
do $$ declare blocked boolean := false; begin
  begin insert into public.push_tokens (token, user_id, platform) values ('ExponentPushToken[x]', '00000000-0000-0000-0000-0000000000e2', 'ios');
  exception when others then blocked := true; end;
  assert blocked, 'ninguém grava token direto na tabela nem em nome de outra pessoa';
  blocked := false;
  begin perform public.register_push_token('token-invalido', 'ios'); exception when others then blocked := true; end;
  assert blocked, 'token fora do formato da Expo é recusado';
  blocked := false;
  begin insert into public.notifications (kind, title, body, audience) values ('announcement', 'Oi', 'Teste', 'all');
  exception when others then blocked := true; end;
  assert blocked, 'aluna não cria aviso';
  blocked := false;
  begin perform * from public.notification_reach('announcement', 'all', null, null); exception when others then blocked := true; end;
  assert blocked, 'aluna não vê o alcance dos avisos';
  blocked := false;
  begin perform * from public.dispatch_notification(gen_random_uuid()); exception when others then blocked := true; end;
  assert blocked, 'aluna não dispara aviso';
  insert into public.notification_settings (launches) values (true);
  assert (select launches_consent_at from public.notification_settings where user_id = auth.uid()) is not null,
    'aceitar lançamentos grava a data do consentimento';
end $$;
commit;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","email":"gil.push@exemplo.com","role":"authenticated"}';
select public.register_push_token('ExponentPushToken[gil-1]', 'android');
-- O mesmo celular passa para o Gil quando ele entra nele.
select public.register_push_token('ExponentPushToken[eva-1]', 'android');
insert into public.notification_settings (muted_tracks) values (array['move', 'MOVE!', 'move']);
do $$ begin
  assert (select count(*) from public.push_tokens) = 2, 'Gil só vê os próprios aparelhos';
  assert (select muted_tracks from public.notification_settings where user_id = auth.uid()) = array['move'],
    'trilhas silenciadas sem repetição nem lixo';
  assert (select count(*) from public.notification_settings) = 1, 'Gil não vê as preferências da Eva';
end $$;
commit;
-- Eva entra de novo no celular dela.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","email":"eva.push@exemplo.com","role":"authenticated"}';
select public.register_push_token('ExponentPushToken[eva-1]', 'ios');
commit;

-- Admin cria três avisos e vê o alcance antes de enviar.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@vivah.com.br","role":"authenticated"}';
insert into public.notifications (id, kind, title, body, url, audience, track_id) values
  ('00000000-0000-0000-0000-00000000a001', 'announcement', 'Live hoje às 20h', 'Respiração para dormir melhor', '/avisos', 'track', 'move'),
  ('00000000-0000-0000-0000-00000000a002', 'announcement', 'Novidade no app', 'Agora você escolhe os avisos que recebe', null, 'all', null);
insert into public.notifications (id, kind, title, body, url, audience, track_id, course_id) values
  ('00000000-0000-0000-0000-00000000a003', 'launch', 'Ficha de treino nova', 'Monte seus treinos da semana', '/curso/ficha-de-treino', 'all', 'move', null);
do $$ declare r record; blocked boolean := false; begin
  select * into r from public.notification_reach('announcement', 'track', 'move', null);
  assert r.recipients = 1 and r.push_targets = 1, format('aviso da Move: só a Eva assina (veio %s/%s)', r.recipients, r.push_targets);
  begin insert into public.notifications (kind, title, body, audience, status) values ('announcement', 'Oi oi', 'Teste', 'all', 'sent');
  exception when others then blocked := true; end;
  assert blocked, 'o admin não marca aviso como enviado sem enviar';
  blocked := false;
  begin insert into public.notifications (kind, title, body, audience) values ('announcement', 'Oi oi', 'Teste', 'track');
  exception when others then blocked := true; end;
  assert blocked, 'aviso para trilha precisa dizer qual trilha';
end $$;
commit;

-- A função de envio (service role) entrega.
begin;
set local role service_role;
do $$ declare tokens text[]; begin
  tokens := array(select token from public.dispatch_notification('00000000-0000-0000-0000-00000000a001'));
  assert tokens = array['ExponentPushToken[eva-1]'], format('push da Move só para a Eva, veio %s', tokens);
  tokens := array(select token from public.dispatch_notification('00000000-0000-0000-0000-00000000a002'));
  assert 'ExponentPushToken[gil-1]' = any (tokens) and 'ExponentPushToken[eva-1]' = any (tokens), 'aviso geral vai para os dois';
  tokens := array(select token from public.dispatch_notification('00000000-0000-0000-0000-00000000a003'));
  assert tokens = array['ExponentPushToken[eva-1]'], 'lançamento só para quem aceitou (Eva), e o Gil silenciou a Move';
  assert (select recipients from public.notifications where id = '00000000-0000-0000-0000-00000000a002') = (select count(*) from public.profiles),
    'o aviso geral entra na caixa de todo mundo';
  begin perform public.dispatch_notification('00000000-0000-0000-0000-00000000a001'); assert false, 'não reenviar';
  exception when raise_exception then null; end;
end $$;
commit;

-- Caixa de avisos do Gil: recebeu o geral e o lançamento (na caixa, sem push), não o da Move.
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","email":"gil.push@exemplo.com","role":"authenticated"}';
do $$ begin
  assert (select count(*) from public.my_inbox()) = 2, 'Gil tem 2 avisos na caixa';
  assert (select count(*) from public.my_inbox() where read_at is null) = 2, 'os dois não lidos';
  perform public.mark_notifications_read(array['00000000-0000-0000-0000-00000000a002'::uuid]);
  assert (select count(*) from public.my_inbox() where read_at is null) = 1, 'marcar um como lido';
  assert (select count(*) from public.user_notifications) = 2, 'Gil só vê a própria caixa';
  assert (public.export_my_data() -> 'avisos_recebidos') is not null, 'os avisos entram na exportação LGPD';
end $$;
commit;
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@vivah.com.br","role":"authenticated"}';
do $$ begin
  assert (select opened from public.admin_notifications() where id = '00000000-0000-0000-0000-00000000a002') = 1, 'o admin vê quantos abriram';
end $$;
commit;

-- ——— Apagar a conta remove os dados pessoais em cascata ———
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 0, 'perfil deveria sumir';
  assert (select count(*) from public.agenda_events where user_id = '00000000-0000-0000-0000-00000000000b') = 0, 'agenda deveria sumir';
  assert (select count(*) from public.posts where author_id = '00000000-0000-0000-0000-00000000000b') = 0, 'posts deveriam sumir';
end $$;

\echo 'RLS: todos os testes passaram'
