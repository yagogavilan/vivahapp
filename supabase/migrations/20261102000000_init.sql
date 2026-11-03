-- Vivah · esquema inicial do MVP
-- Catálogo (trilhas, cursos, aulas), acesso por compra na Hotmart, progresso,
-- Área de Aquecimento (lives e Escudo Anticrise), comunidade, agenda,
-- diagnóstico e check-ins de humor e sono.

create extension if not exists pgcrypto with schema extensions;

-- ————————————————————————————————————————————————————————————
-- Tipos
-- ————————————————————————————————————————————————————————————
create type public.life_area as enum ('mente', 'tempo', 'carreira', 'financas', 'corpo', 'alimentacao');
create type public.track_status as enum ('live', 'soon');
create type public.course_kind as enum ('entrada', 'bonus', 'programa', 'acompanhamento');
create type public.lesson_kind as enum ('video', 'audio', 'texto');
create type public.agenda_kind as enum ('live', 'aula', 'foco', 'treino', 'refeicao', 'pessoal');

-- ————————————————————————————————————————————————————————————
-- Perfis
-- ————————————————————————————————————————————————————————————
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (char_length(full_name) <= 80),
  goal text check (char_length(goal) <= 200),
  role text not null default 'aluno' check (role in ('aluno', 'admin')),
  health_consent_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- O aluno não pode se promover a admin.
create function public.protect_profile_role() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'role só pode ser alterado pelo time Vivah';
  end if;
  new.email := old.email;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ————————————————————————————————————————————————————————————
-- Catálogo
-- ————————————————————————————————————————————————————————————
create table public.tracks (
  id text primary key,
  title text not null,
  area public.life_area not null,
  area_label text not null,
  subtitle text not null,
  description text not null,
  promise text not null,
  teacher text not null,
  status public.track_status not null default 'soon',
  launch_label text not null,
  sort int not null default 0
);

create table public.courses (
  id text primary key,
  track_id text not null references public.tracks (id),
  title text not null,
  kind public.course_kind not null,
  summary text not null,
  price_label text,
  sort int not null default 0,
  in_subscription boolean not null default false,
  is_free boolean not null default false
);
create index on public.courses (track_id);

create table public.modules (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  sort int not null default 0
);
create index on public.modules (course_id);

