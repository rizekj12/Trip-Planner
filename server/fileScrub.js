// Checks what an uploaded file really is (from its bytes, not its name or the type the browser
// claims) and strips metadata from photos before they're stored (issue #55). The browser
// already re-encodes photos, which drops metadata; this is the server's own check, since the
// browser can be bypassed. Passport photos can carry the GPS location they were taken at.

// "image/jpeg" | "image/png" | "application/pdf" | null
export function sniffType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return null;
}

// JPEG segments that can hold personal data: APP1 (EXIF incl. GPS, XMP), APP13 (IPTC),
// COM (comments). Everything else (image data, color profile, JFIF) is kept as is.
const JPEG_DROP = new Set([0xe1, 0xed, 0xfe]);

export function stripJpegMetadata(bytes) {
  const out = [bytes.subarray(0, 2)]; // SOI
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) throw new Error("Not a valid JPEG");
    const marker = bytes[i + 1];
    if (marker === 0xd9) break; // EOI
    if (marker === 0xda) {
      // Start of scan: the compressed image follows; keep the rest as is
      out.push(bytes.subarray(i));
      return Buffer.concat(out);
    }
    const length = bytes.readUInt16BE(i + 2);
    if (length < 2 || i + 2 + length > bytes.length) throw new Error("Not a valid JPEG");
    const segment = bytes.subarray(i, i + 2 + length);
    if (!JPEG_DROP.has(marker)) out.push(segment);
    i += 2 + length;
  }
  // Never reached the image data
  throw new Error("Not a valid JPEG");
}

// PNG chunks that can hold personal data: EXIF and text (author, location, comments), and time
const PNG_DROP = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);

export function stripPngMetadata(bytes) {
  const out = [bytes.subarray(0, 8)];
  let i = 8;
  let ended = false;
  while (i + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(i);
    if (i + 12 + length > bytes.length) throw new Error("Not a valid PNG");
    const type = bytes.subarray(i + 4, i + 8).toString("latin1");
    const chunk = bytes.subarray(i, i + 12 + length);
    if (!PNG_DROP.has(type)) out.push(chunk);
    i += 12 + length;
    if (type === "IEND") {
      ended = true;
      break;
    }
  }
  if (!ended) throw new Error("Not a valid PNG");
  return Buffer.concat(out);
}

// { type, bytes } with metadata removed, or { error } for anything that isn't a JPEG, PNG or PDF
export function cleanUpload(bytes) {
  const type = sniffType(bytes);
  if (!type) return { error: "Only photos (JPEG or PNG) and PDFs can be attached." };
  try {
    if (type === "image/jpeg") return { type, bytes: stripJpegMetadata(bytes) };
    if (type === "image/png") return { type, bytes: stripPngMetadata(bytes) };
    return { type, bytes };
  } catch {
    return { error: "That file looks damaged. Please try another." };
  }
}
