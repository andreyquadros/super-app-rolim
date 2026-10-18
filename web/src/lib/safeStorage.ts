// localStorage pode lançar exceção (modo privado, dados bloqueados).
// Use apenas para conveniências locais, nunca para dados importantes.

export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // sem armazenamento local: ignorado de propósito
  }
}

export function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // sem armazenamento local: ignorado de propósito
  }
}
