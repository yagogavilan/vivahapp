-- Vivah · app por trilha e comunidade com reconhecimento de bondade.
-- - check-in diário por trilha (perguntas da trilha, sentimento e nível de alerta);
-- - feed com tipo de post, sentimento, curtidas e reações;
-- - "obrigado" que vira pontos, níveis e prêmios (regras anti-abuso no banco);
-- - conteúdo exclusivo por nível, pedidos de prêmio físico;
-- - conselheiros (a partir do nível Farol), pedidos de conselho e conversa;
-- - denúncias.

-- ————————————————————————————————————————————————————————————
-- Check-in por trilha
-- ————————————————————————————————————————————————————————————
alter table public.checkins
  add column track_id text not null default 'aquecimento',
  add column answers jsonb not null default '{}'::jsonb,
  add column feeling text check (feeling in ('ansiedade', 'tristeza', 'cansaco', 'sobrecarga', 'irritacao', 'calma', 'animo')),
  add column alert_level text not null default 'bem' check (alert_level in ('bem', 'atencao', 'critico'));
alter table public.checkins drop constraint checkins_pkey;
alter table public.checkins add primary key (user_id, day, track_id);

-- ————————————————————————————————————————————————————————————
-- Níveis e prêmios (gerados pelo seed a partir de src/domain/kindness.ts)
-- ————————————————————————————————————————————————————————————
create table public.kindness_levels (
  level int primary key,
  name text not null,
  min_points int not null,
  min_givers int not null,
  meaning text not null default ''
);

create table public.kindness_rewards (
  id text primary key,
  level int not null references public.kindness_levels (level),
  kind text not null check (kind in ('selo', 'conteudo', 'fisico', 'acesso')),
  title text not null,
  description text not null default '',
  course_id text references public.courses (id) on delete set null
);

-- Curso exclusivo por nível de bondade (não é vendido).
alter table public.courses add column min_kindness_level int references public.kindness_levels (level);

-- ————————————————————————————————————————————————————————————
-- Comunidade: tipo, sentimento e reações
-- ————————————————————————————————————————————————————————————
alter table public.posts
  add column kind text not null default 'desabafo' check (kind in ('apoio', 'desabafo', 'conquista', 'dica')),
  add column feeling text check (feeling in ('ansiedade', 'tristeza', 'cansaco', 'sobrecarga', 'irritacao', 'calma', 'animo'));

create table public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('like', 'abraco', 'forca', 'parabens', 'tocou')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);
create index on public.post_reactions (post_id);

