import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Gavel, ListPlus, Trophy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuctionCard } from "@/components/AuctionCard";
import { supabase } from "@/integrations/supabase/client";
import { useNow } from "@/hooks/use-now";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Auction — Buy Smart. Bid Fair. Sell Easy." },
      { name: "description", content: "A campus auction marketplace where students sell books, gadgets and electronics and bid live." },
      { property: "og:title", content: "Student Auction — Buy Smart. Bid Fair. Sell Easy." },
      { property: "og:description", content: "A campus auction marketplace built for students." },
    ],
  }),
  component: Home,
});

export const STEPS = [
  { icon: UserPlus, title: "Register", text: "Sign up with your student ID and college." },
  { icon: ListPlus, title: "List Your Item", text: "Add photos, a starting price and an end time." },
  { icon: BadgeCheck, title: "Admin Approval", text: "An admin checks every listing before it goes live." },
  { icon: Gavel, title: "Students Bid", text: "Bids update live for everyone watching." },
  { icon: Trophy, title: "Highest Bidder Wins", text: "When the clock hits zero, the top bid takes it." },
];

function Home() {
  const now = useNow();
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_stats");
      if (error) throw error;
      return data as { active: number; students: number; sold: number; bids: number };
    },
  });
  const popular = useQuery({
    queryKey: ["auctions", "popular"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select("*")
        .eq("status", "active")
        .gt("end_time", new Date().toISOString())
        .order("bid_count", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const s = stats.data;
  const statItems = [
    ["Active Auctions", s?.active],
    ["Registered Students", s?.students],
    ["Items Sold", s?.sold],
    ["Total Bids", s?.bids],
  ] as const;

  return (
    <div>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Live campus auctions
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[0.95] md:text-7xl">
            Buy Smart.<br />Bid Fair.<br /><span className="text-primary">Sell Easy.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">An online auction marketplace built for students.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="paddle" size="lg" asChild>
              <Link to="/auctions">Explore Auctions <ArrowRight /></Link>
            </Button>
            <Button variant="outlineInk" size="lg" asChild>
              <Link to="/sell">Start Selling</Link>
            </Button>
          </div>
        </div>
        <div className="paddle-card overflow-hidden">
          <img src={hero} alt="Textbooks, a camera, headphones and a calculator on a desk" width={1280} height={1024} className="h-full w-full object-cover" />
        </div>
      </section>

      <section className="border-y-2 border-ink bg-ink text-ink-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {statItems.map(([label, v]) => (
            <div key={label}>
              <p className="font-display text-4xl font-extrabold text-accent">{v ?? "—"}</p>
              <p className="text-sm opacity-75">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl font-extrabold md:text-4xl">Popular right now</h2>
          <Link to="/auctions" className="text-sm font-semibold text-primary hover:underline">See all →</Link>
        </div>
        {popular.data?.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {popular.data.map((a) => <AuctionCard key={a.id} a={a} now={now} />)}
          </div>
        ) : (
          <div className="paddle-card p-10 text-center">
            <p className="text-lg font-semibold">{popular.isLoading ? "Loading auctions…" : "No live auctions yet."}</p>
            {!popular.isLoading && <p className="mt-1 text-muted-foreground">Be the first — list something you don't use anymore.</p>}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <h2 className="mb-8 text-3xl font-extrabold md:text-4xl">How it works</h2>
        <ol className="grid gap-4 md:grid-cols-5">
          {STEPS.map((st, i) => (
            <li key={st.title} className="paddle-card p-5">
              <div className="flex items-center justify-between">
                <st.icon className="h-6 w-6 text-primary" />
                <span className="font-display text-3xl font-extrabold text-muted-foreground/40">{i + 1}</span>
              </div>
              <h3 className="mt-4 font-bold">{st.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{st.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
