import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number };

export function useSignOut() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}

export function DashShell({ title, items, children }: { title: string; items: NavItem[]; children: ReactNode }) {
  const signOut = useSignOut();
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-24 md:self-start">
        <p className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
        <nav className="paddle-card flex gap-1 overflow-x-auto p-2 md:flex-col">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              activeOptions={{ exact: !!i.exact }}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-ink text-ink-foreground hover:bg-ink hover:text-ink-foreground" }}
            >
              <i.icon className="h-4 w-4" />
              {i.label}
              {!!i.badge && <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{i.badge}</span>}
            </Link>
          ))}
          <button onClick={signOut} className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </nav>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-extrabold md:text-4xl">{children}</h1>
      {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="paddle-card p-5">
      <p className="font-display text-3xl font-extrabold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
