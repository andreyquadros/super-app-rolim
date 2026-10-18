import { useCallback, useEffect, useState } from "react";
import { isIos, isStandalone } from "@/lib/push";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPrompt {
  /** Android/desktop: o navegador oferece instalação direta */
  canPrompt: boolean;
  /** iPhone/iPad: precisa usar Compartilhar → Adicionar à Tela de Início */
  needsIosInstructions: boolean;
  installed: boolean;
  install: () => Promise<boolean>;
}

let deferred: BeforeInstallPromptEvent | null = null;

export function useInstallPrompt(): InstallPrompt {
  const [canPrompt, setCanPrompt] = useState(deferred !== null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      deferred = null;
      setCanPrompt(false);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    setCanPrompt(false);
    return choice.outcome === "accepted";
  }, []);

  return { canPrompt, needsIosInstructions: !installed && isIos(), installed, install };
}
