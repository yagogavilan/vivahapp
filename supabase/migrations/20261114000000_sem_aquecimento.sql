-- Fim da Área de Aquecimento (área grátis).
--
-- Dentro dos apps das lojas nada é vendido, então a vitrine grátis deixou de
-- fazer sentido. O app passa a ter só as seis trilhas da jornada.
--
-- • Comunidade: o canal aberto "aquecimento" sai da lista de canais. As
--   publicações antigas continuam guardadas (a pessoa leva tudo na exportação
--   LGPD), mas não aparecem mais.
-- • Prêmios do Aquecimento: ficam inativos. Quem já resgatou mantém o prêmio
--   e o curso liberado.
-- • Escudo Anticrise e lives continuam: agora fazem parte das trilhas
--   (Escudo do dia na Respira, próxima live no Hoje e na Agenda).

create or replace function public.my_channels() returns text[]
language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is null then '{}'::text[]
    when public.is_admin() then array(select t.id from public.tracks t)
    else array(
      select distinct c.track_id from public.courses c
       where not c.is_free and c.min_kindness_level is null and not c.reward_only and not c.low_ticket
         and c.id in (select public.my_course_ids())
    )
  end
$$;

update public.track_rewards set active = false where track_id = 'aquecimento';

-- Check-in sem trilha informada cai na primeira trilha da jornada.
alter table public.checkins alter column track_id set default 'respira';
