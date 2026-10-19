import { notifications } from "@mantine/notifications";
import { useCallback, useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { errorMessage } from "@/lib/errors";

export interface InstallAction {
  /** Some quando já está instalado ou o navegador não oferece instalação */
  visible: boolean;
  run: () => void;
  howToOpen: boolean;
  closeHowTo: () => void;
}

/** "Colocar na tela inicial": diálogo do navegador ou, no iPhone, os 3 passos. */
export function useInstallAction(): InstallAction {
  const { canPrompt, needsIosInstructions, installed, install } = useInstallPrompt();
  const [howToOpen, setHowToOpen] = useState(false);

  const run = useCallback(() => {
    if (!canPrompt) {
      setHowToOpen(true);
      return;
    }
    install()
      .then((accepted) => {
        if (accepted) notifications.show({ message: "Pronto! O SUPER APP está na tela do celular.", color: "mata" });
      })
      .catch((error: unknown) => {
        notifications.show({ title: "Não foi possível instalar", message: errorMessage(error), color: "barro" });
      });
  }, [canPrompt, install]);

  const closeHowTo = useCallback(() => setHowToOpen(false), []);

  return { visible: !installed && (canPrompt || needsIosInstructions), run, howToOpen, closeHowTo };
}
