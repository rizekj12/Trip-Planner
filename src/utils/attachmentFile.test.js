// Choosing a file to attach (photos are re-encoded in a real browser; jsdom has no canvas,
// so these cover the checks around it)
import { describe, test, expect } from "vitest";
import { prepareAttachment, formatSize } from "./attachmentFile";

const file = (bytes, name, type) => new File([new Uint8Array(bytes)], name, { type });

describe("prepareAttachment", () => {
  test("PDFs are attached as they are", async () => {
    const pdf = file(10, "scan.pdf", "application/pdf");
    expect(await prepareAttachment(pdf)).toBe(pdf);
  });

  test("files over 10 MB are refused", async () => {
    await expect(prepareAttachment(file(10 * 1024 * 1024 + 1, "big.pdf", "application/pdf"))).rejects.toThrow("10 MB");
  });

  test("only photos and PDFs", async () => {
    await expect(prepareAttachment(file(10, "notes.docx", "application/vnd.openxmlformats"))).rejects.toThrow("photo or a PDF");
    await expect(prepareAttachment(null)).rejects.toThrow("Choose a file");
  });
});

test("formatSize", () => {
  expect(formatSize(340 * 1024)).toBe("340 KB");
  expect(formatSize(1.25 * 1024 * 1024)).toBe("1.3 MB");
  expect(formatSize(10)).toBe("1 KB");
});
