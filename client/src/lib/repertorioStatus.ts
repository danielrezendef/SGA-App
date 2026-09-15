export const REPERTORIO_EXISTENTE_BUTTON_CLASS =
  "border-primary/35 bg-primary/15 text-foreground hover:border-primary/55 hover:bg-primary/25";

export function getRepertorioButtonClass(status?: string | null) {
  return status ? REPERTORIO_EXISTENTE_BUTTON_CLASS : "";
}
