import { isIos, isStandalone } from "./platform";

// O Chrome dispara "beforeinstallprompt" uma vez, logo ao abrir: capturado
// aqui (importado no main.tsx) para qualquer tela oferecer a instalação depois.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallSnapshot {
  /** Android/computador: o navegador oferece instalação direta */
  canPrompt: boolean;
  /** iPhone/iPad: Compartilhar → Adicionar à Tela de Início */
  needsIosInstructions: boolean;
  installed: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
let snapshot: InstallSnapshot = { canPrompt: false, needsIosInstructions: false, installed: false };
const listeners = new Set<() => void>();

function update(): void {
  const installed = isStandalone();
  snapshot = { canPrompt: deferred !== null && !installed, needsIosInstructions: !installed && isIos(), installed };
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  update();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    update();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    snapshot = { canPrompt: false, needsIosInstructions: false, installed: true };
    listeners.forEach((listener) => listener());
  });
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallSnapshot(): InstallSnapshot {
  return snapshot;
}

/** Abre o diálogo de instalação do navegador; true se a pessoa aceitou. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  await event.prompt();
  const choice = await event.userChoice;
  deferred = null;
  update();
  return choice.outcome === "accepted";
}
