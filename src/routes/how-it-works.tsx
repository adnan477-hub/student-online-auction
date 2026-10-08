import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { STEPS } from "@/lib/steps";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Student Auction" },
      { name: "description", content: "Register, list your item, get admin approval, and let students bid. Highest bidder wins." },
      { property: "og:title", content: "How It Works — Student Auction" },
      { property: "og:description", content: "Five simple steps from listing to winning bid." },
    ],
  }),
  component: HowItWorks,
});

const RULES = [
  "Every listing is reviewed by an admin before it goes live.",
  "Your bid must beat the current bid by at least the seller's minimum step.",
  "You can't bid on your own item.",
  "Bids update instantly for everyone viewing the auction.",
  "When time runs out, the highest bidder wins and arranges pickup with the seller.",
];

function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-5xl font-extrabold">How it works</h1>
      <ol className="mt-10 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="paddle-card flex items-start gap-5 p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border-2 border-ink bg-accent font-display text-xl font-extrabold">{i + 1}</span>
            <div>
              <h2 className="text-xl font-bold">{s.title}</h2>
              <p className="text-muted-foreground">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <h2 className="mt-14 text-2xl font-extrabold">Bidding rules</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
        {RULES.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <Button variant="paddle" size="lg" className="mt-10" asChild>
        <Link to="/auctions">Start bidding</Link>
      </Button>
    </div>
  );
}
