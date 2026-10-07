create type public.app_role as enum ('admin','student');
create type public.auction_status as enum ('pending','active','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  student_id text not null default '',
  college text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  seller_name text not null default '',
  title text not null,
  description text not null default '',
  category text not null default 'Other',
  condition text not null default 'Good',
  image_url text,
  starting_price numeric(10,2) not null check (starting_price > 0),
  min_increment numeric(10,2) not null default 10 check (min_increment > 0),
  current_price numeric(10,2) not null default 0,
  bid_count int not null default 0,
  end_time timestamptz not null,
  status auction_status not null default 'pending',
  leader_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.auctions to anon;
grant select, insert, update, delete on public.auctions to authenticated;
grant all on public.auctions to service_role;
alter table public.auctions enable row level security;

create policy "public sees active" on public.auctions for select to anon, authenticated using (status = 'active');
create policy "seller sees own" on public.auctions for select to authenticated using (auth.uid() = seller_id);
create policy "admin sees all" on public.auctions for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "seller creates" on public.auctions for insert to authenticated with check (auth.uid() = seller_id and status = 'pending');
create policy "seller deletes pending" on public.auctions for delete to authenticated using (auth.uid() = seller_id and status <> 'active');
create policy "admin updates" on public.auctions for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin deletes" on public.auctions for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.auction_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.current_price := new.starting_price;
  new.bid_count := 0;
  new.leader_id := null;
  new.status := 'pending';
  select full_name into new.seller_name from public.profiles where id = new.seller_id;
  if new.end_time <= now() then raise exception 'End time must be in the future'; end if;
  return new;
end $$;
create trigger auctions_before_insert before insert on public.auctions for each row execute function public.auction_before_insert();

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null,
  bidder_name text not null default '',
  amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);
grant select on public.bids to anon, authenticated;
grant all on public.bids to service_role;
alter table public.bids enable row level security;
create policy "bids visible on visible auctions" on public.bids for select to anon, authenticated
  using (exists (select 1 from public.auctions a where a.id = auction_id));

create or replace function public.place_bid(_auction_id uuid, _amount numeric)
returns public.bids language plpgsql security definer set search_path = public as $$
declare a public.auctions; b public.bids; uid uuid := auth.uid(); nm text;
begin
  if uid is null then raise exception 'Please log in to bid'; end if;
  select * into a from public.auctions where id = _auction_id for update;
  if not found or a.status <> 'active' then raise exception 'This auction is not open'; end if;
  if a.end_time <= now() then raise exception 'This auction has ended'; end if;
  if a.seller_id = uid then raise exception 'You cannot bid on your own item'; end if;
  if a.bid_count = 0 and _amount < a.starting_price then raise exception 'Bid must be at least ₹%', a.starting_price; end if;
  if a.bid_count > 0 and _amount < a.current_price + a.min_increment then raise exception 'Bid must be at least ₹%', a.current_price + a.min_increment; end if;
  select split_part(full_name,' ',1) || coalesce(' ' || left(nullif(split_part(full_name,' ',2),''),1) || '.','') into nm from public.profiles where id = uid;
  insert into public.bids (auction_id, bidder_id, bidder_name, amount) values (_auction_id, uid, coalesce(nullif(nm,''),'Student'), _amount) returning * into b;
  update public.auctions set current_price = _amount, bid_count = bid_count + 1, leader_id = uid where id = _auction_id;
  return b;
end $$;
revoke execute on function public.place_bid(uuid, numeric) from anon, public;
grant execute on function public.place_bid(uuid, numeric) to authenticated;

create or replace function public.get_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'active', (select count(*) from auctions where status='active' and end_time > now()),
    'students', (select count(*) from profiles),
    'sold', (select count(*) from auctions where status='active' and end_time <= now() and bid_count > 0),
    'bids', (select count(*) from bids)
  )
$$;
grant execute on function public.get_stats() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, student_id, college, phone)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'student_id',''), coalesce(new.raw_user_meta_data->>'college',''),
    coalesce(new.raw_user_meta_data->>'phone',''));
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.auctions;
alter publication supabase_realtime add table public.bids;

create policy "public read auction images" on storage.objects for select using (bucket_id = 'auction-images');
create policy "users upload own images" on storage.objects for insert to authenticated
  with check (bucket_id = 'auction-images' and (storage.foldername(name))[1] = auth.uid()::text);