import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, User } from "lucide-react";
import { supabase } from "../utils/supabase";
import SkyBackground from "./SkyBackground";

export default function ProfilePage({ onBack }) {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      setFullName(data.user.user_metadata?.full_name ?? "");
      setAvatarUrl(data.user.user_metadata?.avatar_url ?? null);
    });
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setMsg(null);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setMsg({ type: "error", text: "Upload failed: " + uploadError.message });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: url },
    });

    if (updateError) {
      setMsg({ type: "error", text: "Failed to save avatar." });
    } else {
      setAvatarUrl(url);
      setMsg({ type: "success", text: "Profile picture updated." });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    setSaving(false);
    setMsg(error
      ? { type: "error", text: error.message }
      : { type: "success", text: "Profile saved." }
    );
  };

  return (
    <div className="min-h-screen text-white relative">
      <SkyBackground />

      {/* Back button — top left */}
      <div className="relative px-6 pt-14 md:px-12">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/15 text-white backdrop-blur ring-1 ring-white/20 hover:bg-white/25 transition text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      {/* Centered card */}
      <div className="flex flex-col items-center justify-center px-4 py-10">
        {/* Avatar above the card */}
        <div className="relative mb-6 z-10">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative w-36 h-36 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center shadow-2xl ring-4 ring-white/50 hover:ring-white transition group"
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : <User size={56} className="text-white" />
            }
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
              {uploading
                ? <Loader2 size={28} className="animate-spin text-white" />
                : <Camera size={28} className="text-white" />
              }
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white/15 backdrop-blur-md rounded-3xl ring-1 ring-white/25 shadow-2xl pt-8 pb-10 px-8">
          <h1 className="text-2xl font-extrabold text-center text-white drop-shadow mb-1">
            My Profile
          </h1>
          <p className="text-center text-white/50 text-xs mb-8">
            Click your avatar to change your photo
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 rounded-xl bg-white/90 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-white/20 text-white/50 text-sm cursor-not-allowed"
              />
            </div>

            {msg && (
              <div className={`rounded-xl px-4 py-2.5 text-sm text-center ${msg.type === "success" ? "bg-green-500/30 text-green-100" : "bg-red-500/30 text-red-100"}`}>
                {msg.text}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm mt-4"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
