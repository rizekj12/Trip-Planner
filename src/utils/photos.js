// The trip's shared photo album (server/tripPhotos.js). Everyone on the trip sees every photo.
// `who` is { tripId } for the organizer or a signed-in member, or { guestToken } for a guest.
import { apiJson } from "./api";

const albumPath = ({ tripId, guestToken }) => (guestToken ? `/api/guest/${guestToken}/photos` : `/api/trips/${tripId}/photos`);
const asTraveler = (who) => ({ auth: !who.guestToken });

// { photos: [{ id, day, caption, uploader: { name, avatarUrl }, mine, canDelete, createdAt, url, thumbUrl }], maxPhotos }
export const getTripPhotos = (who) => apiJson("GET", albumPath(who), null, asTraveler(who));

// Adds a photo prepared by preparePhoto (src/utils/photoFile.js); `day` is 1-based or null.
// Sent as one body, thumbnail first, so the photo and its thumbnail are saved together.
// Resolves with the updated album.
export const addTripPhoto = (who, { photo, thumbnail }, day) =>
  apiJson("POST", albumPath(who), new Blob([thumbnail, photo], { type: "application/octet-stream" }), {
    ...asTraveler(who),
    headers: { "X-Thumbnail-Length": String(thumbnail.size), ...(day && { "X-Photo-Day": String(day) }) },
  });

// changes: { caption?, day? } (only the person who added it)
export const updateTripPhoto = (who, id, changes) => apiJson("PATCH", `${albumPath(who)}/${id}`, changes, asTraveler(who));

export const deleteTripPhoto = (who, id) => apiJson("DELETE", `${albumPath(who)}/${id}`, null, asTraveler(who));

// Organizer only, right before deleting the trip
export const emptyTripAlbum = (tripId) => apiJson("DELETE", `/api/trips/${tripId}/photos`, null, { auth: true });

// "Day 2 · Wed, Apr 3 · Kyoto"
export const dayLabel = (meta) => [`Day ${meta.n}`, meta.longDate, meta.city].filter(Boolean).join(" · ");

// Photos grouped by day, in trip order, with untagged ones last. Each group: { key, title, photos }.
export function groupByDay(photos, days) {
  const groups = days
    .map((meta) => ({ key: `day-${meta.n}`, title: dayLabel(meta), photos: photos.filter((p) => p.day === meta.n) }))
    .filter((g) => g.photos.length);
  const other = photos.filter((p) => !p.day || p.day > days.length);
  if (other.length) groups.push({ key: "other", title: groups.length ? "Other photos" : "", photos: other });
  return groups;
}
