import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  student_id: string;
  college: string;
  phone: string;
  status: string;
};

type AuthState = {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthState & { refresh: () => void }>({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, isAdmin: false, loading: true });

  const load = useCallback(async (user: User | null) => {
    if (!user) return setState({ user: null, profile: null, isAdmin: false, loading: false });
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    setState({ user, profile: profile as Profile | null, isAdmin: !!roles?.some((r) => r.role === "admin"), loading: false });
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session?.user ?? null), 0);
    });
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(() => {
    supabase.auth.getUser().then(({ data }) => load(data.user));
  }, [load]);

  return <AuthContext.Provider value={{ ...state, refresh }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
