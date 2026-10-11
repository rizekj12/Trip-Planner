import React, { useState } from "react";
import { Mail, Lock, User, MailCheck } from "lucide-react";
import { supabase } from "../../utils/supabase";
import AuthLayout, { AuthInput, AuthMessage, AuthButton } from "./AuthLayout";

const MIN_PASSWORD = 8;

// If a Google sign-in failed or was cancelled, Supabase sends the user back with
// ?error_description=... (or #error_description=...). Read it once and tidy the URL.
function takeOAuthError() {
  const params = new URLSearchParams(window.location.search || window.location.hash.slice(1));
  const description = params.get("error_description");
  if (!description) return "";
  window.history.replaceState(null, "", window.location.pathname);
  return /access_denied|cancel/i.test(params.get("error") || "")
    ? "Google sign-in was cancelled."
    : description.replace(/\+/g, " ");
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// Supabase's messages, reworded for people
function friendlyError(error) {
  const msg = error?.message || "";
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match.";
  if (/already registered|already been registered/i.test(msg)) return "An account with this email already exists. Try signing in.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for the link.";
  if (/rate limit|too many/i.test(msg)) return "Too many attempts. Please wait a minute and try again.";
  return msg || "Something went wrong. Please try again.";
}

// Sign in, create an account, or request a password-reset email
export default function AuthScreen() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(takeOAuthError);
  const [notice, setNotice] = useState("");
  // Set after sign-up when Supabase requires email confirmation
  const [confirmEmailFor, setConfirmEmailFor] = useState(null);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  const run = async (action) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const onSignIn = (e) => {
    e.preventDefault();
    run(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      // AuthGate switches to the app as soon as the session arrives
    });
  };

  const onSignUp = (e) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    run(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // No session means the project requires email confirmation first
      if (!data.session) setConfirmEmailFor(email.trim());
    });
  };

  // Redirects to Google and back; a first-time Google user gets an account automatically,
  // with their name and photo copied into the profile
  const onGoogle = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    });

  const onForgot = (e) => {
    e.preventDefault();
    run(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setNotice("If an account exists for that email, a reset link is on its way.");
    });
  };

  if (confirmEmailFor) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <MailCheck size={28} />
          </div>
          <h2 className="text-xl font-bold">Check your email</h2>
          <p className="mt-2 text-sm text-white/80">
            We sent a confirmation link to <span className="font-semibold text-white">{confirmEmailFor}</span>.
            Open it to finish creating your account, then sign in.
          </p>
          <button
            onClick={() => {
              setConfirmEmailFor(null);
              switchMode("signin");
            }}
            className="mt-6 text-sm font-semibold underline"
          >
            Back to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {mode === "forgot" ? (
        <form onSubmit={onForgot} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Reset your password</h2>
            <p className="mt-1 text-sm text-white/75">Enter your email and we'll send you a link to set a new one.</p>
          </div>
          <AuthInput label="Email" icon={Mail} type="email" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <AuthMessage>{error}</AuthMessage>
          <AuthMessage type="success">{notice}</AuthMessage>
          <AuthButton busy={busy} busyLabel="Sending…">Send reset link</AuthButton>
          <button type="button" onClick={() => switchMode("signin")} className="block w-full text-center text-sm text-white/80 underline">
            Back to sign in
          </button>
        </form>
      ) : (
        <>
          {/* Sign in / Create account tabs */}
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-black/20 p-1 text-sm font-semibold">
            {[
              ["signin", "Sign in"],
              ["signup", "Create account"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                className={`rounded-lg py-2 transition ${mode === key ? "bg-white text-gray-900 shadow" : "text-white/80 hover:text-white"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3 text-sm font-semibold text-gray-800 shadow-lg transition hover:bg-gray-50 disabled:opacity-60"
          >
            <GoogleLogo />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-white/60">
            <span className="h-px flex-1 bg-white/25" />
            or with email
            <span className="h-px flex-1 bg-white/25" />
          </div>

          <form onSubmit={mode === "signup" ? onSignUp : onSignIn} className="space-y-4">
            {mode === "signup" && (
              <AuthInput label="Name" icon={User} required autoComplete="name"
                value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            )}
            <AuthInput label="Email" icon={Mail} type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <AuthInput label="Password" icon={Lock} type="password" required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? `At least ${MIN_PASSWORD} characters` : "Your password"} />

            {mode === "signin" && (
              <div className="-mt-2 text-right">
                <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-white/80 underline">
                  Forgot password?
                </button>
              </div>
            )}

            <AuthMessage>{error}</AuthMessage>
            <AuthButton busy={busy} busyLabel={mode === "signup" ? "Creating account…" : "Signing in…"}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </AuthButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
