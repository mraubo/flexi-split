--
-- migration: relax participant nickname validation
-- purpose: allow more flexible nicknames including uppercase, polish characters, spaces, and special characters
-- affected objects:
--   tables: participants (CHECK constraint modification)
-- special considerations:
--   - removes strict lowercase-only requirement
--   - allows letters (a-z, A-Z), polish characters (ąćęłńóśźżĄĆĘŁŃÓŚŹŻ)
--   - allows numbers (0-9)
--   - allows spaces and common email/special characters (._+-!#$%&'*/=?^`{|}~@)
--   - nickname_norm column still ensures case-insensitive uniqueness
--   - min length: 2 characters (after trim in application layer)
--   - max length: 30 characters
-- date: 2025-11-14
--

--=========================
-- drop old CHECK constraint and create new one
--=========================

-- Drop the existing constraint that only allowed lowercase letters, numbers, underscores and hyphens
alter table public.participants
  drop constraint if exists participants_nickname_check;

-- Add new relaxed constraint allowing:
-- - Letters: a-z, A-Z
-- - Polish characters: ąćęłńóśźżĄĆĘŁŃÓŚŹŻ
-- - Numbers: 0-9
-- - Spaces (literal space character only, not newlines/tabs)
-- - Special characters commonly used in emails: . _ + - ! # $ % & ' * / = ? ^ ` { | } ~ @
alter table public.participants
  add constraint participants_nickname_check 
  check (nickname ~ '^[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ._+\-!#$%&''*/=?^`{|}~@]+$');

-- The nickname_norm column (generated as lower(nickname)) ensures case-insensitive uniqueness
-- No changes needed to nickname_norm - it continues to work as before

-- end of migration
