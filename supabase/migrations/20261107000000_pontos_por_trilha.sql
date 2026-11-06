-- Vivah · pontos por trilha, validados no servidor, recompensas resgatadas com pontos,
-- apoio a outra pessoa, plano e fechamento do dia por trilha.
--
-- Pontos (ver src/domain/points.ts): curtida 1, agradecimento 2, mensagem de ajuda 3,
-- conselho/dica 4, apoio a outra pessoa 5. Cada atividade tem limite diário de vezes
-- que pontua (10, 5, 3, 1, 1 = no máximo 38 pontos por dia, por trilha).
-- Cada ponto vira uma linha em point_events, com o motivo quando não pontua.

-- ————————————————————————————————————————————————————————————
-- Catálogo: cursos que só abrem por resgate
-- ————————————————————————————————————————————————————————————
alter table public.courses add column reward_only boolean not null default false;

-- ————————————————————————————————————————————————————————————
-- Plano e fechamento do dia por trilha
-- ————————————————————————————————————————————————————————————
create table public.daily_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  track_id text not null,
  kind text not null check (kind in ('plano', 'fechamento')),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 8000),
  score int check (score between 0 and 100),
  valid boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, day, track_id, kind)
);

-- O dia é o de hoje em Brasília: não dá para preencher dia passado.
create function public.daily_log_prepare() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.user_id := auth.uid();
    new.day := (now() at time zone 'America/Sao_Paulo')::date;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger daily_log_prepare before insert or update on public.daily_logs
  for each row execute function public.daily_log_prepare();

