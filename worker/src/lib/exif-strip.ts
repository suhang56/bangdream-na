// Pure-JS EXIF stripper + dimension reader + magic-byte sniffer for JPEG / PNG / WebP.
// Server-side mandatory pre-R2-PUT path: GPS / camera serial / timestamps leak via
// CDN URL is unacceptable. CF Image Resizing strip-metadata only operates on served
// URLs (origin must already be public), not on the upload path. Roll-our-own is
// ~0 bundle cost and handles all 3 MIME types we allow; external libs either
// read-only (exifr) or single-format (piexifjs) or Node-stream (exif-be-gone).

export type SupportedMime = "image/jpeg" | "image/png" | "image/webp";

export interface StripResult {
  body: ArrayBuffer;
  contentType: SupportedMime;
  width: number;
  height: number;
}

export type ExifStripErrorCode = "unsupported" | "parse_failed" | "malformed";

export class ExifStripError extends Error {
  public readonly code: ExifStripErrorCode;
  constructor(code: ExifStripErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ExifStripError";
    this.code = code;
  }
}

const JPEG_SIG = [0xff, 0xd8, 0xff];
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_SIG = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIG = [0x57, 0x45, 0x42, 0x50];

export function sniffMagicByte(input: ArrayBuffer): SupportedMime | null {
  const u = new Uint8Array(input);
  if (u.length >= 3 && matchesAt(u, 0, JPEG_SIG)) return "image/jpeg";
  if (u.length >= 8 && matchesAt(u, 0, PNG_SIG)) return "image/png";
  if (
    u.length >= 12 &&
    matchesAt(u, 0, RIFF_SIG) &&
    matchesAt(u, 8, WEBP_SIG)
  ) {
    return "image/webp";
  }
  return null;
}

function matchesAt(u: Uint8Array, offset: number, sig: number[]): boolean {
  for (let i = 0; i < sig.length; i += 1) {
    if (u[offset + i] !== sig[i]) return false;
  }
  return true;
}

export async function stripExifAndExtractDimensions(
  input: ArrayBuffer,
  declaredContentType: string,
): Promise<StripResult> {
  const sniffed = sniffMagicByte(input);
  if (!sniffed) {
    throw new ExifStripError("unsupported", "no magic byte match");
  }
  const declared = declaredContentType.toLowerCase();
  if (declared !== sniffed) {
    throw new ExifStripError(
      "unsupported",
      `declared ${declared} does not match magic ${sniffed}`,
    );
  }
  if (sniffed === "image/jpeg") return stripJpeg(input);
  if (sniffed === "image/png") return stripPng(input);
  return stripWebp(input);
}

