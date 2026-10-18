/** Alfabeto sem caracteres ambíguos (I, O, 0, 1) para leitura ao telefone. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 8;

export type ProtocolPrefix = "ZEL" | "OUV";

function randomIndexes(count: number): number[] {
  const bytes = new Uint8Array(count);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b % ALPHABET.length);
}

/** Ex.: ZEL-2026-K7Q2MX9P (validado em firestore.rules). */
export function makeProtocol(prefix: ProtocolPrefix, date: Date = new Date(), random: (n: number) => number[] = randomIndexes): string {
  const suffix = random(SUFFIX_LENGTH)
    .map((i) => ALPHABET[i % ALPHABET.length])
    .join("");
  return `${prefix}-${date.getFullYear()}-${suffix}`;
}

export function isProtocol(value: string): boolean {
  return /^(ZEL|OUV)-\d{4}-[A-Z0-9]{8}$/.test(value.trim().toUpperCase());
}
