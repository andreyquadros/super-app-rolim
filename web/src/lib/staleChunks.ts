// Pedaço do app que não carregou (vite:preloadError). O navegador guarda a
// falha do módulo até a página recarregar (Chrome e Safari): chamar o import()
// de novo não baixa o pedaço outra vez, só recarregar resolve.
// - Versão nova no ar (o pedaço pedido é da antiga): recarrega sozinho.
// - Mesma versão (rede instável): oferece recarregar ("Uma parte do app não
//   carregou", no UpdatePrompt), sem perder o que a pessoa está fazendo. O
//   Safari guarda até depois de recarregar um pedaço que veio com erro do
//   servidor (só um processo novo o baixa de novo): se falhar de novo logo
//   depois de recarregar, o aviso pede para fechar e abrir o app.
// No Safari, começar uma navegação de documento ("Sair", "Recarregar o app",
// um link de fora) também cancela os import() pendentes, com "Importing a
// module script failed" e sem a URL do pedaço; recarregar sozinho nesse caso
// abriria a página antiga por cima da navegação.

export const CHUNK_RELOAD_KEY = "rolim.chunkReload";
/** Uma recarga automática por vez: se falhar de novo logo depois, mostra o erro */
export const CHUNK_RELOAD_WINDOW_MS = 30_000;
/** Sem resposta nesse tempo, não recarrega: rede ruim não é versão nova */
const VERSION_CHECK_TIMEOUT_MS = 10_000;
/** Página saindo (Safari) some antes disso: o aviso não pisca na navegação */
export const FAILED_NOTICE_DELAY_MS = 2_000;
const PART_RELOAD_KEY = "rolim.partReload";
/** Falhou de novo até esse tempo depois de "Recarregar": recarregar não bastou */
export const PART_RELOAD_WINDOW_MS = 60_000;

/** Endereço do primeiro <script type="module" src> do HTML (a entrada do app). */
export function entryScriptSrc(html: string): string | null {
  for (const [, attrs] of html.matchAll(/<script\b([^>]*)>/gi)) {
    if (!/\btype=["']?module\b/i.test(attrs)) continue;
    const src = /\bsrc=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attrs);
    if (src) return src[1] ?? src[2] ?? src[3] ?? null;
  }
  return null;
}

export interface StaleChunkCheck {
  online: boolean;
  /** Entrada da página aberta (o mesmo atributo src do index.html) */
  currentEntry: string | null;
  /** index.html que uma recarga abriria agora; rejeita se não conseguir */
  fetchIndex: () => Promise<string>;
  storage: Pick<Storage, "getItem" | "setItem">;
  now: () => number;
}

/**
 * Decide se um pedaço que falhou justifica recarregar: só quando uma recarga
 * abriria outra versão do app, no máximo uma vez a cada 30 s. Na dúvida (sem
 * internet, busca falhou, página saindo), não recarrega sozinho: o app
 * oferece recarregar.
 */
export async function shouldReloadForNewVersion(check: StaleChunkCheck): Promise<boolean> {
  // Sem internet a falha é da rede: recarregar derrubaria o app (e o aviso
  // "Sem internet") no meio do uso
  if (!check.online || !check.currentEntry) return false;
  try {
    const lastReload = Number(check.storage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    if (check.now() - lastReload < CHUNK_RELOAD_WINDOW_MS) return false;
    const served = entryScriptSrc(await check.fetchIndex());
    if (!served || served === check.currentEntry) return false;
    check.storage.setItem(CHUNK_RELOAD_KEY, String(check.now()));
    return true;
  } catch {
    // Busca falhou (página saindo ou sem rede) ou sem sessionStorage, que é o
    // que evita recarregar sem parar: deixa o erro aparecer
    return false;
  }
}

/**
 * O index.html que uma recarga abriria agora: com o service worker no
 * controle é o da cópia offline dele (que só muda quando a pessoa toca em
 * "Atualizar"); sem ele, o do servidor, sem cache do navegador.
 */
async function fetchIndexHtml(): Promise<string> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(import.meta.env.BASE_URL, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`index.html respondeu ${response.status}`);
    return await response.text();
  } finally {
    window.clearTimeout(timer);
  }
}

// O próprio acesso a window.sessionStorage pode lançar (dados bloqueados)
const session: StaleChunkCheck["storage"] = {
  getItem: (key) => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
};

let partFailed = false;
const failureListeners = new Set<() => void>();

function setPartFailed(value: boolean): void {
  partFailed = value;
  failureListeners.forEach((listener) => listener());
}

/** true quando um pedaço não carregou e só recarregar a página resolve. */
export function hasFailedPart(): boolean {
  return partFailed;
}

export function onFailedPartChange(listener: () => void): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

/** "Depois": esconde o aviso (volta se outro pedaço falhar). */
export function dismissFailedPart(): void {
  setPartFailed(false);
}

/** "Recarregar" do aviso: guarda a hora para saber se adiantou. */
export function reloadForFailedPart(): void {
  try {
    window.sessionStorage.setItem(PART_RELOAD_KEY, String(Date.now()));
  } catch {
    // sem sessionStorage o aviso só não muda de texto
  }
  window.location.reload();
}

/** O pedaço falhou de novo logo depois de "Recarregar" (Safari): melhor fechar e abrir o app. */
export function reloadDidNotHelp(now = Date.now()): boolean {
  try {
    return now - Number(window.sessionStorage.getItem(PART_RELOAD_KEY) ?? 0) < PART_RELOAD_WINDOW_MS;
  } catch {
    return false;
  }
}

/**
 * Pedaço que falhou: recarrega sozinho uma vez se saiu uma versão nova; senão
 * marca a falha para o app oferecer recarregar.
 */
export function recoverFromStaleChunks(): void {
  let checking: Promise<void> | null = null;
  window.addEventListener("vite:preloadError", () => {
    // Sem preventDefault: o import() falha como sempre (tela de erro de quem o
    // chamou) enquanto o app confere a versão. Várias falhas juntas (as abas
    // baixadas em segundo plano) fazem uma busca só.
    checking ??= shouldReloadForNewVersion({
      online: navigator.onLine,
      currentEntry: document.querySelector('script[type="module"][src]')?.getAttribute("src") ?? null,
      fetchIndex: fetchIndexHtml,
      storage: session,
      now: Date.now,
    })
      .then((reload) => {
        if (reload) window.location.reload();
        else window.setTimeout(() => setPartFailed(true), FAILED_NOTICE_DELAY_MS);
      })
      .finally(() => (checking = null));
  });
}
