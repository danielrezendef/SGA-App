import defaultLogo from "@/assets/logo.png";
import {
  DOCUMENT_LOGO_MAX_BYTES,
  DOCUMENT_LOGO_MAX_DIMENSION,
  DOCUMENT_LOGO_TYPES,
  detectLogoType,
} from "@shared/documentLogo";

// Only validated PNG data from the documentLogo API is accepted. No external
// URL is handed to the PDF renderer, so storage/CORS failures use the fallback.
export function resolveDocumentLogo(logo?: string | null): string {
  return logo &&
    logo.length <= Math.ceil(DOCUMENT_LOGO_MAX_BYTES / 3) * 4 + 22 &&
    /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]+={0,2}$/.test(logo)
    ? logo
    : defaultLogo;
}

export async function prepareDocumentLogo(file: File): Promise<string> {
  if (!file.size || file.size > DOCUMENT_LOGO_MAX_BYTES)
    throw new Error("Selecione uma imagem não vazia de até 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (
    !DOCUMENT_LOGO_TYPES.includes(file.type) ||
    detectLogoType(bytes) !== file.type
  )
    throw new Error("Arquivo inválido. Use PNG, JPG/JPEG ou WEBP.");
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("Imagem vazia.");
    const scale = Math.min(
      1,
      DOCUMENT_LOGO_MAX_DIMENSION /
        Math.max(image.naturalWidth, image.naturalHeight)
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível processar a imagem.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/png");
    if (data.length > Math.ceil(DOCUMENT_LOGO_MAX_BYTES / 3) * 4 + 22)
      throw new Error("A imagem processada excede 5 MB.");
    return data;
  } catch {
    throw new Error(
      "Não foi possível ler a imagem. Selecione um PNG, JPG ou WEBP válido."
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
