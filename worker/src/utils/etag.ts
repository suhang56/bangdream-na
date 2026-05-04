function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) out[k] = canonicalize(obj[k]);
    return out;
  }
  return value;
}

function bytesToHex(buffer: ArrayBuffer): string {
  const u8 = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < u8.length; i++) {
    hex += u8[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export async function computeEtag(payload: unknown): Promise<string> {
  const canonical = canonicalize(payload);
  const json = JSON.stringify(canonical);
  const encoded = new TextEncoder().encode(json);
  const digest = await crypto.subtle.digest("SHA-1", encoded);
  return `"${bytesToHex(digest)}"`;
}
