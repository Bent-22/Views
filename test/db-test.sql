-- Prüft die Rechte aus supabase/schema.sql gegen ein lokales Postgres.
-- Aufruf siehe test/run-db-test.sh
\set ON_ERROR_STOP on

-- Lehrkraft anlegen und Klasse erzeugen
select set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
insert into public.teachers values ('00000000-0000-0000-0000-000000000001');

set role authenticated;
select (public.create_class('Testklasse', 3, true))::text as created \gset
reset role;
select code as klass from public.classes limit 1 \gset
select code as teil from public.participants order by code limit 1 \gset
select code as teil2 from public.participants order by code offset 1 limit 1 \gset

create schema t;
create function t.expect(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FEHLER: %', label; end if;
  raise notice 'ok: %', label;
end $$;

-- Hilfsfunktion: Aufruf muss mit einer bestimmten Meldung scheitern
create function t.fails(cmd text, expected text, label text) returns void language plpgsql as $$
begin
  execute cmd;
  raise exception 'FEHLER: % (kein Abbruch)', label;
exception when others then
  if sqlerrm like 'FEHLER:%' then raise; end if;
  if position(expected in sqlerrm) = 0 then raise exception 'FEHLER: % (Meldung: %)', label, sqlerrm; end if;
  raise notice 'ok: %', label;
end $$;
grant usage on schema t to anon, authenticated;
grant execute on all functions in schema t to anon, authenticated;

select t.expect(length(:'klass') = 7 and length(:'teil') = 8, 'Codes haben die erwartete Länge');
select t.expect((select count(distinct code) from public.participants) = 3, 'Teilnehmercodes sind verschieden');

-- Schüler (anon)
set role anon;
select t.expect(public.submit_protocol(:'klass', :'teil', '11111111-1111-1111-1111-111111111111', '{"theory":"maenner"}')->>'status' = 'accepted', 'Abgabe wird angenommen');
select t.expect(public.submit_protocol(lower(:'klass'), :'teil', '11111111-1111-1111-1111-111111111111', '{"theory":"maenner"}')->>'status' = 'already_received', 'Wiederholung erzeugt keinen zweiten Eintrag');
select t.fails(format('select public.submit_protocol(%L, %L, %L, %L)', :'klass', :'teil', '22222222-2222-2222-2222-222222222222', '{"theory":"baer"}'), 'already_submitted', 'Zweite Abgabe mit demselben Code wird abgelehnt');
select t.fails(format('select public.submit_protocol(%L, %L, %L, %L)', :'klass', 'FALSCH', '33333333-3333-3333-3333-333333333333', '{}'), 'invalid_code', 'Falscher Code wird abgelehnt');
select t.fails(format('select public.submit_protocol(%L, %L, %L, %L)', :'klass', :'teil2', '44444444-4444-4444-4444-444444444444', '[1]'), 'invalid_payload', 'Falsches Format wird abgelehnt');
select t.fails(format('select public.submit_protocol(%L, %L, %L, %L)', :'klass', :'teil2', '44444444-4444-4444-4444-444444444444', jsonb_build_object('x', (select string_agg(md5(i::text), '') from generate_series(1, 2000) i))), 'invalid_payload', 'Zu große Abgabe wird abgelehnt');
select t.fails('select * from public.submissions', 'permission denied', 'Schüler können keine Abgaben lesen');
select t.fails('select * from public.classes', 'permission denied', 'Schüler können keine Klassen lesen');
select t.fails('select * from public.participants', 'permission denied', 'Schüler können keine Codes lesen');
select t.fails('delete from public.submissions', 'permission denied', 'Schüler können nichts löschen');
select t.fails($$insert into public.submissions (submission_id, class_id, participant_id, payload) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), '{}')$$, 'permission denied', 'Schüler können nicht direkt schreiben');
select t.fails($$select public.create_class('x', 1, true)$$, 'permission denied', 'Schüler können keine Klassen anlegen');
select t.fails('select public.random_code(8)', 'permission denied', 'Schüler erreichen die Hilfsfunktion nicht');
reset role;

-- Angemeldet, aber keine Lehrkraft
select set_config('test.uid', '00000000-0000-0000-0000-000000000002', false);
set role authenticated;
select t.expect((select count(*) from public.submissions) = 0, 'Fremdes Konto sieht keine Abgaben');
select t.expect((select count(*) from public.classes) = 0, 'Fremdes Konto sieht keine Klassen');
delete from public.submissions;
select t.fails($$select public.create_class('x', 1, true)$$, 'not_allowed', 'Fremdes Konto kann keine Klassen anlegen');
reset role;
select t.expect((select count(*) from public.submissions) = 1, 'Fremdes Konto konnte nichts löschen');

-- Lehrkraft
select set_config('test.uid', '00000000-0000-0000-0000-000000000001', false);
set role authenticated;
select t.expect((select count(*) from public.submissions) = 1, 'Lehrkraft sieht die Abgabe');
select t.fails($$update public.submissions set payload = '{}'$$, 'permission denied', 'Auch die Lehrkraft kann Abgaben nicht verändern');
delete from public.submissions;
select t.expect((select count(*) from public.submissions) = 0, 'Lehrkraft kann Abgaben löschen');
delete from public.classes;
reset role;
select t.expect((select count(*) from public.participants) = 0, 'Klasse löschen entfernt die Codes');
