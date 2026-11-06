-- Notificações push e caixa de avisos.
--
-- • push_tokens: o celular de cada aluno (token da Expo). Um token é de um
--   aparelho; se outra pessoa entra no mesmo celular, o token passa para ela.
-- • notification_settings: o que o aluno quer receber. Sem linha = padrão
--   (aulas novas e avisos ligados; lançamentos desligados até ele aceitar,
--   como a Apple pede para mensagens de marketing, diretriz 4.5.4).
-- • notifications: cada aviso que o admin cria (aula nova, curso, low ticket
--   ou aviso livre), com o público e os números do envio.
-- • user_notifications: a caixa de avisos de cada aluno (o sino do app). Vale
--   também na web, onde não há push.
--
-- O envio em si é feito pela função send-notification (service role).

create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[^\]]+\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
create policy "ver os próprios aparelhos" on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));

-- Registrar e tirar o token passam por funções: o mesmo celular pode trocar de dono.
create or replace function public.register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;

create or replace function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;
revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ——— Preferências ———
create table public.notification_settings (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  push_enabled boolean not null default true,
  new_lessons boolean not null default true,
  announcements boolean not null default true,
  launches boolean not null default false,
  launches_consent_at timestamptz,
  muted_tracks text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
create policy "ver as próprias preferências" on public.notification_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "criar as próprias preferências" on public.notification_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "mudar as próprias preferências" on public.notification_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Guarda quando o aluno aceitou receber lançamentos (prova do consentimento).
create or replace function public.notification_settings_prepare() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.launches and (tg_op = 'INSERT' or not old.launches) then new.launches_consent_at := now(); end if;
  if not new.launches then new.launches_consent_at := null; end if;
  new.muted_tracks := array(select distinct t from unnest(new.muted_tracks) t where t ~ '^[a-z0-9-]{2,40}$');
  return new;
end $$;
create trigger notification_settings_prepare before insert or update on public.notification_settings
  for each row execute function public.notification_settings_prepare();

-- ——— Avisos ———
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lesson', 'course', 'low_ticket', 'announcement', 'launch')),
  title text not null check (char_length(title) between 3 and 65),
  body text not null check (char_length(body) between 3 and 178),
  url text check (url is null or url ~ '^/[A-Za-z0-9/_\-\?=&%\.]*$'),
  audience text not null check (audience in ('all', 'track', 'course')),
  track_id text references public.tracks (id) on delete set null,
  course_id text references public.courses (id) on delete set null,
  lesson_id text references public.lessons (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  recipients int not null default 0,
  push_targets int not null default 0,
  push_ok int not null default 0,
  push_failed int not null default 0,
  error text,
  check (audience <> 'track' or track_id is not null),
  check (audience <> 'course' or course_id is not null)
);
create index on public.notifications (created_at desc);
alter table public.notifications enable row level security;
create policy "admin cria e vê os avisos" on public.notifications for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()) and status = 'draft');

create table public.user_notifications (
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  primary key (user_id, notification_id)
);
create index on public.user_notifications (user_id, created_at desc);
create index on public.user_notifications (notification_id);
alter table public.user_notifications enable row level security;
create policy "ver a própria caixa" on public.user_notifications for select to authenticated
  using (user_id = (select auth.uid()));

-- ——— Público de um aviso ———
-- 'all' = todos; 'track' = quem assina a trilha; 'course' = quem tem o curso.
create or replace function public.notification_audience(p_audience text, p_track text, p_course text)
returns setof uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.profiles p where p_audience = 'all'
  union
  select p.id from public.profiles p
    join public.entitlements e on e.email = lower(p.email)
   where p_audience = 'track'
     and e.product_id = 'trilha-' || p_track
     and e.status = 'active' and (e.expires_at is null or e.expires_at > now())
  union
  select p.id from public.profiles p, public.courses c
   where p_audience = 'course' and c.id = p_course and c.is_free
  union
  select p.id from public.profiles p
    join public.entitlements e on e.email = lower(p.email)
    join public.courses c on c.id = p_course
   where p_audience = 'course'
     and e.status = 'active' and (e.expires_at is null or e.expires_at > now())
     and (e.course_id = c.id
          or (e.product_id = 'trilha-' || c.track_id and not c.low_ticket and not c.reward_only and c.min_kindness_level is null))
  union
  select rr.user_id from public.reward_redemptions rr
    join public.track_rewards tr on tr.id = rr.reward_id
   where p_audience = 'course' and tr.course_id = p_course and rr.status <> 'cancelado'
