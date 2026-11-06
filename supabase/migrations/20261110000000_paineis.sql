-- Painel de cada trilha no Hoje: registros do dia a dia com as peculiaridades de
-- cada área (água, peso, treinos e medidas no Move; sono e GAD-7 na Respira;
-- refeições e porções no Nutre; foco e revisão semanal no Ritmo; gastos, dívidas
-- e reserva no Prospera; conquistas, metas, contatos e estudo no Eleva).

create table public.track_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  track_id text not null check (track_id in ('respira', 'ritmo', 'eleva', 'prospera', 'move', 'nutre')),
  metric text not null check (metric ~ '^[a-z0-9_]{2,24}$'),
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  -- '' = um registro por dia (água, peso, sono…); outro valor = vários no dia ou itens (treinos, gastos, dívidas…).
  entry_key text not null default '' check (char_length(entry_key) <= 40),
  value numeric check (value is null or abs(value) < 100000000),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, track_id, metric, day, entry_key)
);
-- A chave única (aluno, trilha, métrica, dia…) já serve de índice para as buscas do painel.

-- Peso, medidas, sono, refeições e GAD-7 são dados de saúde (LGPD, art. 11): só com consentimento.
-- Água, passos, treinos e porções são hábitos e não pedem consentimento.
create function public.is_health_metric(p_metric text) returns boolean
language sql immutable as $$
  select p_metric in ('peso', 'medidas', 'corpo', 'gad7', 'sono', 'refeicao')
$$;

alter table public.track_entries enable row level security;
create policy "painel: ler os meus" on public.track_entries for select to authenticated
  using (user_id = (select auth.uid()));
create policy "painel: registrar" on public.track_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and (not public.is_health_metric(metric) or (select public.has_health_consent())));
create policy "painel: editar" on public.track_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (not public.is_health_metric(metric) or (select public.has_health_consent())));
create policy "painel: apagar" on public.track_entries for delete to authenticated
  using (user_id = (select auth.uid()));

-- O dia segue o calendário de Brasília. O app pode registrar até 7 dias atrás (ex.: o
-- sono de ontem); nunca no futuro. Editar um registro não muda o dia dele.
create function public.track_entry_prepare() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  new.user_id := coalesce(auth.uid(), new.user_id);
  if tg_op = 'UPDATE' then
    new.day := old.day;
  elsif new.day > v_today or new.day < v_today - 7 then
    new.day := v_today;
  end if;
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger track_entry_prepare before insert or update on public.track_entries
  for each row execute function public.track_entry_prepare();

-- Soma num contador do dia (copos de água, porções, minutos) sem perder toques seguidos.
create function public.track_counter_add(p_track text, p_metric text, p_delta numeric) returns numeric
language sql set search_path = '' as $$
  insert into public.track_entries (track_id, metric, value)
  values (p_track, p_metric, greatest(0, p_delta))
  on conflict (user_id, track_id, metric, day, entry_key)
  do update set value = greatest(0, coalesce(public.track_entries.value, 0) + p_delta)
  returning value
$$;
grant execute on function public.track_counter_add(text, text, numeric) to authenticated;

-- Retirar o consentimento apaga também os registros de saúde do painel.
create or replace function public.on_consent_withdrawn() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.health_consent_at is not null and new.health_consent_at is null then
    delete from public.checkins where user_id = new.id;
    delete from public.track_entries where user_id = new.id and public.is_health_metric(metric);
  end if;
  return new;
end;
$$;

-- Exportar meus dados: inclui o painel e filtra pelo próprio aluno (a equipe vê mais pelo RLS).
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
    'atividade', coalesce((select jsonb_agg(to_jsonb(a)) from public.activity_log a where a.user_id = auth.uid()), '[]'::jsonb)
  )
$$;

-- Todas as trilhas no ar.
update public.tracks set status = 'live', launch_label = 'Disponível';