-- ————————————————————————————————————————————————————————————
-- Apoio a outra pessoa (vale 5 pontos quando a pessoa ajudada confirma)
-- ————————————————————————————————————————————————————————————
create table public.support_actions (
  id uuid primary key default gen_random_uuid(),
  track_id text not null,
  post_id uuid not null references public.posts (id) on delete cascade,
  helper_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  helper_name text not null default 'Aluno Vivah',
  helped_id uuid not null references auth.users (id) on delete cascade,
  helped_name text not null default 'Aluno Vivah',
  mode text not null check (mode in ('agenda', 'plano')),
  message text not null default '' check (char_length(message) <= 1000),
  items text[] not null default '{}',
  scheduled_at timestamptz,
  status text not null default 'oferecido' check (status in ('oferecido', 'aceito', 'recusado', 'concluido', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.support_actions (helper_id);
create index on public.support_actions (helped_id);
create index on public.support_actions (post_id);

alter table public.agenda_events add column support_id uuid references public.support_actions (id) on delete cascade;

create function public.support_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_kind text;
  v_channel text;
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  new.helper_id := auth.uid();
  new.status := 'oferecido';
  new.created_at := now();
  new.updated_at := now();
  select p.kind, p.channel, p.author_id into v_kind, v_channel, new.helped_id
    from public.posts p where p.id = new.post_id and not p.hidden;
  if not found or not public.can_access_channel(v_channel) then
    raise exception 'Publicação não encontrada.';
  end if;
  if v_kind <> 'apoio' then
    raise exception 'Apoio só pode ser oferecido em pedidos de apoio.';
  end if;
  if new.helped_id = auth.uid() then
    raise exception 'Você não pode oferecer apoio para si mesmo.';
  end if;
  new.track_id := v_channel;
  if new.mode = 'agenda' then
    if new.scheduled_at is null or new.scheduled_at < now() + interval '30 minutes' or new.scheduled_at > now() + interval '14 days' then
      raise exception 'Escolha um horário entre daqui a 30 minutos e os próximos 14 dias.';
    end if;
  else
    new.scheduled_at := null;
    if coalesce(array_length(new.items, 1), 0) < 2 or array_length(new.items, 1) > 12
       or exists (select 1 from unnest(new.items) i where char_length(i) not between 3 and 200) then
      raise exception 'Monte de 2 a 12 itens, cada um com 3 a 200 caracteres.';
    end if;
  end if;
  if exists (select 1 from public.support_actions s
              where s.post_id = new.post_id and s.helper_id = auth.uid() and s.status in ('oferecido', 'aceito')) then
    raise exception 'Você já ofereceu apoio neste pedido.';
  end if;
  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Aluno Vivah') into new.helper_name from public.profiles p where p.id = auth.uid();
  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Aluno Vivah') into new.helped_name from public.profiles p where p.id = new.helped_id;
  new.helper_name := coalesce(new.helper_name, 'Aluno Vivah');
  new.helped_name := coalesce(new.helped_name, 'Aluno Vivah');
  return new;
end;
$$;
create trigger support_insert before insert on public.support_actions
  for each row execute function public.support_insert();

-- Só o status muda, e só pelos caminhos permitidos.
create function public.support_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if (new.track_id, new.post_id, new.helper_id, new.helped_id, new.mode, new.message, new.items, new.scheduled_at, new.created_at)
     is distinct from (old.track_id, old.post_id, old.helper_id, old.helped_id, old.mode, old.message, old.items, old.scheduled_at, old.created_at) then
    raise exception 'Só o status do apoio pode mudar.';
  end if;
  if not (
       (auth.uid() = old.helped_id and old.status = 'oferecido' and new.status in ('aceito', 'recusado'))
    or (auth.uid() = old.helped_id and old.status = 'aceito' and new.status = 'concluido'
        and (old.mode = 'plano' or old.scheduled_at <= now()))
    or (auth.uid() = old.helper_id and old.status in ('oferecido', 'aceito') and new.status = 'cancelado')
  ) then
    raise exception 'Mudança não permitida. Num horário marcado, confirme só depois que ele acontecer.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger support_update before update on public.support_actions
  for each row execute function public.support_update();

-- Horário de apoio aceito entra na agenda das duas pessoas.
create function public.support_to_agenda() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.mode = 'agenda' and new.status = 'aceito' and old.status = 'oferecido' then
    insert into public.agenda_events (user_id, title, kind, starts_at, ends_at, support_id)
    values (new.helper_id, 'Apoio a ' || new.helped_name, 'pessoal', new.scheduled_at, new.scheduled_at + interval '30 minutes', new.id),
           (new.helped_id, 'Conversa de apoio com ' || new.helper_name, 'pessoal', new.scheduled_at, new.scheduled_at + interval '30 minutes', new.id);
  elsif new.status in ('cancelado', 'recusado') then
    delete from public.agenda_events where support_id = new.id;
  end if;
  return new;
end;
$$;
create trigger support_to_agenda after update on public.support_actions
  for each row execute function public.support_to_agenda();

-- ————————————————————————————————————————————————————————————
-- Extrato de pontos
-- ————————————————————————————————————————————————————————————
create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text,
  track_id text not null,
  kind text not null check (kind in ('curtida', 'agradecimento', 'ajuda', 'conselho', 'apoio')),
  points int not null check (points between 0 and 5),
  status text not null default 'valido' check (status in ('pendente', 'valido', 'recusado')),
  reason text,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  thank_id uuid references public.thanks (id) on delete cascade,
  support_id uuid references public.support_actions (id) on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  created_at timestamptz not null default now()
);
create index on public.point_events (user_id, track_id, day);
create index on public.point_events (status) where status = 'pendente';
create unique index point_events_curtida on public.point_events (post_id, actor_id) where kind = 'curtida';
create unique index point_events_thank on public.point_events (thank_id) where thank_id is not null;
create unique index point_events_comment on public.point_events (comment_id) where comment_id is not null;
create unique index point_events_conselho on public.point_events (post_id) where kind = 'conselho';
create unique index point_events_support on public.point_events (support_id) where support_id is not null;

/** Pontos da atividade já contados hoje (válidos ou em validação) por quem recebe, na trilha. */
create function public.points_today(p_user uuid, p_track text, p_kind text) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(e.points), 0)::int from public.point_events e
   where e.user_id = p_user and e.track_id = p_track and e.kind = p_kind
     and e.status in ('valido', 'pendente')
     and e.day = (now() at time zone 'America/Sao_Paulo')::date
$$;

/**
 * Registra um ponto já aplicando as regras de limite.
 * Status 'pendente' fica para a validação do texto (função validate-contributions).
 */
create function public.award(
  p_user uuid, p_actor uuid, p_track text, p_kind text, p_status text,
  p_post uuid default null, p_comment uuid default null, p_thank uuid default null, p_support uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_points int := case p_kind when 'curtida' then 1 when 'agradecimento' then 2 when 'ajuda' then 3 when 'conselho' then 4 else 5 end;
  v_cap int := case p_kind when 'curtida' then 10 when 'agradecimento' then 10 when 'ajuda' then 9 when 'conselho' then 4 else 5 end;
  v_status text := p_status;
  v_reason text;
  v_actor_name text;
begin
  if p_user is null or p_user = p_actor then
    return;
  end if;
  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Aluno Vivah') into v_actor_name from public.profiles p where p.id = p_actor;

  if public.points_today(p_user, p_track, p_kind) + v_points > v_cap then
    v_status := 'recusado';
    v_reason := 'Limite diário desta atividade atingido.';
  elsif p_kind = 'curtida' and (
      select count(*) from public.point_events e
       where e.user_id = p_user and e.actor_id = p_actor and e.kind = 'curtida' and e.status = 'valido'
         and e.created_at > now() - interval '30 days') >= 10 then
    v_status := 'recusado';
    v_reason := 'Curtidas da mesma pessoa contam até 10 vezes por mês.';
  elsif p_kind = 'agradecimento' and (
      select count(*) from public.point_events e
       where e.user_id = p_user and e.actor_id = p_actor and e.kind = 'agradecimento' and e.status = 'valido'
         and e.created_at > now() - interval '30 days') >= 3 then
    v_status := 'recusado';
    v_reason := 'Agradecimentos da mesma pessoa contam até 3 vezes por mês.';
  elsif p_kind = 'apoio' and exists (
      select 1 from public.point_events e
       where e.user_id = p_user and e.actor_id = p_actor and e.kind = 'apoio' and e.status = 'valido'
         and e.created_at > now() - interval '7 days') then
    v_status := 'recusado';
    v_reason := 'Apoio para a mesma pessoa conta uma vez por semana.';
  end if;

  insert into public.point_events (user_id, actor_id, actor_name, track_id, kind, points, status, reason, post_id, comment_id, thank_id, support_id)
  values (p_user, p_actor, v_actor_name, p_track, p_kind, case when v_status = 'recusado' then 0 else v_points end, v_status, v_reason,
          p_post, p_comment, p_thank, p_support)
  on conflict do nothing;
end;
$$;
revoke execute on function public.award(uuid, uuid, text, text, text, uuid, uuid, uuid, uuid) from public, anon, authenticated;

-- Curtida recebida: 1 ponto para o autor. Descurtir tira o ponto.
create function public.points_on_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid;
  v_channel text;
begin
  if tg_op = 'INSERT' then
    if new.kind <> 'like' then return new; end if;
    select p.author_id, p.channel into v_author, v_channel from public.posts p where p.id = new.post_id;
    perform public.award(v_author, new.user_id, v_channel, 'curtida', 'valido', p_post => new.post_id);
    return new;
  end if;
  if old.kind = 'like' then
    delete from public.point_events where kind = 'curtida' and post_id = old.post_id and actor_id = old.user_id;
  end if;
  return old;
end;
$$;
create trigger points_on_like after insert or delete on public.post_reactions
  for each row execute function public.points_on_like();

-- Agradecimento recebido: 2 pontos.
create function public.points_on_thanks() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_channel text;
begin
  if new.post_id is not null then
    select p.channel into v_channel from public.posts p where p.id = new.post_id;
  elsif new.comment_id is not null then
    select p.channel into v_channel from public.comments c join public.posts p on p.id = c.post_id where c.id = new.comment_id;
  else
    select a.track_id into v_channel from public.advice_requests a where a.id = new.advice_id;
  end if;
  perform public.award(new.receiver_id, new.giver_id, coalesce(v_channel, 'aquecimento'), 'agradecimento', 'valido', p_thank => new.id);
  return new;
end;
$$;
create trigger points_on_thanks after insert on public.thanks
  for each row execute function public.points_on_thanks();

-- Mensagem de ajuda (comentário no post de outra pessoa): 3 pontos depois da validação do texto.
create function public.points_on_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid;
  v_channel text;
begin
  select p.author_id, p.channel into v_author, v_channel from public.posts p where p.id = new.post_id;
  if v_author = new.author_id then
    return new;
  end if;
  if exists (select 1 from public.point_events e
              join public.comments c on c.id = e.comment_id
             where e.user_id = new.author_id and e.kind = 'ajuda' and c.post_id = new.post_id and e.status <> 'recusado') then
    -- Só a primeira mensagem de ajuda em cada publicação pontua.
    insert into public.point_events (user_id, actor_id, track_id, kind, points, status, reason, comment_id, post_id)
    values (new.author_id, v_author, v_channel, 'ajuda', 0, 'recusado', 'Só a primeira mensagem em cada publicação pontua.', new.id, new.post_id);
    return new;
  end if;
  perform public.award(new.author_id, v_author, v_channel, 'ajuda', 'pendente', p_comment => new.id, p_post => new.post_id);
  return new;
end;
$$;
create trigger points_on_comment after insert on public.comments
  for each row execute function public.points_on_comment();

-- Conselho, dica ou frase de ajuda (post do tipo "dica"): 4 pontos depois da validação.
-- Quem gera o ponto é a comunidade (actor nulo): não conta como "pessoa diferente".
create function public.points_on_post() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'dica' then
    if public.points_today(new.author_id, new.channel, 'conselho') + 4 > 4 then
      insert into public.point_events (user_id, track_id, kind, points, status, reason, post_id)
      values (new.author_id, new.channel, 'conselho', 0, 'recusado', 'Limite diário desta atividade atingido.', new.id);
    else
      insert into public.point_events (user_id, track_id, kind, points, status, post_id)
      values (new.author_id, new.channel, 'conselho', 4, 'pendente', new.id);
    end if;
  end if;
  return new;
end;
$$;
create trigger points_on_post after insert on public.posts
  for each row execute function public.points_on_post();

-- Apoio concluído (a pessoa ajudada confirmou): 5 pontos.
create function public.points_on_support() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'concluido' and old.status <> 'concluido' then
    perform public.award(new.helper_id, new.helped_id, new.track_id, 'apoio', 'valido', p_support => new.id);
  end if;
  return new;
end;
$$;
create trigger points_on_support after update on public.support_actions
  for each row execute function public.points_on_support();

-- ————————————————————————————————————————————————————————————
-- Nível por trilha, saldo e resgates
-- ————————————————————————————————————————————————————————————
create table public.track_rewards (
  id text primary key,
  track_id text not null,
  kind text not null check (kind in ('digital', 'experiencia', 'fisico', 'acesso')),
  title text not null,
  description text not null default '',
  cost int not null check (cost >= 0),
  min_level int not null default 1,
  course_id text references public.courses (id) on delete set null,
  active boolean not null default true
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reward_id text not null references public.track_rewards (id),
  track_id text not null,
  cost int not null,
  status text not null check (status in ('liberado', 'solicitado', 'enviado', 'entregue', 'cancelado')),
  created_at timestamptz not null default now(),
  unique (user_id, reward_id)
);

drop view public.posts_feed;
drop view public.comments_feed;
drop function public.list_counselors();
drop function public.kindness_level(uuid);
drop function public.kindness_stats(uuid);
drop trigger reward_claim_prepare on public.reward_claims;
drop function public.reward_claim_prepare();
drop table public.reward_claims;
drop table public.kindness_rewards;

/** Pontos ganhos (validados), pessoas diferentes, gastos e saldo de alguém numa trilha. */
create function public.points_stats(p_user uuid, p_track text)
returns table (earned int, givers int, spent int, balance int)
language sql stable security definer set search_path = '' as $$
  with e as (
    select coalesce(sum(points), 0)::int as earned, count(distinct actor_id)::int as givers
      from public.point_events where user_id = p_user and track_id = p_track and status = 'valido'
  ), s as (
    select coalesce(sum(cost), 0)::int as spent
      from public.reward_redemptions where user_id = p_user and track_id = p_track and status <> 'cancelado'
  )
  select e.earned, e.givers, s.spent, e.earned - s.spent from e, s
$$;

create function public.kindness_level(p_user uuid, p_track text) returns int
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.profiles p where p.id = p_user and p.role = 'admin') then 99
    else coalesce((
      select max(l.level) from public.kindness_levels l, public.points_stats(p_user, p_track) s
       where s.earned >= l.min_points and s.givers >= l.min_givers
    ), 1)
  end
$$;

/** Maior nível em qualquer trilha (para a Formação de Conselheiro). */
create function public.max_kindness_level(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(max(public.kindness_level(p_user, t.track_id)), 1)
    from (select distinct track_id from public.point_events where user_id = p_user) t
$$;

/** Resgata uma recompensa: confere nível, saldo e se já foi resgatada. */
create function public.redeem_reward(p_reward text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r public.track_rewards;
  v_balance int;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  select * into r from public.track_rewards where id = p_reward and active;
  if not found then raise exception 'Recompensa não encontrada.'; end if;
  if r.kind = 'acesso' then raise exception 'Este acesso abre sozinho quando você chega ao nível.'; end if;
  -- Um resgate por vez para a mesma pessoa (evita gastar o mesmo saldo duas vezes).
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if public.kindness_level(auth.uid(), r.track_id) < r.min_level then
    raise exception 'Esta recompensa pede um nível maior nesta trilha.';
  end if;
  select balance into v_balance from public.points_stats(auth.uid(), r.track_id);
  if v_balance < r.cost then
    raise exception 'Faltam % pontos para esta recompensa.', r.cost - v_balance;
  end if;
  insert into public.reward_redemptions (user_id, reward_id, track_id, cost, status)
  values (auth.uid(), r.id, r.track_id, r.cost, case when r.kind = 'fisico' then 'solicitado' else 'liberado' end)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Você já resgatou esta recompensa.';
end;
$$;

-- Cursos: comprados, grátis, liberados por resgate e a Formação de Conselheiro (nível Farol).
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
  select tr.course_id from public.reward_redemptions rr join public.track_rewards tr on tr.id = rr.reward_id
   where rr.user_id = auth.uid() and rr.status <> 'cancelado' and tr.course_id is not null
  union
  select c.id from public.courses c
   where c.min_kindness_level is not null and auth.uid() is not null
     and public.max_kindness_level(auth.uid()) >= c.min_kindness_level
  union
  select c.id from public.courses c where public.is_admin()
$$;

-- Curso de resgate também não abre o canal da trilha (só compra abre).
create or replace function public.can_access_channel(p_channel text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    p_channel = 'aquecimento'
    or public.is_admin()
    or exists (
      select 1 from public.courses c
       where c.track_id = p_channel and not c.is_free and c.min_kindness_level is null and not c.reward_only
         and public.has_course_access(c.id)
    )
  )
$$;

-- ————————————————————————————————————————————————————————————
-- Agradecimento vale 2 pontos (o extrato decide); conselheiros por trilha
-- ————————————————————————————————————————————————————————————
create or replace function public.thanks_prepare() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_channel text;
  v_status text;
  v_requester uuid;
  v_today_count int;
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  new.giver_id := auth.uid();
  new.created_at := now();
  new.points := 2;
  if new.post_id is not null then
    select p.author_id, p.channel into new.receiver_id, v_channel from public.posts p where p.id = new.post_id and not p.hidden;
    if not found or not public.can_access_channel(v_channel) then raise exception 'Publicação não encontrada.'; end if;
  elsif new.comment_id is not null then
    select c.author_id, p.channel into new.receiver_id, v_channel
      from public.comments c join public.posts p on p.id = c.post_id
     where c.id = new.comment_id and not c.hidden and not p.hidden;
    if not found or not public.can_access_channel(v_channel) then raise exception 'Comentário não encontrado.'; end if;
  else
    select a.requester_id, a.counselor_id, a.status into v_requester, new.receiver_id, v_status
      from public.advice_requests a where a.id = new.advice_id;
    if not found or v_requester <> auth.uid() or v_status not in ('aceito', 'encerrado') then
      raise exception 'Só quem pediu o conselho pode agradecer, depois que a conversa começou.';
    end if;
  end if;
  if new.receiver_id = auth.uid() then raise exception 'Não dá para agradecer a si mesmo.'; end if;
  select count(*) into v_today_count from public.thanks t
   where t.giver_id = auth.uid()
     and (t.created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  if v_today_count >= 10 then raise exception 'Você já deu 10 agradecimentos hoje. Amanhã tem mais.'; end if;
  return new;
end;
$$;

alter table public.advice_requests drop constraint advice_requests_counselor_id_fkey;
alter table public.counselors add column track_id text not null default 'respira';
alter table public.counselors drop constraint counselors_pkey;
alter table public.counselors add primary key (user_id, track_id);
alter table public.advice_requests add column track_id text not null default 'respira';
alter table public.advice_requests
  add constraint advice_requests_counselor_fkey foreign key (counselor_id, track_id)
  references public.counselors (user_id, track_id) on delete cascade;

create or replace function public.counselor_prepare() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  new.user_id := auth.uid();
  if public.kindness_level(auth.uid(), new.track_id) < 6 then
    raise exception 'O espaço de conselheiro abre no nível Farol desta trilha.';
  end if;
  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Aluno Vivah') into new.display_name
    from public.profiles p where p.id = auth.uid();
  return new;
end;
$$;

create or replace function public.advice_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_open int;
begin
  new.requester_id := auth.uid();
  new.status := 'pendente';
  new.created_at := now();
  new.updated_at := now();
  select c.display_name into new.counselor_name
    from public.counselors c where c.user_id = new.counselor_id and c.track_id = new.track_id and c.is_open;
  if not found then raise exception 'Este conselheiro não está recebendo pedidos agora.'; end if;
  if new.counselor_id = auth.uid() then raise exception 'Você não pode pedir conselho para si mesmo.'; end if;
  select count(*) into v_open from public.advice_requests a
   where a.requester_id = auth.uid() and a.status in ('pendente', 'aceito');
  if v_open >= 3 then raise exception 'Você já tem 3 conversas abertas. Encerre uma para pedir outra.'; end if;
  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Aluno Vivah') into new.requester_name
    from public.profiles p where p.id = auth.uid();
  new.requester_name := coalesce(new.requester_name, 'Aluno Vivah');
  return new;
end;
$$;

create or replace function public.advice_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if (new.requester_id, new.counselor_id, new.track_id, new.topic, new.message, new.requester_name, new.counselor_name, new.created_at)
     is distinct from (old.requester_id, old.counselor_id, old.track_id, old.topic, old.message, old.requester_name, old.counselor_name, old.created_at) then
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

create function public.list_counselors(p_track text)
returns table (user_id uuid, display_name text, bio text, topics text[], level int)
language sql stable security definer set search_path = '' as $$
  select c.user_id, c.display_name, c.bio, c.topics, public.kindness_level(c.user_id, c.track_id)
    from public.counselors c
   where c.is_open and c.track_id = p_track and auth.uid() is not null
   order by 5 desc, c.created_at
$$;

-- Denúncias automáticas (sinal de risco detectado na validação) não têm quem denunciou.
alter table public.reports alter column reporter_id drop not null;
alter table public.reports add column source text not null default 'aluno' check (source in ('aluno', 'sistema'));

-- ————————————————————————————————————————————————————————————
-- Feeds com o nível do autor na trilha do post
-- ————————————————————————————————————————————————————————————
create view public.posts_feed with (security_invoker = true) as
  select p.id, p.channel, p.author_id, p.author_name, p.body, p.kind, p.feeling, p.created_at,
         public.kindness_level(p.author_id, p.channel) as author_level,
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
         public.kindness_level(c.author_id, p.channel) as author_level,
         public.thanks_count('comment', c.id) as thanks_count,
         exists (select 1 from public.thanks t where t.comment_id = c.id and t.giver_id = auth.uid()) as i_thanked
    from public.comments c join public.posts p on p.id = c.post_id
   where not c.hidden;

-- ————————————————————————————————————————————————————————————
-- RLS
-- ————————————————————————————————————————————————————————————
alter table public.daily_logs enable row level security;
alter table public.support_actions enable row level security;
alter table public.point_events enable row level security;
alter table public.track_rewards enable row level security;
alter table public.reward_redemptions enable row level security;

create policy "plano e fechamento: meus" on public.daily_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "apoio: participantes leem" on public.support_actions for select to authenticated
  using (auth.uid() in (helper_id, helped_id) or public.is_admin());
create policy "apoio: oferecer" on public.support_actions for insert to authenticated with check (helper_id = auth.uid());
create policy "apoio: participantes atualizam" on public.support_actions for update to authenticated
  using (auth.uid() in (helper_id, helped_id)) with check (auth.uid() in (helper_id, helped_id));

-- O extrato é só leitura para o aluno: quem escreve são os gatilhos e a validação.
create policy "pontos: meu extrato" on public.point_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "recompensas: ler" on public.track_rewards for select to anon, authenticated using (true);
create policy "resgates: os meus" on public.reward_redemptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "resgates: equipe atualiza" on public.reward_redemptions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.posts_feed, public.comments_feed to authenticated;
grant execute on function public.list_counselors(text), public.points_stats(uuid, text), public.kindness_level(uuid, text),
  public.redeem_reward(text) to authenticated;

-- ————————————————————————————————————————————————————————————
-- Exportação de dados (LGPD)
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
    'planos_e_fechamentos', coalesce((select jsonb_agg(to_jsonb(l)) from public.daily_logs l), '[]'::jsonb),
    'publicacoes', coalesce((select jsonb_agg(to_jsonb(p)) from public.posts p where p.author_id = auth.uid()), '[]'::jsonb),
    'comentarios', coalesce((select jsonb_agg(to_jsonb(c)) from public.comments c where c.author_id = auth.uid()), '[]'::jsonb),
    'reacoes', coalesce((select jsonb_agg(to_jsonb(r)) from public.post_reactions r where r.user_id = auth.uid()), '[]'::jsonb),
    'agradecimentos', coalesce((select jsonb_agg(to_jsonb(t)) from public.thanks t), '[]'::jsonb),
    'pontos', coalesce((select jsonb_agg(to_jsonb(e)) from public.point_events e), '[]'::jsonb),
    'resgates', coalesce((select jsonb_agg(to_jsonb(r)) from public.reward_redemptions r), '[]'::jsonb),
    'apoios', coalesce((select jsonb_agg(to_jsonb(s)) from public.support_actions s), '[]'::jsonb),
    'conselheiro', coalesce((select jsonb_agg(to_jsonb(c)) from public.counselors c where c.user_id = auth.uid()), '[]'::jsonb),
    'conselhos', coalesce((select jsonb_agg(to_jsonb(a)) from public.advice_requests a), '[]'::jsonb),
    'mensagens_conselho', coalesce((select jsonb_agg(to_jsonb(m)) from public.advice_messages m where m.sender_id = auth.uid()), '[]'::jsonb),
    'anotacoes', coalesce((select jsonb_agg(to_jsonb(n)) from public.lesson_notes n), '[]'::jsonb),
    'favoritos', coalesce((select jsonb_agg(to_jsonb(f)) from public.favorites f), '[]'::jsonb),
    'atividade', coalesce((select jsonb_agg(to_jsonb(a)) from public.activity_log a), '[]'::jsonb)
  )
$$;
