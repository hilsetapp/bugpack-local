import { inflateRawSync } from 'node:zlib';

const MAX_BUNDLE_BYTES = 120 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 200 * 1024 * 1024;

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function findEndRecord(bytes) {
  const min = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= min; offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error('This file is not a supported ZIP package.');
}

export function readBugpack(bytes) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length > MAX_BUNDLE_BYTES) throw new Error('Bugpack exceeds the 120 MB safety limit.');
  const end = findEndRecord(bytes);
  const count = bytes.readUInt16LE(end + 10);
  const directorySize = bytes.readUInt32LE(end + 12);
  const directoryOffset = bytes.readUInt32LE(end + 16);
  if (directoryOffset + directorySize > end || count > 500) throw new Error('The ZIP directory is invalid.');

  const files = new Map();
  let offset = directoryOffset;
  let unpackedTotal = 0;
  for (let index = 0; index < count; index++) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('The ZIP directory is corrupt.');
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const expectedCrc = bytes.readUInt32LE(offset + 16);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const unpackedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8').replaceAll('\\', '/');
    if (!name || name.startsWith('/') || name.split('/').includes('..') || name.includes('\0')) throw new Error('The package contains an unsafe path.');
    if (flags & 1) throw new Error('Encrypted bugpacks are not supported.');
    if (unpackedSize > MAX_UNPACKED_BYTES) throw new Error('A package entry exceeds the safety limit.');
    unpackedTotal += unpackedSize;
    if (unpackedTotal > MAX_UNPACKED_BYTES) throw new Error('Unpacked package exceeds the safety limit.');
    if (bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('A package entry is corrupt.');
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
    let data;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed, { maxOutputLength: MAX_UNPACKED_BYTES });
    else throw new Error(`Unsupported ZIP compression method ${method}.`);
    if (data.length !== unpackedSize || crc32(data) !== expectedCrc) throw new Error(`The package entry failed validation: ${name}`);
    files.set(name, data);
    offset += 46 + nameLength + extraLength + commentLength;
  }

  if (!files.has('report.json')) throw new Error('This package has no report.json.');
  let report;
  try { report = JSON.parse(files.get('report.json').toString('utf8')); }
  catch { throw new Error('report.json is not valid JSON.'); }
  if (report?.schemaVersion !== 1 || typeof report.id !== 'string') throw new Error('Unsupported bugpack schema.');
  return { report, files };
}
