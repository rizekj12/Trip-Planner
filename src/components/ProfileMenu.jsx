import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, ChevronDown } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { useClickOutside } from "../hooks/useClickOutside";

// "Joshua Rizek" -> "Joshua R."; Google accounts use `name`; falls back to the email's username
function shortName(user) {
  const full = (user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim();
  if (!full) return user?.email?.split("@")[0] || "";
  const [first, ...rest] = full.split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export default function ProfileMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  const avatarUrl = user?.user_metadata?.avatar_url;
  const name = shortName(user);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 group"
        aria-label="Profile menu"
      >
        {/* Circle avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-brand-100 group-hover:ring-brand-300 transition bg-brand-500 flex items-center justify-center shadow-lg flex-shrink-0">
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : <User size={20} className="text-white" />
          }
        </div>
        {name && (
          <span className="hidden max-w-[8rem] truncate text-sm font-semibold text-slate-800 sm:inline">{name}</span>
        )}
        <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-700 transition" />
      </button>

      {open && (
        /* Use right-0 but cap it so it never goes off screen */
        <div
          className="absolute mt-2 w-48 glass-strong rounded-xl shadow-xl py-1 z-50 text-sm"
          style={{ right: 0, maxWidth: "calc(100vw - 1.5rem)" }}
        >
          {user?.email && (
            <div className="px-4 py-2 text-xs text-gray-400 truncate border-b border-gray-100">
              {user.email}
            </div>
          )}
          <button
            onClick={() => { setOpen(false); navigate("/profile"); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition"
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
