--
-- migration: init flexisplit schema (mvp)
-- purpose:
--   create core tables, indexes, row-level security (rls) policies,
--   triggers, and the finalize_settlement function per the db plan.
-- affected objects:
--   tables: settlements, participants, expenses, expense_participants,
--           settlement_snapshots, events
--   functions: finalize_settlement, various trigger helpers
--   triggers: audit timestamps/editor, guards, counters, constraints
-- special considerations:
--   - all monetary values are stored in cents (bigint)
--   - all tables have rls enabled and policies defined per role/action
--   - constraint triggers are deferrable to support multi-step txns
--   - uses gen_random_uuid() from pgcrypto
--

-- ensure required extensions
create extension if not exists pgcrypto;

--=========================
-- tables
--=========================

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  title varchar(100) not null,
  status text not null default 'open' check (status in ('open','closed')),
  currency char(3) not null default 'PLN',
  participants_count int not null default 0 check (participants_count >= 0),
  expenses_count int not null default 0 check (expenses_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz null,
  last_edited_by uuid null references auth.users(id)
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  nickname varchar(30) not null check (nickname ~ '^[a-z0-9_-]+$'),
  nickname_norm text generated always as (lower(nickname)) stored,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_edited_by uuid null references auth.users(id)
);

-- composite uniqueness to support fks and invariants
create unique index if not exists participants_unique_norm_per_settlement
  on public.participants (settlement_id, nickname_norm);

create unique index if not exists participants_unique_owner_per_settlement
  on public.participants (settlement_id)
  where is_owner = true;

create unique index if not exists participants_unique_composite_fk_support
  on public.participants (settlement_id, id);

create index if not exists participants_settlement_created_at_idx
  on public.participants (settlement_id, created_at);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  payer_participant_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  expense_date date not null,
  description varchar(140),
  share_count int not null default 0 check (share_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_edited_by uuid null references auth.users(id),
  -- ensure payer belongs to same settlement via composite fk
  constraint expenses_payer_consistency
    foreign key (settlement_id, payer_participant_id)
    references public.participants (settlement_id, id)
    on delete restrict
);

create index if not exists expenses_listing_idx
  on public.expenses (settlement_id, expense_date, created_at, id);

create index if not exists expenses_payer_idx on public.expenses (payer_participant_id);
create index if not exists expenses_settlement_payer_idx on public.expenses (settlement_id, payer_participant_id);

-- composite uniqueness to support fk (expense_id, settlement_id) → expenses(id, settlement_id)
create unique index if not exists expenses_unique_id_settlement
  on public.expenses (id, settlement_id);

create table if not exists public.expense_participants (
  expense_id uuid not null,
  participant_id uuid not null,
  settlement_id uuid not null,
  created_at timestamptz not null default now(),
  constraint expense_participants_pk primary key (expense_id, participant_id),
  constraint expense_participants_expense_fk
    foreign key (expense_id, settlement_id)
    references public.expenses (id, settlement_id)
    on delete cascade,
  constraint expense_participants_participant_fk
    foreign key (participant_id, settlement_id)
    references public.participants (id, settlement_id)
    on delete cascade
);

create index if not exists expense_participants_participant_expense_idx
  on public.expense_participants (participant_id, expense_id);

create index if not exists expense_participants_expense_idx
  on public.expense_participants (expense_id);

create index if not exists expense_participants_settlement_participant_idx
  on public.expense_participants (settlement_id, participant_id);

create table if not exists public.settlement_snapshots (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  balances jsonb not null,
  transfers jsonb not null,
  algorithm_version int not null default 1,
  created_at timestamptz not null default now()
);

create unique index if not exists settlement_snapshots_unique_settlement
  on public.settlement_snapshots (settlement_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'settlement_created',
      'participant_added',
      'expense_added',
      'settle_confirmed',
      'settled',
      'summary_copied',
      'new_settlement_started'
    )
  ),
  settlement_id uuid null references public.settlements(id) on delete set null,
  actor_id uuid null references auth.users(id),
  payload jsonb not null check (
    (payload ? 'env') and (payload->>'env') in ('dev','prod')
  ),
  created_at timestamptz not null default now()
);

create index if not exists events_settlement_created_at_idx on public.events (settlement_id, created_at);
create index if not exists events_type_created_at_idx on public.events (event_type, created_at);
create index if not exists events_actor_created_at_idx on public.events (actor_id, created_at);