-- ————————————————————————————————————————————————————————————
-- Conselheiros e pedidos de conselho
-- ————————————————————————————————————————————————————————————
create table public.counselors (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null default 'Aluno Vivah',
  bio text not null default '' check (char_length(bio) <= 400),
  topics text[] not null default '{}',
  is_open boolean not null default true,
  code_accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.advice_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  requester_name text not null default 'Aluno Vivah',
  counselor_id uuid not null references public.counselors (user_id) on delete cascade,
  counselor_name text not null default 'Conselheiro',
  topic text not null check (char_length(topic) between 2 and 80),
  message text not null check (char_length(message) between 1 and 1000),
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado', 'encerrado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.advice_requests (requester_id);
create index on public.advice_requests (counselor_id);

create table public.advice_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.advice_requests (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.advice_messages (request_id, created_at);

-- ————————————————————————————————————————————————————————————
-- Agradecimentos ("obrigado") e pontos de bondade
-- ————————————————————————————————————————————————————————————
create table public.thanks (
  id uuid primary key default gen_random_uuid(),
  giver_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  advice_id uuid references public.advice_requests (id) on delete cascade,
  points int not null default 10,
  created_at timestamptz not null default now(),
  check (num_nonnulls(post_id, comment_id, advice_id) = 1),
  check (giver_id <> receiver_id),
  unique (giver_id, post_id),
  unique (giver_id, comment_id),
  unique (giver_id, advice_id)
);
create index on public.thanks (receiver_id, created_at);
create index on public.thanks (giver_id, created_at);

/** Pontos (com limite de 3 por pessoa por mês) e pessoas diferentes que agradeceram. */
create function public.kindness_stats(p_user uuid)
returns table (points int, givers int)
language sql stable security definer set search_path = '' as $$
  with ranked as (
    select t.giver_id, t.points,
           row_number() over (
             partition by t.giver_id, date_trunc('month', t.created_at at time zone 'America/Sao_Paulo')
             order by t.created_at
           ) as rn
      from public.thanks t
     where t.receiver_id = p_user
  )
  select coalesce(sum(points) filter (where rn <= 3), 0)::int, count(distinct giver_id)::int from ranked
$$;

create function public.kindness_level(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.profiles p where p.id = p_user and p.role = 'admin') then 99
    else coalesce((
      select max(l.level) from public.kindness_levels l, public.kindness_stats(p_user) s
       where s.points >= l.min_points and s.givers >= l.min_givers
    ), 1)
  end
$$;

create function public.thanks_count(p_kind text, p_id uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.thanks t
   where (p_kind = 'post' and t.post_id = p_id) or (p_kind = 'comment' and t.comment_id = p_id)
$$;

-- Quem dá o obrigado é sempre quem está logado; quem recebe e quantos pontos vale, o banco decide.
create function public.thanks_prepare() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_channel text;
  v_post_author uuid;
  v_status text;
  v_requester uuid;
  v_today_count int;
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  new.giver_id := auth.uid();
  new.created_at := now();

  if new.post_id is not null then
    select p.author_id, p.channel into new.receiver_id, v_channel
      from public.posts p where p.id = new.post_id and not p.hidden;
    if not found or not public.can_access_channel(v_channel) then
      raise exception 'Publicação não encontrada.';
    end if;
    new.points := 10;
  elsif new.comment_id is not null then
    select c.author_id, p.author_id, p.channel into new.receiver_id, v_post_author, v_channel
      from public.comments c join public.posts p on p.id = c.post_id
     where c.id = new.comment_id and not c.hidden and not p.hidden;
    if not found or not public.can_access_channel(v_channel) then
      raise exception 'Comentário não encontrado.';
    end if;
    new.points := case when v_post_author = auth.uid() then 20 else 10 end;
  else
    select a.requester_id, a.counselor_id, a.status into v_requester, new.receiver_id, v_status
      from public.advice_requests a where a.id = new.advice_id;
    if not found or v_requester <> auth.uid() or v_status not in ('aceito', 'encerrado') then
      raise exception 'Só quem pediu o conselho pode agradecer, depois que a conversa começou.';
    end if;
    new.points := 30;
  end if;

  if new.receiver_id = auth.uid() then
    raise exception 'Não dá para agradecer a si mesmo.';
  end if;

  select count(*) into v_today_count from public.thanks t
   where t.giver_id = auth.uid()
     and (t.created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  if v_today_count >= 10 then
    raise exception 'Você já deu 10 agradecimentos hoje. Amanhã tem mais.';
  end if;
  return new;
end;
$$;

create trigger thanks_prepare before insert on public.thanks
  for each row execute function public.thanks_prepare();

-- ————————————————————————————————————————————————————————————
-- Pedidos de prêmio físico
-- ————————————————————————————————————————————————————————————
create table public.reward_claims (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reward_id text not null references public.kindness_rewards (id),
  status text not null default 'solicitado' check (status in ('solicitado', 'enviado', 'entregue')),
  created_at timestamptz not null default now(),
  primary key (user_id, reward_id)
);

create function public.reward_claim_prepare() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_level int;
  v_kind text;
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;
  new.user_id := auth.uid();
  new.status := 'solicitado';
  select r.level, r.kind into v_level, v_kind from public.kindness_rewards r where r.id = new.reward_id;
  if not found or v_kind <> 'fisico' then
    raise exception 'Prêmio não encontrado.';
  end if;
  if public.kindness_level(auth.uid()) < v_level then
    raise exception 'Este prêmio ainda não foi liberado para o seu nível.';
  end if;
  return new;
end;
$$;

create trigger reward_claim_prepare before insert on public.reward_claims
  for each row execute function public.reward_claim_prepare();

-- ————————————————————————————————————————————————————————————
-- Regras dos conselheiros
-- ————————————————————————————————————————————————————————————
create function public.counselor_prepare() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  new.user_id := auth.uid();
  if public.kindness_level(auth.uid()) < 6 then
    raise exception 'O espaço de conselheiro abre no nível Farol.';
  end if;
  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Aluno Vivah') into new.display_name
    from public.profiles p where p.id = auth.uid();
  return new;
end;
$$;

create trigger counselor_prepare before insert or update on public.counselors
  for each row execute function public.counselor_prepare();

create function public.advice_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_open int;
begin
  new.requester_id := auth.uid();
  new.status := 'pendente';
  new.created_at := now();
  new.updated_at := now();
  select c.display_name into new.counselor_name
    from public.counselors c where c.user_id = new.counselor_id and c.is_open;
  if not found then
    raise exception 'Este conselheiro não está recebendo pedidos agora.';
  end if;
  if new.counselor_id = auth.uid() then
    raise exception 'Você não pode pedir conselho para si mesmo.';
  end if;
  select count(*) into v_open from public.advice_requests a
   where a.requester_id = auth.uid() and a.status in ('pendente', 'aceito');
  if v_open >= 3 then
    raise exception 'Você já tem 3 conversas abertas. Encerre uma para pedir outra.';
  end if;
  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Aluno Vivah') into new.requester_name
    from public.profiles p where p.id = auth.uid();
  new.requester_name := coalesce(new.requester_name, 'Aluno Vivah');
  return new;
end;
$$;

create trigger advice_insert before insert on public.advice_requests
  for each row execute function public.advice_insert();

-- Só muda o status, e só pelos caminhos permitidos.
create function public.advice_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if (new.requester_id, new.counselor_id, new.topic, new.message, new.requester_name, new.counselor_name, new.created_at)
     is distinct from (old.requester_id, old.counselor_id, old.topic, old.message, old.requester_name, old.counselor_name, old.created_at) then
    raise exception 'Só o status do pedido pode mudar.';
  end if;
  if not (
       (auth.uid() = old.counselor_id and old.status = 'pendente' and new.status in ('aceito', 'recusado'))
    or (auth.uid() = old.requester_id and old.status = 'pendente' and new.status = 'encerrado')
    or (auth.uid() in (old.counselor_id, old.requester_id) and old.status = 'aceito' and new.status = 'encerrado')
  ) then
    raise exception 'Mudança de status não permitida.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger advice_update before update on public.advice_requests
  for each row execute function public.advice_update();

create function public.advice_message_prepare() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.sender_id := auth.uid();
    new.created_at := now();
  end if;
  return new;
end;
$$;

create trigger advice_message_prepare before insert on public.advice_messages
  for each row execute function public.advice_message_prepare();

-- Lista pública de conselheiros abertos, com o nível de cada um.
create function public.list_counselors()
returns table (user_id uuid, display_name text, bio text, topics text[], level int)
language sql stable security definer set search_path = '' as $$
  select c.user_id, c.display_name, c.bio, c.topics, public.kindness_level(c.user_id)
    from public.counselors c
   where c.is_open and auth.uid() is not null
   order by public.kindness_level(c.user_id) desc, c.created_at
$$;

-- ————————————————————————————————————————————————————————————
-- Denúncias
-- ————————————————————————————————————————————————————————————
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'advice', 'user')),
  target_id text not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

-- ————————————————————————————————————————————————————————————
-- Acesso: cursos exclusivos por nível e canais de trilha
-- ————————————————————————————————————————————————————————————
create or replace function public.my_course_ids() returns setof text
language sql stable security definer set search_path = '' as $$
  select c.id from public.courses c where c.is_free
  union
  select e.course_id from public.entitlements e
   where e.email = public.current_email()
     and public.current_email() <> ''
     and e.status = 'active'
     and (e.expires_at is null or e.expires_at > now())
  union
  select c.id from public.courses c
   where c.min_kindness_level is not null
     and auth.uid() is not null
     and public.kindness_level(auth.uid()) >= c.min_kindness_level
  union
  select c.id from public.courses c where public.is_admin()
$$;

-- Curso exclusivo de bondade não abre o canal da trilha (só compra abre).
create or replace function public.can_access_channel(p_channel text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    p_channel = 'aquecimento'
    or public.is_admin()
    or exists (
      select 1 from public.courses c
       where c.track_id = p_channel and not c.is_free and c.min_kindness_level is null
         and public.has_course_access(c.id)
    )
  )
$$;

-- ————————————————————————————————————————————————————————————
-- Feeds
-- ————————————————————————————————————————————————————————————
drop view public.posts_feed;
create view public.posts_feed with (security_invoker = true) as
  select p.id, p.channel, p.author_id, p.author_name, p.body, p.kind, p.feeling, p.created_at,
         public.kindness_level(p.author_id) as author_level,
         (select count(*) from public.comments c where c.post_id = p.id and not c.hidden)::int as comment_count,
         coalesce((select jsonb_object_agg(s.kind, s.n)
                     from (select r.kind, count(*) as n from public.post_reactions r where r.post_id = p.id group by r.kind) s),
                  '{}'::jsonb) as reactions,
         coalesce((select array_agg(r.kind) from public.post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
                  '{}'::text[]) as my_reactions,
         public.thanks_count('post', p.id) as thanks_count,
         exists (select 1 from public.thanks t where t.post_id = p.id and t.giver_id = auth.uid()) as i_thanked
    from public.posts p
   where not p.hidden;

create view public.comments_feed with (security_invoker = true) as
  select c.id, c.post_id, c.author_id, c.author_name, c.body, c.created_at,
         public.kindness_level(c.author_id) as author_level,
         public.thanks_count('comment', c.id) as thanks_count,
         exists (select 1 from public.thanks t where t.comment_id = c.id and t.giver_id = auth.uid()) as i_thanked
    from public.comments c
   where not c.hidden;

-- ————————————————————————————————————————————————————————————
-- RLS
-- ————————————————————————————————————————————————————————————
alter table public.kindness_levels enable row level security;
alter table public.kindness_rewards enable row level security;
alter table public.post_reactions enable row level security;
alter table public.thanks enable row level security;
alter table public.reward_claims enable row level security;
alter table public.counselors enable row level security;
alter table public.advice_requests enable row level security;
alter table public.advice_messages enable row level security;
alter table public.reports enable row level security;

create policy "níveis: ler" on public.kindness_levels for select to anon, authenticated using (true);
create policy "prêmios: ler" on public.kindness_rewards for select to anon, authenticated using (true);

create policy "reações: ler" on public.post_reactions for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_access_channel(p.channel)));
create policy "reações: reagir" on public.post_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.posts p where p.id = post_id and not p.hidden and public.can_access_channel(p.channel)));
create policy "reações: desfazer" on public.post_reactions for delete to authenticated using (user_id = auth.uid());

