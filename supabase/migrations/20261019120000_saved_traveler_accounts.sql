-- Saved travelers linked to accounts (issue #57).
--
-- When the organizer saves someone from a trip's Travel Crew list, the server records which
-- account they are (linked_user_id), so the Saved travelers list can follow their current
-- name and photo and count trips together even if their email changes.
--
-- Only the server sets the link: the browser keeps insert/update on the other columns only.
-- (The server also ignores a link unless the two people really share a trip, so a forged one
-- couldn't reveal anything; this keeps it from being forged at all.)

alter table public.saved_travelers
  add column if not exists linked_user_id uuid references auth.users(id) on delete set null;

create index if not exists saved_travelers_linked_user_idx on public.saved_travelers (linked_user_id)
  where linked_user_id is not null;

revoke insert, update on table public.saved_travelers from anon, authenticated;
grant insert (owner_id, name, email, relation) on table public.saved_travelers to authenticated;
grant update (owner_id, name, email, relation) on table public.saved_travelers to authenticated;