--=========================
-- audit and guard trigger functions
--=========================

-- set updated_at and last_edited_by on update (for tables that have last_edited_by)
create or replace function public.tg_set_updated_at_and_editor()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.last_edited_by := auth.uid();
  return new;
end;
$$;

-- settlements: block owner change + set audit fields
create or replace function public.tg_settlements_before_update()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed after insert';
  end if;
  new.updated_at := now();
  new.last_edited_by := auth.uid();
  return new;
end;
$$;

-- guard: reject dml on child tables when parent settlement is closed
create or replace function public.tg_require_open_settlement_for_participants()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_sid uuid := coalesce(new.settlement_id, old.settlement_id);
begin
  select s.status into v_status from public.settlements s where s.id = v_sid;
  if v_status is distinct from 'open' then
    raise exception 'modifications are allowed only when settlement is open';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.tg_require_open_settlement_for_expenses()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_sid uuid := coalesce(new.settlement_id, old.settlement_id);
begin
  select s.status into v_status from public.settlements s where s.id = v_sid;
  if v_status is distinct from 'open' then
    raise exception 'modifications are allowed only when settlement is open';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.tg_require_open_settlement_for_expense_participants()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_sid uuid := coalesce(new.settlement_id, old.settlement_id);
begin
  select s.status into v_status from public.settlements s where s.id = v_sid;
  if v_status is distinct from 'open' then
    raise exception 'modifications are allowed only when settlement is open';
  end if;
  return coalesce(new, old);
end;
$$;

-- counters: recompute participants_count
create or replace function public.refresh_participants_count(p_settlement_id uuid)
returns void
language plpgsql
as $$
begin
  update public.settlements s
    set participants_count = (
      select count(*)::int from public.participants p where p.settlement_id = p_settlement_id
    )
  where s.id = p_settlement_id;
end;
$$;

-- counters: recompute expenses_count
create or replace function public.refresh_expenses_count(p_settlement_id uuid)
returns void
language plpgsql
as $$
begin
  update public.settlements s
    set expenses_count = (
      select count(*)::int from public.expenses e where e.settlement_id = p_settlement_id
    )
  where s.id = p_settlement_id;
end;
$$;

-- share_count maintenance
create or replace function public.refresh_expense_share_count(p_expense_id uuid)
returns void
language plpgsql
as $$
begin
  update public.expenses e
    set share_count = (
      select count(*)::int from public.expense_participants ep where ep.expense_id = p_expense_id
    )
  where e.id = p_expense_id;
end;
$$;

-- trigger wrappers for counters and constraints (required: trigger functions must return trigger)
create or replace function public.tg_participants_refresh_counts()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_participants_count(coalesce(new.settlement_id, old.settlement_id));
  return null; -- after trigger; result ignored
end;
$$;

create or replace function public.tg_expenses_refresh_counts()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_expenses_count(coalesce(new.settlement_id, old.settlement_id));
  return null; -- after trigger; result ignored
end;
$$;

create or replace function public.tg_ep_refresh_share_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_expense_share_count(new.expense_id);
  elsif tg_op = 'DELETE' then
    perform public.refresh_expense_share_count(old.expense_id);
  else
    -- update: refresh both old and new if changed
    perform public.refresh_expense_share_count(old.expense_id);
    if new.expense_id is distinct from old.expense_id then
      perform public.refresh_expense_share_count(new.expense_id);
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.tg_assert_expense_has_participants_trg()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.assert_expense_has_participants(new.expense_id);
  elsif tg_op = 'DELETE' then
    perform public.assert_expense_has_participants(old.expense_id);
  else
    perform public.assert_expense_has_participants(old.expense_id);
    if new.expense_id is distinct from old.expense_id then
      perform public.assert_expense_has_participants(new.expense_id);
    end if;
  end if;
  return null;
end;
$$;

create or replace function public.tg_assert_participant_limit_trg()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_participant_limit(coalesce(new.settlement_id, old.settlement_id));
  return null;
end;
$$;

create or replace function public.tg_assert_expense_limit_trg()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_expense_limit(coalesce(new.settlement_id, old.settlement_id));
  return null;
end;
$$;

create or replace function public.tg_assert_open_settlements_limit_trg()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_open_settlements_limit(new.owner_id);
  return null;
end;
$$;

