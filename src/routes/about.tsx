import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Student Auction" },
      { name: "description", content: "Student Auction is a safe, fair campus marketplace for students to buy and sell used items." },
      { property: "og:title", content: "About — Student Auction" },
      { property: "og:description", content: "A safe, fair campus marketplace for students." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-5xl font-extrabold">Made for campus.</h1>
      <p className="mt-6 text-lg text-muted-foreground">
        Every semester, students end up with textbooks they'll never open again, gadgets in drawers,
        and furniture they can't take home. Student Auction turns that clutter into cash — and helps
        other students get what they need for less.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["Verified", "Every listing is approved by an admin."],
          ["Fair", "Open bidding. Everyone sees the same price."],
          ["Live", "Bids update instantly — no refreshing."],
        ].map(([t, d]) => (
          <div key={t} className="paddle-card p-5">
            <h2 className="text-xl font-bold text-primary">{t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
