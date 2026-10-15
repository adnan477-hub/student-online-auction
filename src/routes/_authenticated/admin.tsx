import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { BarChart3, Flag, Gavel, LayoutDashboard, Package, ShieldCheck, Users } from "lucide-react";
import { DashShell } from "@/components/DashShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  // UI gate only; every admin read/write is also enforced by database policies.
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data: ok } = await supabase.rpc("has_role", { _user_id: u.user?.id ?? "", _role: "admin" });
    if (!ok) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <DashShell
      title="Admin dashboard"
      items={[
        { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/auctions", label: "Pending approvals", icon: Package },
        { to: "/admin/bids", label: "Bidding", icon: Gavel },
        { to: "/admin/reports", label: "Reports", icon: Flag },
        { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { to: "/admin/security", label: "Security", icon: ShieldCheck },
      ]}
    >
      <Outlet />
    </DashShell>
  );
}