$$;
revoke execute on function public.notification_audience(text, text, text) from public, anon, authenticated;

-- Quantas pessoas o aviso alcança (o admin vê antes de enviar).
create or replace function public.notification_reach(p_kind text, p_audience text, p_track text, p_course text)
returns table (recipients bigint, push_targets bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Só o admin vê o alcance dos avisos.'; end if;
  return query
    with aud as (select a as user_id from public.notification_audience(p_audience, p_track, p_course) a)
    select (select count(*) from aud),
           (select count(*) from public.push_tokens t join aud on aud.user_id = t.user_id
              left join public.notification_settings s on s.user_id = t.user_id
             where public.wants_push(s, p_kind, p_track));
end $$;

-- A preferência do aluno deixa este tipo de aviso chegar por push?
create or replace function public.wants_push(s public.notification_settings, p_kind text, p_track text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(s.push_enabled, true)
     and case
           when p_kind in ('lesson', 'course') then coalesce(s.new_lessons, true)
           when p_kind in ('low_ticket', 'launch') then coalesce(s.launches, false)
           else coalesce(s.announcements, true)
         end
     and not (p_track is not null and p_track = any (coalesce(s.muted_tracks, '{}')))
$$;
revoke execute on function public.notification_reach(text, text, text, text) from public, anon;
grant execute on function public.notification_reach(text, text, text, text) to authenticated;

-- Entrega o aviso: põe na caixa de cada pessoa do público e devolve os
-- celulares que devem receber push. Só a função de envio (service role) chama.
create or replace function public.dispatch_notification(p_id uuid)
returns table (token text)
language plpgsql security definer set search_path = '' as $$
declare
  n public.notifications;
  total int;
begin
  update public.notifications set status = 'sending', error = null
   where id = p_id and status in ('draft', 'failed')
  returning * into n;
  if not found then raise exception 'Este aviso já foi enviado ou está sendo enviado.'; end if;

  insert into public.user_notifications (user_id, notification_id)
  select a, p_id from public.notification_audience(n.audience, n.track_id, n.course_id) a
  on conflict do nothing;
  select count(*) into total from public.user_notifications where notification_id = p_id;

  update public.notifications set recipients = total where id = p_id;

  return query
    select t.token from public.push_tokens t
      join public.user_notifications un on un.user_id = t.user_id and un.notification_id = p_id
      left join public.notification_settings s on s.user_id = t.user_id
     where public.wants_push(s, n.kind, n.track_id);
end $$;
revoke execute on function public.dispatch_notification(uuid) from public, anon, authenticated;
grant execute on function public.dispatch_notification(uuid) to service_role;

-- ——— Caixa de avisos do aluno ———
create or replace function public.my_inbox(p_limit int default 50)
returns table (id uuid, kind text, title text, body text, url text, track_id text, sent_at timestamptz, read_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select n.id, n.kind, n.title, n.body, n.url, n.track_id, coalesce(n.sent_at, un.created_at), un.read_at
    from public.user_notifications un
    join public.notifications n on n.id = un.notification_id
   where un.user_id = auth.uid()
   order by un.created_at desc
   limit least(greatest(p_limit, 1), 200)
$$;

-- Marca como lido (sem lista = todos).
create or replace function public.mark_notifications_read(p_ids uuid[] default null) returns void
language sql security definer set search_path = '' as $$
  update public.user_notifications set read_at = now()
   where user_id = auth.uid() and read_at is null
     and (p_ids is null or notification_id = any (p_ids));
$$;
revoke execute on function public.my_inbox(int) from public, anon;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.my_inbox(int) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Histórico para o admin, com quantos abriram.
create or replace function public.admin_notifications(p_limit int default 50)
returns table (
  id uuid, kind text, title text, body text, url text, audience text, track_id text, course_id text,
  status text, created_at timestamptz, sent_at timestamptz, recipients int, push_targets int,
  push_ok int, push_failed int, opened bigint, error text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Só o admin vê os avisos enviados.'; end if;
  return query
    select n.id, n.kind, n.title, n.body, n.url, n.audience, n.track_id, n.course_id, n.status, n.created_at, n.sent_at,
           n.recipients, n.push_targets, n.push_ok, n.push_failed,
           (select count(*) from public.user_notifications un where un.notification_id = n.id and un.read_at is not null),
           n.error
      from public.notifications n
     order by n.created_at desc
     limit least(greatest(p_limit, 1), 200);
end $$;
revoke execute on function public.admin_notifications(int) from public, anon;
grant execute on function public.admin_notifications(int) to authenticated;

-- ——— LGPD: o aluno leva também as preferências e os avisos ———
create or replace function public.export_my_data() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'exportado_em', now(),
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'acessos', coalesce((select jsonb_agg(to_jsonb(e)) from public.entitlements e where e.email = public.current_email()), '[]'::jsonb),
    'progresso', coalesce((select jsonb_agg(to_jsonb(lp)) from public.lesson_progress lp where lp.user_id = auth.uid()), '[]'::jsonb),
    'agenda', coalesce((select jsonb_agg(to_jsonb(a)) from public.agenda_events a where a.user_id = auth.uid()), '[]'::jsonb),
    'diagnosticos', coalesce((select jsonb_agg(to_jsonb(d)) from public.diagnostic_results d where d.user_id = auth.uid()), '[]'::jsonb),
    'checkins', coalesce((select jsonb_agg(to_jsonb(c)) from public.checkins c where c.user_id = auth.uid()), '[]'::jsonb),
    'planos_e_fechamentos', coalesce((select jsonb_agg(to_jsonb(l)) from public.daily_logs l where l.user_id = auth.uid()), '[]'::jsonb),
    'painel_das_trilhas', coalesce((select jsonb_agg(to_jsonb(t) order by t.day) from public.track_entries t where t.user_id = auth.uid()), '[]'::jsonb),
    'publicacoes', coalesce((select jsonb_agg(to_jsonb(p)) from public.posts p where p.author_id = auth.uid()), '[]'::jsonb),
    'comentarios', coalesce((select jsonb_agg(to_jsonb(c)) from public.comments c where c.author_id = auth.uid()), '[]'::jsonb),
    'reacoes', coalesce((select jsonb_agg(to_jsonb(r)) from public.post_reactions r where r.user_id = auth.uid()), '[]'::jsonb),
    'agradecimentos', coalesce((select jsonb_agg(to_jsonb(t)) from public.thanks t where auth.uid() in (t.giver_id, t.receiver_id)), '[]'::jsonb),
    'pontos', coalesce((select jsonb_agg(to_jsonb(e)) from public.point_events e where e.user_id = auth.uid()), '[]'::jsonb),
    'resgates', coalesce((select jsonb_agg(to_jsonb(r)) from public.reward_redemptions r where r.user_id = auth.uid()), '[]'::jsonb),
    'apoios', coalesce((select jsonb_agg(to_jsonb(s)) from public.support_actions s where auth.uid() in (s.helper_id, s.helped_id)), '[]'::jsonb),
    'conselheiro', coalesce((select jsonb_agg(to_jsonb(c)) from public.counselors c where c.user_id = auth.uid()), '[]'::jsonb),
    'conselhos', coalesce((select jsonb_agg(to_jsonb(a)) from public.advice_requests a where auth.uid() in (a.requester_id, a.counselor_id)), '[]'::jsonb),
    'mensagens_conselho', coalesce((select jsonb_agg(to_jsonb(m)) from public.advice_messages m where m.sender_id = auth.uid()), '[]'::jsonb),
    'anotacoes', coalesce((select jsonb_agg(to_jsonb(n)) from public.lesson_notes n where n.user_id = auth.uid()), '[]'::jsonb),
    'favoritos', coalesce((select jsonb_agg(to_jsonb(f)) from public.favorites f where f.user_id = auth.uid()), '[]'::jsonb),
    'atividade', coalesce((select jsonb_agg(to_jsonb(a)) from public.activity_log a where a.user_id = auth.uid()), '[]'::jsonb),
    'notificacoes_preferencias', (select to_jsonb(s) from public.notification_settings s where s.user_id = auth.uid()),
    'aparelhos_para_push', coalesce((select jsonb_agg(jsonb_build_object('plataforma', t.platform, 'atualizado_em', t.updated_at))
                                       from public.push_tokens t where t.user_id = auth.uid()), '[]'::jsonb),
    'avisos_recebidos', coalesce((select jsonb_agg(jsonb_build_object('titulo', n.title, 'texto', n.body, 'recebido_em', un.created_at, 'lido_em', un.read_at))
                                    from public.user_notifications un join public.notifications n on n.id = un.notification_id
                                   where un.user_id = auth.uid()), '[]'::jsonb)
  )
$$;
