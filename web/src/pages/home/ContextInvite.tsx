import { notifications } from "@mantine/notifications";
import { IconBellRinging, IconDeviceMobileDown } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { InstallHowToSheet } from "@/components/install/InstallHowToSheet";
import { canOfferPush, EnablePushSheet } from "@/components/push/EnablePushSheet";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { storageGet, storageSet } from "@/lib/safeStorage";
import { chooseInvite } from "./homeText";
import classes from "./ContextInvite.module.css";
import sections from "./sections.module.css";

const INSTALL_KEY = "rolim.installDismissed";
const PUSH_KEY = "rolim.pushInviteDismissed";

const isPhone = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent);

const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Para onde o foco vai quando o convite some: o item logo antes dele (o último
 * aviso) ou, se não houver, o título da tela. Assim o leitor de tela não volta
 * ao começo da página.
 */
function focusTargetAfter(invite: HTMLElement): HTMLElement | null {
  const previous = invite.previousElementSibling?.querySelector<HTMLElement>(FOCUSABLE);
  return previous ?? document.querySelector<HTMLElement>("main h1");
}

interface ContextInviteProps {
  signedIn: boolean;
  hasRequests: boolean;
}

/** No máximo um convite por vez, e a pessoa pode dispensar: instalar o app ou ligar os avisos. */
export function ContextInvite({ signedIn, hasRequests }: ContextInviteProps) {
  const { canPrompt, needsIosInstructions, installed, install } = useInstallPrompt();
  const [installDismissed, setInstallDismissed] = useState(() => storageGet(INSTALL_KEY) === "1");
  const [pushDismissed, setPushDismissed] = useState(() => storageGet(PUSH_KEY) === "1");
  const [canPush, setCanPush] = useState(canOfferPush);
  const [sheet, setSheet] = useState<"ios" | "push" | null>(null);
  const inviteRef = useRef<HTMLElement>(null);

  const kind = chooseInvite({
    installable: !installed && (canPrompt || needsIosInstructions),
    installDismissed,
    signedIn,
    canPush,
    hasRequests,
    pushDismissed,
  });

  const dismiss = () => {
    // O botão focado vai sumir junto com o convite: leva o foco para perto
    const invite = inviteRef.current;
    const target = invite?.contains(document.activeElement) ? focusTargetAfter(invite) : null;
    if (target) requestAnimationFrame(() => target.focus({ preventScroll: true }));

    if (kind === "install") {
      storageSet(INSTALL_KEY, "1");
      setInstallDismissed(true);
    } else {
      storageSet(PUSH_KEY, "1");
      setPushDismissed(true);
    }
  };

  const startInstall = async () => {
    if (needsIosInstructions) {
      setSheet("ios");
      return;
    }
    try {
      await install();
    } catch {
      notifications.show({ message: "Não foi possível abrir a instalação. Tente pelo menu do navegador.", color: "barro" });
    }
  };

  // Ao fechar a folha, confere de novo: avisos ligados (ou bloqueados) tiram o convite
  const closeSheet = () => {
    setSheet(null);
    setCanPush(canOfferPush());
  };

  return (
    <>
      {kind && (
        <aside ref={inviteRef} className={`${classes.invite} enter-rise`} aria-labelledby="home-convite" data-kind={kind}>
          <span className={classes.icon} aria-hidden>
            {kind === "install" ? <IconDeviceMobileDown size={26} stroke={1.7} /> : <IconBellRinging size={26} stroke={1.7} />}
          </span>
          <div className={classes.text}>
            <h2 id="home-convite" className={classes.title}>
              {kind === "push"
                ? "Quer saber quando seu pedido andar?"
                : isPhone()
                  ? "Coloque o app na tela do celular"
                  : "Instale o app neste computador"}
            </h2>
            <p className={classes.description}>
              {kind === "push"
                ? "Ligue os avisos e o celular avisa quando a prefeitura responder."
                : "Abre com um toque, como os outros apps, e não ocupa espaço."}
            </p>
          </div>
          <div className={classes.actions}>
            {kind === "install" ? (
              <button type="button" className={sections.button} data-variant="filled" onClick={startInstall} data-press>
                {needsIosInstructions ? "Ver como" : "Instalar"}
              </button>
            ) : (
              <button type="button" className={sections.button} data-variant="filled" onClick={() => setSheet("push")} data-press>
                Ligar avisos
              </button>
            )}
            <button type="button" className={sections.button} data-variant="subtle" onClick={dismiss} data-press>
              Agora não
            </button>
          </div>
        </aside>
      )}

      <InstallHowToSheet open={sheet === "ios"} onClose={closeSheet} />
      <EnablePushSheet open={sheet === "push"} onClose={closeSheet} />
    </>
  );
}
