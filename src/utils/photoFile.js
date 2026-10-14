// Photos chosen in the browser, redrawn onto a canvas and saved as a new JPEG. That drops all
// metadata (EXIF, including the GPS location a phone camera records), applies the photo's
// rotation, and shrinks large photos. The server strips metadata again and checks the bytes.

// A JPEG Blob of `file` at most `maxSide` px on its longest side
export async function resizeToJpeg(file, maxSide, quality) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo format isn't supported here. Please use a JPEG or PNG.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Couldn't read this photo. Please try another.");
  return blob;
}

// ---- The trip photo album (server/tripPhotos.js) ----

export const ALBUM_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const ALBUM_MAX_SIDE = 2048; // px; sharp on a phone or laptop, a fraction of the original
const THUMB_MAX_SIDE = 480; // px; grid tiles

// { photo, thumbnail } JPEG Blobs ready to add to the album
export async function preparePhoto(file) {
  if (!file?.type?.startsWith("image/")) throw new Error(`${file?.name || "That file"} isn't a photo.`);
  const photo = await resizeToJpeg(file, ALBUM_MAX_SIDE, 0.85);
  if (photo.size > ALBUM_PHOTO_MAX_BYTES) throw new Error("Photos can be up to 10 MB.");
  const thumbnail = await resizeToJpeg(photo, THUMB_MAX_SIDE, 0.8);
  return { photo, thumbnail };
}

// The trip day (1-based) a photo was probably taken on, from the file's date, or null.
// `days` comes from describeDays (each has its date as `iso`). Phones set a camera photo's
// file date to when it was taken; anything outside the trip gets no day.
export function guessDay(file, days) {
  if (!file?.lastModified || !days?.length) return null;
  const d = new Date(file.lastModified);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const match = days.find((day) => day.iso === iso);
  return match ? match.n : null;
}
