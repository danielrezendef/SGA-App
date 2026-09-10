import { inflateSync } from "node:zlib";
import {
  DOCUMENT_LOGO_MAX_BYTES,
  DOCUMENT_LOGO_MAX_DIMENSION,
  detectLogoType,
} from "../shared/documentLogo";

// The browser normalizes uploads to non-interlaced, 8-bit RGB/RGBA PNG.
// Validate the actual chunks and pixels on the server, not just the MIME label.
export function validateDocumentLogo(data: Buffer): Buffer {
  const invalid = () => {
    throw new Error(
      "Imagem inválida. Selecione novamente um PNG, JPG ou WEBP."
    );
  };
  if (
    !data.length ||
    data.length > DOCUMENT_LOGO_MAX_BYTES ||
    detectLogoType(data) !== "image/png"
  )
    invalid();
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  let ended = false;
  const pixels: Buffer[] = [];
  const chunks: Buffer[] = [data.subarray(0, 8)];
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > data.length) invalid();
    const type = data.toString("ascii", offset + 4, offset + 8);
    let crc = 0xffffffff;
    for (let i = offset + 4; i < end - 4; i++) {
      crc ^= data[i];
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    if ((crc ^ 0xffffffff) >>> 0 !== data.readUInt32BE(end - 4)) invalid();
    if (offset === 8 && type !== "IHDR") invalid();
    if (type === "IHDR") {
      if (offset !== 8 || length !== 13) invalid();
      width = data.readUInt32BE(offset + 8);
      height = data.readUInt32BE(offset + 12);
      const color = data[offset + 17];
      if (
        !width ||
        !height ||
        Math.max(width, height) > DOCUMENT_LOGO_MAX_DIMENSION ||
        data[offset + 16] !== 8 ||
        ![2, 6].includes(color) ||
        data[offset + 18] !== 0 ||
        data[offset + 19] !== 0 ||
        data[offset + 20] !== 0
      )
        invalid();
      channels = color === 6 ? 4 : 3;
    } else if (type === "IDAT") {
      pixels.push(data.subarray(offset + 8, end - 4));
    } else if (type === "IEND") {
      if (length !== 0 || end !== data.length) invalid();
      ended = true;
    } else if (type[0] === type[0].toUpperCase()) invalid();
    // Only image data is persisted; uploaded metadata is discarded.
    if (["IHDR", "IDAT", "IEND"].includes(type))
      chunks.push(data.subarray(offset, end));
    offset = end;
  }
  if (!ended || !pixels.length) invalid();
  const rowSize = width * channels + 1;
  const decoded = inflateSync(Buffer.concat(pixels), {
    maxOutputLength: rowSize * height,
  });
  if (decoded.length !== rowSize * height) invalid();
  for (let row = 0; row < height; row++)
    if (decoded[row * rowSize] > 4) invalid();
  return Buffer.concat(chunks);
}
