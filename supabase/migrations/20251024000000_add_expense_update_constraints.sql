--
-- migration: add expense update constraints
-- purpose: add database-level validation for expense updates to ensure payer is always a participant
-- affected objects:
--   functions: assert_expense_payer_is_participant
--   triggers: expenses_payer_participant_constraint
-- special considerations:
--   - ensures data integrity when updating expenses
--   - prevents invalid state where payer is not included in expense participants
--

--=========================
-- constraint function for expense updates
--=========================

-- constraint: ensure expense payer is always included in participants
create or replace function public.assert_expense_payer_is_participant(p_expense_id uuid)
returns void
language plpgsql
as $$
declare
  v_payer_id uuid;
  v_has_payer boolean := false;
begin
  -- Get the payer for this expense
  select e.payer_participant_id into v_payer_id
  from public.expenses e
  where e.id = p_expense_id;

  if v_payer_id is null then
    raise exception 'expense % not found', p_expense_id;
  end if;

  -- Check if payer is in the participants list
  select exists(
    select 1 from public.expense_participants ep
    where ep.expense_id = p_expense_id
      and ep.participant_id = v_payer_id
  ) into v_has_payer;

  if not v_has_payer then
    raise exception 'expense payer must be included in participants for expense %', p_expense_id;
  end if;
end;
$$;

--=========================
-- trigger for expense updates
--=========================

-- trigger wrapper for the constraint (required: trigger functions must return trigger)
create or replace function public.tg_assert_expense_payer_is_participant_trg()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    -- Only check when payer_participant_id changes
    if new.payer_participant_id is distinct from old.payer_participant_id then
      perform public.assert_expense_payer_is_participant(new.id);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

--=========================
-- trigger wiring
--=========================

-- constraint trigger for expense payer validation
drop trigger if exists expenses_payer_participant_constraint on public.expenses;
create constraint trigger expenses_payer_participant_constraint
  after update of payer_participant_id on public.expenses
  deferrable initially deferred
  for each row execute function public.tg_assert_expense_payer_is_participant_trg();

-- end of migration
