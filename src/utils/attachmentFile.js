// Gets a chosen photo or PDF ready to attach to a travel document (issue #55).
// Photos are redrawn onto a canvas and saved as a new JPEG: that drops all metadata (EXIF,
// including the GPS location a phone camera records), applies the photo's rotation, and
// shrinks very large photos. The server strips metadata again and checks the file's content.
import { ATTACHMENT_MAX_BYTES } from "./profile";

const MAX_SIDE = 2400; // px; plenty to read a passport page
const JPEG_QUALITY = 0.9;

const tooBig = () => new Error("Files can be up to 10 MB.");

export async function prepareAttachment(file) {
  if (!file) throw new Error("Choose a file to attach.");

  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    if (file.size > ATTACHMENT_MAX_BYTES) throw tooBig();
    return file;
  }
  if (!file.type.startsWith("image/")) throw new Error("Attach a photo or a PDF.");

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo format isn't supported here. Please use a JPEG or PNG.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("Couldn't read this photo. Please try another.");
  if (blob.size > ATTACHMENT_MAX_BYTES) throw tooBig();
  const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

// "1.2 MB", "340 KB"
export const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
