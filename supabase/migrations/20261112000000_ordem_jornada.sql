-- As trilhas aparecem sempre na ordem da jornada Vivah (início e fim):
-- Respira → Ritmo → Move → Nutre → Prospera → Eleva.
update public.tracks set sort = case id
  when 'respira' then 1 when 'ritmo' then 2 when 'move' then 3
  when 'nutre' then 4 when 'prospera' then 5 when 'eleva' then 6 else sort end;