// JPEG: SOI + marker segments. Skip APP1 (Exif/XMP) + APP2 (ICC redundant) +
// APP3..APP15 (proprietary metadata). Keep APP0 (JFIF) and APP14 (Adobe colorspace)
// because some decoders fall back to these for chroma/encoding hints. SOF{0..3}
// segments carry width/height.
function stripJpeg(input: ArrayBuffer): StripResult {
  const src = new Uint8Array(input);
  if (src.length < 4 || src[0] !== 0xff || src[1] !== 0xd8) {
    throw new ExifStripError("malformed", "missing SOI");
  }

  const out: number[] = [0xff, 0xd8];
  let width = 0;
  let height = 0;
  let i = 2;

  while (i < src.length) {
    if (src[i] !== 0xff) {
      throw new ExifStripError("malformed", `expected 0xFF at ${i}`);
    }
    // Skip fill bytes (0xFF padding).
    while (i < src.length && src[i] === 0xff) i += 1;
    if (i >= src.length) break;
    const marker = src[i];
    i += 1;

    if (marker === 0xd9) {
      // EOI
      out.push(0xff, 0xd9);
      break;
    }
    if (marker === 0xda) {
      // SOS — copy SOS segment then everything after until EOI verbatim.
      if (i + 1 >= src.length) {
        throw new ExifStripError("malformed", "truncated SOS");
      }
      const len = (src[i] << 8) | src[i + 1];
      if (i + len > src.length) {
        throw new ExifStripError("malformed", "SOS length overflow");
      }
      out.push(0xff, 0xda);
      for (let k = i; k < i + len; k += 1) out.push(src[k]);
      i += len;
      // Now copy entropy-coded scan data until next non-stuffed marker (0xFF 0x??).
      while (i < src.length) {
        const b = src[i];
        out.push(b);
        i += 1;
        if (b === 0xff && i < src.length) {
          const nxt = src[i];
          if (nxt === 0x00) {
            out.push(0x00);
            i += 1;
          } else if (nxt >= 0xd0 && nxt <= 0xd7) {
            out.push(nxt);
            i += 1;
          } else {
            // Real marker — rewind so outer loop sees the 0xFF.
            out.pop();
            i -= 1;
            break;
          }
        }
      }
      continue;
    }

    // Standalone markers (no length field).
    if (
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      out.push(0xff, marker);
      continue;
    }

    if (i + 1 >= src.length) {
      throw new ExifStripError("malformed", "truncated marker length");
    }
    const segLen = (src[i] << 8) | src[i + 1];
    if (segLen < 2 || i + segLen > src.length) {
      throw new ExifStripError("malformed", `bad segment length at marker 0x${marker.toString(16)}`);
    }

    const isStripped =
      marker === 0xe1 || // APP1 (Exif, XMP)
      marker === 0xe2 || // APP2 (ICC) — kept-out per spec; if needed for color critical apps, re-add
      (marker >= 0xe3 && marker <= 0xef) || // APP3..APP15 metadata
      marker === 0xfe; // COM (comment)

    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3
    ) {
      // SOF: [length(2)][precision(1)][height(2)][width(2)]
      if (segLen < 7) {
        throw new ExifStripError("malformed", "SOF too short");
      }
      const segBase = i;
      height = (src[segBase + 3] << 8) | src[segBase + 4];
      width = (src[segBase + 5] << 8) | src[segBase + 6];
    }

    if (!isStripped) {
      out.push(0xff, marker);
      for (let k = i; k < i + segLen; k += 1) out.push(src[k]);
    }
    i += segLen;
  }

  if (width <= 0 || height <= 0) {
    throw new ExifStripError("parse_failed", "no SOF dimensions");
  }
  return {
    body: bytesToBuffer(out),
    contentType: "image/jpeg",
    width,
    height,
  };
}

// PNG chunk layout: 8-byte sig + [length(4)][type(4)][data][crc(4)]
// Strip metadata chunks: tEXt, zTXt, iTXt, eXIf, tIME.
function stripPng(input: ArrayBuffer): StripResult {
  const src = new Uint8Array(input);
  if (src.length < 8 + 25 || !matchesAt(src, 0, PNG_SIG)) {
    throw new ExifStripError("malformed", "bad PNG header");
  }

  const out: number[] = [];
  for (let k = 0; k < 8; k += 1) out.push(src[k]);

  let width = 0;
  let height = 0;
  let i = 8;

  while (i < src.length) {
    if (i + 8 > src.length) {
      throw new ExifStripError("malformed", "truncated PNG chunk header");
    }
    const len =
      (src[i] << 24) |
      (src[i + 1] << 16) |
      (src[i + 2] << 8) |
      src[i + 3];
    const typeBytes = [src[i + 4], src[i + 5], src[i + 6], src[i + 7]];
    const typeStr = String.fromCharCode(...typeBytes);
    const chunkEnd = i + 8 + len + 4;
    if (chunkEnd > src.length || len < 0) {
      throw new ExifStripError("malformed", `PNG chunk ${typeStr} overflow`);
    }

    if (typeStr === "IHDR") {
      if (len < 8) {
        throw new ExifStripError("malformed", "IHDR too short");
      }
      const base = i + 8;
      width =
        (src[base] << 24) |
        (src[base + 1] << 16) |
        (src[base + 2] << 8) |
        src[base + 3];
      height =
        (src[base + 4] << 24) |
        (src[base + 5] << 16) |
        (src[base + 6] << 8) |
        src[base + 7];
    }

    const drop =
      typeStr === "tEXt" ||
      typeStr === "zTXt" ||
      typeStr === "iTXt" ||
      typeStr === "eXIf" ||
      typeStr === "tIME";

    if (!drop) {
      for (let k = i; k < chunkEnd; k += 1) out.push(src[k]);
    }

    i = chunkEnd;
    if (typeStr === "IEND") {
      // Anything trailing IEND is non-conformant; drop it.
      break;
    }
  }

  if (width <= 0 || height <= 0) {
    throw new ExifStripError("parse_failed", "no IHDR dimensions");
  }
  return {
    body: bytesToBuffer(out),
    contentType: "image/png",
    width,
    height,
  };
}