create table public.lessons (
  id text primary key,
  module_id text not null references public.modules (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  summary text not null default '',
  kind public.lesson_kind not null,
  duration_min int not null default 0,
  sort int not null default 0,
  is_preview boolean not null default false
);
create index on public.lessons (course_id);
create index on public.lessons (module_id);

-- O endereço do vídeo/áudio fica separado: só chega a quem tem acesso.
create table public.lesson_media (
  lesson_id text primary key references public.lessons (id) on delete cascade,
  media_url text,
  body text
);

-- ————————————————————————————————————————————————————————————
-- Produtos da Hotmart e acessos
-- ————————————————————————————————————————————————————————————
create table public.products (
  id text primary key,
  name text not null,
  hotmart_product_id text unique,
  checkout_url text,
  active boolean not null default true
);

create table public.product_courses (
  product_id text not null references public.products (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  primary key (product_id, course_id)
);

-- O acesso é guardado pelo e-mail da compra: quem compra antes de criar a
-- conta recebe tudo ao entrar com o mesmo e-mail.
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  course_id text not null references public.courses (id) on delete cascade,
  product_id text not null references public.products (id),
  hotmart_transaction text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  unique (email, course_id, product_id)
);
create index on public.entitlements (email);
create index on public.entitlements (hotmart_transaction);

create table public.hotmart_events (
  id uuid primary key default gen_random_uuid(),
  hotmart_event_id text unique,
  event text not null,
  email text,
  hotmart_product_id text,
  transaction text,
  payload jsonb not null,
  result text not null,
  received_at timestamptz not null default now()
);

-- ————————————————————————————————————————————————————————————
-- Funções de acesso
-- ————————————————————————————————————————————————————————————
create function public.current_email() returns text
language sql stable set search_path = '' as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
$$;

/** Cursos que o usuário logado pode assistir. */
create function public.my_course_ids() returns setof text
language sql stable security definer set search_path = '' as $$
  select c.id from public.courses c where c.is_free
  union
  select e.course_id from public.entitlements e
   where e.email = public.current_email()
     and public.current_email() <> ''
     and e.status = 'active'
     and (e.expires_at is null or e.expires_at > now())
  union
  select c.id from public.courses c where public.is_admin()
$$;

create function public.has_course_access(p_course text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.my_course_ids() id where id = p_course)
$$;

create function public.can_read_lesson(p_lesson text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      join public.tracks t on t.id = c.track_id
     where l.id = p_lesson
       and (public.has_course_access(l.course_id) or (l.is_preview and t.status = 'live'))
  )
$$;

-- Canal "aquecimento": todo mundo com conta. Canal de trilha: quem tem algum curso dela.
create function public.can_access_channel(p_channel text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    p_channel = 'aquecimento'
    or public.is_admin()
    or exists (
      select 1 from public.courses c
       where c.track_id = p_channel and not c.is_free and public.has_course_access(c.id)
    )
  )
$$;

-- ————————————————————————————————————————————————————————————
-- Progresso nas aulas
-- ————————————————————————————————————————————————————————————
create table public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  position_sec int not null default 0 check (position_sec >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ————————————————————————————————————————————————————————————
-- Área de Aquecimento
-- ————————————————————————————————————————————————————————————
create table public.lives (
  id text primary key,
  title text not null,
  description text not null default '',
  track_id text references public.tracks (id),
  host text not null default 'Edmilson',
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  youtube_id text,
  replay_until timestamptz,
  published boolean not null default true
);
create index on public.lives (starts_at);

create table public.escudo_audios (
  id text primary key,
  publish_date date not null unique,
  title text not null,
  summary text not null default '',
  audio_url text,
  duration_min int not null default 5
);

-- ————————————————————————————————————————————————————————————
-- Comunidade
-- ————————————————————————————————————————————————————————————
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default 'Aluno Vivah',
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.posts (channel, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default 'Aluno Vivah',
  body text not null check (char_length(body) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.comments (post_id, created_at);

-- O nome do autor vem do perfil, não do que o app manda.
create function public.set_author_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.author_id := auth.uid();
  select coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Aluno Vivah')
    into new.author_name
    from public.profiles p where p.id = auth.uid();
  new.author_name := coalesce(new.author_name, 'Aluno Vivah');
  new.hidden := false;
  return new;
end;
$$;

create trigger posts_author before insert on public.posts
  for each row execute function public.set_author_name();
create trigger comments_author before insert on public.comments
  for each row execute function public.set_author_name();

create view public.posts_feed with (security_invoker = true) as
  select p.id, p.channel, p.author_id, p.author_name, p.body, p.created_at,
         (select count(*) from public.comments c where c.post_id = p.id and not c.hidden)::int as comment_count
    from public.posts p
   where not p.hidden;

-- ————————————————————————————————————————————————————————————
-- Agenda
-- ————————————————————————————————————————————————————————————
create table public.agenda_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  kind public.agenda_kind not null default 'pessoal',
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  live_id text references public.lives (id) on delete set null,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, live_id)
);
create index on public.agenda_events (user_id, starts_at);

-- ————————————————————————————————————————————————————————————
-- Diagnóstico e check-ins
-- ————————————————————————————————————————————————————————————
create table public.diagnostic_questions (
  id text primary key,
  area public.life_area not null,
  prompt text not null,
  options jsonb not null,
  sort int not null default 0
);

create table public.diagnostic_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  answers jsonb not null,
  scores jsonb not null,
  recommended_track text not null references public.tracks (id),
  created_at timestamptz not null default now()
);
create index on public.diagnostic_results (user_id, created_at desc);

-- Humor e sono são dados de saúde (LGPD, art. 11): só com consentimento específico.
create table public.checkins (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  mood smallint not null check (mood between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  sleep_hours numeric(3, 1) not null check (sleep_hours between 0 and 24),
  sleep_quality smallint not null check (sleep_quality between 1 and 5),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create function public.has_health_consent() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.health_consent_at is not null)
$$;

-- Retirar o consentimento apaga os dados de saúde.
create function public.on_consent_withdrawn() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.health_consent_at is not null and new.health_consent_at is null then
    delete from public.checkins where user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_consent_withdrawn
  after update of health_consent_at on public.profiles
  for each row execute function public.on_consent_withdrawn();

-- ————————————————————————————————————————————————————————————
-- Exportar meus dados (LGPD)
-- ————————————————————————————————————————————————————————————
create function public.export_my_data() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'exportado_em', now(),
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'acessos', coalesce((select jsonb_agg(to_jsonb(e)) from public.entitlements e), '[]'::jsonb),
    'progresso', coalesce((select jsonb_agg(to_jsonb(lp)) from public.lesson_progress lp), '[]'::jsonb),
    'agenda', coalesce((select jsonb_agg(to_jsonb(a)) from public.agenda_events a), '[]'::jsonb),
    'diagnosticos', coalesce((select jsonb_agg(to_jsonb(d)) from public.diagnostic_results d), '[]'::jsonb),
    'checkins', coalesce((select jsonb_agg(to_jsonb(c)) from public.checkins c), '[]'::jsonb),
    'publicacoes', coalesce((select jsonb_agg(to_jsonb(p)) from public.posts p where p.author_id = auth.uid()), '[]'::jsonb)
  )
$$;

-- ————————————————————————————————————————————————————————————
-- RLS
-- ————————————————————————————————————————————————————————————
alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_media enable row level security;
alter table public.products enable row level security;
alter table public.product_courses enable row level security;
alter table public.entitlements enable row level security;
alter table public.hotmart_events enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lives enable row level security;
alter table public.escudo_audios enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.agenda_events enable row level security;
alter table public.diagnostic_questions enable row level security;
alter table public.diagnostic_results enable row level security;
alter table public.checkins enable row level security;

-- Perfil: cada um vê e edita o seu.
create policy "perfil: ler o meu" on public.profiles for select to authenticated using (id = auth.uid());
create policy "perfil: editar o meu" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Catálogo e Área de Aquecimento: qualquer pessoa com conta vê a vitrine.
create policy "catálogo" on public.tracks for select to authenticated using (true);
create policy "catálogo" on public.courses for select to authenticated using (true);
create policy "catálogo" on public.modules for select to authenticated using (true);
create policy "catálogo" on public.lessons for select to authenticated using (true);
create policy "catálogo" on public.products for select to authenticated using (active);
create policy "catálogo" on public.product_courses for select to authenticated using (true);
create policy "catálogo" on public.diagnostic_questions for select to authenticated using (true);
create policy "aquecimento" on public.lives for select to authenticated using (published or public.is_admin());
create policy "aquecimento" on public.escudo_audios for select to authenticated
  using (publish_date <= (now() at time zone 'America/Sao_Paulo')::date or public.is_admin());

-- Conteúdo das aulas: só com acesso (ou aula de amostra).
create policy "aula com acesso" on public.lesson_media for select to authenticated
  using (public.can_read_lesson(lesson_id));

-- Acessos: o aluno vê os acessos do e-mail dele. Quem grava é o webhook (service role).
create policy "meus acessos" on public.entitlements for select to authenticated
  using (email = public.current_email() and public.current_email() <> '');

-- Progresso: só o meu, só em aula que posso ver.
create policy "progresso: ler" on public.lesson_progress for select to authenticated using (user_id = auth.uid());
create policy "progresso: criar" on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and public.can_read_lesson(lesson_id));
create policy "progresso: atualizar" on public.lesson_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_read_lesson(lesson_id));