create policy "obrigado: ver os meus" on public.thanks for select to authenticated
  using (giver_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());
create policy "obrigado: agradecer" on public.thanks for insert to authenticated with check (giver_id = auth.uid());

create policy "prêmios pedidos: ver os meus" on public.reward_claims for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "prêmios pedidos: pedir" on public.reward_claims for insert to authenticated with check (user_id = auth.uid());
create policy "prêmios pedidos: equipe atualiza" on public.reward_claims for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "conselheiros: ler" on public.counselors for select to authenticated using (is_open or user_id = auth.uid());
create policy "conselheiros: criar o meu" on public.counselors for insert to authenticated with check (user_id = auth.uid());
create policy "conselheiros: editar o meu" on public.counselors for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "conselheiros: sair" on public.counselors for delete to authenticated using (user_id = auth.uid());

create policy "conselho: participantes leem" on public.advice_requests for select to authenticated
  using (auth.uid() in (requester_id, counselor_id) or public.is_admin());
create policy "conselho: pedir" on public.advice_requests for insert to authenticated with check (requester_id = auth.uid());
create policy "conselho: mudar status" on public.advice_requests for update to authenticated
  using (auth.uid() in (requester_id, counselor_id)) with check (auth.uid() in (requester_id, counselor_id));

create policy "conversa: participantes leem" on public.advice_messages for select to authenticated
  using (exists (select 1 from public.advice_requests a
                  where a.id = request_id and (auth.uid() in (a.requester_id, a.counselor_id) or public.is_admin())));
