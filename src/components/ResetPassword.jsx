import React, { useState } from "react";
import { supabase } from "../utils/supabase";

export default function ResetPassword({ onDone }) {
    const [pw, setPw] = useState("");
    const [confirm, setConfirm] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");
    const [success, setSuccess] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (pw !== confirm) { setMsg("Passwords don't match."); return; }
        if (pw.length < 6) { setMsg("Password must be at least 6 characters."); return; }
        setBusy(true); setMsg("");
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) { setMsg(error.message); setBusy(false); return; }
        setSuccess(true);
        setBusy(false);
        setTimeout(onDone, 2000);
    };

    return (
        <div className="grid min-h-screen place-items-center bg-black/40 text-white">
            <form
                onSubmit={onSubmit}
                className="w-[90%] max-w-md rounded-2xl bg-white/15 p-6 backdrop-blur"
            >
                <div className="mb-4 text-2xl font-bold">Set New Password</div>

                {success ? (
                    <div className="rounded bg-green-500/30 p-3 text-sm">
                        Password updated! Signing you in…
                    </div>
                ) : (
                    <>
                        <label className="mb-1 block text-sm opacity-80">New password</label>
                        <input
                            type="password"
                            required
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                            className="mb-3 w-full rounded-lg bg-white/90 px-3 py-2 text-zinc-900"
                            placeholder="••••••••"
                        />

                        <label className="mb-1 block text-sm opacity-80">Confirm password</label>
                        <input
                            type="password"
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="mb-3 w-full rounded-lg bg-white/90 px-3 py-2 text-zinc-900"
                            placeholder="••••••••"
                        />

                        {msg && (
                            <div className="mb-3 rounded bg-white/20 p-2 text-sm">{msg}</div>
                        )}

                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {busy ? "Saving…" : "Update password"}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}
