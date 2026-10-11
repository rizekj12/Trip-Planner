import React, { useState } from "react";
import { Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "../../utils/supabase";
import AuthLayout, { AuthInput, AuthMessage, AuthButton } from "./AuthLayout";

const MIN_PASSWORD = 8;

// Shown after the user opens a password-reset link
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("Passwords don't match.");

    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    setSuccess(true);
    setTimeout(onDone, 2000);
  };

  return (
    <AuthLayout>
      {success ? (
        <div className="text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-green-300" />
          <h2 className="text-xl font-bold">Password updated</h2>
          <p className="mt-1 text-sm text-white/80">Signing you in…</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Set a new password</h2>
            <p className="mt-1 text-sm text-white/75">Choose a password with at least {MIN_PASSWORD} characters.</p>
          </div>
          <AuthInput label="New password" icon={Lock} type="password" required autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
          <AuthInput label="Confirm password" icon={Lock} type="password" required autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type it again" />
          <AuthMessage>{error}</AuthMessage>
          <AuthButton busy={busy} busyLabel="Saving…">Update password</AuthButton>
        </form>
      )}
    </AuthLayout>
  );
}
