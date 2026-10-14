// Tiny hand-built files for upload tests: a JPEG and a PNG carrying private metadata
const seg = (marker, payload) => {
  const body = Buffer.from(payload, "latin1");
  const len = Buffer.alloc(2);
  len.writeUInt16BE(body.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), len, body]);
};

export const JPEG_WITH_GPS = Buffer.concat([
  Buffer.from([0xff, 0xd8]), // SOI
  seg(0xe0, "JFIF\0\x01\x01\0\0\x01\0\x01\0\0"), // APP0 (kept)
  seg(0xe1, "Exif\0\0GPS-LAT-40.7128-LON-74.0060"), // APP1: EXIF with location (dropped)
  seg(0xfe, "Taken at home"), // COM (dropped)
  seg(0xdb, "\0QUANT-TABLE"), // DQT (kept)
  seg(0xda, "\0\x03SCAN"), // SOS, then image data
  Buffer.from("IMAGE-DATA-BYTES", "latin1"),
  Buffer.from([0xff, 0xd9]), // EOI
]);

const chunk = (type, data) => {
  const body = Buffer.from(data, "latin1");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  return Buffer.concat([len, Buffer.from(type, "latin1"), body, Buffer.alloc(4)]); // CRC not checked
};

export const PNG_WITH_TEXT = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", "\0\0\0\x01\0\0\0\x01\x08\x02\0\0\0"),
  chunk("tEXt", "Comment\0Passport of Alex at 12 Main St"),
  chunk("IDAT", "PIXELS"),
  chunk("IEND", ""),
]);

export const PDF = Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF", "latin1");