create policy "conversa: escrever" on public.advice_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (
    select 1 from public.advice_requests a
     where a.id = request_id and a.status = 'aceito' and auth.uid() in (a.requester_id, a.counselor_id)));

create policy "denúncias: enviar" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "denúncias: equipe lê" on public.reports for select to authenticated using (public.is_admin());

grant select on public.posts_feed, public.comments_feed to authenticated;
grant execute on function public.list_counselors(), public.kindness_stats(uuid), public.kindness_level(uuid) to authenticated;

-- ————————————————————————————————————————————————————————————
-- Exportação de dados (LGPD): inclui comunidade, bondade e conselhos
-- ————————————————————————————————————————————————————————————
create or replace function public.export_my_data() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'exportado_em', now(),
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'acessos', coalesce((select jsonb_agg(to_jsonb(e)) from public.entitlements e where e.email = public.current_email()), '[]'::jsonb),
    'progresso', coalesce((select jsonb_agg(to_jsonb(lp)) from public.lesson_progress lp), '[]'::jsonb),
    'agenda', coalesce((select jsonb_agg(to_jsonb(a)) from public.agenda_events a), '[]'::jsonb),
    'diagnosticos', coalesce((select jsonb_agg(to_jsonb(d)) from public.diagnostic_results d), '[]'::jsonb),
    'checkins', coalesce((select jsonb_agg(to_jsonb(c)) from public.checkins c), '[]'::jsonb),
    'publicacoes', coalesce((select jsonb_agg(to_jsonb(p)) from public.posts p where p.author_id = auth.uid()), '[]'::jsonb),
    'comentarios', coalesce((select jsonb_agg(to_jsonb(c)) from public.comments c where c.author_id = auth.uid()), '[]'::jsonb),
    'reacoes', coalesce((select jsonb_agg(to_jsonb(r)) from public.post_reactions r where r.user_id = auth.uid()), '[]'::jsonb),
    'agradecimentos', coalesce((select jsonb_agg(to_jsonb(t)) from public.thanks t), '[]'::jsonb),
    'premios', coalesce((select jsonb_agg(to_jsonb(r)) from public.reward_claims r), '[]'::jsonb),
    'conselheiro', (select to_jsonb(c) from public.counselors c where c.user_id = auth.uid()),
    'conselhos', coalesce((select jsonb_agg(to_jsonb(a)) from public.advice_requests a), '[]'::jsonb),
    'mensagens_conselho', coalesce((select jsonb_agg(to_jsonb(m)) from public.advice_messages m where m.sender_id = auth.uid()), '[]'::jsonb),
    'anotacoes', coalesce((select jsonb_agg(to_jsonb(n)) from public.lesson_notes n), '[]'::jsonb),
    'favoritos', coalesce((select jsonb_agg(to_jsonb(f)) from public.favorites f), '[]'::jsonb),
    'atividade', coalesce((select jsonb_agg(to_jsonb(a)) from public.activity_log a), '[]'::jsonb)
  )
$$;
