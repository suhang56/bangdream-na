import { describe, expect, it } from "vitest";
import {
  ExifStripError,
  sniffMagicByte,
  stripExifAndExtractDimensions,
} from "./exif-strip";

function bytes(...n: number[]): Uint8Array {
  return new Uint8Array(n);
}

function asBuf(u: Uint8Array): ArrayBuffer {
  // Force ArrayBuffer (not SharedArrayBuffer) for strict TS.
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

function be16(v: number): Uint8Array {
  return bytes((v >> 8) & 0xff, v & 0xff);
}

function be32(v: number): Uint8Array {
  return bytes((v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff);
}

function le32(v: number): Uint8Array {
  return bytes(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);
}

// Build a minimal JPEG with an APP0 (JFIF), an APP1 (EXIF), an SOF0, and SOS+EOI.
// Width and height encoded in SOF0.
function buildJpegWithExif(opts: {
  width: number;
  height: number;
  exifPayload: Uint8Array;
  withApp2?: boolean;
}): ArrayBuffer {
  const soi = bytes(0xff, 0xd8);
  // APP0 JFIF (kept)
  const app0Body = bytes(
    0x4a, 0x46, 0x49, 0x46, 0x00, // 'JFIF\0'
    0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  );
  const app0 = concatU8(bytes(0xff, 0xe0), be16(app0Body.length + 2), app0Body);
  // APP1 EXIF (stripped)
  const exifHeader = bytes(0x45, 0x78, 0x69, 0x66, 0x00, 0x00); // 'Exif\0\0'
  const app1Body = concatU8(exifHeader, opts.exifPayload);
  const app1 = concatU8(bytes(0xff, 0xe1), be16(app1Body.length + 2), app1Body);
  // Optional APP2 ICC (stripped)
  let app2: Uint8Array = new Uint8Array(0);
  if (opts.withApp2) {
    const icc = new Uint8Array(64).fill(0x42);
    app2 = concatU8(bytes(0xff, 0xe2), be16(icc.length + 2), icc);
  }
  // SOF0: [length=11][precision=8][height(2)][width(2)][components=3][3*3 bytes]
  const sof0Body = concatU8(
    bytes(0x08),
    be16(opts.height),
    be16(opts.width),
    bytes(0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01),
  );
  const sof0 = concatU8(bytes(0xff, 0xc0), be16(sof0Body.length + 2), sof0Body);
  // SOS: length=12 then 10 bytes; followed by scan data (1 byte) + EOI
  const sosBody = bytes(0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00);
  const sos = concatU8(bytes(0xff, 0xda), be16(sosBody.length + 2), sosBody);
  const scan = bytes(0xaa, 0xbb, 0xcc);
  const eoi = bytes(0xff, 0xd9);
  return concatBuffers(soi, app0, app1, app2, sof0, sos, scan, eoi);
}

function concatU8(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function concatBuffers(...parts: Uint8Array[]): ArrayBuffer {
  return asBuf(concatU8(...parts));
}

// PNG: 8-byte sig + IHDR + tEXt + iTXt + IDAT + IEND
function buildPngWithText(opts: {
  width: number;
  height: number;
  withText?: boolean;
}): ArrayBuffer {
  const sig = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  const ihdrData = concatU8(
    be32(opts.width),
    be32(opts.height),
    bytes(0x08, 0x02, 0x00, 0x00, 0x00),
  );
  const ihdr = pngChunk("IHDR", ihdrData);
  const textChunks: Uint8Array[] = [];
  if (opts.withText !== false) {
    textChunks.push(pngChunk("tEXt", strBytes("Comment\0secret-gps-location")));
    textChunks.push(pngChunk("iTXt", strBytes("Author\0\0\0\0\0secret-user")));
    textChunks.push(pngChunk("eXIf", new Uint8Array(20).fill(0xde)));
    textChunks.push(pngChunk("tIME", new Uint8Array(7).fill(0x01)));
  }
  const idat = pngChunk("IDAT", bytes(0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01));
  const iend = pngChunk("IEND", new Uint8Array(0));
  return concatBuffers(sig, ihdr, ...textChunks, idat, iend);
}

function strBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const len = be32(data.length);
  const typeB = strBytes(type);
  // CRC is computed by skipping in test fixtures (parser doesn't verify CRC).
  const crc = bytes(0, 0, 0, 0);
  return concatU8(len, typeB, data, crc);
}

// WebP VP8 lossy with EXIF chunk
function buildWebpWithExif(opts: {
  width: number;
  height: number;
  withExif?: boolean;
}): ArrayBuffer {
  // VP8 chunk: 10 bytes minimal (start code + dimensions at bytes 6..9)
  const vp8Data = new Uint8Array(20);
  vp8Data[3] = 0x9d;
  vp8Data[4] = 0x01;
  vp8Data[5] = 0x2a;
  vp8Data[6] = opts.width & 0xff;
  vp8Data[7] = (opts.width >> 8) & 0xff;
  vp8Data[8] = opts.height & 0xff;
  vp8Data[9] = (opts.height >> 8) & 0xff;
  const vp8 = webpChunk("VP8 ", vp8Data);
  const exifChunk = opts.withExif !== false
    ? webpChunk("EXIF", strBytes("ExifGPS:35.6762N,139.6503E,secret"))
    : new Uint8Array(0);
  const xmpChunk = opts.withExif !== false
    ? webpChunk("XMP ", strBytes("<x:xmpmeta>secret</x:xmpmeta>"))
    : new Uint8Array(0);

  const body = concatU8(strBytes("WEBP"), vp8, exifChunk, xmpChunk);
  const riff = concatU8(strBytes("RIFF"), le32(body.length), body);
  return asBuf(riff);
}

function webpChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const padded = data.length % 2 === 1 ? 1 : 0;
  const out = new Uint8Array(8 + data.length + padded);
  out.set(strBytes(fourcc), 0);
  out.set(le32(data.length), 4);
  out.set(data, 8);
  return out;
}

describe("sniffMagicByte", () => {
  it("detects JPEG signature FF D8 FF", () => {
    const buf = asBuf(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00));
    expect(sniffMagicByte(buf)).toBe("image/jpeg");
  });

  it("detects PNG signature 89 50 4E 47 0D 0A 1A 0A", () => {
    const buf = asBuf(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a));
    expect(sniffMagicByte(buf)).toBe("image/png");
  });

  it("detects WebP signature RIFF...WEBP", () => {
    const buf = concatBuffers(
      strBytes("RIFF"),
      bytes(0, 0, 0, 0),
      strBytes("WEBP"),
    );
    expect(sniffMagicByte(buf)).toBe("image/webp");
  });

  it("rejects PDF magic", () => {
    const buf = asBuf(bytes(0x25, 0x50, 0x44, 0x46, 0x2d));
    expect(sniffMagicByte(buf)).toBeNull();
  });

  it("rejects empty buffer", () => {
    expect(sniffMagicByte(new ArrayBuffer(0))).toBeNull();
  });

  it("rejects truncated JPEG (only 2 bytes)", () => {
    expect(sniffMagicByte(asBuf(bytes(0xff, 0xd8)))).toBeNull();
  });
});

