// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sniffFormat } from "../formats";
import { stripMetadata } from "../strip";

/**
 * Phone photos carry GPS. These build the smallest file of each format that
 * still has a metadata container in it, and check the container is gone and
 * the picture is not.
 */

function bytes(...parts: Array<number | number[] | string | Uint8Array>): Uint8Array {
  const flat: number[] = [];
  for (const part of parts) {
    if (typeof part === "number") flat.push(part);
    else if (typeof part === "string") flat.push(...[...part].map((c) => c.charCodeAt(0)));
    else flat.push(...part);
  }
  return Uint8Array.from(flat);
}

const be16 = (n: number) => [n >> 8, n & 0xff];
const be32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const le32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

const GPS = "GPS 51.5074N 0.1278W";

describe("stripping a JPEG", () => {
  // SOI · APP0/JFIF · APP1/Exif · SOS · scan data · EOI
  const exifPayload = bytes("Exif\0\0", GPS);
  const jpeg = bytes(
    0xff, 0xd8,
    0xff, 0xe0, be16(2 + 5), "JFIF\0",
    0xff, 0xe1, be16(2 + exifPayload.length), exifPayload,
    0xff, 0xda, be16(2 + 1), 0x00,
    [0x11, 0x22, 0x33, 0x44],
    0xff, 0xd9,
  );

  const stripped = stripMetadata(jpeg, "jpeg");
  const text = Buffer.from(stripped).toString("latin1");

  it("is still a JPEG", () => {
    expect(sniffFormat(stripped)).toBe("jpeg");
  });

  it("carries no Exif", () => {
    expect(text).not.toContain("Exif");
    expect(text).not.toContain(GPS);
    expect(stripped.length).toBeLessThan(jpeg.length);
  });

  it("keeps JFIF, the scan, and the end of the image", () => {
    expect(text).toContain("JFIF");
    expect([...stripped.subarray(-6)]).toEqual([0x11, 0x22, 0x33, 0x44, 0xff, 0xd9]);
  });

  it("drops a comment marker too", () => {
    const commented = bytes(
      0xff, 0xd8,
      0xff, 0xfe, be16(2 + 6), "secret",
      0xff, 0xda, be16(3), 0x00, [0x99],
      0xff, 0xd9,
    );
    expect(Buffer.from(stripMetadata(commented, "jpeg")).toString("latin1")).not.toContain("secret");
  });
});

describe("stripping a PNG", () => {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const chunk = (type: string, data: string) =>
    bytes(be32(data.length), type, data, be32(0));

  const png = bytes(
    signature,
    chunk("IHDR", "whatever"),
    chunk("tEXt", `Comment\0${GPS}`),
    chunk("eXIf", GPS),
    chunk("iTXt", "XMP payload"),
    chunk("zTXt", "compressed"),
    chunk("prVt", "a private chunk nobody documents"),
    chunk("IDAT", "pixels"),
    chunk("IEND", ""),
  );

  const stripped = stripMetadata(png, "png");
  const text = Buffer.from(stripped).toString("latin1");

  it("is still a PNG", () => {
    expect(sniffFormat(stripped)).toBe("png");
  });

  it("drops every metadata chunk, including ones it has never heard of", () => {
    for (const type of ["tEXt", "eXIf", "iTXt", "zTXt", "prVt"]) {
      expect(text).not.toContain(type);
    }
    expect(text).not.toContain(GPS);
  });

  it("keeps the header, the pixels, and the terminator", () => {
    expect(text).toContain("IHDR");
    expect(text).toContain("pixels");
    expect(text.endsWith("IEND\0\0\0\0")).toBe(true);
  });
});

describe("stripping a WebP", () => {
  const chunk = (fourcc: string, data: string) => {
    const padded = data.length % 2 === 1 ? `${data}\0` : data;
    return bytes(fourcc, le32(data.length), padded);
  };

  const body = bytes(
    // VP8X with the Exif and XMP flags set, plus ICC and Alpha which must survive.
    "VP8X", le32(10), [0b0010_1100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    chunk("VP8 ", "pixels"),
    chunk("EXIF", GPS),
    chunk("XMP ", "xmp payload"),
  );
  const webp = bytes("RIFF", le32(body.length + 4), "WEBP", body);

  const stripped = stripMetadata(webp, "webp");
  const text = Buffer.from(stripped).toString("latin1");

  it("is still a WebP", () => {
    expect(sniffFormat(stripped)).toBe("webp");
  });

  it("drops the EXIF and XMP chunks", () => {
    expect(text).not.toContain("EXIF");
    expect(text).not.toContain(GPS);
    expect(text).not.toContain("xmp payload");
    expect(text).toContain("pixels");
  });

  it("clears the flags that promised them, and leaves the others alone", () => {
    const flags = stripped[stripped.indexOf(0x56 /* V */) + 8];
    expect(flags & 0b0000_1100).toBe(0); // Exif and XMP: gone
    expect(flags & 0b0010_0000).toBe(0b0010_0000); // ICC: untouched
  });

  it("rewrites the RIFF length to match what is left", () => {
    const declared = new DataView(stripped.buffer, stripped.byteOffset).getUint32(4, true);
    expect(declared).toBe(stripped.length - 8);
  });
});

describe("sniffing", () => {
  it("refuses anything that is not one of the three", () => {
    expect(sniffFormat(bytes("GIF89a"))).toBeNull();
    expect(sniffFormat(bytes("%PDF-1.7"))).toBeNull();
    expect(sniffFormat(bytes("<svg xmlns="))).toBeNull();
    expect(sniffFormat(bytes([]))).toBeNull();
  });

  it("ignores what an upload claims and reads the bytes", () => {
    expect(sniffFormat(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
  });
});
