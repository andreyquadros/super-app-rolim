import { storageGet, storageSet } from "./safeStorage";

export const TEXT_SIZES = ["normal", "grande", "muito-grande"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

const TEXT_SIZE_KEY = "rolim.textSize";

export const TEXT_SIZE_LABEL: Record<TextSize, string> = {
  normal: "Normal",
  grande: "Grande",
  "muito-grande": "Muito grande",
};

export function parseTextSize(value: string | null): TextSize {
  return (TEXT_SIZES as readonly string[]).includes(value ?? "") ? (value as TextSize) : "normal";
}

export function getTextSize(): TextSize {
  return parseTextSize(storageGet(TEXT_SIZE_KEY));
}

/** Aplica no <html> (o CSS escala a fonte base do app). */
export function applyTextSize(size: TextSize): void {
  document.documentElement.dataset.textSize = size;
}

export function setTextSize(size: TextSize): void {
  storageSet(TEXT_SIZE_KEY, size);
  applyTextSize(size);
}
