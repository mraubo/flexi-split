--
-- migration: add soft delete to settlements
-- purpose: add deleted_at column and update RLS policies to support soft delete functionality
-- affected objects:
--   tables: settlements
--   policies: settlements RLS policies
-- special considerations:
--   - adds deleted_at timestamptz column with default NULL
--   - updates all RLS policies to filter out soft-deleted records
--   - adds index on deleted_at for performance
--

-- add deleted_at column to settlements table
alter table public.settlements
  add column if not exists deleted_at timestamptz null;

-- add index for performance when filtering soft-deleted records
create index if not exists settlements_deleted_at_idx on public.settlements (deleted_at);

-- update RLS policies to filter out soft-deleted records and allow deletion only for closed settlements

-- settlements select policy: exclude soft-deleted
drop policy if exists settlements_select_auth on public.settlements;
create policy settlements_select_auth on public.settlements
  for select to authenticated using (
    owner_id = auth.uid() and deleted_at is null
  );

-- settlements insert policy: no change needed (already restricted to owner)
drop policy if exists settlements_insert_auth on public.settlements;
create policy settlements_insert_auth on public.settlements
  for insert to authenticated with check (
    owner_id = auth.uid()
  );

-- settlements update policy: exclude soft-deleted and only allow open settlements
drop policy if exists settlements_update_auth on public.settlements;
create policy settlements_update_auth on public.settlements
  for update to authenticated using (
    owner_id = auth.uid() and deleted_at is null and status = 'open'
  ) with check (
    owner_id = auth.uid() and deleted_at is null and status = 'open'
  );

-- settlements delete policy: only allow deletion of closed settlements owned by user
drop policy if exists settlements_delete_auth on public.settlements;
create policy settlements_delete_auth on public.settlements
  for delete to authenticated using (
    owner_id = auth.uid() and deleted_at is null and status = 'closed'
  );

-- end of migration
