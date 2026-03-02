// Magic byte signatures for allowed file types
// MIME type alone is spoofable — validate actual file content
const MAGIC_BYTES: { type: string; bytes: number[]; extraCheck?: (header: Uint8Array) => boolean }[] = [
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  {
    type: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46], // RIFF
    extraCheck: (header) =>
      header.length >= 12 &&
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50, // WEBP
  },
  { type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
]

export function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const header = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength))

  for (const sig of MAGIC_BYTES) {
    if (mimeType === sig.type || (mimeType === 'image/jpg' && sig.type === 'image/jpeg')) {
      if (header.length < sig.bytes.length) return false
      const matches = sig.bytes.every((byte, i) => header[i] === byte)
      if (!matches) return false
      if (sig.extraCheck && !sig.extraCheck(header)) return false
      return true
    }
  }

  return false
}
