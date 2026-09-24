// Identify a file from its first bytes, never from its name or declared type.
export type FileKind = "pdf" | "zip" | "mp4" | "webm";

export function detectFileKind(bytes: Uint8Array): FileKind | null {
  const at = (offset: number, ...values: number[]) =>
    values.every((v, i) => bytes[offset + i] === v);
  if (at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return "pdf"; // %PDF-
  if (at(0, 0x50, 0x4b, 0x03, 0x04)) return "zip"; // DOCX is a ZIP container
  if (at(4, 0x66, 0x74, 0x79, 0x70)) return "mp4"; // ....ftyp (MP4/MOV)
  if (at(0, 0x1a, 0x45, 0xdf, 0xa3)) return "webm"; // EBML (WebM/Matroska)
  return null;
}
