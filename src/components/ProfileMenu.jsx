import React, { useEffect, useRef, useState } from "react";
import { LogOut, User, ChevronDown } from "lucide-react";
import { supabase } from "../utils/supabase";

export default function ProfileMenu({ onOpenProfile }) {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 group"
        aria-label="Profile menu"
      >
        {/* Circle avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/50 group-hover:ring-white transition bg-indigo-500 flex items-center justify-center shadow-lg flex-shrink-0">
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : <User size={20} className="text-white" />
          }
        </div>
        <ChevronDown size={14} className="text-white/70 group-hover:text-white transition" />
      </button>

      {open && (
        /* Use right-0 but cap it so it never goes off screen */
        <div
          className="absolute mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 text-sm"
          style={{ right: 0, maxWidth: "calc(100vw - 1.5rem)" }}
        >
          {user?.email && (
            <div className="px-4 py-2 text-xs text-gray-400 truncate border-b border-gray-100">
              {user.email}
            </div>
          )}
          <button
            onClick={() => { setOpen(false); onOpenProfile(); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
          >
            <User size={15} />
            My Profile
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