describe("stripExifAndExtractDimensions — JPEG", () => {
  it("strips APP1 EXIF segment and returns dimensions", async () => {
    const exifPayload = new Uint8Array(100).fill(0xab);
    const input = buildJpegWithExif({ width: 800, height: 600, exifPayload });
    const result = await stripExifAndExtractDimensions(input, "image/jpeg");
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.contentType).toBe("image/jpeg");
    expect(result.body.byteLength).toBeLessThan(input.byteLength);
    // Verify no APP1 marker (FF E1) survives.
    const out = new Uint8Array(result.body);
    for (let i = 0; i < out.length - 1; i += 1) {
      if (out[i] === 0xff && out[i + 1] === 0xe1) {
        throw new Error(`APP1 survived at offset ${i}`);
      }
    }
  });

  it("strips APP2 ICC segment when present", async () => {
    const exifPayload = new Uint8Array(50).fill(0xab);
    const input = buildJpegWithExif({
      width: 1024,
      height: 768,
      exifPayload,
      withApp2: true,
    });
    const result = await stripExifAndExtractDimensions(input, "image/jpeg");
    const out = new Uint8Array(result.body);
    for (let i = 0; i < out.length - 1; i += 1) {
      if (out[i] === 0xff && out[i + 1] === 0xe2) {
        throw new Error(`APP2 survived at offset ${i}`);
      }
    }
  });

  it("throws on declared-content-type mismatch", async () => {
    const input = buildJpegWithExif({
      width: 100,
      height: 100,
      exifPayload: new Uint8Array(0),
    });
    await expect(
      stripExifAndExtractDimensions(input, "image/png"),
    ).rejects.toBeInstanceOf(ExifStripError);
  });

  it("throws ExifStripError on malformed JPEG (no SOI)", async () => {
    const bad = asBuf(bytes(0xff, 0xd9, 0x00, 0x00));
    await expect(
      stripExifAndExtractDimensions(bad, "image/jpeg"),
    ).rejects.toBeInstanceOf(ExifStripError);
  });
});

