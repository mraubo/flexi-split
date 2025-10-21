--
-- migration: add check_settlement_access function
-- purpose: add security definer function to check settlement existence and ownership without RLS restrictions
-- affected objects:
--   functions: check_settlement_access
-- special considerations:
--   - security definer function to bypass RLS for controlled access checking
--   - returns json object with exists and accessible boolean fields
--   - used by GET /settlements/{id} endpoint to distinguish 403 vs 404
--

--=========================
-- check_settlement_access function
--=========================

-- function to check if a settlement exists and if the user has access to it
-- returns json: { "exists": boolean, "accessible": boolean }
-- security definer allows bypassing RLS for controlled checking
create or replace function public.check_settlement_access(p_settlement_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_deleted_at timestamptz;
begin
  -- Check if settlement exists and get ownership info
  select s.owner_id, s.deleted_at
    into v_owner_id, v_deleted_at
  from public.settlements s
  where s.id = p_settlement_id;

  -- Settlement doesn't exist
  if v_owner_id is null then
    return jsonb_build_object('exists', false, 'accessible', false);
  end if;

  -- Settlement exists but is soft-deleted
  if v_deleted_at is not null then
    return jsonb_build_object('exists', false, 'accessible', false);
  end if;

  -- Settlement exists, check if user has access (is owner)
  return jsonb_build_object('exists', true, 'accessible', (v_owner_id = p_user_id));
end;
$$;

-- end of migration
