-- Loja da trilha: produtos físicos vendidos pela Vivah (camiseta, garrafa, planner…).
-- São diferentes das recompensas resgatadas com pontos (track_rewards).
-- O pagamento acontece fora do app, na página de checkout de cada produto. As regras
-- da Apple (3.1.5) e do Google pedem exatamente isso para produtos físicos.
create table public.store_items (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  track_id text references public.tracks (id) on delete set null, -- null = aparece em todas as trilhas
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 400),
  price_label text check (char_length(price_label) <= 40),
  image_url text check (image_url is null or image_url ~ '^https://'),
  checkout_url text check (checkout_url is null or checkout_url ~ '^https://'),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.store_items (track_id);

alter table public.store_items enable row level security;
create policy "loja: ver produtos" on public.store_items for select to authenticated
  using (active or (select public.is_admin()));
create policy "admin: gerir" on public.store_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
