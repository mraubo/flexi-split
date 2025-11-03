--
-- migration: enable rls for production
-- purpose: re-enable row level security on all tables for production deployment
-- affected objects:
--   tables: settlements, participants, expenses, expense_participants,
--           settlement_snapshots, events
--   policies: all rls policies for authenticated and anon users
-- special considerations:
--   - this migration restores security after development phase
--   - all policies enforce owner-based access control via auth.uid()
--   - soft-deleted settlements are filtered via deleted_at IS NULL
--   - settlement_snapshots can only be written via security definer functions
--   - events table allows users to see their own events or settlement-related events
--

--=========================
-- enable rls on all tables
--=========================

alter table public.settlements enable row level security;
alter table public.participants enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.settlement_snapshots enable row level security;
alter table public.events enable row level security;

--=========================
-- settlements policies
--=========================

-- anon users have no access
drop policy if exists settlements_select_anon on public.settlements;
create policy settlements_select_anon on public.settlements
  for select to anon using (false);

drop policy if exists settlements_insert_anon on public.settlements;
create policy settlements_insert_anon on public.settlements
  for insert to anon with check (false);

drop policy if exists settlements_update_anon on public.settlements;
create policy settlements_update_anon on public.settlements
  for update to anon using (false) with check (false);

drop policy if exists settlements_delete_anon on public.settlements;
create policy settlements_delete_anon on public.settlements
  for delete to anon using (false);

-- authenticated users can only see their own non-deleted settlements
drop policy if exists settlements_select_auth on public.settlements;
create policy settlements_select_auth on public.settlements
  for select to authenticated using (owner_id = auth.uid() and deleted_at is null);

-- authenticated users can only insert settlements they own
drop policy if exists settlements_insert_auth on public.settlements;
create policy settlements_insert_auth on public.settlements
  for insert to authenticated with check (owner_id = auth.uid());

-- authenticated users can only update their own open settlements (not deleted)
drop policy if exists settlements_update_auth on public.settlements;
create policy settlements_update_auth on public.settlements
  for update to authenticated 
  using (owner_id = auth.uid() and status = 'open' and deleted_at is null)
  with check (owner_id = auth.uid());

-- authenticated users can only soft-delete their own closed settlements
drop policy if exists settlements_delete_auth on public.settlements;
create policy settlements_delete_auth on public.settlements
  for delete to authenticated using (owner_id = auth.uid() and status = 'closed');

--=========================
-- participants policies
--=========================

-- anon users have no access
drop policy if exists participants_select_anon on public.participants;
create policy participants_select_anon on public.participants
  for select to anon using (false);

drop policy if exists participants_insert_anon on public.participants;
create policy participants_insert_anon on public.participants
  for insert to anon with check (false);

drop policy if exists participants_update_anon on public.participants;
create policy participants_update_anon on public.participants
  for update to anon using (false) with check (false);

drop policy if exists participants_delete_anon on public.participants;
create policy participants_delete_anon on public.participants
  for delete to anon using (false);

-- authenticated users can see participants in their own settlements
drop policy if exists participants_select_auth on public.participants;
create policy participants_select_auth on public.participants
  for select to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = participants.settlement_id 
        and s.owner_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- authenticated users can add participants to their own open settlements
drop policy if exists participants_insert_auth on public.participants;
create policy participants_insert_auth on public.participants
  for insert to authenticated with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  );

-- authenticated users can update participants in their own open settlements
drop policy if exists participants_update_auth on public.participants;
create policy participants_update_auth on public.participants
  for update to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = participants.settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  ) with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  );

-- authenticated users can delete participants from their own open settlements
drop policy if exists participants_delete_auth on public.participants;
create policy participants_delete_auth on public.participants
  for delete to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = participants.settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  );

--=========================
-- expenses policies
--=========================

-- anon users have no access
drop policy if exists expenses_select_anon on public.expenses;
create policy expenses_select_anon on public.expenses
  for select to anon using (false);

drop policy if exists expenses_insert_anon on public.expenses;
create policy expenses_insert_anon on public.expenses
  for insert to anon with check (false);

drop policy if exists expenses_update_anon on public.expenses;
create policy expenses_update_anon on public.expenses
  for update to anon using (false) with check (false);

drop policy if exists expenses_delete_anon on public.expenses;
create policy expenses_delete_anon on public.expenses
  for delete to anon using (false);

-- authenticated users can see expenses in their own settlements
drop policy if exists expenses_select_auth on public.expenses;
create policy expenses_select_auth on public.expenses
  for select to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expenses.settlement_id 
        and s.owner_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- authenticated users can add expenses to their own open settlements
drop policy if exists expenses_insert_auth on public.expenses;
create policy expenses_insert_auth on public.expenses
  for insert to authenticated with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  );

-- authenticated users can update expenses in their own open settlements
drop policy if exists expenses_update_auth on public.expenses;
create policy expenses_update_auth on public.expenses
  for update to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expenses.settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  ) with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  );

-- authenticated users can delete expenses from their own open settlements
drop policy if exists expenses_delete_auth on public.expenses;
create policy expenses_delete_auth on public.expenses
  for delete to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expenses.settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  );

