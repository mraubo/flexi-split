--
-- migration: add finalize_settlement_transaction function
-- purpose: add function to atomically finalize settlement (save snapshot + update status)
-- affected objects:
--   functions: finalize_settlement_transaction
-- special considerations:
--   - security definer function to bypass RLS for controlled transaction
--   - performs snapshot insertion and settlement update atomically
--   - used by finalizeSettlement service to ensure consistency
--

--=========================
-- finalize_settlement_transaction function
--=========================

-- function to atomically finalize a settlement transaction
-- parameters:
--   p_settlement_id: uuid - settlement to finalize
--   p_balances: jsonb - balances map (participant_id -> balance_cents)
--   p_transfers: jsonb - transfers array
--   p_user_id: uuid - user performing the operation
--   p_closed_at: timestamptz - timestamp for closure
-- returns: boolean (true on success)
-- security definer allows bypassing RLS for controlled finalization
create or replace function public.finalize_settlement_transaction(
  p_settlement_id uuid,
  p_balances jsonb,
  p_transfers jsonb,
  p_user_id uuid,
  p_closed_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_algorithm_version int := 1;
  v_snapshot_id uuid;
  v_current_status text;
begin
  -- lock the settlement row to prevent race conditions
  select s.status
    into v_current_status
  from public.settlements s
  where s.id = p_settlement_id
  for update;

  -- validate settlement exists
  if v_current_status is null then
    raise exception 'settlement not found';
  end if;

  -- validate ownership
  if not exists (
    select 1 from public.settlements s
    where s.id = p_settlement_id
      and s.owner_id = p_user_id
  ) then
    raise exception 'settlement not found or not authorized';
  end if;

  -- validate status is still open (after lock)
  if v_current_status != 'open' then
    raise exception 'settlement is already closed';
  end if;

  -- insert settlement snapshot
  insert into public.settlement_snapshots(
    settlement_id,
    balances,
    transfers,
    algorithm_version,
    created_at
  )
  values (
    p_settlement_id,
    p_balances,
    p_transfers,
    v_algorithm_version,
    p_closed_at
  )
  returning id into v_snapshot_id;

  -- update settlement status
  update public.settlements
  set
    status = 'closed',
    closed_at = p_closed_at,
    updated_at = p_closed_at,
    last_edited_by = p_user_id
  where id = p_settlement_id;

  -- insert event
  insert into public.events(
    event_type,
    settlement_id,
    payload
  )
  values (
    'settled',
    p_settlement_id,
    jsonb_build_object(
      'env', 'prod',
      'algorithm_version', v_algorithm_version,
      'transfers_count', jsonb_array_length(p_transfers)
    )
  );

  return true;
end;
$$;

-- end of migration
