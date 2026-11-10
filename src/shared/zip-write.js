const encoder = new TextEncoder();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255);
}

function u32(value) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
}

function join(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function toBytes(value) {
  if (typeof value === 'string') return encoder.encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof Blob !== 'undefined' && value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  throw new TypeError('ZIP entries must be strings, Blobs, or byte arrays.');
}

/** Build a standards-compliant ZIP using the store method. Video is already compressed. */
export async function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = String(entry.name).replaceAll('\\', '/');
    if (!name || name.startsWith('/') || name.split('/').includes('..')) throw new Error(`Unsafe ZIP path: ${name}`);
    const nameBytes = encoder.encode(name);
    const data = await toBytes(entry.data);
    const checksum = crc32(data);
    const flags = 0x0800;
    const local = join([
      u32(0x04034b50), u16(20), u16(flags), u16(0), u16(0), u16(33),
      u32(checksum), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0),
      nameBytes, data,
    ]);
    const central = join([
      u32(0x02014b50), u16(20), u16(20), u16(flags), u16(0), u16(0), u16(33),
      u32(checksum), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0),
      u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes,
    ]);
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  }

  const centralDirectory = join(centralParts);
  const end = join([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralDirectory.length), u32(offset), u16(0),
  ]);
  return new Blob([...localParts, centralDirectory, end], { type: 'application/zip' });
}
