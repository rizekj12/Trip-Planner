-- Food spots shared across trips (server/foodSpotCache.js). A city's first batch of food spots
-- depends only on the country, city and the traveler's dietary needs, so the server reuses a
-- list made in the last 30 days instead of asking Claude again. Holds the place list and the
-- dietary categories it was made for ("" or e.g. "gluten-free,vegan"), never who asked.
create table if not exists public.food_spot_cache (
  country text not null,
  city text not null,
  dietary text not null default '',
  spots jsonb not null,
  created_at timestamptz not null default now(),
  primary key (country, city, dietary)
);

-- No policies: only the server (service role) reads and writes it
alter table public.food_spot_cache enable row level security;
revoke all on table public.food_spot_cache from anon, authenticated;
