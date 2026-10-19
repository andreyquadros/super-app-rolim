// STUB (substituído na F5): regras de quando mostrar a apresentação.

/** main.tsx, antes do roteador: guarda a entrada da sessão e marca usuários antigos. */
export function recordSessionEntry(): void {}

/** Loader da rota index: true → redirect("/boas-vindas"). */
export function shouldShowOnboarding(_url: URL): boolean {
  return false;
}

/** Pular, Começar a usar, Entrar ou login bem-sucedido. */
export function completeOnboarding(): void {}

/** "Novidade" (funerárias) para quem já usava o app. */
export function shouldShowWhatsNew(): boolean {
  return false;
}

export function markWhatsNewSeen(): void {}
