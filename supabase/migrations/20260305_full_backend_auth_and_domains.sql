-- HestiaLink comprehensive Supabase backend schema
-- Includes authentication profile wiring + ERP domain tables
-- Run in Supabase SQL Editor (project-level)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_user_role') then
    create type public.app_user_role as enum (
      'admin','manager','supervisor','cashier','waiter','barman','chef','butcher','inventory','delivery'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'open','sent','served','closed','voided','pending','confirmed','preparing','ready','delivered','cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('cash','card','qr');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('completed','refunded','partial_refund');
  end if;

  if not exists (select 1 from pg_type where typname = 'table_status') then
    create type public.table_status as enum ('available','occupied','reserved','cleaning','bill_requested','serving');
  end if;

  if not exists (select 1 from pg_type where typname = 'table_shape') then
    create type public.table_shape as enum ('square','round','rectangle','bar');
  end if;

  if not exists (select 1 from pg_type where typname = 'table_type') then
    create type public.table_type as enum ('standard','vip','bar','outdoor','private');
  end if;

  if not exists (select 1 from pg_type where typname = 'reservation_status') then
    create type public.reservation_status as enum ('upcoming','seated','completed','no-show');
  end if;

  if not exists (select 1 from pg_type where typname = 'waitlist_status') then
    create type public.waitlist_status as enum ('waiting','notified');
  end if;

  if not exists (select 1 from pg_type where typname = 'tax_category') then
    create type public.tax_category as enum ('none','vat','to');
  end if;

  if not exists (select 1 from pg_type where typname = 'costing_method') then
    create type public.costing_method as enum ('fifo','avco');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger
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

-- ---------------------------------------------------------------------------
-- Authentication profile table (linked to auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role public.app_user_role not null default 'waiter',
  outlet_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_user_role, 'waiter'::public.app_user_role)
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role;
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- ---------------------------------------------------------------------------
-- Hotels / outlets / zones
-- ---------------------------------------------------------------------------
create table if not exists public.hotels (
  id text primary key,
  name text not null,
  timezone text not null default 'Africa/Nairobi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outlets (
  id text primary key,
  hotel_id text references public.hotels(id) on delete cascade,
  name text not null,
  outlet_type text not null,
  pricing_rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zones (
  id text primary key,
  outlet_id text references public.outlets(id) on delete cascade,
  name text not null,
  zone_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table if not exists public.menu_categories (
  id text primary key,
  name text not null,
  description text,
  icon text,
  color text,
  display_order int not null default 0,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id text primary key,
  category_id text references public.menu_categories(id) on delete set null,
  name text not null,
  sku text,
  description text,
  price numeric not null default 0,
  tax_category public.tax_category not null default 'none',
  prep_time int,
  stations jsonb not null default '[]'::jsonb,
  allergens jsonb not null default '[]'::jsonb,
  modifiers jsonb not null default '[]'::jsonb,
  image_url text,
  video_url text,
  available boolean not null default true,
  archived boolean not null default false,
  sold_by_weight boolean not null default false,
  uom text,
  price_per_kilo numeric,
  primary_ingredient_id text,
  wastage_factor numeric,
  archived_reason text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders & payments
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id text primary key,
  hotel_id text,
  outlet_id text,
  zone_id text,
  location text not null,
  items jsonb not null default '[]'::jsonb,
  status public.order_status not null,
  guest_info jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  staff_id text,
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
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_staff_id on public.orders (staff_id);

create table if not exists public.payments (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  amount numeric not null,
  refunded_amount numeric,
  status public.payment_status not null,
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
-- Tables / reservations / waitlist
-- ---------------------------------------------------------------------------
create table if not exists public.sections (
  id text primary key,
  name text not null,
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_tables (
  id text primary key,
  name text,
  zone text not null,
  section_id text references public.sections(id) on delete set null,
  status public.table_status not null default 'available',
  seats int not null,
  shape public.table_shape,
  table_type public.table_type,
  x numeric not null,
  y numeric not null,
  w numeric,
  h numeric,
  server text,
  occupied_at bigint,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id text primary key,
  name text not null,
  party int not null,
  time text not null,
  table_id text references public.restaurant_tables(id) on delete set null,
  status public.reservation_status not null default 'upcoming',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waitlist (
  id text primary key,
  name text not null,
  party int not null,
  quoted text not null,
  status public.waitlist_status not null default 'waiting',
  added_at bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Inventory / purchasing / recipes / discounts / CRM / shifts / accounting
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id text primary key,
  code text,
  name text not null,
  category text,
  item_type text,
  unit text,
  costing_method public.costing_method default 'fifo',
  reorder_point numeric,
  reorder_qty numeric,
  min_stock numeric,
  barcode text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_stock_levels (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id text not null references public.inventory_items(id) on delete cascade,
  location text not null,
  qty_on_hand numeric not null default 0,
  qty_committed numeric not null default 0,
  qty_available numeric not null default 0,
  last_movement_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inventory_item_id, location)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id text not null references public.inventory_items(id) on delete cascade,
  movement_type text not null,
  warehouse text,
  quantity numeric not null,
  unit_cost numeric,
  reference text,
  lot_batch text,
  expiry_date date,
  performed_by text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id text primary key,
  name text not null,
  contact_name text,
  email text,
  phone text,
  payment_terms text,
  lead_time_days int,
  tax_id text,
  rating numeric,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_requisitions (
  id text primary key,
  requester text,
  department text,
  required_by date,
  status text not null,
  lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id text primary key,
  requisition_id text references public.purchase_requisitions(id) on delete set null,
  vendor_id text references public.vendors(id) on delete set null,
  status text not null,
  expected_delivery_date date,
  delivery_location text,
  payment_terms text,
  lines jsonb not null default '[]'::jsonb,
  subtotal numeric,
  tax numeric,
  total numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goods_receipts (
  id text primary key,
  purchase_order_id text references public.purchase_orders(id) on delete set null,
  lines jsonb not null default '[]'::jsonb,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_bills (
  id text primary key,
  vendor_id text references public.vendors(id) on delete set null,
  purchase_order_id text references public.purchase_orders(id) on delete set null,
  goods_receipt_id text references public.goods_receipts(id) on delete set null,
  status text not null,
  total_amount numeric,
  paid_amount numeric,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id text primary key,
  name text not null,
  menu_item_id text references public.menu_items(id) on delete set null,
  ingredients jsonb not null default '[]'::jsonb,
  instructions text,
  yield_qty numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discounts (
  id text primary key,
  code text unique,
  name text not null,
  discount_type text not null,
  value numeric not null,
  scope text not null,
  min_order_value numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit int,
  usage_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  name text,
  phone text,
  email text,
  date_of_birth date,
  preferred_language text,
  visit_count int not null default 0,
  total_spend numeric not null default 0,
  loyalty_points int not null default 0,
  loyalty_tier text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id text primary key,
  staff_id text,
  role text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  branch text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_accounts (
  id text primary key,
  code text unique,
  name text not null,
  account_type text not null,
  currency text,
  opening_balance numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_journal_entries (
  id text primary key,
  entry_date date not null,
  reference text,
  memo text,
  source_type text,
  source_id text,
  posted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id text not null references public.accounting_journal_entries(id) on delete cascade,
  account_id text references public.accounting_accounts(id) on delete set null,
  debit numeric not null default 0,
  credit numeric not null default 0,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Generic full-state sync table (kept for current app integration)
-- ---------------------------------------------------------------------------
create table if not exists public.app_state (
  store_name text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_app_state_updated_at on public.app_state;
create trigger trg_app_state_updated_at
before update on public.app_state
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_hotels_updated_at on public.hotels;
create trigger trg_hotels_updated_at before update on public.hotels for each row execute function public.touch_updated_at();

drop trigger if exists trg_outlets_updated_at on public.outlets;
create trigger trg_outlets_updated_at before update on public.outlets for each row execute function public.touch_updated_at();

drop trigger if exists trg_zones_updated_at on public.zones;
create trigger trg_zones_updated_at before update on public.zones for each row execute function public.touch_updated_at();

drop trigger if exists trg_menu_categories_updated_at on public.menu_categories;
create trigger trg_menu_categories_updated_at before update on public.menu_categories for each row execute function public.touch_updated_at();

drop trigger if exists trg_menu_items_updated_at on public.menu_items;
create trigger trg_menu_items_updated_at before update on public.menu_items for each row execute function public.touch_updated_at();

drop trigger if exists trg_sections_updated_at on public.sections;
create trigger trg_sections_updated_at before update on public.sections for each row execute function public.touch_updated_at();

drop trigger if exists trg_restaurant_tables_updated_at on public.restaurant_tables;
create trigger trg_restaurant_tables_updated_at before update on public.restaurant_tables for each row execute function public.touch_updated_at();

drop trigger if exists trg_reservations_updated_at on public.reservations;
create trigger trg_reservations_updated_at before update on public.reservations for each row execute function public.touch_updated_at();

drop trigger if exists trg_waitlist_updated_at on public.waitlist;
create trigger trg_waitlist_updated_at before update on public.waitlist for each row execute function public.touch_updated_at();

drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
create trigger trg_inventory_items_updated_at before update on public.inventory_items for each row execute function public.touch_updated_at();

drop trigger if exists trg_inventory_stock_levels_updated_at on public.inventory_stock_levels;
create trigger trg_inventory_stock_levels_updated_at before update on public.inventory_stock_levels for each row execute function public.touch_updated_at();

drop trigger if exists trg_vendors_updated_at on public.vendors;
create trigger trg_vendors_updated_at before update on public.vendors for each row execute function public.touch_updated_at();

drop trigger if exists trg_purchase_requisitions_updated_at on public.purchase_requisitions;
create trigger trg_purchase_requisitions_updated_at before update on public.purchase_requisitions for each row execute function public.touch_updated_at();

drop trigger if exists trg_purchase_orders_updated_at on public.purchase_orders;
create trigger trg_purchase_orders_updated_at before update on public.purchase_orders for each row execute function public.touch_updated_at();

drop trigger if exists trg_goods_receipts_updated_at on public.goods_receipts;
create trigger trg_goods_receipts_updated_at before update on public.goods_receipts for each row execute function public.touch_updated_at();

drop trigger if exists trg_vendor_bills_updated_at on public.vendor_bills;
create trigger trg_vendor_bills_updated_at before update on public.vendor_bills for each row execute function public.touch_updated_at();

drop trigger if exists trg_recipes_updated_at on public.recipes;
create trigger trg_recipes_updated_at before update on public.recipes for each row execute function public.touch_updated_at();

drop trigger if exists trg_discounts_updated_at on public.discounts;
create trigger trg_discounts_updated_at before update on public.discounts for each row execute function public.touch_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before update on public.customers for each row execute function public.touch_updated_at();

drop trigger if exists trg_shifts_updated_at on public.shifts;
create trigger trg_shifts_updated_at before update on public.shifts for each row execute function public.touch_updated_at();

drop trigger if exists trg_accounting_accounts_updated_at on public.accounting_accounts;
create trigger trg_accounting_accounts_updated_at before update on public.accounting_accounts for each row execute function public.touch_updated_at();

drop trigger if exists trg_accounting_journal_entries_updated_at on public.accounting_journal_entries;
create trigger trg_accounting_journal_entries_updated_at before update on public.accounting_journal_entries for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS + permissive development policies
-- NOTE: tighten these for production by tenant and role.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'profiles','hotels','outlets','zones','menu_categories','menu_items','orders','payments',
    'sections','restaurant_tables','reservations','waitlist','inventory_items','inventory_stock_levels',
    'inventory_movements','vendors','purchase_requisitions','purchase_orders','goods_receipts','vendor_bills',
    'recipes','discounts','customers','shifts','accounting_accounts','accounting_journal_entries',
    'accounting_journal_lines','app_state'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I_select_all on public.%I', t || '_pol', t);
    execute format('drop policy if exists %I_insert_all on public.%I', t || '_pol', t);
    execute format('drop policy if exists %I_update_all on public.%I', t || '_pol', t);
    execute format('drop policy if exists %I_delete_all on public.%I', t || '_pol', t);

    execute format('create policy %I_select_all on public.%I for select using (true)', t || '_pol', t);
    execute format('create policy %I_insert_all on public.%I for insert with check (true)', t || '_pol', t);
    execute format('create policy %I_update_all on public.%I for update using (true) with check (true)', t || '_pol', t);
    execute format('create policy %I_delete_all on public.%I for delete using (true)', t || '_pol', t);
  end loop;
end
$$;
