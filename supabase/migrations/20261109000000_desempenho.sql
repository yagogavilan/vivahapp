-- Desempenho para milhares de alunos (teste de carga: 10 mil alunos, 40 mil posts,
-- 1 milhão de eventos de pontos). Ver supabase/tests/load.sql e bench.sh.
--
-- 1. As regras de acesso (RLS) chamavam funções a cada linha. O feed de uma trilha
--    levava 40 segundos para um aluno sem a assinatura. Agora cada função roda uma
--    vez por consulta: auth.uid(), is_admin() etc. ficam dentro de (select ...), e o
--    canal é conferido contra a lista de canais do aluno, calculada uma vez.
-- 2. Índices para as buscas e para apagar contas.
-- 3. thanks_count sem "or" (usava leitura da tabela inteira).

-- ————————————————————————————————————————————————————————————
-- Canais que o aluno logado pode ver (Aquecimento + trilhas que assina)
-- ————————————————————————————————————————————————————————————
create or replace function public.my_channels() returns text[]
language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is null then '{}'::text[]
    when public.is_admin() then array['aquecimento'] || array(select t.id from public.tracks t)
    else array['aquecimento'] || array(
      select distinct c.track_id from public.courses c
       where not c.is_free and c.min_kindness_level is null and not c.reward_only and not c.low_ticket
         and c.id in (select public.my_course_ids())
    )
  end
$$;

create or replace function public.can_access_channel(p_channel text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_channel = any (public.my_channels())
$$;

grant execute on function public.my_channels() to authenticated;

-- ————————————————————————————————————————————————————————————
-- Reescreve todas as regras: funções avaliadas uma vez por consulta
-- ————————————————————————————————————————————————————————————
create or replace function pg_temp.fast(expr text) returns text language sql immutable as $$
  select regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(expr,
           'public\.can_access_channel\(([a-z_\.]+)\)', '(\1 = ANY ((SELECT public.my_channels())::text[]))', 'g'),
           'auth\.uid\(\)', '(SELECT auth.uid())', 'g'),
           'public\.is_admin\(\)', '(SELECT public.is_admin())', 'g'),
           'public\.has_health_consent\(\)', '(SELECT public.has_health_consent())', 'g'),
           'public\.current_email\(\)', '(SELECT public.current_email())', 'g')
$$;

do $$
declare
  r record;
  q text;
  c text;
begin
  -- Sem search_path, o texto das regras sai com o esquema (public., auth.).
  perform set_config('search_path', '', true);
  for r in
    select pol.polname, cls.relname,
           pg_get_expr(pol.polqual, pol.polrelid) as qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) as chk
      from pg_policy pol join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
     where ns.nspname = 'public'
  loop
    q := case when r.qual is not null then pg_temp.fast(r.qual) end;
    c := case when r.chk is not null then pg_temp.fast(r.chk) end;
    if q is distinct from r.qual or c is distinct from r.chk then
      execute format('alter policy %I on public.%I%s%s', r.polname, r.relname,
        case when q is not null then format(' using (%s)', q) else '' end,
        case when c is not null then format(' with check (%s)', c) else '' end);
    end if;
  end loop;
end $$;

-- ————————————————————————————————————————————————————————————
-- Índices
-- ————————————————————————————————————————————————————————————
create index if not exists thanks_post_idx on public.thanks (post_id) where post_id is not null;
create index if not exists thanks_comment_idx on public.thanks (comment_id) where comment_id is not null;
create index if not exists point_events_extrato_idx on public.point_events (user_id, track_id, created_at desc);
create index if not exists point_events_actor_idx on public.point_events (actor_id);
create index if not exists posts_author_idx on public.posts (author_id);
create index if not exists comments_author_idx on public.comments (author_id);
create index if not exists post_reactions_user_idx on public.post_reactions (user_id);
create index if not exists reward_redemptions_user_idx on public.reward_redemptions (user_id, track_id);
create index if not exists entitlements_product_idx on public.entitlements (product_id);
create index if not exists lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

create or replace function public.thanks_count(p_kind text, p_id uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case p_kind
    when 'post' then (select count(*) from public.thanks t where t.post_id = p_id)
    when 'comment' then (select count(*) from public.thanks t where t.comment_id = p_id)
    else 0
  end::int
$$;

-- ————————————————————————————————————————————————————————————
-- Totais de pontos por aluno e trilha, mantidos pelo banco.
-- O nível de bondade aparece em cada post e comentário; somar o extrato inteiro
-- a cada linha ficava caro para quem tem milhares de eventos.
-- ————————————————————————————————————————————————————————————
create table if not exists public.point_totals (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null,
  earned int not null default 0,
  givers int not null default 0,
  primary key (user_id, track_id)
);
alter table public.point_totals enable row level security;
-- Só o banco lê e escreve (pelas funções); o app usa points_stats().

create or replace function public.refresh_point_total(p_user uuid, p_track text) returns void
language sql security definer set search_path = '' as $$
  insert into public.point_totals (user_id, track_id, earned, givers)
  select p_user, p_track, coalesce(sum(points), 0)::int, count(distinct actor_id)::int
    from public.point_events where user_id = p_user and track_id = p_track and status = 'valido'
  -- Ao apagar a conta, os eventos somem em cascata: não recria o total de quem saiu.
  having exists (select 1 from auth.users u where u.id = p_user)
  on conflict (user_id, track_id) do update set earned = excluded.earned, givers = excluded.givers
$$;

create or replace function public.point_totals_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_point_total(old.user_id, old.track_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.user_id <> old.user_id or new.track_id <> old.track_id) then
    perform public.refresh_point_total(new.user_id, new.track_id);
  end if;
  return null;
end;
$$;

drop trigger if exists point_totals_sync on public.point_events;
create trigger point_totals_sync after insert or update or delete on public.point_events
  for each row execute function public.point_totals_sync();

-- Preenche os totais de quem já tem pontos (e serve para recalcular tudo, se preciso).
create or replace function public.rebuild_point_totals() returns void
language sql security definer set search_path = '' as $$
  insert into public.point_totals (user_id, track_id, earned, givers)
  select user_id, track_id, coalesce(sum(points) filter (where status = 'valido'), 0)::int,
         count(distinct actor_id) filter (where status = 'valido')::int
    from public.point_events group by user_id, track_id
  on conflict (user_id, track_id) do update set earned = excluded.earned, givers = excluded.givers
$$;
select public.rebuild_point_totals();
revoke execute on function public.refresh_point_total(uuid, text), public.rebuild_point_totals() from public, anon, authenticated;

create or replace function public.points_stats(p_user uuid, p_track text)
returns table (earned int, givers int, spent int, balance int)
language sql stable security definer set search_path = '' as $$
  with e as (
    select coalesce((select t.earned from public.point_totals t where t.user_id = p_user and t.track_id = p_track), 0) as earned,
           coalesce((select t.givers from public.point_totals t where t.user_id = p_user and t.track_id = p_track), 0) as givers
  ), s as (
    select coalesce(sum(cost), 0)::int as spent
      from public.reward_redemptions where user_id = p_user and track_id = p_track and status <> 'cancelado'
  )
  select e.earned, e.givers, s.spent, e.earned - s.spent from e, s
$$;

create or replace function public.max_kindness_level(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(max(public.kindness_level(p_user, t.track_id)), 1)
    from public.point_totals t where t.user_id = p_user
$$;
