-- v5: assinatura anual por trilha, low tickets, sequência obrigatória das aulas,
-- momento de vida no teste inicial e escrita do catálogo pelo admin.

-- ————————————————————————————————————————————————————————————
-- Catálogo
-- ————————————————————————————————————————————————————————————
-- Preço da assinatura anual da trilha (texto livre, só aparece na web).
alter table public.tracks add column if not exists price_label text;

-- Low ticket: mini produto vendido à parte (aula curta, planilha ou ferramenta), fora da sequência.
alter table public.courses add column if not exists low_ticket boolean not null default false;
alter table public.courses add column if not exists format text check (format in ('aula', 'planilha', 'ferramenta'));

-- Momento de vida que o teste inicial mostrou.
alter table public.diagnostic_results add column if not exists moment text
  check (moment in ('reequilibrio', 'organizacao', 'estabilidade', 'crescimento'));

-- A assinatura geral saiu: agora cada trilha tem a sua (anual).
update public.products set active = false where id = 'assinatura-vivah';

-- ————————————————————————————————————————————————————————————
-- Produtos automáticos: cada curso da trilha entra na assinatura "trilha-<id>";
-- cada low ticket vira um produto com o próprio id. Assim o admin cria um curso
-- e ele já aparece na venda certa, sem mexer em tabela de produtos.
-- ————————————————————————————————————————————————————————————
create or replace function public.course_products_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_product text;
  v_name text;
begin
  delete from public.product_courses pc
   where pc.course_id = new.id and (pc.product_id = new.id or pc.product_id like 'trilha-%');
  if new.reward_only or new.min_kindness_level is not null then
    return new;
  end if;
  if new.low_ticket then
    v_product := new.id;
    v_name := new.title;
  else
    v_product := 'trilha-' || new.track_id;
    select 'Trilha ' || t.title || ' · anual' into v_name from public.tracks t where t.id = new.track_id;
  end if;
  insert into public.products (id, name) values (v_product, coalesce(v_name, v_product))
  on conflict (id) do update set active = true,
    name = case when new.low_ticket then excluded.name else public.products.name end;
  insert into public.product_courses (product_id, course_id) values (v_product, new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists courses_products_sync on public.courses;
create trigger courses_products_sync
  after insert or update of track_id, title, low_ticket, reward_only, min_kindness_level on public.courses
  for each row execute function public.course_products_sync();

-- Curso já vendido não pode ser apagado (apagaria o acesso de quem comprou).
create or replace function public.protect_sold_course() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.entitlements e where e.course_id = old.id and e.status = 'active') then
    raise exception 'Este curso já tem alunos com acesso. Em vez de apagar, mude o título ou mova as aulas.';
  end if;
  return old;
end;
$$;

drop trigger if exists courses_protect_sold on public.courses;
create trigger courses_protect_sold before delete on public.courses
  for each row execute function public.protect_sold_course();

-- ————————————————————————————————————————————————————————————
-- Acesso: quem assina a trilha recebe também os cursos novos que o admin criar.
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
   where not c.low_ticket and not c.reward_only and c.min_kindness_level is null
     and exists (
       select 1 from public.entitlements e
        where e.email = public.current_email() and public.current_email() <> ''
          and e.product_id = 'trilha-' || c.track_id
          and e.status = 'active' and (e.expires_at is null or e.expires_at > now())
     )
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

-- Canal da trilha: só quem assina a trilha (low ticket não abre a comunidade).
create or replace function public.can_access_channel(p_channel text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    p_channel = 'aquecimento'
    or public.is_admin()
    or exists (
      select 1 from public.courses c
       where c.track_id = p_channel and not c.is_free and c.min_kindness_level is null
         and not c.reward_only and not c.low_ticket
         and public.has_course_access(c.id)
    )
  )
$$;

-- ————————————————————————————————————————————————————————————
-- Sequência obrigatória: a aula só abre com a anterior da trilha concluída.
-- Ordem: curso, módulo, aula. Low tickets e conteúdos de recompensa ficam fora.
-- ————————————————————————————————————————————————————————————
create or replace function public.previous_lesson_in_track(p_lesson text) returns text
language sql stable security definer set search_path = '' as $$
  with me as (
    select c.track_id from public.lessons l join public.courses c on c.id = l.course_id
     where l.id = p_lesson and not c.low_ticket and not c.reward_only and c.min_kindness_level is null
  ),
  seq as (
    select l.id,
           row_number() over (order by c.sort, c.id collate "C", m.sort, m.id collate "C", l.sort, l.id collate "C") as n
      from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = l.course_id
     where c.track_id = (select track_id from me)
       and not c.low_ticket and not c.reward_only and c.min_kindness_level is null
  )
  select s.id from seq s where s.n = (select n - 1 from seq where id = p_lesson)
$$;

create or replace function public.can_read_lesson(p_lesson text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      join public.tracks t on t.id = c.track_id
     where l.id = p_lesson
       and (public.has_course_access(l.course_id) or (l.is_preview and t.status = 'live'))
       and (
         public.is_admin()
         or l.is_preview
         or public.previous_lesson_in_track(l.id) is null
         or exists (
           select 1 from public.lesson_progress p
            where p.user_id = auth.uid()
              and p.lesson_id = public.previous_lesson_in_track(l.id)
              and p.completed_at is not null
         )
       )
  )
$$;

-- ————————————————————————————————————————————————————————————
-- Página de admin: o time Vivah escreve no catálogo pelo app.
-- ————————————————————————————————————————————————————————————
create policy "admin: gerir" on public.tracks for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin: gerir" on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin: gerir" on public.modules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin: gerir" on public.lessons for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin: gerir" on public.lesson_media for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin: gerir" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin: gerir" on public.product_courses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin: gerir" on public.track_rewards for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant execute on function public.previous_lesson_in_track(text) to authenticated;