-- constraint: each expense must have at least one participant (deferrable)
create or replace function public.assert_expense_has_participants(p_expense_id uuid)
returns void
language plpgsql
as $$
declare
  v_cnt int;
begin
  select count(*) into v_cnt from public.expense_participants ep where ep.expense_id = p_expense_id;
  if coalesce(v_cnt, 0) < 1 then
    raise exception 'expense % must have at least one participant', p_expense_id;
  end if;
end;
$$;

-- constraint limits: max 10 participants per settlement
create or replace function public.assert_participant_limit(p_settlement_id uuid)
returns void
language plpgsql
as $$
declare v_cnt int;
begin
  select count(*) into v_cnt from public.participants p where p.settlement_id = p_settlement_id;
  if v_cnt > 10 then
    raise exception 'participant limit (10) exceeded for settlement %', p_settlement_id;
  end if;
end;
$$;

-- constraint limits: max 500 expenses per settlement
create or replace function public.assert_expense_limit(p_settlement_id uuid)
returns void
language plpgsql
as $$
declare v_cnt int;
begin
  select count(*) into v_cnt from public.expenses e where e.settlement_id = p_settlement_id;
  if v_cnt > 500 then
    raise exception 'expense limit (500) exceeded for settlement %', p_settlement_id;
  end if;
end;
$$;

-- constraint limits: max 3 open settlements per owner
create or replace function public.assert_open_settlements_limit(p_owner_id uuid)
returns void
language plpgsql
as $$
declare v_cnt int;
begin
  select count(*) into v_cnt from public.settlements s where s.owner_id = p_owner_id and s.status = 'open';
  if v_cnt > 3 then
    raise exception 'open settlements limit (3) exceeded for owner %', p_owner_id;
  end if;
end;
$$;

--=========================
-- triggers wiring
--=========================

-- settlements audit and invariants
drop trigger if exists settlements_before_update on public.settlements;
create trigger settlements_before_update
  before update on public.settlements
  for each row execute function public.tg_settlements_before_update();

-- participants audit + guards
drop trigger if exists participants_before_update_audit on public.participants;
create trigger participants_before_update_audit
  before update on public.participants
  for each row execute function public.tg_set_updated_at_and_editor();

drop trigger if exists participants_require_open on public.participants;
create trigger participants_require_open
  before insert or update or delete on public.participants
  for each row execute function public.tg_require_open_settlement_for_participants();

drop trigger if exists participants_after_change_counts on public.participants;
create trigger participants_after_change_counts
  after insert or delete on public.participants
  for each row execute function public.tg_participants_refresh_counts();

-- expenses audit + guards
drop trigger if exists expenses_before_update_audit on public.expenses;
create trigger expenses_before_update_audit
  before update on public.expenses
  for each row execute function public.tg_set_updated_at_and_editor();

drop trigger if exists expenses_require_open on public.expenses;
create trigger expenses_require_open
  before insert or update or delete on public.expenses
  for each row execute function public.tg_require_open_settlement_for_expenses();

drop trigger if exists expenses_after_change_counts on public.expenses;
create trigger expenses_after_change_counts
  after insert or delete on public.expenses
  for each row execute function public.tg_expenses_refresh_counts();

-- expense_participants guards + share_count maintenance
drop trigger if exists expense_participants_require_open on public.expense_participants;
create trigger expense_participants_require_open
  before insert or update or delete on public.expense_participants
  for each row execute function public.tg_require_open_settlement_for_expense_participants();

drop trigger if exists expense_participants_after_change_recalc on public.expense_participants;
create trigger expense_participants_after_change_recalc
  after insert or delete or update of expense_id on public.expense_participants
  for each row execute function public.tg_ep_refresh_share_count();

-- deferrable constraint triggers
drop trigger if exists expense_participants_min_one_constraint on public.expense_participants;
create constraint trigger expense_participants_min_one_constraint
  after insert or delete or update of expense_id on public.expense_participants
  deferrable initially deferred
  for each row execute function public.tg_assert_expense_has_participants_trg();

drop trigger if exists participants_limit_constraint on public.participants;
create constraint trigger participants_limit_constraint
  after insert or delete on public.participants
  deferrable initially deferred
  for each row execute function public.tg_assert_participant_limit_trg();

drop trigger if exists expenses_limit_constraint on public.expenses;
create constraint trigger expenses_limit_constraint
  after insert or delete on public.expenses
  deferrable initially deferred
  for each row execute function public.tg_assert_expense_limit_trg();

