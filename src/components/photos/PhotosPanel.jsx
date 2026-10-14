import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X, ChevronLeft, ChevronRight, Trash2, ExternalLink, Pencil } from "lucide-react";
import Modal from "../Modal";
import CrewAvatar from "../crew/CrewAvatar";
import { useTripPhotos, useAddTripPhoto, useUpdateTripPhoto, useDeleteTripPhoto } from "../../hooks/useTripPhotos";
import { preparePhoto, guessDay } from "../../utils/photoFile";
import { groupByDay, dayLabel } from "../../utils/photos";
import { theme } from "../../utils/theme";

const MAX_CAPTION = 200;

// "Photos" tab: the trip's shared album. Everyone on the trip (organizer, members and guests)
// sees every photo and can add their own; each photo is tagged to the day it was taken (from
// the file's date) and can be moved to another day or given a caption by whoever added it.
// `days` comes from describeDays. Guests pass their guestToken.
export default function PhotosPanel({ tripId, guestToken, days }) {
  const who = guestToken ? { guestToken } : { tripId };
  const album = useTripPhotos(who);
  const add = useAddTripPhoto(who);
  const input = useRef(null);
  const [progress, setProgress] = useState(null); // { done, total } while adding
  const [failures, setFailures] = useState([]); // ["IMG_1.HEIC: This photo format…"]
  const [openId, setOpenId] = useState(null);

  const photos = album.data?.photos || [];
  const groups = groupByDay(photos, days);

  // One at a time: phones run short on memory resizing several big photos at once
  const addFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setFailures([]);
    const failed = [];
    for (const [i, file] of files.entries()) {
      setProgress({ done: i, total: files.length });
      try {
        const prepared = await preparePhoto(file);
        await add.mutateAsync({ prepared, day: guessDay(file, days) });
      } catch (err) {
        failed.push(`${file.name}: ${err.message}`);
        // A full album won't take the rest either
        if (err.status === 409) break;
      }
    }
    setProgress(null);
    setFailures(failed);
  };

  const addButton = (
    <button
      onClick={() => input.current?.click()}
      disabled={!!progress}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-pink-600 px-4 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-60"
    >
      {progress ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
      {progress ? `Adding ${progress.done + 1} of ${progress.total}…` : "Add photos"}
    </button>
  );

  return (
    <div className={`mx-auto max-w-5xl rounded-2xl p-3 shadow-xl sm:p-6 ${theme.card}`}>
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 ${theme.header}`}>
        <div>
          <h2 className="text-2xl font-semibold">Trip photos</h2>
          <p className="mt-1 text-sm opacity-80">
            Everyone on this trip can see and add photos
            {photos.length > 0 && ` · ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {addButton}
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={addFiles} aria-label="Choose photos" />
      </div>

      {failures.length > 0 && (
        <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">
              {failures.length === 1 ? "One photo couldn't be added" : `${failures.length} photos couldn't be added`}
            </p>
            <button onClick={() => setFailures([])} aria-label="Dismiss" className="-m-1 rounded p-1 hover:bg-red-100">
              <X size={16} />
            </button>
          </div>
          <ul className="mt-1 list-disc pl-5">
            {failures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {album.isLoading ? (
        <div className="py-12 text-center text-gray-500">
          <Loader2 className="mx-auto animate-spin" />
        </div>
      ) : album.isError ? (
        <p className="py-8 text-center text-sm text-red-600">Couldn't load the photos: {album.error.message}</p>
      ) : photos.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-pink-600">
            <Camera size={26} />
          </span>
          <p className="text-lg font-bold text-gray-900">No photos yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
            Add photos from the trip and everyone going will see them here, sorted by day.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.title || "Photos"}>
              {g.title && <h3 className="mb-2 px-1 text-xs font-extrabold uppercase tracking-wider text-violet-700">{g.title}</h3>}
              <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2 md:grid-cols-5">
                {g.photos.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setOpenId(p.id)}
                      className="block aspect-square w-full overflow-hidden rounded-md bg-gray-100 sm:rounded-lg"
                      aria-label={p.caption ? `Photo: ${p.caption}` : `Photo by ${p.uploader.name}`}
                    >
                      {p.thumbUrl && <img src={p.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <PhotoViewer who={who} photos={groups.flatMap((g) => g.photos)} openId={openId} onOpen={setOpenId} days={days} />
    </div>
  );
}

// Full-size photo with who added it, its day and caption. Swipe or arrows for the next one.
// Whoever added it can change the caption and day; they or the organizer can delete it.
function PhotoViewer({ who, photos, openId, onOpen, days }) {
  const index = photos.findIndex((p) => p.id === openId);
  const photo = photos[index];
  const close = () => onOpen(null);
  const go = (step) => {
    const next = photos[index + step];
    if (next) onOpen(next.id);
  };
  const touch = useRef(null);

  // Arrow keys move between photos while the viewer is open
  useEffect(() => {
    if (!photo) return undefined;
    const onKey = (e) => {
      if (e.target.closest?.("input, select, textarea")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <Modal open={!!photo} onClose={close} className="flex max-h-[95vh] max-w-4xl flex-col overflow-hidden bg-black p-0 text-white">
      {photo && (
        <>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center bg-black"
            onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - (touch.current ?? e.changedTouches[0].clientX);
              touch.current = null;
              if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
            }}
          >
            {photo.url ? (
              <img key={photo.id} src={photo.url} alt={photo.caption || `Photo by ${photo.uploader.name}`} className="max-h-[65vh] w-auto max-w-full object-contain" />
            ) : (
              <p className="p-12 text-sm text-gray-300">This photo couldn't be loaded.</p>
            )}
            <button onClick={close} aria-label="Close" className="absolute right-2 top-2 rounded-full bg-black/60 p-2 hover:bg-black/80">
              <X size={20} />
            </button>
            {index > 0 && (
              <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80">
                <ChevronLeft size={22} />
              </button>
            )}
            {index < photos.length - 1 && (
              <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80">
                <ChevronRight size={22} />
              </button>
            )}
          </div>
          <PhotoDetails key={photo.id} who={who} photo={photo} days={days} position={`${index + 1} of ${photos.length}`} onDeleted={close} />
        </>
      )}
    </Modal>
  );
}

function PhotoDetails({ who, photo, days, position, onDeleted }) {
  const update = useUpdateTripPhoto(who);
  const remove = useDeleteTripPhoto(who);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(photo.caption || "");
  const [day, setDay] = useState(photo.day ? String(photo.day) : "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = days.find((d) => d.n === photo.day);
  const added = new Date(photo.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const save = (e) => {
    e.preventDefault();
    update.mutate({ id: photo.id, changes: { caption, day: day ? Number(day) : null } }, { onSuccess: () => setEditing(false) });
  };

  return (
    <div className="space-y-3 bg-white p-4 text-gray-900">
      <div className="flex items-center gap-3">
        <CrewAvatar person={photo.uploader} size="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{photo.mine ? "You" : photo.uploader.name}</p>
          <p className="truncate text-xs text-gray-500">
            {meta ? dayLabel(meta) : "Not tied to a day"} · added {added} · {position}
          </p>
        </div>
        {photo.url && (
          <a href={photo.url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Open full size" title="Open full size">
            <ExternalLink size={18} />
          </a>
        )}
        {photo.mine && !editing && (
          <button onClick={() => setEditing(true)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Edit caption and day" title="Edit">
            <Pencil size={18} />
          </button>
        )}
        {photo.canDelete && (
          <button onClick={() => setConfirmDelete(true)} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete photo" title="Delete">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="space-y-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={MAX_CAPTION}
            placeholder="Add a caption"
            aria-label="Caption"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-violet-500 focus:outline-none sm:text-sm"
          />
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            aria-label="Day"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-violet-500 focus:outline-none sm:text-sm"
          >
            <option value="">Not tied to a day</option>
            {days.map((d) => (
              <option key={d.n} value={d.n}>
                {dayLabel(d)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={update.isPending} className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              {update.isPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
          {update.isError && <p className="text-sm text-red-600">{update.error.message}</p>}
        </form>
      ) : (
        photo.caption && <p className="text-sm text-gray-800">{photo.caption}</p>
      )}

      {confirmDelete && (
        <div className="rounded-lg bg-red-50 p-3 text-sm">
          <p className="font-semibold text-red-800">
            Delete this photo for everyone on the trip?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => remove.mutate(photo.id, { onSuccess: onDeleted })}
              disabled={remove.isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold text-gray-700">
              Keep it
            </button>
          </div>
          {remove.isError && <p className="mt-2 text-red-600">{remove.error.message}</p>}
        </div>
      )}
    </div>
  );
}