-- Comunidade.
create policy "posts: ler" on public.posts for select to authenticated
  using ((not hidden and public.can_access_channel(channel)) or author_id = auth.uid() or public.is_admin());
create policy "posts: publicar" on public.posts for insert to authenticated
  with check (public.can_access_channel(channel));
create policy "posts: apagar os meus" on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy "posts: moderar" on public.posts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "comentários: ler" on public.comments for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_access_channel(p.channel))
         and (not hidden or author_id = auth.uid() or public.is_admin()));
create policy "comentários: publicar" on public.comments for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and not p.hidden and public.can_access_channel(p.channel)));
create policy "comentários: apagar os meus" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy "comentários: moderar" on public.comments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Agenda, diagnóstico e check-ins: só os meus.
create policy "agenda: meus" on public.agenda_events for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "diagnóstico: meus" on public.diagnostic_results for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "check-in: ler" on public.checkins for select to authenticated using (user_id = auth.uid());
create policy "check-in: criar" on public.checkins for insert to authenticated
  with check (user_id = auth.uid() and public.has_health_consent());
create policy "check-in: atualizar" on public.checkins for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.has_health_consent());
create policy "check-in: apagar" on public.checkins for delete to authenticated using (user_id = auth.uid());

-- Visitantes sem conta não leem nada; tudo passa pelo login.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
