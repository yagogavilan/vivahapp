#!/usr/bin/env bash
# Roda a migração, o seed e os testes de RLS num Postgres local (sem Docker).
# Uso: npm run db:test   (precisa de um Postgres 15+ com o usuário "postgres")
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${VIVAH_TEST_DB:-vivah_test}
PSQL=(psql -v ON_ERROR_STOP=1 -q -U "${PGUSER:-postgres}" -h "${PGHOST:-localhost}")

"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
"${PSQL[@]}" -d postgres -c "do \$\$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end \$\$;"
sed -e '/^create role/d' supabase/tests/stub.sql | "${PSQL[@]}" -d "$DB"
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -d "$DB" -f "$f"; done
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql
# O seed roda duas vezes para garantir que pode ser repetido.
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql
"${PSQL[@]}" -d "$DB" -f supabase/tests/rls_test.sql
