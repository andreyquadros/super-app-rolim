import { Button } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useEffect, useRef, type ReactNode } from "react";
import { AppLink } from "@/components/AppLink";
import { prepareGoogleSignIn } from "@/lib/firebase";
import { motionAllowed } from "@/lib/navMotion";
import classes from "./auth.module.css";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

interface GoogleButtonProps {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

/** Botão "Entrar com Google" (vem antes do e-mail: é o caminho mais curto). */
export function GoogleButton({ label, loading, disabled, onClick }: GoogleButtonProps) {
  // A janela do Google precisa abrir logo após o toque: prepara antes
  useEffect(prepareGoogleSignIn, []);
  return (
    <Button
      type="button"
      size="lg"
      h={56}
      radius="xl"
      fullWidth
      variant="default"
      className={classes.google}
      leftSection={
        <span className={classes.googleIcon}>
          <GoogleIcon />
        </span>
      }
      loading={loading}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

/** Separador "ou" entre o Google e o formulário. */
export function OrDivider() {
  return <p className={classes.or}>ou</p>;
}

interface SubmitButtonProps {
  children: ReactNode;
  loading: boolean;
  disabled?: boolean;
}

/** Ação principal do formulário (56 px). */
export function SubmitButton({ children, loading, disabled }: SubmitButtonProps) {
  return (
    <Button type="submit" size="lg" h={56} radius="xl" fullWidth className={classes.primary} loading={loading} disabled={disabled}>
      {children}
    </Button>
  );
}

/** Ações do formulário: fixas no rodapé do celular, logo abaixo dos campos no computador. */
export function AuthActions({ children }: { children: ReactNode }) {
  return (
    <div className={classes.actions}>
      <div className={classes.actionsInner}>{children}</div>
    </div>
  );
}

/** Erro vindo do servidor, mostrado (e rolado até a vista) perto da ação. */
export function FormError({ message }: { message: string | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) ref.current?.scrollIntoView({ block: "nearest", behavior: motionAllowed() ? "smooth" : "auto" });
  }, [message]);
  if (!message) return null;
  return (
    <p ref={ref} role="alert" className={classes.formError}>
      <IconAlertCircle size={22} aria-hidden />
      <span>{message}</span>
    </p>
  );
}

interface SwitchPromptProps {
  question: string;
  to: string;
  label: string;
}

/** "Ainda não tem conta? Criar conta": troca entre telas de acesso sem empilhar histórico. */
export function SwitchPrompt({ question, to, label }: SwitchPromptProps) {
  return (
    <p className={classes.switch}>
      <span>{question}</span>
      <AppLink to={to} nav="flow" replace className={classes.link}>
        {label}
      </AppLink>
    </p>
  );
}
