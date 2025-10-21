--
-- migration: add check_settlement_participation function
-- purpose: add security definer function to check if user participates in settlement (is owner or participant)
-- affected objects:
--   functions: check_settlement_participation
-- special considerations:
--   - security definer function to bypass RLS for controlled access checking
--   - returns json object with exists, accessible, and status fields
--   - used by expense operations to allow access for all settlement participants
--

--=========================
-- check_settlement_participation function
--=========================

-- function to check if a user participates in a settlement (is owner or has a participant record)
-- returns json: { "exists": boolean, "accessible": boolean, "status": string }
-- security definer allows bypassing RLS for controlled checking
create or replace function public.check_settlement_participation(p_settlement_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_deleted_at timestamptz;
  v_status text;
  v_participant_exists boolean := false;
begin
  -- Check if settlement exists and get ownership info
  select s.owner_id, s.deleted_at, s.status
    into v_owner_id, v_deleted_at, v_status
  from public.settlements s
  where s.id = p_settlement_id;

  -- Settlement doesn't exist
  if v_owner_id is null then
    return jsonb_build_object('exists', false, 'accessible', false, 'status', null);
  end if;

  -- Settlement exists but is soft-deleted
  if v_deleted_at is not null then
    return jsonb_build_object('exists', false, 'accessible', false, 'status', v_status);
  end if;

  -- Check if user is the owner
  if v_owner_id = p_user_id then
    return jsonb_build_object('exists', true, 'accessible', true, 'status', v_status);
  end if;

  -- Check if user has a participant record in this settlement
  select exists(
    select 1 from public.participants p
    where p.settlement_id = p_settlement_id and p.last_edited_by = p_user_id
  ) into v_participant_exists;

  -- User participates in settlement (either as owner or participant)
  if v_participant_exists then
    return jsonb_build_object('exists', true, 'accessible', true, 'status', v_status);
  end if;

  -- Settlement exists but user doesn't participate
  return jsonb_build_object('exists', true, 'accessible', false, 'status', v_status);
end;
$$;

-- end of migration
