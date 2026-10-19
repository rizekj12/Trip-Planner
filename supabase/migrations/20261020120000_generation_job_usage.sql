-- What generating each trip cost (issue #47): token usage of every Claude call in the job
-- (itinerary, food spots, events) with an estimated US$ total, written by the server
-- (server/generationJobs.js). For example, average cost per trip this month:
--   select avg((usage->>'estimated_usd')::numeric) from generation_jobs
--   where usage is not null and started_at > date_trunc('month', now());
alter table public.generation_jobs add column if not exists usage jsonb;
