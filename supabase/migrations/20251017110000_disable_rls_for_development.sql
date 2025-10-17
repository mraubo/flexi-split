--
-- migration: disable rls for development
-- purpose: disable row level security on all tables for development/testing purposes
-- affected objects:
--   tables: settlements, participants, expenses, expense_participants,
--           settlement_snapshots, events
-- special considerations:
--   - this disables rls completely for development
--   - rls should be re-enabled in production with proper policies
--

--=========================
-- disable rls on all tables
--=========================

alter table public.settlements disable row level security;
alter table public.participants disable row level security;
alter table public.expenses disable row level security;
alter table public.expense_participants disable row level security;
alter table public.settlement_snapshots disable row level security;
alter table public.events disable row level security;

-- end of migration
