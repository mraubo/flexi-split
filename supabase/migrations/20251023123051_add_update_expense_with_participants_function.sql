--
-- migration: add update_expense_with_participants function
-- purpose: add atomic function to update expense with participants in a single transaction
-- affected objects:
--   functions: update_expense_with_participants
-- special considerations:
--   - security definer function to bypass RLS for controlled expense updates
--   - ensures settlement is open and user has access
--   - validates all business rules in a single transaction
--   - handles participant replacement atomically to avoid constraint violations
--   - returns updated expense data for immediate use
--

--=========================
-- update_expense_with_participants function
--=========================

-- function to atomically update an expense with its participants
-- performs all validation and ensures data consistency
-- returns json with updated expense id and data
create or replace function public.update_expense_with_participants(
  p_expense_id uuid,
  expense_data jsonb,
  expense_participants_data jsonb[],
  user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_expense record;
  v_settlement_id uuid;
  v_payer_participant_id uuid;
  v_user_id uuid := coalesce(user_id, auth.uid());
  v_settlement_status text;
  v_payer_exists boolean;
  v_participant_ids uuid[];
  v_participant_record record;
  v_updated_expense jsonb;
begin
  -- Get existing expense to validate it exists and get settlement_id
  select e.* into v_existing_expense
  from public.expenses e
  where e.id = p_expense_id;

  if not found then
    raise exception 'expense not found' using errcode = 'P0001';
  end if;

  v_settlement_id := v_existing_expense.settlement_id;

  -- Extract values from expense_data (use existing values if not provided)
  v_payer_participant_id := coalesce((expense_data->>'payer_participant_id')::uuid, v_existing_expense.payer_participant_id);

  -- Validate required user authentication (use provided user_id or auth.uid())
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  -- Check settlement access and status using existing function
  declare
    access_check jsonb;
  begin
    select public.check_settlement_participation(v_settlement_id, v_user_id) into access_check;

    if not (access_check->>'exists')::boolean then
      raise exception 'settlement not found' using errcode = 'P0002';
    end if;

    if not (access_check->>'accessible')::boolean then
      raise exception 'insufficient permissions' using errcode = '42501';
    end if;

    v_settlement_status := access_check->>'status';
    if v_settlement_status != 'open' then
      raise exception 'settlement is closed - cannot update expenses' using errcode = 'P0003';
    end if;
  end;

  -- Validate payer exists in settlement
  select exists(
    select 1 from public.participants p
    where p.id = v_payer_participant_id
      and p.settlement_id = v_settlement_id
  ) into v_payer_exists;

  if not v_payer_exists then
    raise exception 'payer participant does not exist in settlement' using errcode = 'P0004';
  end if;

  -- Extract and validate participant IDs from expense_participants_data
  select array_agg((ep->>'participant_id')::uuid)
  into v_participant_ids
  from unnest(expense_participants_data) as ep;

  -- Check that all participants exist in the settlement
  for v_participant_record in
    select p.id
    from public.participants p
    where p.settlement_id = v_settlement_id
      and p.id = any(v_participant_ids)
  loop
    -- Remove found participant from array
    v_participant_ids := array_remove(v_participant_ids, v_participant_record.id);
  end loop;

  -- If any participants were not found, raise error
  if array_length(v_participant_ids, 1) > 0 then
    raise exception 'some participants do not exist in settlement: %', array_to_string(v_participant_ids, ', ') using errcode = 'P0005';
  end if;

  -- Update the expense
  update public.expenses
  set
    payer_participant_id = v_payer_participant_id,
    amount_cents = coalesce((expense_data->>'amount_cents')::bigint, amount_cents),
    expense_date = coalesce((expense_data->>'expense_date')::date, expense_date),
    description = coalesce((expense_data->>'description')::varchar(140), description),
    last_edited_by = v_user_id,
    updated_at = now()
  where id = p_expense_id;

  -- Replace expense participants atomically
  -- First delete existing participants
  delete from public.expense_participants
  where expense_id = p_expense_id;

  -- Then insert new participants
  insert into public.expense_participants (
    expense_id,
    participant_id,
    settlement_id
  )
  select
    p_expense_id,
    (ep->>'participant_id')::uuid,
    v_settlement_id
  from unnest(expense_participants_data) as ep;

  -- Return updated expense data
  select jsonb_build_object(
    'id', e.id,
    'settlement_id', e.settlement_id,
    'payer_participant_id', e.payer_participant_id,
    'amount_cents', e.amount_cents,
    'expense_date', e.expense_date,
    'description', e.description,
    'share_count', e.share_count,
    'created_at', e.created_at,
    'updated_at', e.updated_at,
    'last_edited_by', e.last_edited_by
  ) into v_updated_expense
  from public.expenses e
  where e.id = p_expense_id;

  return v_updated_expense;
end;
$$;

-- end of migration
