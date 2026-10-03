create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 100),
  customer_email text not null check (char_length(customer_email) between 3 and 254),
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint bookings_unique_start_time unique (starts_at)
);

alter table public.bookings enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.bookings to anon, authenticated;
grant select on public.bookings to authenticated;

drop policy if exists "Anyone can create a booking" on public.bookings;
create policy "Anyone can create a booking"
  on public.bookings
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Signed-in providers can view bookings" on public.bookings;
create policy "Signed-in providers can view bookings"
  on public.bookings
  for select
  to authenticated
  using (true);

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
