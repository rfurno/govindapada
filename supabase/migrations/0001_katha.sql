-- Kathā library. Apply in the Supabase SQL editor once the project is linked.
-- RLS is on with no policies. The Next server and katha-loop use the secret key.

create type piece_mode as enum ('story', 'poem', 'haiku');
create type piece_kind as enum ('misturada', 'F', 'N', 'M', 'V');
create type piece_size as enum ('curta', 'media', 'longa');
create type request_status as enum ('pending', 'running', 'done', 'error');

create table pieces (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null,
  mode piece_mode not null,
  kind piece_kind not null,
  size piece_size,
  word_ids text[] not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index pieces_cache_key_idx on pieces (cache_key, created_at desc);

create table requests (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null,
  mode piece_mode not null,
  kind piece_kind not null,
  size piece_size,
  word_ids text[] not null,
  status request_status not null default 'pending',
  piece_id uuid references pieces (id),
  error text,
  attempts integer not null default 0,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index requests_status_idx on requests (status, created_at);

alter table pieces enable row level security;
alter table requests enable row level security;
