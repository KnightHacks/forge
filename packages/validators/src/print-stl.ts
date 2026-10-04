/** Structural validation only; never executes, repairs, or renders a model. */
export function isPrintStl(bytes: Uint8Array): boolean {
  if (bytes.length >= 84) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const triangles = view.getUint32(80, true);
    if (triangles > 0 && 84 + triangles * 50 === bytes.length) {
      for (let offset = 84; offset < bytes.length; offset += 50) {
        for (let field = 0; field < 48; field += 4) {
          if (!Number.isFinite(view.getFloat32(offset + field, true)))
            return false;
        }
      }
      return true;
    }
  }

  // Bounded lines avoid a giant token array and reject binary/text polyglots.
  for (const byte of bytes) {
    if (byte !== 9 && byte !== 10 && byte !== 13 && (byte < 32 || byte > 126))
      return false;
  }
  const text = new TextDecoder().decode(bytes);
  let cursor = 0;
  function line(): string | null {
    while (cursor < text.length) {
      const end = text.indexOf("\n", cursor);
      const next = end === -1 ? text.length : end;
      if (next - cursor > 1024) return null;
      const result = text
        .slice(cursor, next)
        .trim()
        .replace(/[ \t]+/g, " ");
      cursor = next + 1;
      if (result) return result;
    }
    return null;
  }
  const number = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
  function vector(value: string | null, prefix: string) {
    if (!value?.startsWith(prefix)) return false;
    const parts = value.slice(prefix.length).trim().split(/\s+/);
    return (
      parts.length === 3 &&
      parts.every((part) => number.test(part) && Number.isFinite(Number(part)))
    );
  }
  if (!/^solid(?:\s.*)?$/.test(line() ?? "")) return false;
  let triangles = 0;
  for (let value = line(); value !== null; value = line()) {
    if (/^endsolid(?:\s.*)?$/.test(value)) {
      return triangles > 0 && text.slice(cursor).trim() === "";
    }
    if (!vector(value, "facet normal ") || line() !== "outer loop")
      return false;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      if (!vector(line(), "vertex ")) return false;
    }
    if (line() !== "endloop" || line() !== "endfacet") return false;
    triangles += 1;
  }
  return false;
}
