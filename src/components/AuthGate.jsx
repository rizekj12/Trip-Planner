import React, { useEffect } from "react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import LoginPassword from "./LoginPassword";
import ResetPassword from "./ResetPassword";

export default function AuthGate({ children }) {
    const { user, ready, needsReset, clearNeedsReset } = useAuth();

    // Ensure member row exists for this user
    useEffect(() => {
        if (!user) return;
        supabase.from("members").upsert({ id: user.id }, { onConflict: "id" });
    }, [user?.id]);

    if (!ready) return null;
    if (needsReset) return <ResetPassword onDone={clearNeedsReset} />;
    return user ? children : <LoginPassword />;
}
