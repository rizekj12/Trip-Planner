-- Photos and PDFs attached to travel documents (issue #55).
-- Run once in Supabase → SQL Editor → New query → paste → Run, after
-- encrypt-travel-documents.sql. Safe to run again.
--
-- One file per document. The server strips photo metadata, encrypts the file with the same
-- key as document numbers (server/documentCrypto.js) and stores it in a PRIVATE bucket that
-- has no access policies, so browsers can't list, read or write it directly; owners view their
-- files only through the server (GET /api/documents/:id/attachment).

alter table public.travel_documents
  add column if not exists attachment_path text,             -- "<user id>/<document id>" in the bucket
  add column if not exists attachment_type text check (attachment_type in ('image/jpeg', 'image/png', 'application/pdf')),
  add column if not exists attachment_name text check (char_length(attachment_name) <= 100),
  add column if not exists attachment_size int check (attachment_size between 0 and 10485760),
  add column if not exists attachment_uploaded_at timestamptz;

-- Private bucket. Files are stored encrypted (application/octet-stream), up to 10 MB plus a
-- little for the encryption header. No storage.objects policies: only the service role can
-- touch it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('travel-documents', 'travel-documents', false, 10486000, array['application/octet-stream'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
