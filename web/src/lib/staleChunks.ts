// Pedaço do app que não carregou (vite:preloadError): recarregar só resolve
// quando há versão nova no ar e o pedaço pedido é da antiga. No Safari, começar
// uma navegação de documento ("Sair", "Recarregar o app", um link de fora)
// cancela os import() pendentes com "Importing a module script failed", sem a
// URL do pedaço; recarregar nesse caso abriria a página antiga por cima da
// navegação. Por isso o app confere antes o que uma recarga abriria.

export const CHUNK_RELOAD_KEY = "rolim.chunkReload";
/** Uma recarga automática por vez: se falhar de novo logo depois, mostra o erro */
export const CHUNK_RELOAD_WINDOW_MS = 30_000;
/** Sem resposta nesse tempo, não recarrega: rede ruim não é versão nova */
const VERSION_CHECK_TIMEOUT_MS = 10_000;

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
 * internet, busca falhou, página saindo), não recarrega: o erro aparece na tela
 * com o botão "Recarregar o app".
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

/** Recarrega uma vez quando um pedaço falha porque saiu uma versão nova. */
export function recoverFromStaleChunks(): void {
  let checking: Promise<void> | null = null;
  window.addEventListener("vite:preloadError", () => {
    // Sem preventDefault: o import() falha como sempre (tela de erro ou nova
    // tentativa de quem o chamou) enquanto o app confere a versão. Várias
    // falhas juntas (as abas baixadas em segundo plano) fazem uma busca só.
    checking ??= shouldReloadForNewVersion({
      online: navigator.onLine,
      currentEntry: document.querySelector('script[type="module"][src]')?.getAttribute("src") ?? null,
      fetchIndex: fetchIndexHtml,
      storage: session,
      now: Date.now,
    })
      .then((reload) => {
        if (reload) window.location.reload();
      })
      .finally(() => (checking = null));
  });
}
