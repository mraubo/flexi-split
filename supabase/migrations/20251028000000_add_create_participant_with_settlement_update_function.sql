--
-- migration: add create_participant_with_settlement_update function
-- purpose: add atomic function to create participant with settlement counter update in a single transaction
-- affected objects:
--   functions: create_participant_with_settlement_update
-- special considerations:
--   - security definer function to bypass RLS for controlled participant creation
--   - ensures settlement is open and user has access
--   - validates all business rules in a single transaction
--   - updates participants_count in settlements table
--   - returns created participant data for immediate use
-- date: 2025-10-28
--

--=========================
-- create_participant_with_settlement_update function
--=========================

-- function to atomically create a participant and update settlement counter
-- performs all validation and ensures data consistency
-- returns json with created participant id and data
create or replace function public.create_participant_with_settlement_update(
  participant_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_settlement_id uuid;
  v_nickname text;
  v_user_id uuid := auth.uid();
  v_settlement_status text;
  v_participants_count integer;
  v_nickname_norm text;
  v_created_participant jsonb;
begin
  -- Extract values from participant_data
  v_settlement_id := (participant_data->>'settlement_id')::uuid;
  v_nickname := participant_data->>'nickname';

  -- Validate required user authentication
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  -- Check settlement access and status using existing function
  declare
    access_check jsonb;
  begin
    select public.check_settlement_participation(v_settlement_id, v_user_id) into access_check;

    if not (access_check->>'exists')::boolean then
      raise exception 'settlement not found' using errcode = 'P0001';
    end if;

    if not (access_check->>'accessible')::boolean then
      raise exception 'insufficient permissions' using errcode = '42501';
    end if;

    v_settlement_status := access_check->>'status';
    if v_settlement_status != 'open' then
      raise exception 'settlement is closed - cannot add participants' using errcode = 'P0002';
    end if;

    v_participants_count := (access_check->>'participants_count')::integer;
  end;

  -- Check participant limit (max 10 participants)
  if v_participants_count >= 10 then
    raise exception 'maximum participant limit reached - cannot add more than 10 participants' using errcode = 'P0003';
  end if;

  -- Prepare normalized nickname for uniqueness check
  v_nickname_norm := lower(v_nickname);

  -- Check nickname uniqueness (case-insensitive) within settlement
  if exists(
    select 1 from public.participants p
    where p.settlement_id = v_settlement_id
      and p.nickname_norm = v_nickname_norm
  ) then
    raise exception 'nickname already exists in this settlement' using errcode = '23505';
  end if;

  -- Insert the participant and update settlement counter in a transaction
  insert into public.participants (
    settlement_id,
    nickname,
    last_edited_by
  ) values (
    v_settlement_id,
    v_nickname,
    v_user_id
  )
  returning id into v_participant_id;

  -- Update participants_count in settlements table
  update public.settlements
  set
    participants_count = participants_count + 1,
    updated_at = now(),
    last_edited_by = v_user_id
  where id = v_settlement_id;

  -- Return created participant data
  select jsonb_build_object(
    'id', p.id,
    'nickname', p.nickname,
    'is_owner', p.is_owner,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'last_edited_by', p.last_edited_by
  ) into v_created_participant
  from public.participants p
  where p.id = v_participant_id;

  return v_created_participant;
end;
$$;

-- end of migration
