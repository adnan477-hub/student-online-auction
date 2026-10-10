-- No more automatic admin for the first registrant
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (id, full_name, email, student_id, college, phone)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'student_id',''), coalesce(new.raw_user_meta_data->>'college',''),
    coalesce(new.raw_user_meta_data->>'phone',''));
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end $$;

-- Account status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE OR REPLACE FUNCTION public.is_active_user(_uid uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ select coalesce((select status = 'active' from public.profiles where id = _uid), false) $$;

-- Audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: students may only edit name/college/phone/student_id; admins may change status
CREATE POLICY "admin updates profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.profile_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if new.id <> old.id or new.email <> old.email or new.created_at <> old.created_at then
    raise exception 'This field cannot be changed';
  end if;
  if new.status <> old.status then
    if not public.has_role(auth.uid(), 'admin') then raise exception 'Only admins can change account status'; end if;
    if new.status not in ('active','suspended') then raise exception 'Invalid status'; end if;
    if new.id = auth.uid() then raise exception 'You cannot change your own status'; end if;
    insert into public.audit_log(actor_id, action, target, details) values (auth.uid(), 'user_' || new.status, new.id::text, new.full_name);
  end if;
  if auth.uid() <> new.id and not public.has_role(auth.uid(), 'admin') then raise exception 'Not allowed'; end if;
  if auth.uid() <> new.id and (new.full_name, new.college, new.phone, new.student_id) is distinct from (old.full_name, old.college, old.phone, old.student_id) then
    raise exception 'Admins cannot edit student details';
  end if;
  return new;
end $$;
CREATE TRIGGER profiles_guard BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profile_guard();

-- Suspended users cannot list
CREATE OR REPLACE FUNCTION public.auction_before_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if not public.is_active_user(new.seller_id) then raise exception 'Your account is suspended'; end if;
  new.current_price := new.starting_price;
  new.bid_count := 0;
  new.leader_id := null;
  new.status := 'pending';
  select full_name into new.seller_name from public.profiles where id = new.seller_id;
  if new.end_time <= now() then raise exception 'End time must be in the future'; end if;
  return new;
end $$;

-- Suspended users cannot bid
CREATE OR REPLACE FUNCTION public.place_bid(_auction_id uuid, _amount numeric)
 RETURNS bids LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare a public.auctions; b public.bids; uid uuid := auth.uid(); nm text;
begin
  if uid is null then raise exception 'Please log in to bid'; end if;
  if not public.is_active_user(uid) then raise exception 'Your account is suspended'; end if;
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

-- Watchlist
CREATE TABLE public.watchlist (
  user_id uuid NOT NULL,
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, auction_id)
);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watchlist read" ON public.watchlist FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own watchlist add" ON public.watchlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own watchlist remove" ON public.watchlist FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  auction_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_on_bid()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare a public.auctions;
begin
  select * into a from public.auctions where id = new.auction_id;
  if a.leader_id is not null and a.leader_id <> new.bidder_id then
    insert into public.notifications(user_id, title, body, auction_id)
    values (a.leader_id, 'You were outbid', 'Someone bid ₹' || new.amount || ' on "' || a.title || '".', a.id);
  end if;
  insert into public.notifications(user_id, title, body, auction_id)
  values (a.seller_id, 'New bid on your item', new.bidder_name || ' bid ₹' || new.amount || ' on "' || a.title || '".', a.id);
  return new;
end $$;
CREATE TRIGGER bids_notify AFTER INSERT ON public.bids FOR EACH ROW EXECUTE FUNCTION public.notify_on_bid();

CREATE OR REPLACE FUNCTION public.auction_after_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if new.status <> old.status then
    insert into public.notifications(user_id, title, body, auction_id)
    values (new.seller_id,
      case when new.status = 'active' then 'Listing approved' else 'Listing ' || new.status end,
      '"' || new.title || '" is now ' || case when new.status = 'active' then 'live for bidding.' else new.status || '.' end, new.id);
    insert into public.audit_log(actor_id, action, target, details) values (auth.uid(), 'auction_' || new.status, new.id::text, new.title);
  end if;
  return new;
end $$;
CREATE TRIGGER auctions_after_update AFTER UPDATE ON public.auctions FOR EACH ROW EXECUTE FUNCTION public.auction_after_update();

CREATE OR REPLACE FUNCTION public.auction_after_delete()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if public.has_role(auth.uid(), 'admin') and old.seller_id <> auth.uid() then
    insert into public.audit_log(actor_id, action, target, details) values (auth.uid(), 'auction_deleted', old.id::text, old.title);
    insert into public.notifications(user_id, title, body) values (old.seller_id, 'Listing removed', '"' || old.title || '" was removed by an admin.');
  end if;
  return old;
end $$;
CREATE TRIGGER auctions_after_delete AFTER DELETE ON public.auctions FOR EACH ROW EXECUTE FUNCTION public.auction_after_delete();

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reporter reads own" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "student reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id AND status = 'open' AND length(reason) between 3 and 500);
CREATE POLICY "admin resolves" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.report_after_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if new.status <> old.status then
    insert into public.audit_log(actor_id, action, target, details) values (auth.uid(), 'report_' || new.status, new.auction_id::text, new.reason);
  end if;
  return new;
end $$;
CREATE TRIGGER reports_after_update AFTER UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.report_after_update();

-- Admin-only bid overview (no emails/phones)
CREATE OR REPLACE FUNCTION public.admin_bid_activity()
 RETURNS TABLE(bidder_id uuid, bidder_name text, bid_count bigint, auctions bigint, total numeric, last_bid timestamptz, fast_bids bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  return query
  select b.bidder_id, max(b.bidder_name), count(*), count(distinct b.auction_id), sum(b.amount), max(b.created_at),
    (select count(*) from public.bids x where x.bidder_id = b.bidder_id and x.created_at > now() - interval '10 minutes')
  from public.bids b group by b.bidder_id order by count(*) desc;
end $$;
REVOKE EXECUTE ON FUNCTION public.admin_bid_activity() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_bid_activity() TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;