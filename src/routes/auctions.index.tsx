import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AuctionCard } from "@/components/AuctionCard";
import { supabase } from "@/integrations/supabase/client";
import { useNow } from "@/hooks/use-now";
import { CATEGORIES } from "@/lib/format";

export const Route = createFileRoute("/auctions/")({
  head: () => ({
    meta: [
      { title: "Live Auctions — Student Auction" },
      { name: "description", content: "Browse live student auctions for books, electronics, gadgets and more." },
      { property: "og:title", content: "Live Auctions — Student Auction" },
      { property: "og:description", content: "Browse and bid on items from students on your campus." },
    ],
  }),
  component: AuctionsPage,
});

const SORTS = {
  ending: "Ending soon",
  recent: "Recently added",
  high: "Highest bid",
  low: "Lowest bid",
} as const;

const selectCls = "h-10 rounded-md border-2 border-ink bg-card px-3 text-sm";

function AuctionsPage() {
  const now = useNow();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<keyof typeof SORTS>("ending");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["auctions", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select("*")
        .eq("status", "active")
        .gt("end_time", new Date().toISOString());
      if (error) throw error;
      return data;
    },
  });

  const list = useMemo(() => {
    let l = (data ?? []).filter(
      (a) =>
        (cat === "All" || a.category === cat) &&
        a.title.toLowerCase().includes(q.toLowerCase()) &&
        (!min || Number(a.current_price) >= Number(min)) &&
        (!max || Number(a.current_price) <= Number(max)),
    );
    const by = {
      ending: (a: (typeof l)[0], b: (typeof l)[0]) => +new Date(a.end_time) - +new Date(b.end_time),
      recent: (a: (typeof l)[0], b: (typeof l)[0]) => +new Date(b.created_at) - +new Date(a.created_at),
      high: (a: (typeof l)[0], b: (typeof l)[0]) => Number(b.current_price) - Number(a.current_price),
      low: (a: (typeof l)[0], b: (typeof l)[0]) => Number(a.current_price) - Number(b.current_price),
    }[sort];
    l = [...l].sort(by);
    return l;
  }, [data, q, cat, sort, min, max]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-5xl font-extrabold">Live auctions</h1>
      <div className="mt-8 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items…" className="h-10 border-2 border-ink bg-card pl-9" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}>
          <option>All</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <Input value={min} onChange={(e) => setMin(e.target.value)} type="number" placeholder="Min ₹" className="h-10 w-28 border-2 border-ink bg-card" />
        <Input value={max} onChange={(e) => setMax(e.target.value)} type="number" placeholder="Max ₹" className="h-10 w-28 border-2 border-ink bg-card" />
        <select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} className={selectCls}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Loading…</p>
      ) : list.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((a) => <AuctionCard key={a.id} a={a} now={now} />)}
        </div>
      ) : (
        <div className="paddle-card mt-8 p-10 text-center text-muted-foreground">No auctions match your filters.</div>
      )}
    </div>
  );
}
