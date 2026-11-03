-- Vivah · engajamento: sequência de dias, plano do dia, conquistas, anotações,
-- favoritos e preferências (lembretes).

-- Preferências do aluno: lembrete diário, lembrete de live, mostrar sequência.
alter table public.profiles add column preferences jsonb not null default '{}'::jsonb;

-- ————————————————————————————————————————————————————————————
-- Registro de atividade (base da sequência e das conquistas)
-- ————————————————————————————————————————————————————————————
create type public.activity_kind as enum ('escudo', 'aula', 'checkin', 'live', 'foco', 'diagnostico', 'post');

create table public.activity_log (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  kind public.activity_kind not null,
  ref text not null default '',
  minutes int not null default 0 check (minutes between 0 and 600),
  created_at timestamptz not null default now(),
  primary key (user_id, day, kind, ref)
);
create index on public.activity_log (user_id, day desc);

-- O dia é sempre o de Brasília no servidor: o aluno não registra dia passado ou futuro.
create function public.activity_set_day() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.user_id := auth.uid();
    new.day := (now() at time zone 'America/Sao_Paulo')::date;
  end if;
  return new;
end;
$$;

create trigger activity_log_day before insert on public.activity_log
  for each row execute function public.activity_set_day();

-- ————————————————————————————————————————————————————————————
-- Anotações nas aulas
-- ————————————————————————————————————————————————————————————
create table public.lesson_notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  body text not null check (char_length(body) <= 5000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ————————————————————————————————————————————————————————————
-- Favoritos (aulas e áudios do Escudo)
-- ————————————————————————————————————————————————————————————
create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('lesson', 'escudo')),
  item_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

-- ————————————————————————————————————————————————————————————
-- RLS
-- ————————————————————————————————————————————————————————————
alter table public.activity_log enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.favorites enable row level security;

create policy "atividade: ler" on public.activity_log for select to authenticated using (user_id = auth.uid());
create policy "atividade: registrar" on public.activity_log for insert to authenticated with check (user_id = auth.uid());

create policy "anotações: ler" on public.lesson_notes for select to authenticated using (user_id = auth.uid());
create policy "anotações: criar" on public.lesson_notes for insert to authenticated
  with check (user_id = auth.uid() and public.can_read_lesson(lesson_id));
create policy "anotações: editar" on public.lesson_notes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_read_lesson(lesson_id));
create policy "anotações: apagar" on public.lesson_notes for delete to authenticated using (user_id = auth.uid());

create policy "favoritos: meus" on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.activity_log, public.lesson_notes, public.favorites from anon;

-- Exportação passa a incluir as tabelas novas.
create or replace function public.export_my_data() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'exportado_em', now(),
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'acessos', coalesce((select jsonb_agg(to_jsonb(e)) from public.entitlements e), '[]'::jsonb),
    'progresso', coalesce((select jsonb_agg(to_jsonb(lp)) from public.lesson_progress lp), '[]'::jsonb),
    'anotacoes', coalesce((select jsonb_agg(to_jsonb(n)) from public.lesson_notes n), '[]'::jsonb),
    'favoritos', coalesce((select jsonb_agg(to_jsonb(f)) from public.favorites f), '[]'::jsonb),
    'atividade', coalesce((select jsonb_agg(to_jsonb(a)) from public.activity_log a), '[]'::jsonb),
    'agenda', coalesce((select jsonb_agg(to_jsonb(a)) from public.agenda_events a), '[]'::jsonb),
    'diagnosticos', coalesce((select jsonb_agg(to_jsonb(d)) from public.diagnostic_results d), '[]'::jsonb),
    'checkins', coalesce((select jsonb_agg(to_jsonb(c)) from public.checkins c), '[]'::jsonb),
    'publicacoes', coalesce((select jsonb_agg(to_jsonb(p)) from public.posts p where p.author_id = auth.uid()), '[]'::jsonb)
  )
$$;
