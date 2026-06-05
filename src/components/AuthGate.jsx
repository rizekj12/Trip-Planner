import React from 'react';
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import LoginPassword from "./LoginPassword";
import ResetPassword from "./ResetPassword";

export default function AuthGate({ children }) {
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
            setSession(s);
        });
        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    // Ensure member row exists for this user
    useEffect(() => {
        const ensureMember = async () => {
            if (!session?.user) return;
            const uid = session.user.id;
            await supabase.from("members").upsert({ id: uid }, { onConflict: "id" });
        };
        ensureMember();
    }, [session]);

    if (!ready) return null;
    if (needsReset) return <ResetPassword onDone={() => setNeedsReset(false)} />;
    return session ? children : <LoginPassword />;
}
