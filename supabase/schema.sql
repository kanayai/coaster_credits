-- Coaster Credits schema for Supabase/Postgres
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists app_users (
  id text primary key,
  owner_id text not null,
  name text not null,
  avatar_color text not null,
  avatar_url text,
  rankings jsonb,
  high_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coasters (
  id text primary key,
  name text not null,
  park text not null,
  country text not null,
  type text not null,
  manufacturer text not null,
  image_url text,
  is_custom boolean not null default false,
  specs jsonb,
  variants text[],
  audio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credits (
  id text primary key,
  owner_id text not null,
  user_id text not null references app_users(id) on delete cascade,
  coaster_id text not null references coasters(id) on delete restrict,
  date date not null,
  ride_count integer not null default 1,
  photo_url text,
  gallery text[],
  notes text,
  restraints text,
  variant text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credits_ride_count_positive check (ride_count > 0)
);

create table if not exists wishlist (
  id text primary key,
  owner_id text not null,
  user_id text not null references app_users(id) on delete cascade,
  coaster_id text not null references coasters(id) on delete restrict,
  added_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishlist_unique_per_user unique (owner_id, user_id, coaster_id)
);

create index if not exists idx_app_users_owner_id on app_users(owner_id);
create index if not exists idx_credits_owner_id on credits(owner_id);
create index if not exists idx_credits_owner_user on credits(owner_id, user_id);
create index if not exists idx_wishlist_owner_id on wishlist(owner_id);
create index if not exists idx_wishlist_owner_user on wishlist(owner_id, user_id);
create index if not exists idx_coasters_is_custom on coasters(is_custom);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_users_updated_at on app_users;
create trigger trg_app_users_updated_at
before update on app_users
for each row execute function set_updated_at();

drop trigger if exists trg_coasters_updated_at on coasters;
create trigger trg_coasters_updated_at
before update on coasters
for each row execute function set_updated_at();

drop trigger if exists trg_credits_updated_at on credits;
create trigger trg_credits_updated_at
before update on credits
for each row execute function set_updated_at();

drop trigger if exists trg_wishlist_updated_at on wishlist;
create trigger trg_wishlist_updated_at
before update on wishlist
for each row execute function set_updated_at();

alter table app_users enable row level security;
alter table coasters enable row level security;
alter table credits enable row level security;
alter table wishlist enable row level security;

-- Owner-scoped access. Requires Supabase Auth user id to match owner_id.
drop policy if exists app_users_owner_select on app_users;
create policy app_users_owner_select on app_users for select using (auth.uid()::text = owner_id);
drop policy if exists app_users_owner_insert on app_users;
create policy app_users_owner_insert on app_users for insert with check (auth.uid()::text = owner_id);
drop policy if exists app_users_owner_update on app_users;
create policy app_users_owner_update on app_users for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);
drop policy if exists app_users_owner_delete on app_users;
create policy app_users_owner_delete on app_users for delete using (auth.uid()::text = owner_id);

-- Coasters are globally readable. Writes require auth; tighten later if needed.
drop policy if exists coasters_public_read on coasters;
create policy coasters_public_read on coasters for select using (true);
drop policy if exists coasters_auth_write on coasters;
create policy coasters_auth_write on coasters for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists credits_owner_select on credits;
create policy credits_owner_select on credits for select using (auth.uid()::text = owner_id);
drop policy if exists credits_owner_insert on credits;
create policy credits_owner_insert on credits for insert with check (auth.uid()::text = owner_id);
drop policy if exists credits_owner_update on credits;
create policy credits_owner_update on credits for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);
drop policy if exists credits_owner_delete on credits;
create policy credits_owner_delete on credits for delete using (auth.uid()::text = owner_id);

drop policy if exists wishlist_owner_select on wishlist;
create policy wishlist_owner_select on wishlist for select using (auth.uid()::text = owner_id);
drop policy if exists wishlist_owner_insert on wishlist;
create policy wishlist_owner_insert on wishlist for insert with check (auth.uid()::text = owner_id);
drop policy if exists wishlist_owner_update on wishlist;
create policy wishlist_owner_update on wishlist for update using (auth.uid()::text = owner_id) with check (auth.uid()::text = owner_id);
drop policy if exists wishlist_owner_delete on wishlist;
create policy wishlist_owner_delete on wishlist for delete using (auth.uid()::text = owner_id);
