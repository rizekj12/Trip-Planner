// Gets a chosen photo or PDF ready to attach to a travel document (issue #55). Photos are
// re-encoded as JPEG (src/utils/photoFile.js), which drops their metadata, e.g. GPS location.
import { ATTACHMENT_MAX_BYTES } from "./profile";
import { resizeToJpeg } from "./photoFile";

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

  const blob = await resizeToJpeg(file, MAX_SIDE, JPEG_QUALITY);
  if (blob.size > ATTACHMENT_MAX_BYTES) throw tooBig();
  const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

// "1.2 MB", "340 KB"
export const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
