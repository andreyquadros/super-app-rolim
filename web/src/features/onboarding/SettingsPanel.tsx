import { IconBell, IconCheck, IconDeviceMobile, IconTextSize } from "@tabler/icons-react";
import { useId, useState, type ReactNode } from "react";
import { InstallHowToSheet } from "@/components/install/InstallHowToSheet";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { getTextSize, setTextSize, TEXT_SIZE_LABEL, TEXT_SIZES, type TextSize } from "@/lib/preferences";
import classes from "./SettingsPanel.module.css";

function Group({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section className={classes.group} aria-labelledby={titleId}>
      <h3 id={titleId} className={classes.groupTitle}>
        <span className={classes.groupIcon} aria-hidden>
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** "Aa" em três tamanhos; a tela inteira muda na hora (prévia ao vivo). */
function TextSizeChoice() {
  const [size, setSize] = useState<TextSize>(getTextSize);
  const choose = (value: TextSize) => {
    setSize(value);
    setTextSize(value);
  };

  return (
    <Group icon={<IconTextSize size={22} stroke={1.8} />} title="Tamanho do texto">
      <div role="radiogroup" aria-label="Tamanho do texto" className={classes.sizes}>
        {TEXT_SIZES.map((value) => (
          <label key={value} className={classes.size} data-size={value} data-press>
            <input
              type="radio"
              name="tamanho-do-texto"
              value={value}
              checked={size === value}
              onChange={() => choose(value)}
              className={classes.radio}
            />
            <span className={classes.check} aria-hidden>
              <IconCheck size={14} stroke={3} />
            </span>
            <span className={classes.sample} aria-hidden>
              Aa
            </span>
            <span>{TEXT_SIZE_LABEL[value]}</span>
          </label>
        ))}
      </div>
      <p className={classes.groupText}>Este texto mostra como as letras vão ficar no app.</p>
    </Group>
  );
}

/** Instalar na tela inicial: botão no Android, passo a passo no iPhone. */
function InstallChoice() {
  const { canPrompt, needsIosInstructions, installed, install } = useInstallPrompt();
  const [howToOpen, setHowToOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (installed) return null;

  const onInstall = async () => {
    setError(null);
    try {
      await install();
    } catch {
      setError("Não foi possível abrir a instalação agora. Você pode instalar depois pelo menu do navegador.");
    }
  };

  return (
    <Group icon={<IconDeviceMobile size={22} stroke={1.8} />} title="Colocar o app na tela do celular">
      {canPrompt ? (
        <>
          <p className={classes.groupText}>Ele abre com um toque, como os outros apps.</p>
          <button type="button" className={classes.action} onClick={onInstall} data-press>
            Instalar o app
          </button>
        </>
      ) : needsIosInstructions ? (
        <>
          <p className={classes.groupText}>No iPhone, são 3 toques no Safari.</p>
          <button type="button" className={classes.action} onClick={() => setHowToOpen(true)} data-press>
            Ver como instalar
          </button>
          <InstallHowToSheet open={howToOpen} onClose={() => setHowToOpen(false)} />
        </>
      ) : (
        <p className={classes.groupText}>Você pode instalar depois pelo menu do navegador.</p>
      )}
      {error && (
        <p className={classes.error} role="alert">
          {error}
        </p>
      )}
    </Group>
  );
}

interface SettingsPanelProps {
  /** Já entrou na conta (revendo a apresentação pelo Perfil) */
  signedIn: boolean;
  onSignIn: () => void;
}

/** Slide 5: tamanho do texto, instalação e avisos (sem pedir permissão aqui). */
export function SettingsPanel({ signedIn, onSignIn }: SettingsPanelProps) {
  return (
    <div className={classes.groups}>
      <TextSizeChoice />
      <InstallChoice />
      <Group icon={<IconBell size={22} stroke={1.8} />} title="Avisos">
        <p className={classes.groupText}>Depois de entrar, você pode ligar os avisos para saber quando seu pedido andar.</p>
        {!signedIn && (
          <button type="button" className={classes.action} data-variant="outline" onClick={onSignIn} data-press>
            Entrar ou criar conta
          </button>
        )}
      </Group>
    </div>
  );
}
