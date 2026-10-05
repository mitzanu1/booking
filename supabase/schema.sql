create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  widget_key uuid not null unique default gen_random_uuid(),
  business_name text not null default 'My business'
    check (char_length(btrim(business_name)) between 1 and 80),
  widget_title text not null default 'Book a consultation'
    check (char_length(btrim(widget_title)) between 1 and 80),
  widget_intro text not null default 'Choose a date and time and we’ll save your request.'
    check (char_length(btrim(widget_intro)) between 1 and 180),
  brand_color text not null default '#28453a'
    check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  paid_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.businesses
  add column if not exists widget_key uuid default gen_random_uuid(),
  add column if not exists business_name text not null default 'My business',
  add column if not exists widget_title text not null default 'Book a consultation',
  add column if not exists widget_intro text not null default 'Choose a date and time and we’ll save your request.',
  add column if not exists brand_color text not null default '#28453a',
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '7 days'),
  add column if not exists paid_until timestamptz,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists businesses_widget_key_unique
  on public.businesses (widget_key);

alter table public.businesses enable row level security;

revoke all on public.businesses from anon, authenticated;
grant select (id, widget_key, business_name, widget_title, widget_intro, brand_color, trial_ends_at, paid_until)
  on public.businesses to anon, authenticated;
grant update (business_name, widget_title, widget_intro, brand_color)
  on public.businesses to authenticated;

create or replace function public.is_business_owner(business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses
    where id = business_id
      and owner_id = auth.uid()
  );
$$;

revoke all on function public.is_business_owner(uuid) from public, anon;
grant execute on function public.is_business_owner(uuid) to authenticated;

drop policy if exists "Business owners can view their business" on public.businesses;
create policy "Business owners can view their business"
  on public.businesses for select to authenticated
  using ((select public.is_business_owner(id)));

drop policy if exists "Active businesses can serve their widget" on public.businesses;
create policy "Active businesses can serve their widget"
  on public.businesses for select to anon, authenticated
  using (trial_ends_at > now() or paid_until > now());

drop policy if exists "Paid business owners can customize their widget" on public.businesses;
create policy "Paid business owners can customize their widget"
  on public.businesses for update to authenticated
  using ((select public.is_business_owner(id)) and paid_until > now())
  with check ((select public.is_business_owner(id)) and paid_until > now());

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 100),
  customer_email text not null check (char_length(customer_email) between 3 and 254),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.bookings enable row level security;

revoke all on public.bookings from anon, authenticated;
grant insert on public.bookings to anon, authenticated;
grant select on public.bookings to authenticated;

alter table public.bookings
  drop constraint if exists bookings_unique_start_time;
create unique index if not exists bookings_business_start_unique
  on public.bookings (business_id, starts_at);

drop policy if exists "Anyone can create a booking" on public.bookings;
drop policy if exists "Signed-in providers can view bookings" on public.bookings;
drop policy if exists "Anyone can book an active business" on public.bookings;
create policy "Anyone can book an active business"
  on public.bookings for insert to anon, authenticated
  with check (
    business_id is not null
    and exists (
      select 1
      from public.businesses
      where businesses.id = bookings.business_id
        and (businesses.trial_ends_at > now() or businesses.paid_until > now())
    )
  );

drop policy if exists "Business owners can view their bookings" on public.bookings;
create policy "Business owners can view their bookings"
  on public.bookings for select to authenticated
  using ((select public.is_business_owner(business_id)));

create or replace function public.require_future_booking()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.starts_at <= now() then
    raise exception 'Booking time must be in the future';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_must_be_future on public.bookings;
create trigger bookings_must_be_future
  before insert on public.bookings
  for each row
  execute function public.require_future_booking();

create or replace function public.create_business_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.businesses (owner_id)
  values (new.id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_business_after_signup on auth.users;
create trigger create_business_after_signup
  after insert on auth.users
  for each row
  execute function public.create_business_for_new_user();

create or replace function public.ensure_business_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a business profile';
  end if;

  insert into public.businesses (owner_id)
  values (auth.uid())
  on conflict (owner_id) do nothing;

  select id into business_id
  from public.businesses
  where owner_id = auth.uid();

  return business_id;
end;
$$;

revoke all on function public.ensure_business_profile() from public, anon;
grant execute on function public.ensure_business_profile() to authenticated;

create or replace function public.set_mock_subscription(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to change a subscription';
  end if;

  update public.businesses
  set paid_until = case
    when p_enabled then now() + interval '30 days'
    else null
  end
  where owner_id = auth.uid();

  if not found then
    raise exception 'Business profile not found';
  end if;
end;
$$;

revoke all on function public.set_mock_subscription(boolean) from public, anon;
grant execute on function public.set_mock_subscription(boolean) to authenticated;
