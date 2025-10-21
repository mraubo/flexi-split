--
-- migration: add close settlement rls policies
-- purpose: enable RLS policies for settlements close operation
-- affected objects:
--   policies: settlements_close_select_policy, settlements_close_update_policy
--            expenses_close_select_policy, participants_close_select_policy
-- special considerations:
--   - policies allow owner to read/update their settlements and read related data
--   - used by POST /settlements/{id}/close endpoint
--   - these policies are for production use, RLS is disabled in development
--

--=========================
-- enable rls on tables for close settlement operation
--=========================

-- Note: RLS is disabled in development per 20251017110000_disable_rls_for_development.sql
-- These policies are intended for production deployment

--=========================
-- settlements policies for close operation
--=========================

-- Allow owner to read their settlements (for status checking)
create policy "settlements_close_select_policy" on public.settlements
  for select
  using (owner_id = auth.uid() and deleted_at is null);

-- Allow owner to update their settlements (for status change to closed)
create policy "settlements_close_update_policy" on public.settlements
  for update
  using (owner_id = auth.uid() and deleted_at is null and status = 'open')
  with check (owner_id = auth.uid() and deleted_at is null and status = 'closed');

--=========================
-- expenses policies for close operation
--=========================

-- Allow reading expenses from settlements owned by the user
create policy "expenses_close_select_policy" on public.expenses
  for select
  using (
    exists (
      select 1 from public.settlements s
      where s.id = expenses.settlement_id
        and s.owner_id = auth.uid()
        and s.deleted_at is null
    )
  );

--=========================
-- participants policies for close operation
--=========================

-- Allow reading participants from settlements owned by the user
create policy "participants_close_select_policy" on public.participants
  for select
  using (
    exists (
      select 1 from public.settlements s
      where s.id = participants.settlement_id
        and s.owner_id = auth.uid()
        and s.deleted_at is null
    )
  );

--=========================
-- expense_participants policies for close operation
--=========================

-- Allow reading expense_participants from settlements owned by the user
create policy "expense_participants_close_select_policy" on public.expense_participants
  for select
  using (
    exists (
      select 1 from public.settlements s
      where s.id = (
        select e.settlement_id from public.expenses e
        where e.id = expense_participants.expense_id
      )
      and s.owner_id = auth.uid()
      and s.deleted_at is null
    )
  );

--=========================
-- settlement_snapshots policies for close operation
--=========================

-- Allow owner to insert settlement snapshots for their settlements
create policy "settlement_snapshots_close_insert_policy" on public.settlement_snapshots
  for insert
  with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_snapshots.settlement_id
        and s.owner_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- Allow owner to read settlement snapshots for their settlements
create policy "settlement_snapshots_close_select_policy" on public.settlement_snapshots
  for select
  using (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_snapshots.settlement_id
        and s.owner_id = auth.uid()
        and s.deleted_at is null
    )
  );

--=========================
-- events policies for close operation
--=========================

-- Allow owner to insert events for their settlements
create policy "events_close_insert_policy" on public.events
  for insert
  with check (
    settlement_id is null or
    exists (
      select 1 from public.settlements s
      where s.id = events.settlement_id
        and s.owner_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- end of migration
