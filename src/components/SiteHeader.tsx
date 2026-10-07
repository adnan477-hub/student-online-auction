import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Gavel, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/", label: "Home" },
  { to: "/auctions", label: "Auctions" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const links = (
    <>
      {nav.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
          activeProps={{ className: "text-foreground font-semibold" }}
          activeOptions={{ exact: n.to === "/" }}
        >
          {n.label}
        </Link>
      ))}
      {user && (
        <Link to="/dashboard" onClick={() => setOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground font-semibold" }}>
          Dashboard
        </Link>
      )}
      {isAdmin && (
        <Link to="/admin" onClick={() => setOpen(false)} className="text-sm font-medium text-primary hover:underline">
          Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-ink bg-primary text-primary-foreground shadow-paddle-sm">
            <Gavel className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-extrabold">Student Auction</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">{links}</nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button variant="paddle" size="sm" asChild>
                <Link to="/sell">Sell an item</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut /> Log out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Login</Link>
              </Button>
              <Button variant="paddle" size="sm" asChild>
                <Link to="/auth" search={{ mode: "register" }}>Register</Link>
              </Button>
            </>
          )}
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          <Menu />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t px-4 py-4 md:hidden">
          {links}
          {user ? (
            <>
              <Link to="/sell" onClick={() => setOpen(false)} className="text-sm font-semibold text-primary">Sell an item</Link>
              <button onClick={signOut} className="text-left text-sm">Log out</button>
            </>
          ) : (
            <>
              <Link to="/auth" onClick={() => setOpen(false)} className="text-sm">Login</Link>
              <Link to="/auth" search={{ mode: "register" }} onClick={() => setOpen(false)} className="text-sm font-semibold text-primary">Register</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-ink bg-ink text-ink-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm md:flex-row">
        <span className="font-display font-bold">Student Auction</span>
        <span className="opacity-70">Buy Smart. Bid Fair. Sell Easy.</span>
      </div>
    </footer>
  );
}
