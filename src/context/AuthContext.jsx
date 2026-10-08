import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../utils/supabase";

const AuthContext = createContext(null);

// Single subscription to Supabase auth; everything else reads from useAuth()
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [needsReset, setNeedsReset] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setNeedsReset(true);
      // Don't leak one user's cached trips to the next login
      if (event === "SIGNED_OUT") queryClient.clear();
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = {
    session,
    user: session?.user ?? null,
    ready,
    needsReset,
    clearNeedsReset: () => setNeedsReset(false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
