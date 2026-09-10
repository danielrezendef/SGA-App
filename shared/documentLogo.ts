export const DOCUMENT_LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_LOGO_MAX_DIMENSION = 1024;
export const DOCUMENT_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function detectLogoType(bytes: Uint8Array): string | null {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value))
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    String.fromCharCode(...Array.from(bytes.slice(0, 4))) === "RIFF" &&
    String.fromCharCode(...Array.from(bytes.slice(8, 12))) === "WEBP"
  )
    return "image/webp";
  return null;
}
