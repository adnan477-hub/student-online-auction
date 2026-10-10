import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Gavel, Heart, LayoutDashboard, Package, Search, User } from "lucide-react";
import { DashShell } from "@/components/DashShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user } = useAuth();
  const unread = useQuery({
    enabled: !!user,
    queryKey: ["unread", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
  });
  return (
    <DashShell
      title="Student dashboard"
      items={[
        { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
        { to: "/auctions", label: "Browse auctions", icon: Search },
        { to: "/dashboard/listings", label: "My listings", icon: Package },
        { to: "/dashboard/bids", label: "My bids", icon: Gavel },
        { to: "/dashboard/watchlist", label: "Watchlist", icon: Heart },
        { to: "/dashboard/notifications", label: "Notifications", icon: Bell, badge: unread.data },
        { to: "/dashboard/profile", label: "My profile", icon: User },
      ]}
    >
      <Outlet />
    </DashShell>
  );
}
