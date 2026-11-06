#!/usr/bin/env bash
# Startet ein leeres lokales Postgres und prüft supabase/schema.sql.
set -euo pipefail
BIN=/usr/lib/postgresql/16/bin
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$(mktemp -d)"
chown postgres "$DIR"
run() { su postgres -c "$*"; }
run "$BIN/initdb -D $DIR/db -U postgres >/dev/null"
run "$BIN/pg_ctl -D $DIR/db -o '-p 54329 -k $DIR' -l $DIR/log -w start >/dev/null"
trap 'run "$BIN/pg_ctl -D $DIR/db -m immediate stop >/dev/null"; rm -rf "$DIR"' EXIT
PSQL="psql -h $DIR -p 54329 -U postgres -q -v ON_ERROR_STOP=1 -d postgres"
# Nachbau der Supabase-Umgebung: Rollen und auth.uid()
su postgres -c "$PSQL" <<'SQL'
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
SQL
cp "$ROOT/supabase/schema.sql" "$ROOT/test/db-test.sql" "$DIR/"
chmod a+r "$DIR"/*.sql
su postgres -c "$PSQL -f $DIR/schema.sql"
su postgres -c "$PSQL -f $DIR/db-test.sql" 2>&1 | grep -E 'ok:|FEHLER|ERROR'
