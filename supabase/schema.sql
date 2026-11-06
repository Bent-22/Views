-- VIEWS: Ergebnissammlung für Supabase (Postgres)
-- Einmal im SQL-Editor des Projekts ausführen.
-- Grundregel: Der Browser hat keinen direkten Tabellenzugriff.
-- Schüler dürfen nur submit_protocol aufrufen, Lesen und Löschen
-- ist ausschließlich angemeldeten Lehrkräften aus public.teachers erlaubt.

create table public.teachers (
  user_id uuid primary key
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  code text not null unique,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  code text not null,
  unique (class_id, code)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  class_id uuid not null references public.classes (id) on delete cascade,
  participant_id uuid not null unique references public.participants (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.participants enable row level security;
alter table public.submissions enable row level security;

revoke all on public.teachers, public.classes, public.participants, public.submissions from public, anon, authenticated;

create function public.is_teacher()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.teachers t where t.user_id = auth.uid());
$$;

revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

grant select, delete on public.classes, public.submissions to authenticated;
grant select on public.participants to authenticated;

create policy teacher_read_classes on public.classes for select to authenticated using (public.is_teacher());
create policy teacher_delete_classes on public.classes for delete to authenticated using (public.is_teacher());
create policy teacher_read_participants on public.participants for select to authenticated using (public.is_teacher());
create policy teacher_read_submissions on public.submissions for select to authenticated using (public.is_teacher());
create policy teacher_delete_submissions on public.submissions for delete to authenticated using (public.is_teacher());

-- Zufallscode ohne verwechselbare Zeichen (kein 0/O, 1/I/L)
create function public.random_code(p_length int)
returns text
language plpgsql volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  raw bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  -- Byte 6 und 8 einer UUID sind nicht zufällig und werden ausgelassen
  positions constant int[] := array[0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13];
  result text := '';
  i int;
begin
  for i in 1 .. p_length loop
    result := result || substr(alphabet, 1 + get_byte(raw, positions[i]) % 31, 1);
  end loop;
  return result;
end;
$$;

revoke all on function public.random_code(int) from public, anon, authenticated;

-- Lehrkraft legt eine Klasse mit anonymen Teilnehmercodes an
create function public.create_class(p_name text, p_count int, p_is_test boolean)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_class public.classes;
  v_code text;
  v_codes text[] := '{}';
begin
  if not public.is_teacher() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_count < 1 or p_count > 60 then
    raise exception 'invalid_count' using errcode = '22023';
  end if;
  insert into public.classes (name, code, is_test)
    values (p_name, 'K' || public.random_code(6), coalesce(p_is_test, false))
    returning * into v_class;
  while coalesce(array_length(v_codes, 1), 0) < p_count loop
    v_code := public.random_code(8);
    insert into public.participants (class_id, code) values (v_class.id, v_code)
      on conflict do nothing;
    if found then
      v_codes := v_codes || v_code;
    end if;
  end loop;
  return jsonb_build_object('id', v_class.id, 'code', v_class.code, 'participants', to_jsonb(v_codes));
end;
$$;

revoke all on function public.create_class(text, int, boolean) from public, anon;
grant execute on function public.create_class(text, int, boolean) to authenticated;

-- Einziger Schreibweg für Schüler.
-- Gleiche submission_id: Wiederholung nach Verbindungsabbruch, kein neuer Eintrag.
-- Andere submission_id mit benutztem Code: wird abgelehnt.
-- Falsche Codes liefern immer dieselbe Meldung, damit nichts ausprobiert werden kann.
create function public.submit_protocol(
  p_class_code text,
  p_participant_code text,
  p_submission_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_participant public.participants;
  v_existing public.submissions;
begin
  if p_submission_id is null or jsonb_typeof(p_payload) is distinct from 'object'
     or pg_column_size(p_payload) > 16384 then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  select p.* into v_participant
    from public.participants p
    join public.classes c on c.id = p.class_id
    where c.code = upper(trim(p_class_code)) and p.code = upper(trim(p_participant_code))
    for update of p;
  if not found then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;

  select s.* into v_existing from public.submissions s where s.participant_id = v_participant.id;
  if found then
    if v_existing.submission_id = p_submission_id then
      return jsonb_build_object('status', 'already_received');
    end if;
    raise exception 'already_submitted' using errcode = 'P0001';
  end if;

  insert into public.submissions (submission_id, class_id, participant_id, payload)
    values (p_submission_id, v_participant.class_id, v_participant.id, p_payload);
  return jsonb_build_object('status', 'accepted');
end;
$$;

revoke all on function public.submit_protocol(text, text, uuid, jsonb) from public, authenticated;
grant execute on function public.submit_protocol(text, text, uuid, jsonb) to anon;
