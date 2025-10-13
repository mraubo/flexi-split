--
-- migration: disable all rls policies
-- purpose:
--   drop all row level security policies from tables to temporarily disable
--   access controls for development/testing purposes
-- affected objects:
--   policies: all rls policies on settlements, participants, expenses,
--             expense_participants, settlement_snapshots, events tables
-- special considerations:
--   - this is a temporary migration for development
--   - policies should be re-enabled in a future migration
--

--=========================
-- drop all rls policies
--=========================

-- settlements policies
drop policy if exists settlements_select_anon on public.settlements;
drop policy if exists settlements_insert_anon on public.settlements;
drop policy if exists settlements_update_anon on public.settlements;
drop policy if exists settlements_delete_anon on public.settlements;
drop policy if exists settlements_select_auth on public.settlements;
drop policy if exists settlements_insert_auth on public.settlements;
drop policy if exists settlements_update_auth on public.settlements;
drop policy if exists settlements_delete_auth on public.settlements;

-- participants policies
drop policy if exists participants_select_anon on public.participants;
drop policy if exists participants_insert_anon on public.participants;
drop policy if exists participants_update_anon on public.participants;
drop policy if exists participants_delete_anon on public.participants;
drop policy if exists participants_select_auth on public.participants;
drop policy if exists participants_insert_auth on public.participants;
drop policy if exists participants_update_auth on public.participants;
drop policy if exists participants_delete_auth on public.participants;

-- expenses policies
drop policy if exists expenses_select_anon on public.expenses;
drop policy if exists expenses_insert_anon on public.expenses;
drop policy if exists expenses_update_anon on public.expenses;
drop policy if exists expenses_delete_anon on public.expenses;
drop policy if exists expenses_select_auth on public.expenses;
drop policy if exists expenses_insert_auth on public.expenses;
drop policy if exists expenses_update_auth on public.expenses;
drop policy if exists expenses_delete_auth on public.expenses;

-- expense_participants policies
drop policy if exists expense_participants_select_anon on public.expense_participants;
drop policy if exists expense_participants_insert_anon on public.expense_participants;
drop policy if exists expense_participants_update_anon on public.expense_participants;
drop policy if exists expense_participants_delete_anon on public.expense_participants;
drop policy if exists expense_participants_select_auth on public.expense_participants;
drop policy if exists expense_participants_insert_auth on public.expense_participants;
drop policy if exists expense_participants_update_auth on public.expense_participants;
drop policy if exists expense_participants_delete_auth on public.expense_participants;

-- settlement_snapshots policies
drop policy if exists settlement_snapshots_select_anon on public.settlement_snapshots;
drop policy if exists settlement_snapshots_insert_anon on public.settlement_snapshots;
drop policy if exists settlement_snapshots_update_anon on public.settlement_snapshots;
drop policy if exists settlement_snapshots_delete_anon on public.settlement_snapshots;
drop policy if exists settlement_snapshots_select_auth on public.settlement_snapshots;
drop policy if exists settlement_snapshots_insert_auth on public.settlement_snapshots;
drop policy if exists settlement_snapshots_update_auth on public.settlement_snapshots;
drop policy if exists settlement_snapshots_delete_auth on public.settlement_snapshots;

-- events policies
drop policy if exists events_select_anon on public.events;
drop policy if exists events_insert_anon on public.events;
drop policy if exists events_update_anon on public.events;
drop policy if exists events_delete_anon on public.events;
drop policy if exists events_select_auth on public.events;
drop policy if exists events_insert_auth on public.events;
drop policy if exists events_update_auth on public.events;
drop policy if exists events_delete_auth on public.events;

-- end of migration