// WebP RIFF: 'RIFF' + size(4 LE) + 'WEBP' + chunks [fourcc(4)][size(4 LE)][data][pad?]
// Strip EXIF, XMP, ICCP. Each chunk is padded to even length.
function stripWebp(input: ArrayBuffer): StripResult {
  const src = new Uint8Array(input);
  if (
    src.length < 12 ||
    !matchesAt(src, 0, RIFF_SIG) ||
    !matchesAt(src, 8, WEBP_SIG)
  ) {
    throw new ExifStripError("malformed", "bad WebP header");
  }

  const out: number[] = [];
  // We emit RIFF + placeholder size + WEBP first, then chunks. Patch size at end.
  for (let k = 0; k < 4; k += 1) out.push(src[k]); // 'RIFF'
  out.push(0, 0, 0, 0); // size placeholder
  for (let k = 8; k < 12; k += 1) out.push(src[k]); // 'WEBP'

  let width = 0;
  let height = 0;
  let i = 12;

  while (i < src.length) {
    if (i + 8 > src.length) break;
    const fourcc = String.fromCharCode(src[i], src[i + 1], src[i + 2], src[i + 3]);
    const size =
      src[i + 4] |
      (src[i + 5] << 8) |
      (src[i + 6] << 16) |
      (src[i + 7] << 24);
    if (size < 0 || size > src.length - i - 8) {
      throw new ExifStripError("malformed", `WebP chunk ${fourcc} size overflow`);
    }
    const padded = size + (size & 1);
    const chunkEnd = i + 8 + padded;

    if (fourcc === "VP8 ") {
      // Dimensions at offset 6..9 within data (2 bytes width, 2 bytes height — & 0x3FFF)
      if (size >= 10) {
        const base = i + 8;
        const w = src[base + 6] | (src[base + 7] << 8);
        const h = src[base + 8] | (src[base + 9] << 8);
        width = w & 0x3fff;
        height = h & 0x3fff;
      }
    } else if (fourcc === "VP8L") {
      // signature byte at base+0 = 0x2F, then 14-bit width + 14-bit height (-1 each)
      if (size >= 5) {
        const base = i + 8;
        const b1 = src[base + 1];
        const b2 = src[base + 2];
        const b3 = src[base + 3];
        const b4 = src[base + 4];
        width = ((b1 | (b2 << 8)) & 0x3fff) + 1;
        height = (((b2 >> 6) | (b3 << 2) | (b4 << 10)) & 0x3fff) + 1;
      }
    } else if (fourcc === "VP8X") {
      // Canvas width/height stored as 24-bit values (- 1)
      if (size >= 10) {
        const base = i + 8;
        const wMinus =
          src[base + 4] |
          (src[base + 5] << 8) |
          (src[base + 6] << 16);
        const hMinus =
          src[base + 7] |
          (src[base + 8] << 8) |
          (src[base + 9] << 16);
        width = wMinus + 1;
        height = hMinus + 1;
      }
    }

    const drop = fourcc === "EXIF" || fourcc === "XMP " || fourcc === "ICCP";
    if (!drop) {
      for (let k = i; k < chunkEnd && k < src.length; k += 1) out.push(src[k]);
    }
    i = chunkEnd;
  }

  if (width <= 0 || height <= 0) {
    throw new ExifStripError("parse_failed", "no WebP dimensions");
  }

  // Patch RIFF size = out.length - 8 (size excludes 'RIFF' fourcc + size field itself).
  const riffSize = out.length - 8;
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >> 8) & 0xff;
  out[6] = (riffSize >> 16) & 0xff;
  out[7] = (riffSize >> 24) & 0xff;

  return {
    body: bytesToBuffer(out),
    contentType: "image/webp",
    width,
    height,
  };
}

function bytesToBuffer(bytes: number[]): ArrayBuffer {
  const u = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) u[i] = bytes[i];
  return u.buffer;
}
