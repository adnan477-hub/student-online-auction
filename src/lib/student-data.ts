import { supabase } from "@/integrations/supabase/client";

export type BidStatus = "Leading" | "Outbid" | "Won" | "Lost";

export async function fetchMyBids(uid: string) {
  const { data, error } = await supabase
    .from("bids")
    .select("amount, auction_id, auctions(id, title, current_price, end_time, leader_id)")
    .eq("bidder_id", uid)
    .order("amount", { ascending: false });
  if (error) throw error;
  const map = new Map<string, { a: NonNullable<(typeof data)[0]["auctions"]>; mine: number }>();
  for (const b of data) if (b.auctions && !map.has(b.auction_id)) map.set(b.auction_id, { a: b.auctions, mine: Number(b.amount) });
  return [...map.values()];
}

export function bidStatus(a: { end_time: string; leader_id: string | null }, uid: string, now: number): BidStatus {
  const ended = now ? new Date(a.end_time).getTime() <= now : false;
  const lead = a.leader_id === uid;
  return ended ? (lead ? "Won" : "Lost") : lead ? "Leading" : "Outbid";
}

export async function fetchMyListings(uid: string) {
  const { data, error } = await supabase.from("auctions").select("*").eq("seller_id", uid).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export const badge: Record<string, string> = {
  Leading: "bg-success text-success-foreground",
  Won: "bg-success text-success-foreground",
  Outbid: "bg-primary text-primary-foreground",
  Lost: "bg-muted text-muted-foreground",
  pending: "bg-accent",
  active: "bg-success text-success-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  ended: "bg-muted",
  open: "bg-accent",
  resolved: "bg-success text-success-foreground",
  dismissed: "bg-muted",
  suspended: "bg-destructive text-destructive-foreground",
};
