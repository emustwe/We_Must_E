import { describe, expect, it } from "vitest";
import { detectFileKind } from "./file-signature";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

describe("detectFileKind", () => {
  it("recognises PDF, DOCX (zip), MP4 and WebM", () => {
    expect(detectFileKind(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31))).toBe("pdf");
    expect(detectFileKind(bytes(0x50, 0x4b, 0x03, 0x04))).toBe("zip");
    expect(detectFileKind(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70))).toBe("mp4");
    expect(detectFileKind(bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe("webm");
  });
  it("rejects anything else, e.g. HTML renamed to .pdf", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script>");
    expect(detectFileKind(html)).toBeNull();
  });
});

describe("detectFileKind: images", () => {
  it("recognises PNG, JPEG and WebP by their first bytes", () => {
    expect(detectFileKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "png",
    );
    expect(detectFileKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(detectFileKind(webp)).toBe("webp");
    expect(detectFileKind(new TextEncoder().encode("<svg xmlns"))).toBeNull();
  });
});
