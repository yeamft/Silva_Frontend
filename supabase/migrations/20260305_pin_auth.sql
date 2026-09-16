-- PIN-only authentication support

create table if not exists public.user_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_pins_pin_format check (
    char_length(pin_code) = 4
    and translate(pin_code, '0123456789', '') = ''
  )
);

drop trigger if exists trg_user_pins_updated_at on public.user_pins;
create trigger trg_user_pins_updated_at
before update on public.user_pins
for each row execute function public.touch_updated_at();

alter table public.user_pins enable row level security;

drop policy if exists user_pins_pol_select_all on public.user_pins;
drop policy if exists user_pins_pol_insert_all on public.user_pins;
drop policy if exists user_pins_pol_update_all on public.user_pins;
drop policy if exists user_pins_pol_delete_all on public.user_pins;

-- Keep closed from direct client access; only service role / functions should touch this table.
create policy user_pins_pol_select_all on public.user_pins for select using (false);
create policy user_pins_pol_insert_all on public.user_pins for insert with check (false);
create policy user_pins_pol_update_all on public.user_pins for update using (false) with check (false);
create policy user_pins_pol_delete_all on public.user_pins for delete using (false);

create or replace function public.authenticate_pin(p_pin text)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role public.app_user_role,
  outlet_id text,
  active boolean
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.email, p.full_name, p.role, p.outlet_id, p.active
  from public.user_pins up
  join public.profiles p on p.id = up.user_id
  where up.pin_code = p_pin
    and p.active = true
  limit 1;
$$;

grant execute on function public.authenticate_pin(text) to anon, authenticated;
