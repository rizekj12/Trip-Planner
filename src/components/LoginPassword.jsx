import React from 'react';
import { useState } from "react";
import { supabase } from "../utils/supabase";

export default function LoginPassword() {
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [mode, setMode] = useState("login"); // "login" | "reset"
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");

    const onLogin = async (e) => {
        e.preventDefault();
        setBusy(true); setMsg("");
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: pw,
        });
        if (error) setMsg(error.message);
        setBusy(false);
    };

    const onReset = async (e) => {
        e.preventDefault();
        setBusy(true); setMsg("");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin, // set a recovery URL in Auth settings if you want a custom page
        });
        if (error) setMsg(error.message);
        else setMsg("Password reset email sent.");
        setBusy(false);
    };

    return (
        <div className="grid min-h-screen place-items-center bg-black/40 text-white">
            <form
                onSubmit={mode === "login" ? onLogin : onReset}
                className="w-[90%] max-w-md rounded-2xl bg-white/15 p-6 backdrop-blur"
            >
                <div className="mb-4 text-2xl font-bold">Tokyo Boyz — Sign in</div>

                <label className="mb-1 block text-sm opacity-80">Email</label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mb-3 w-full rounded-lg bg-white/90 px-3 py-2 text-zinc-900"
                    placeholder="you@example.com"
                />

                {mode === "login" && (
                    <>
                        <label className="mb-1 block text-sm opacity-80">Password</label>
                        <input
                            type="password"
                            required
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                            className="mb-3 w-full rounded-lg bg-white/90 px-3 py-2 text-zinc-900"
                            placeholder="••••••••"
                        />
                    </>
                )}

                {msg && <div className="mb-3 rounded bg-white/20 p-2 text-sm">{msg}</div>}

                <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60"
                >
                    {busy ? "Working..." : mode === "login" ? "Sign in" : "Send reset link"}
                </button>

                <div className="mt-3 flex items-center justify-between text-sm opacity-80">
                    <button
                        type="button"
                        onClick={() => setMode(mode === "login" ? "reset" : "login")}
                        className="underline"
                    >
                        {mode === "login" ? "Forgot password?" : "Back to login"}
                    </button>
                </div>
            </form>
        </div>
    );
}