--=========================
-- expense_participants policies
--=========================

-- anon users have no access
drop policy if exists expense_participants_select_anon on public.expense_participants;
create policy expense_participants_select_anon on public.expense_participants
  for select to anon using (false);

drop policy if exists expense_participants_insert_anon on public.expense_participants;
create policy expense_participants_insert_anon on public.expense_participants
  for insert to anon with check (false);

drop policy if exists expense_participants_update_anon on public.expense_participants;
create policy expense_participants_update_anon on public.expense_participants
  for update to anon using (false) with check (false);

drop policy if exists expense_participants_delete_anon on public.expense_participants;
create policy expense_participants_delete_anon on public.expense_participants
  for delete to anon using (false);

-- authenticated users can see expense_participants in their own settlements
drop policy if exists expense_participants_select_auth on public.expense_participants;
create policy expense_participants_select_auth on public.expense_participants
  for select to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expense_participants.settlement_id 
        and s.owner_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- authenticated users can add expense_participants to their own open settlements
drop policy if exists expense_participants_insert_auth on public.expense_participants;
create policy expense_participants_insert_auth on public.expense_participants
  for insert to authenticated with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  );

-- authenticated users can update expense_participants in their own open settlements
drop policy if exists expense_participants_update_auth on public.expense_participants;
create policy expense_participants_update_auth on public.expense_participants
  for update to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expense_participants.settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  ) with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  );

-- authenticated users can delete expense_participants from their own open settlements
drop policy if exists expense_participants_delete_auth on public.expense_participants;
create policy expense_participants_delete_auth on public.expense_participants
  for delete to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expense_participants.settlement_id 
        and s.owner_id = auth.uid() 
        and s.status = 'open'
        and s.deleted_at is null
    )
  );

--=========================
-- settlement_snapshots policies
--=========================

-- anon users have no access
drop policy if exists settlement_snapshots_select_anon on public.settlement_snapshots;
create policy settlement_snapshots_select_anon on public.settlement_snapshots
  for select to anon using (false);

drop policy if exists settlement_snapshots_insert_anon on public.settlement_snapshots;
create policy settlement_snapshots_insert_anon on public.settlement_snapshots
  for insert to anon with check (false);

drop policy if exists settlement_snapshots_update_anon on public.settlement_snapshots;
create policy settlement_snapshots_update_anon on public.settlement_snapshots
  for update to anon using (false) with check (false);

drop policy if exists settlement_snapshots_delete_anon on public.settlement_snapshots;
create policy settlement_snapshots_delete_anon on public.settlement_snapshots
  for delete to anon using (false);

-- authenticated users can read snapshots for their own settlements
drop policy if exists settlement_snapshots_select_auth on public.settlement_snapshots;
create policy settlement_snapshots_select_auth on public.settlement_snapshots
  for select to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_snapshots.settlement_id 
        and s.owner_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- prevent direct writes by app users; writes occur via finalize_settlement_transaction() only (security definer)
drop policy if exists settlement_snapshots_insert_auth on public.settlement_snapshots;
create policy settlement_snapshots_insert_auth on public.settlement_snapshots
  for insert to authenticated with check (false);

drop policy if exists settlement_snapshots_update_auth on public.settlement_snapshots;
create policy settlement_snapshots_update_auth on public.settlement_snapshots
  for update to authenticated using (false) with check (false);

drop policy if exists settlement_snapshots_delete_auth on public.settlement_snapshots;
create policy settlement_snapshots_delete_auth on public.settlement_snapshots
  for delete to authenticated using (false);

--=========================
-- events policies
--=========================

-- anon users have no access
drop policy if exists events_select_anon on public.events;
create policy events_select_anon on public.events
  for select to anon using (false);

drop policy if exists events_insert_anon on public.events;
create policy events_insert_anon on public.events
  for insert to anon with check (false);

drop policy if exists events_update_anon on public.events;
create policy events_update_anon on public.events
  for update to anon using (false) with check (false);

drop policy if exists events_delete_anon on public.events;
create policy events_delete_anon on public.events
  for delete to anon using (false);

-- authenticated users can see their own events or events from their settlements
drop policy if exists events_select_auth on public.events;
create policy events_select_auth on public.events
  for select to authenticated using (
    (
      settlement_id is not null and exists (
        select 1 from public.settlements s
        where s.id = events.settlement_id 
          and s.owner_id = auth.uid()
          and s.deleted_at is null
      )
    ) or (
      settlement_id is null and actor_id = auth.uid()
    )
  );

-- authenticated users can insert events for themselves
drop policy if exists events_insert_auth on public.events;
create policy events_insert_auth on public.events
  for insert to authenticated with check (
    actor_id = auth.uid() and (payload ? 'env') and (payload->>'env') in ('dev','prod')
  );

-- events are immutable once created
drop policy if exists events_update_auth on public.events;
create policy events_update_auth on public.events
  for update to authenticated using (false) with check (false);

drop policy if exists events_delete_auth on public.events;
create policy events_delete_auth on public.events
  for delete to authenticated using (false);

-- end of migration
