// Uploads are identified by their bytes, and photos lose their metadata (issue #55)
import { describe, test, expect } from "vitest";
import { sniffType, cleanUpload } from "./fileScrub.js";
import { JPEG_WITH_GPS, PNG_WITH_TEXT, PDF } from "./test/sampleFiles.js";

describe("sniffType", () => {
  test("by content, not name", () => {
    expect(sniffType(JPEG_WITH_GPS)).toBe("image/jpeg");
    expect(sniffType(PNG_WITH_TEXT)).toBe("image/png");
    expect(sniffType(PDF)).toBe("application/pdf");
    expect(sniffType(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffType(Buffer.from("MZ executable"))).toBeNull();
  });
});

describe("cleanUpload", () => {
  test("a JPEG loses its EXIF (GPS) and comments, and keeps the image", () => {
    const { type, bytes } = cleanUpload(JPEG_WITH_GPS);
    const text = bytes.toString("latin1");
    expect(type).toBe("image/jpeg");
    expect(text).not.toContain("GPS-LAT");
    expect(text).not.toContain("Taken at home");
    expect(text).toContain("JFIF");
    expect(text).toContain("QUANT-TABLE");
    expect(text).toContain("IMAGE-DATA-BYTES");
    expect(bytes.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]));
  });

  test("a PNG loses its text chunks and keeps the image", () => {
    const { bytes } = cleanUpload(PNG_WITH_TEXT);
    const text = bytes.toString("latin1");
    expect(text).not.toContain("Passport of Alex");
    expect(text).toContain("IHDR");
    expect(text).toContain("PIXELS");
    expect(text).toContain("IEND");
  });

  test("PDFs pass through; anything else is refused", () => {
    expect(cleanUpload(PDF)).toEqual({ type: "application/pdf", bytes: PDF });
    expect(cleanUpload(Buffer.from("hello")).error).toMatch(/JPEG or PNG/);
  });

  test("a damaged JPEG is refused", () => {
    expect(cleanUpload(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x01, 0x02])).error).toMatch(/damaged/);
    expect(cleanUpload(JPEG_WITH_GPS.subarray(0, 30)).error).toMatch(/damaged/); // cut off before the image
    expect(cleanUpload(PNG_WITH_TEXT.subarray(0, 40)).error).toMatch(/damaged/);
  });
});