describe("stripExifAndExtractDimensions — PNG", () => {
  it("strips tEXt/iTXt/eXIf/tIME chunks", async () => {
    const input = buildPngWithText({ width: 320, height: 240 });
    const result = await stripExifAndExtractDimensions(input, "image/png");
    expect(result.width).toBe(320);
    expect(result.height).toBe(240);
    const text = new TextDecoder("latin1").decode(result.body);
    expect(text).not.toContain("secret-gps-location");
    expect(text).not.toContain("secret-user");
  });

  it("returns dimensions from IHDR", async () => {
    const input = buildPngWithText({
      width: 4096,
      height: 2048,
      withText: false,
    });
    const result = await stripExifAndExtractDimensions(input, "image/png");
    expect(result.width).toBe(4096);
    expect(result.height).toBe(2048);
  });

  it("throws on bad PNG header", async () => {
    const bad = asBuf(bytes(0x89, 0x50, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00));
    await expect(
      stripExifAndExtractDimensions(bad, "image/png"),
    ).rejects.toBeInstanceOf(ExifStripError);
  });
});

describe("stripExifAndExtractDimensions — WebP", () => {
  it("strips EXIF and XMP chunks, rewrites RIFF size", async () => {
    const input = buildWebpWithExif({ width: 640, height: 480 });
    const result = await stripExifAndExtractDimensions(input, "image/webp");
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
    const out = new Uint8Array(result.body);
    const text = new TextDecoder("latin1").decode(out);
    expect(text).not.toContain("ExifGPS");
    expect(text).not.toContain("xmpmeta");
    // RIFF size at bytes 4..7 (LE) should equal out.length - 8.
    const size =
      out[4] | (out[5] << 8) | (out[6] << 16) | (out[7] << 24);
    expect(size).toBe(out.length - 8);
  });

  it("returns dimensions when no metadata", async () => {
    const input = buildWebpWithExif({
      width: 200,
      height: 200,
      withExif: false,
    });
    const result = await stripExifAndExtractDimensions(input, "image/webp");
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it("throws on bad WebP header", async () => {
    const bad = concatBuffers(strBytes("RIFF"), bytes(0, 0, 0, 0), strBytes("WEBM"));
    await expect(
      stripExifAndExtractDimensions(bad, "image/webp"),
    ).rejects.toBeInstanceOf(ExifStripError);
  });
});

describe("stripExifAndExtractDimensions — unsupported", () => {
  it("throws ExifStripError(unsupported) for PDF bytes", async () => {
    const pdf = asBuf(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34));
    await expect(
      stripExifAndExtractDimensions(pdf, "image/jpeg"),
    ).rejects.toBeInstanceOf(ExifStripError);
  });

  it("throws ExifStripError(unsupported) for empty buffer", async () => {
    await expect(
      stripExifAndExtractDimensions(new ArrayBuffer(0), "image/jpeg"),
    ).rejects.toBeInstanceOf(ExifStripError);
  });
});
