import { Stack } from "@mantine/core";
import { createContext, useContext, type ReactNode } from "react";
import { MAINTAINER_LINE } from "@/config/city";

// As classes .boot* ficam no <style> do index.html: valem antes de qualquer
// CSS do app e não dependem do tema (verde no claro e no escuro).

function BootBrand({ children }: { children?: ReactNode }) {
  return (
    <div className="boot-center">
      <img src="/logo-mono.svg" alt="" width={96} height={96} />
      <p className="boot-kicker">SUPER APP</p>
      <p className="boot-title">Rolim de Moura</p>
      {children}
    </div>
  );
}

/** Abertura verde (a mesma do index.html) enquanto a primeira tela carrega. */
export function BootSplash() {
  return (
    <div className="boot" role="status">
      <BootBrand>
        <div className="boot-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="boot-sr">Carregando o SUPER APP</span>
      </BootBrand>
      <p className="boot-foot">{MAINTAINER_LINE}</p>
    </div>
  );
}

/** O app não conseguiu abrir (rede instável, versão nova no ar): tenta de novo. */
export function BootError() {
  return (
    <div className="boot">
      <BootBrand>
        <div className="boot-error" role="alert">
          <p className="boot-error-title">Não foi possível abrir o app.</p>
          <p className="boot-error-text">Verifique a internet e tente de novo.</p>
        </div>
        <button type="button" className="boot-retry" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </BootBrand>
      <p className="boot-foot">{MAINTAINER_LINE}</p>
    </div>
  );
}

const SKELETON_HEIGHTS = [96, 72, 72] as const;

/** true dentro da casca do cidadão (barra verde e abas já visíveis). */
export const InShellContext = createContext(false);

/**
 * Espera curta (ex.: conferindo o login). Dentro da casca: o formato da tela,
 * sem o "Carregando" centralizado de site. Fora dela: a abertura verde continua.
 */
export function LoadingScreen({ label = "Carregando" }: { label?: string }) {
  const inShell = useContext(InShellContext);
  if (!inShell) return <BootSplash />;
  return (
    <Stack gap="sm" pt="xs" role="status" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {SKELETON_HEIGHTS.map((height, i) => (
        <div key={i} className="shimmer" style={{ height }} aria-hidden />
      ))}
    </Stack>
  );
}
