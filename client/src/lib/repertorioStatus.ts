export const REPERTORIO_FINALIZADO_BUTTON_CLASS =
  "border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900";

export function getRepertorioButtonClass(status?: string | null) {
  return status === "FINALIZADO" ? REPERTORIO_FINALIZADO_BUTTON_CLASS : "";
}