drop trigger if exists open_settlements_limit_constraint on public.settlements;
create constraint trigger open_settlements_limit_constraint
  after insert or update of status on public.settlements
  deferrable initially deferred
  for each row execute function public.tg_assert_open_settlements_limit_trg();

--=========================
-- rls (row level security) policies
--=========================

alter table public.settlements enable row level security;
alter table public.participants enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.settlement_snapshots enable row level security;
alter table public.events enable row level security;

-- settlements
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

drop policy if exists settlements_select_auth on public.settlements;
create policy settlements_select_auth on public.settlements
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists settlements_insert_auth on public.settlements;
create policy settlements_insert_auth on public.settlements
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists settlements_update_auth on public.settlements;
create policy settlements_update_auth on public.settlements
  for update to authenticated using (owner_id = auth.uid() and status = 'open')
  with check (owner_id = auth.uid() and status = 'open');

drop policy if exists settlements_delete_auth on public.settlements;
create policy settlements_delete_auth on public.settlements
  for delete to authenticated using (owner_id = auth.uid() and status = 'closed');

-- participants
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

drop policy if exists participants_select_auth on public.participants;
create policy participants_select_auth on public.participants
  for select to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = participants.settlement_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists participants_insert_auth on public.participants;
create policy participants_insert_auth on public.participants
  for insert to authenticated with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  );

drop policy if exists participants_update_auth on public.participants;
create policy participants_update_auth on public.participants
  for update to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = participants.settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  ) with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  );

drop policy if exists participants_delete_auth on public.participants;
create policy participants_delete_auth on public.participants
  for delete to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = participants.settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  );

-- expenses
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

drop policy if exists expenses_select_auth on public.expenses;
create policy expenses_select_auth on public.expenses
  for select to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expenses.settlement_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists expenses_insert_auth on public.expenses;
create policy expenses_insert_auth on public.expenses
  for insert to authenticated with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  );

drop policy if exists expenses_update_auth on public.expenses;
create policy expenses_update_auth on public.expenses
  for update to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expenses.settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  ) with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  );

drop policy if exists expenses_delete_auth on public.expenses;
create policy expenses_delete_auth on public.expenses
  for delete to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expenses.settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  );

-- expense_participants
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

drop policy if exists expense_participants_select_auth on public.expense_participants;
create policy expense_participants_select_auth on public.expense_participants
  for select to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expense_participants.settlement_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists expense_participants_insert_auth on public.expense_participants;
create policy expense_participants_insert_auth on public.expense_participants
  for insert to authenticated with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  );

drop policy if exists expense_participants_update_auth on public.expense_participants;
create policy expense_participants_update_auth on public.expense_participants
  for update to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expense_participants.settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  ) with check (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  );

drop policy if exists expense_participants_delete_auth on public.expense_participants;
create policy expense_participants_delete_auth on public.expense_participants
  for delete to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = expense_participants.settlement_id and s.owner_id = auth.uid() and s.status = 'open'
    )
  );

-- settlement_snapshots
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

drop policy if exists settlement_snapshots_select_auth on public.settlement_snapshots;
create policy settlement_snapshots_select_auth on public.settlement_snapshots
  for select to authenticated using (
    exists (
      select 1 from public.settlements s
      where s.id = settlement_snapshots.settlement_id and s.owner_id = auth.uid()
    )
  );

-- prevent direct writes by app users; writes occur via finalize_settlement() only (security definer)
drop policy if exists settlement_snapshots_insert_auth on public.settlement_snapshots;
create policy settlement_snapshots_insert_auth on public.settlement_snapshots
  for insert to authenticated with check (false);

drop policy if exists settlement_snapshots_update_auth on public.settlement_snapshots;
create policy settlement_snapshots_update_auth on public.settlement_snapshots
  for update to authenticated using (false) with check (false);

drop policy if exists settlement_snapshots_delete_auth on public.settlement_snapshots;
create policy settlement_snapshots_delete_auth on public.settlement_snapshots
  for delete to authenticated using (false);

-- events
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

drop policy if exists events_select_auth on public.events;
create policy events_select_auth on public.events
  for select to authenticated using (
    (
      settlement_id is not null and exists (
        select 1 from public.settlements s
        where s.id = events.settlement_id and s.owner_id = auth.uid()
      )
    ) or (
      settlement_id is null and actor_id = auth.uid()
    )
  );

