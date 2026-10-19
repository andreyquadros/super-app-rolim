import { describe, expect, it, vi } from "vitest";
import { CHUNK_RELOAD_KEY, CHUNK_RELOAD_WINDOW_MS, entryScriptSrc, shouldReloadForNewVersion, type StaleChunkCheck } from "./staleChunks";

const indexHtml = (entry: string) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <link rel="modulepreload" crossorigin href="/assets/router-Bx1.js">
    <script type="module" crossorigin src="${entry}"></script>
    <link rel="preload" as="style" crossorigin href="/assets/index-C9.css" data-app-css>
  </head>
  <body><div id="root"></div></body>
</html>`;

const NOW = 1_800_000_000_000;

function memoryStorage(initial: Record<string, string> = {}): StaleChunkCheck["storage"] & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

const check = (over: Partial<StaleChunkCheck> = {}): StaleChunkCheck => ({
  online: true,
  currentEntry: "/assets/index-Antiga1.js",
  fetchIndex: () => Promise.resolve(indexHtml("/assets/index-Nova22.js")),
  storage: memoryStorage(),
  now: () => NOW,
  ...over,
});

describe("entryScriptSrc", () => {
  it("acha o script de entrada do index.html do build", () => {
    expect(entryScriptSrc(indexHtml("/assets/index-DHXb2Hpr.js"))).toBe("/assets/index-DHXb2Hpr.js");
  });

  it("aceita outra ordem de atributos e aspas simples", () => {
    expect(entryScriptSrc(`<script src='/assets/a.js' type='module'></script>`)).toBe("/assets/a.js");
  });

  it("ignora scripts comuns e módulos sem src", () => {
    const html = `<script src="/x.js"></script><script type="module">import "./y.js"</script><script type="module" src="/z.js"></script>`;
    expect(entryScriptSrc(html)).toBe("/z.js");
  });

  it("página sem o app (portal de Wi-Fi, erro do servidor) não tem entrada", () => {
    expect(entryScriptSrc("<html><body>Faça login na rede</body></html>")).toBeNull();
  });
});

describe("shouldReloadForNewVersion", () => {
  it("recarrega quando uma recarga abriria outra versão e guarda a hora", async () => {
    const storage = memoryStorage();
    expect(await shouldReloadForNewVersion(check({ storage }))).toBe(true);
    expect(storage.data[CHUNK_RELOAD_KEY]).toBe(String(NOW));
  });

  it("mesma versão: falha passageira ou navegação saindo (Safari), não recarrega", async () => {
    const storage = memoryStorage();
    const same = check({ storage, fetchIndex: () => Promise.resolve(indexHtml("/assets/index-Antiga1.js")) });
    expect(await shouldReloadForNewVersion(same)).toBe(false);
    expect(storage.data).toEqual({});
  });

  it("busca do index.html falhou (página saindo, sem rede, tempo esgotado): não recarrega", async () => {
    const failing = check({ fetchIndex: () => Promise.reject(new TypeError("Load failed")) });
    expect(await shouldReloadForNewVersion(failing)).toBe(false);
  });

  it("resposta sem o app não conta como versão nova", async () => {
    const portal = check({ fetchIndex: () => Promise.resolve("<html><body>Wi-Fi da praça</body></html>") });
    expect(await shouldReloadForNewVersion(portal)).toBe(false);
  });

  it("sem internet nem pergunta ao servidor", async () => {
    const fetchIndex = vi.fn(check().fetchIndex);
    expect(await shouldReloadForNewVersion(check({ online: false, fetchIndex }))).toBe(false);
    expect(fetchIndex).not.toHaveBeenCalled();
  });

  it("página sem script de entrada (desenvolvimento) não recarrega", async () => {
    expect(await shouldReloadForNewVersion(check({ currentEntry: null }))).toBe(false);
  });

  it("já recarregou há menos de 30 s: mostra o erro em vez de entrar em laço", async () => {
    const fetchIndex = vi.fn(check().fetchIndex);
    const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: String(NOW - CHUNK_RELOAD_WINDOW_MS + 1) });
    expect(await shouldReloadForNewVersion(check({ storage, fetchIndex }))).toBe(false);
    expect(fetchIndex).not.toHaveBeenCalled();
  });

  it("passados os 30 s, pode recarregar de novo", async () => {
    const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: String(NOW - CHUNK_RELOAD_WINDOW_MS) });
    expect(await shouldReloadForNewVersion(check({ storage }))).toBe(true);
  });

  it("sem sessionStorage não há como evitar o laço: não recarrega", async () => {
    const blocked: StaleChunkCheck["storage"] = {
      getItem: () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
      setItem: () => undefined,
    };
    expect(await shouldReloadForNewVersion(check({ storage: blocked }))).toBe(false);
  });
});
