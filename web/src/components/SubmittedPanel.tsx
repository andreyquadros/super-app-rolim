import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBell, IconCheck, IconCloudUpload, IconCopy, IconShare } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AppLink } from "@/components/AppLink";
import { canOfferPush, EnablePushSheet } from "@/components/push/EnablePushSheet";
import { StepBar } from "@/components/ui/StepBar";
import { APP_NAME } from "@/config/city";
import classes from "./SubmittedPanel.module.css";

interface SubmittedPanelProps {
  protocol: string;
  detailPath: string;
  pendingSync: boolean;
  /** "Problema na rua" ou "Ouvidoria" (aparece no canhoto) */
  kindLabel?: string;
}

const COPIED_MS = 2500;
const STUB_DELAY_MS = 200;

/** Entrada escalonada depois do canhoto (respeita o modo leve e o movimento reduzido). */
const rise = (delayMs: number): CSSProperties => ({ animationDelay: `${delayMs}ms` });

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Área de transferência indisponível");
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      notifications.show({ message: "Não foi possível copiar. Anote o número do protocolo.", color: "barro" });
    }
  };

  return (
    <>
      <button type="button" className={classes.stubAction} data-tone="primary" onClick={copy} data-press>
        {/* Troca suave do rótulo; o nome acessível é sempre o texto visível */}
        <span className={classes.swap}>
          <span aria-hidden={copied}>
            <IconCopy size={20} aria-hidden />
            Copiar
          </span>
          <span aria-hidden={!copied}>
            <IconCheck size={20} aria-hidden />
            Copiado
          </span>
        </span>
      </button>
      <span className="visually-hidden" role="status">
        {copied ? "Protocolo copiado" : ""}
      </span>
    </>
  );
}

function ShareButton({ protocol, kindLabel }: { protocol: string; kindLabel?: string }) {
  const share = async () => {
    const what = kindLabel ? ` (${kindLabel})` : "";
    try {
      await navigator.share({ title: "Protocolo do meu pedido", text: `Fiz um pedido${what} no ${APP_NAME}. Protocolo: ${protocol}` });
    } catch (error: unknown) {
      // Fechar a janela de compartilhar não é erro
      if (error instanceof DOMException && error.name === "AbortError") return;
      notifications.show({ message: "Não foi possível compartilhar. Use o botão Copiar.", color: "barro" });
    }
  };

  return (
    <button type="button" className={classes.stubAction} onClick={share} data-press>
      <IconShare size={20} aria-hidden />
      Compartilhar
    </button>
  );
}

/** Confirmação do envio: protocolo no canhoto, convite para avisos e próximos passos. */
export function SubmittedPanel({ protocol, detailPath, pendingSync, kindLabel }: SubmittedPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [offerPush, setOfferPush] = useState(canOfferPush);
  const [pushOpen, setPushOpen] = useState(false);
  const [canShare] = useState(() => typeof navigator.share === "function");
  const closePush = useCallback(() => setPushOpen(false), []);
  const pushEnabled = useCallback(() => setOfferPush(false), []);

  useEffect(() => {
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
    navigator.vibrate?.(15);
  }, []);

  return (
    <section className={classes.panel} aria-labelledby="pedido-enviado">
      <div className={classes.mark} aria-hidden>
        <svg viewBox="0 0 48 48" className={classes.check}>
          <path d="M12 25.5l8 8L36.5 16" />
        </svg>
      </div>
      <h1 id="pedido-enviado" ref={headingRef} tabIndex={-1} className={classes.title}>
        Pedido enviado!
      </h1>
      <p className={classes.lead}>Guarde o número do protocolo. Com ele você acompanha cada passo do atendimento.</p>

      <div className={`${classes.stub} enter-rise`} style={rise(STUB_DELAY_MS)}>
        <div className={classes.stubTop}>
          <p className={classes.stubKicker}>{kindLabel ? `Protocolo · ${kindLabel}` : "Protocolo"}</p>
          <p className={classes.protocol}>{protocol}</p>
          <StepBar status="RECEIVED" />
        </div>
        <div className={classes.stubBottom}>
          <CopyButton value={protocol} />
          {canShare && <ShareButton protocol={protocol} kindLabel={kindLabel} />}
        </div>
      </div>

      {pendingSync && (
        <p className={`${classes.pending} enter-rise`} style={rise(STUB_DELAY_MS + 40)}>
          <IconCloudUpload size={22} aria-hidden />
          Você está sem internet. O pedido ficou guardado no celular e será enviado sozinho quando a conexão voltar.
        </p>
      )}

      {offerPush && (
        <div className={`${classes.invite} enter-rise`} style={rise(STUB_DELAY_MS + 80)}>
          <span className={classes.inviteIcon} aria-hidden>
            <IconBell size={24} />
          </span>
          <div className={classes.inviteText}>
            <h2 className={classes.inviteTitle}>Quer saber quando seu pedido andar?</h2>
            <p>O app avisa no celular quando a prefeitura analisar e resolver.</p>
          </div>
          <button type="button" className={classes.inviteButton} onClick={() => setPushOpen(true)} data-press>
            Ligar avisos
          </button>
        </div>
      )}

      <div className={`${classes.actions} enter-rise`} style={rise(STUB_DELAY_MS + 120)}>
        <Button component={AppLink} to={detailPath} replace size="lg" radius="xl" className={classes.action}>
          Acompanhar pedido
        </Button>
        <Button component={AppLink} to="/" nav="tab" replace variant="default" size="lg" radius="xl" className={classes.action}>
          Voltar ao início
        </Button>
      </div>

      <EnablePushSheet open={pushOpen} onClose={closePush} onEnabled={pushEnabled} />
    </section>
  );
}