drop policy if exists events_insert_auth on public.events;
create policy events_insert_auth on public.events
  for insert to authenticated with check (
    actor_id = auth.uid() and (payload ? 'env') and (payload->>'env') in ('dev','prod')
  );

drop policy if exists events_update_auth on public.events;
create policy events_update_auth on public.events
  for update to authenticated using (false) with check (false);

drop policy if exists events_delete_auth on public.events;
create policy events_delete_auth on public.events
  for delete to authenticated using (false);

--=========================
-- finalize_settlement function
--=========================

-- this function closes a settlement, computes participant balances and
-- generates a minimal set of transfers using a simple greedy algorithm.
-- security: runs as definer to bypass rls when inserting the snapshot.
-- it validates that the invoker owns the settlement and that it is open.

create or replace function public.finalize_settlement(p_settlement_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
  v_status text;
  v_now timestamptz := now();
  v_algo int := 1;
  v_snapshot_id uuid;
  v_balances jsonb;
  v_transfers jsonb := '[]'::jsonb;
begin
  -- lock the settlement row and verify ownership and status
  select s.owner_id, s.status
    into v_owner, v_status
  from public.settlements s
  where s.id = p_settlement_id
  for update;

  if v_owner is null then
    raise exception 'settlement % not found', p_settlement_id;
  end if;
  if v_owner is distinct from auth.uid() then
    raise exception 'only the owner can finalize this settlement';
  end if;
  if v_status is distinct from 'open' then
    raise exception 'settlement is already closed';
  end if;

  -- ensure there is at least one participant
  if not exists (select 1 from public.participants p where p.settlement_id = p_settlement_id) then
    raise exception 'cannot finalize without participants';
  end if;

  -- balances: compute per participant (paid - owed), with remainder assigned to payer
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
  ), agg as (
    select p.id as participant_id,
           coalesce(pa.paid, 0)::bigint - coalesce(ow.owed, 0)::bigint as balance
    from public.participants p
    left join paid pa on pa.participant_id = p.id
    left join owed ow on ow.participant_id = p.id
    where p.settlement_id = p_settlement_id
  )
  select jsonb_object_agg(agg.participant_id::text, agg.balance) into v_balances from agg;

  -- compute transfers using a greedy netting algorithm
  create temporary table _tmp_balances (
    participant_id uuid primary key,
    balance bigint not null
  ) on commit drop;

  insert into _tmp_balances(participant_id, balance)
  select (key)::uuid, (value)::bigint from jsonb_each(v_balances);

  loop
    -- largest creditor and largest debtor
    -- tie-break on uuid for determinism
    declare
      r_creditor record;
      r_debtor record;
      v_amt bigint;
    begin
      select participant_id, balance
        into r_creditor
      from _tmp_balances
      where balance > 0
      order by balance desc, participant_id asc
      limit 1;

      select participant_id, balance
        into r_debtor
      from _tmp_balances
      where balance < 0
      order by balance asc, participant_id asc
      limit 1;

      exit when r_creditor.participant_id is null or r_debtor.participant_id is null;

      v_amt := least(r_creditor.balance, -r_debtor.balance);

      -- append transfer
      v_transfers := v_transfers || jsonb_build_array(
        jsonb_build_object(
          'from', r_debtor.participant_id,
          'to', r_creditor.participant_id,
          'amount_cents', v_amt
        )
      );

      -- adjust balances
      update _tmp_balances set balance = balance - v_amt where participant_id = r_creditor.participant_id;
      update _tmp_balances set balance = balance + v_amt where participant_id = r_debtor.participant_id;
    end;
  end loop;

  -- write snapshot (bypasses rls due to security definer + table owner)
  insert into public.settlement_snapshots(settlement_id, balances, transfers, algorithm_version, created_at)
  values (p_settlement_id, v_balances, v_transfers, v_algo, v_now)
  returning id into v_snapshot_id;

  -- close the settlement
  update public.settlements s
  set status = 'closed', closed_at = v_now, updated_at = v_now, last_edited_by = auth.uid()
  where s.id = p_settlement_id;

end;
$$;

--=========================
-- supportive indexes on settlements
--=========================

create index if not exists settlements_owner_status_created_desc_idx
  on public.settlements (owner_id, status, created_at desc);

create index if not exists settlements_status_created_idx
  on public.settlements (status, created_at);

-- end of migration


