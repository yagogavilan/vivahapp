#!/usr/bin/env bash
# Mede as consultas de cada tela na base de carga (npm run db:load antes).
# Para cada consulta: média de 5 execuções, já com o cache aquecido, como um aluno logado.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${VIVAH_TEST_DB:-vivah_test}
PSQL=(psql -X -q -At -U "${PGUSER:-postgres}" -h "${PGHOST:-localhost}" -d "$DB")

# As consultas repetem os filtros que o app envia (ME = id do aluno).
# Aluno típico (assina a Respira) e o aluno mais ativo da comunidade (10 mil eventos de pontos).
TIPICO=$("${PSQL[@]}" -c "select id || '|' || email from public.profiles where email = 'aluno1@carga.vivah'")
ATIVO=$("${PSQL[@]}" -c "select p.id || '|' || p.email from public.point_events e join public.profiles p on p.id = e.user_id group by p.id order by count(*) desc limit 1")
POST=$("${PSQL[@]}" -c "select p.id from public.posts p join public.comments c on c.post_id = p.id where p.channel = 'respira' group by p.id order by count(*) desc limit 1")

run() { # nome, usuário, sql
  local name=$1 who=$2 sql=$3 id=${2%%|*} email=${2##*|}
  sql=${sql//ME/$id}
  local ms
  ms=$("${PSQL[@]}" <<SQL | tail -1
set role authenticated;
set request.jwt.claims = '{"sub":"$id","email":"$email","role":"authenticated"}';
create temp table if not exists t(ms numeric);
do \$\$ declare s timestamptz; i int; begin
  perform 1 from ($sql) q;  -- aquece
  for i in 1..5 loop s := clock_timestamp(); perform 1 from ($sql) q; insert into t values (extract(epoch from clock_timestamp() - s) * 1000); end loop;
end \$\$;
select round(avg(ms), 1) from t;
SQL
)
  printf '%-58s %8s ms\n' "$name" "$ms"
}

for who in "$TIPICO" "$ATIVO"; do
  echo "== ${who##*|}"
  run "catálogo: aulas (157)" "$who" "select * from public.lessons"
  run "catálogo: cursos + produtos" "$who" "select * from public.courses c left join public.product_courses pc on pc.course_id = c.id"
  run "meus acessos (my_course_ids)" "$who" "select * from public.my_course_ids()"
  run "abrir aula (lesson_media + sequência)" "$who" "select * from public.lesson_media where lesson_id = 'protocolo-desligando-a-mente--m1--a1'"
  run "meu progresso" "$who" "select * from public.lesson_progress where user_id = 'ME'"
  run "feed da Respira (50 posts)" "$who" "select * from public.posts_feed where channel = 'respira' order by created_at desc limit 50"
  run "feed do Aquecimento (50 posts)" "$who" "select * from public.posts_feed where channel = 'aquecimento' order by created_at desc limit 50"
  run "comentários do post mais comentado" "$who" "select * from public.comments_feed where post_id = '$POST' order by created_at"
  run "pontos e nível na trilha" "$who" "select * from public.points_stats('ME'::uuid, 'respira'), public.kindness_level('ME'::uuid, 'respira')"
  run "extrato de pontos (100 últimos)" "$who" "select * from public.point_events where user_id = 'ME'::uuid and track_id = 'respira' order by created_at desc limit 100"
  run "plano e fechamento (30 dias)" "$who" "select * from public.daily_logs where user_id = 'ME' and track_id = 'respira' and day > current_date - 30"
  run "check-ins (30 dias)" "$who" "select * from public.checkins where user_id = 'ME' and day > current_date - 30"
  run "atividade (7 dias)" "$who" "select * from public.activity_log where user_id = 'ME' and day > current_date - 7"
  run "conselheiros da trilha" "$who" "select * from public.list_counselors('respira')"
  run "painel do Move (120 dias)" "$who" "select * from public.track_entries where user_id = 'ME' and track_id in ('move') and (day >= current_date - 120 or metric in ('corpo','financas','divida','meta')) order by day desc limit 3000"
done
