import { useSyncExternalStore } from "react";
import { getInstallSnapshot, promptInstall, subscribeInstall, type InstallSnapshot } from "@/lib/installPrompt";

export interface InstallPrompt extends InstallSnapshot {
  install: () => Promise<boolean>;
}

/** Estado da instalação do app na tela inicial (sem passar por lojas). */
export function useInstallPrompt(): InstallPrompt {
  const snapshot = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot);
  return { ...snapshot, install: promptInstall };
}
