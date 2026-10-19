import { notifications } from "@mantine/notifications";
import { IconShare } from "@tabler/icons-react";
import { APP_NAME } from "@/config/city";
import { copyText } from "./clipboard";
import { shareText } from "./requestModel";
import classes from "./actions.module.css";

interface ShareButtonProps {
  title: string;
  protocol: string;
}

function isUserCancel(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** "Compartilhar" na barra: menu do celular; sem ele, copia o link. */
export function ShareButton({ title, protocol }: ShareButtonProps) {
  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: APP_NAME, text: shareText(title, protocol), url });
        return;
      } catch (error: unknown) {
        // Fechar o menu de compartilhar não é erro; outras falhas caem na cópia
        if (isUserCancel(error)) return;
      }
    }
    if (await copyText(url)) {
      notifications.show({ color: "mata", message: "Link copiado" });
    } else {
      notifications.show({ color: "barro", title: "Não foi possível compartilhar", message: `Anote o protocolo: ${protocol}` });
    }
  };

  return (
    <button type="button" className={classes.share} onClick={share} data-press>
      <IconShare size={22} stroke={2} aria-hidden />
      <span className={classes.shareText}>Compartilhar</span>
    </button>
  );
}
