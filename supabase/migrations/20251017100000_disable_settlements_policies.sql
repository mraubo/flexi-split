--
-- migration: disable settlements policies
-- purpose: drop all RLS policies from settlements table to temporarily disable
--   access controls for development/testing purposes
-- affected objects:
--   policies: settlements RLS policies
-- special considerations:
--   - this disables the soft delete policies created in previous migration
--   - policies should be re-enabled in a future migration
--

--=========================
-- drop settlements rls policies
--=========================

drop policy if exists settlements_select_auth on public.settlements;
drop policy if exists settlements_insert_auth on public.settlements;
drop policy if exists settlements_update_auth on public.settlements;
drop policy if exists settlements_delete_auth on public.settlements;

-- end of migration
