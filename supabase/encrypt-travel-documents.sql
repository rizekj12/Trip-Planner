-- Encrypted travel document numbers (issue #56).
-- Run once in Supabase → SQL Editor → New query → paste → Run, after deploying the app version
-- that reads documents through the server (/api/documents). Safe to run again.
--
-- Document numbers are now encrypted by the server (server/documentCrypto.js) with a key that
-- only the server has, and the browser reads and writes documents only through the server:
--   - number          (plain text) → removed
--   - number_encrypted              → "v<key version>:<iv>:<tag>:<ciphertext>"
--   - number_last4                  → last 4 characters, for "•••• 1234" in the list
-- and the table gets row-level security with no policies, like member_reservations.

alter table public.travel_documents
  add column if not exists number_encrypted text,
  add column if not exists number_last4 text check (char_length(number_last4) <= 4);

-- Refuse to drop plain-text numbers that haven't been moved yet (there were none when this
-- shipped, as documents were brand new)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'travel_documents' and column_name = 'number'
  ) then
    if exists (select 1 from public.travel_documents where number is not null) then
      raise exception 'travel_documents has plain-text numbers; re-save them through the app (or ask for a migration script) before running this';
    end if;
    alter table public.travel_documents drop column number;
  end if;
end $$;

-- Only the server (service role) reads and writes documents now
drop policy if exists "Users manage their travel documents" on public.travel_documents;
alter table public.travel_documents enable row level security;
revoke all on public.travel_documents from anon, authenticated;
