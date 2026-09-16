-- HestiaLink full app schema for Supabase
-- Run this entire file in Supabase SQL Editor

-- Optional extension for UUID helpers if needed in future
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Generic full-state sync table (all Zustand stores serialized)
-- ---------------------------------------------------------------------------
create table if not exists public.app_state (
  store_name text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Domain tables used directly in app logic (orders + payments)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id text primary key,
  hotel_id text not null,
  outlet_id text not null,
  zone_id text not null,
  location text not null,
  items jsonb not null,
  status text not null,
  guest_info jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  staff_id text not null,
  order_type text,
  table_id text,
  discount numeric,
  service_charge numeric,
  tax numeric,
  grand_total numeric,
  void_reason text,
  voided_by text,
  voided_at timestamptz,
  customer_name text,
  notes text
);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_staff_id on public.orders (staff_id);
create index if not exists idx_orders_status on public.orders (status);

create table if not exists public.payments (
  id text primary key,
  order_id text not null,
  method text not null,
  amount numeric not null,
  refunded_amount numeric,
  status text not null,
  created_at timestamptz not null,
  refund_reason text,
  refunded_at timestamptz,
  refunded_by text,
  processed_by text
);

create index if not exists idx_payments_created_at on public.payments (created_at desc);
create index if not exists idx_payments_order_id on public.payments (order_id);
create index if not exists idx_payments_status on public.payments (status);

-- ---------------------------------------------------------------------------
-- Updated-at trigger for app_state
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated_at on public.app_state;
create trigger trg_app_state_updated_at
before update on public.app_state
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Basic permissive RLS (adjust for production auth later)
-- ---------------------------------------------------------------------------
alter table public.app_state enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;

drop policy if exists app_state_select_all on public.app_state;
drop policy if exists app_state_insert_all on public.app_state;
drop policy if exists app_state_update_all on public.app_state;

create policy app_state_select_all on public.app_state for select using (true);
create policy app_state_insert_all on public.app_state for insert with check (true);
create policy app_state_update_all on public.app_state for update using (true) with check (true);

drop policy if exists orders_select_all on public.orders;
drop policy if exists orders_insert_all on public.orders;
drop policy if exists orders_update_all on public.orders;

create policy orders_select_all on public.orders for select using (true);
create policy orders_insert_all on public.orders for insert with check (true);
create policy orders_update_all on public.orders for update using (true) with check (true);

drop policy if exists payments_select_all on public.payments;
drop policy if exists payments_insert_all on public.payments;
drop policy if exists payments_update_all on public.payments;

create policy payments_select_all on public.payments for select using (true);
create policy payments_insert_all on public.payments for insert with check (true);
create policy payments_update_all on public.payments for update using (true) with check (true);
