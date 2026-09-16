-- Seed / assign first admin PIN in one step
-- Usage:
-- 1) Replace email + PIN below
-- 2) (Optional) if email lookup fails, set v_user_id_override manually from auth.users.id
-- 3) Run in Supabase SQL Editor after running 20260305_full_backend_auth_and_domains.sql and 20260305_pin_auth.sql

do $$
declare
  v_email text := 'admin@hestia.com';
  v_pin text := '1234';
  v_user_id_override uuid := null;
  v_user_id uuid;
begin
  if v_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;

  if v_user_id_override is not null then
    v_user_id := v_user_id_override;
  else
    select id into v_user_id
    from auth.users
    where lower(email) = lower(v_email)
    limit 1;

    -- fallback to profiles lookup if auth.users email is not what you expect
    if v_user_id is null then
      select id into v_user_id
      from public.profiles
      where lower(email) = lower(v_email)
      limit 1;
    end if;
  end if;

  if v_user_id is null then
    raise exception E'No auth/profile user found for email: %\nCreate user first in Supabase Authentication > Users, or set v_user_id_override.\nHelpful query: select id, email from auth.users order by created_at desc;', v_email;
  end if;

  update public.profiles
  set role = 'admin', active = true
  where id = v_user_id;

  if not found then
    raise exception 'No profile found for auth user id: %', v_user_id;
  end if;

  insert into public.user_pins (user_id, pin_code)
  values (v_user_id, v_pin)
  on conflict (user_id)
  do update set pin_code = excluded.pin_code, updated_at = now();
end $$;
