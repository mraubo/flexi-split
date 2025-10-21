--
-- migration: add calculate_settlement_balances function
-- purpose: add function to calculate net balances for all participants in a settlement
-- affected objects:
--   functions: calculate_settlement_balances
-- special considerations:
--   - security definer function to bypass RLS for controlled balance calculation
--   - returns table with participant_id and balance_cents
--   - used by close settlement endpoint to compute balances before transfers
--

--=========================
-- calculate_settlement_balances function
--=========================

-- function to calculate net balances for all participants in a settlement
-- returns table: participant_id uuid, balance_cents bigint
-- security definer allows bypassing RLS for controlled calculation
create or replace function public.calculate_settlement_balances(p_settlement_id uuid)
returns table(participant_id uuid, balance_cents bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- validate settlement exists
  if not exists (select 1 from public.settlements s where s.id = p_settlement_id) then
    raise exception 'settlement % not found', p_settlement_id;
  end if;

  -- balances: compute per participant (paid - owed), with remainder assigned to payer
  return query
  with paid as (
    select e.payer_participant_id as participant_id, sum(e.amount_cents)::bigint as paid
    from public.expenses e
    where e.settlement_id = p_settlement_id
    group by e.payer_participant_id
  ), owed as (
    select ep.participant_id,
           sum( (e.amount_cents / e.share_count)::bigint
                + case when ep.participant_id = e.payer_participant_id
                       then (e.amount_cents % e.share_count::bigint)
                       else 0 end
              )::bigint as owed
    from public.expenses e
    join public.expense_participants ep
      on ep.expense_id = e.id and ep.settlement_id = e.settlement_id
    where e.settlement_id = p_settlement_id
      and e.share_count > 0
    group by ep.participant_id
  ), balances as (
    select p.id as participant_id,
           coalesce(pa.paid, 0)::bigint - coalesce(ow.owed, 0)::bigint as balance_cents
    from public.participants p
    left join paid pa on pa.participant_id = p.id
    left join owed ow on ow.participant_id = p.id
    where p.settlement_id = p_settlement_id
  )
  select b.participant_id, b.balance_cents
  from balances b
  order by b.participant_id;
end;
$$;

-- end of migration
