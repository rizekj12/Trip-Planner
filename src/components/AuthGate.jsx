import React from "react";
import { useAuth } from "../context/AuthContext";
import AuthScreen from "./auth/AuthScreen";
import ResetPassword from "./auth/ResetPassword";

export default function AuthGate({ children }) {
    const { user, ready, needsReset, clearNeedsReset } = useAuth();

    if (!ready) return null;
    if (needsReset) return <ResetPassword onDone={clearNeedsReset} />;
    return user ? children : <AuthScreen />;
}
