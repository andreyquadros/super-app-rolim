import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BROWSER_ENV,
  completeOnboarding,
  decideOnboarding,
  markWhatsNewSeen,
  NEWS_CURRENT,
  recordSessionEntry,
  shouldShowOnboarding,
  shouldShowWhatsNew,
  storageWorks,
  todayLocal,
  TOUR_DONE,
  TOUR_KEY,
  withoutIntroParam,
  withoutParams,
  type EntryContext,
  type KeyValueStore,
  type OnboardingEnv,
} from "./onboardingState";

const ORIGIN = "https://app.rolimdemoura.ro.gov.br";
const url = (path: string) => new URL(path, ORIGIN);

interface MemoryStore extends KeyValueStore {
  snapshot: () => Record<string, string>;
}

function memoryStore(initial: Record<string, string> = {}): MemoryStore {
  const data = new Map(Object.entries(initial));
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
    snapshot: () => Object.fromEntries(data),
  };
}

/** Armazenamento bloqueado (modo privado de alguns navegadores). */
const brokenStore: KeyValueStore = { get: () => null, set: () => undefined, remove: () => undefined };

function makeEnv(local: Record<string, string> = {}, session: Record<string, string> = {}) {
  const env = { local: memoryStore(local), session: memoryStore(session), replaceUrl: vi.fn<(from: URL, to: string) => void>() };
  return env satisfies OnboardingEnv;
}

const firstVisit = (path = "/"): EntryContext => ({ path, serviceWorkerControlled: false, today: "2026-10-19" });

/** Nova sessão (aba fechada e aberta de novo): o localStorage continua. */
function newSession(env: ReturnType<typeof makeEnv>, entry = "/") {
  const next = makeEnv(env.local.snapshot());
  recordSessionEntry(next, firstVisit(entry));
  return next;
}

describe("decideOnboarding", () => {
  const base = { storageWorks: true, completed: false, entry: "/", pathname: "/", introShown: false, introOff: false };

  it("mostra só no primeiro acesso pela tela inicial", () => {
    expect(decideOnboarding(base)).toBe("show");
  });

  it("não mostra quando já concluída, já exibida na sessão ou sem armazenamento", () => {
    expect(decideOnboarding({ ...base, completed: true })).toBe("skip");
    expect(decideOnboarding({ ...base, introShown: true })).toBe("skip");
    expect(decideOnboarding({ ...base, storageWorks: false })).toBe("skip");
  });

  it("nunca intercepta links diretos", () => {
    for (const entry of ["/protocolos/zeladoria/x", "/plantao/funerarias", "/entrar?next=/", "/cadastro", "/painel/inicio", "/zeladoria/nova", "/?utm_source=whatsapp"]) {
      expect(decideOnboarding({ ...base, entry })).toBe("skip");
    }
    expect(decideOnboarding({ ...base, entry: null })).toBe("skip");
  });

  it("?intro=0 desliga a apresentação", () => {
    expect(decideOnboarding({ ...base, introOff: true })).toBe("disable");
    expect(decideOnboarding({ ...base, introOff: true, completed: true })).toBe("disable");
  });
});

describe("shouldShowOnboarding", () => {
  it("mostra uma vez por sessão a quem entrou por /", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/"));
    expect(shouldShowOnboarding(url("/"), env)).toBe(true);
    // Recarregar ou voltar à Início na mesma sessão não mostra de novo
    expect(shouldShowOnboarding(url("/"), env)).toBe(false);
  });

  it("desiste na 2ª exibição sem conclusão", () => {
    const first = makeEnv();
    recordSessionEntry(first, firstVisit("/"));
    expect(shouldShowOnboarding(url("/"), first)).toBe(true);
    expect(first.local.get("rolim.onboarding.vezes")).toBe("1");

    const second = newSession(first);
    expect(shouldShowOnboarding(url("/"), second)).toBe(true);
    expect(second.local.get("rolim.onboarding")).toBe("v1");
    expect(second.local.get("rolim.onboarding.vezes")).toBeNull();

    const third = newSession(second);
    expect(shouldShowOnboarding(url("/"), third)).toBe(false);
  });

  it("não mostra depois de concluída", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/"));
    completeOnboarding(env);
    expect(env.local.get("rolim.onboarding")).toBe("v1");
    expect(shouldShowOnboarding(url("/"), newSession(env))).toBe(false);
  });

  it("não intercepta quem chegou por link direto e depois foi à Início", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/plantao/funerarias"));
    expect(shouldShowOnboarding(url("/"), env)).toBe(false);
    expect(env.local.get("rolim.onboarding")).toBeNull();
  });

  it("só decide na rota index", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/"));
    expect(shouldShowOnboarding(url("/protocolos"), env)).toBe(false);
  });

  it("?intro=0 grava a conclusão e tira o parâmetro da barra", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/?intro=0"));
    const request = url("/?intro=0");
    expect(shouldShowOnboarding(request, env)).toBe(false);
    expect(env.local.get("rolim.onboarding")).toBe("v1");
    expect(env.replaceUrl).toHaveBeenCalledWith(request, "/");
    expect(shouldShowOnboarding(url("/"), newSession(env))).toBe(false);
  });

  it("sem armazenamento funcionando, nunca mostra (voltaria sempre)", () => {
    const env: OnboardingEnv = { local: brokenStore, session: memoryStore({ "rolim.entry": "/" }) };
    expect(shouldShowOnboarding(url("/"), env)).toBe(false);
  });

  it("?intro=0 também grava o passeio como visto (Lighthouse e e2e limpos)", () => {
    const env = makeEnv({ [TOUR_KEY]: "pendente" });
    recordSessionEntry(env, firstVisit("/?intro=0"));
    expect(shouldShowOnboarding(url("/?intro=0"), env)).toBe(false);
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_DONE);
  });

  it("sem ?intro=0, não mexe no passeio", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/"));
    shouldShowOnboarding(url("/"), env);
    expect(env.local.get(TOUR_KEY)).toBeNull();
  });
});

describe("withoutIntroParam", () => {
  it("remove só o parâmetro intro", () => {
    expect(withoutIntroParam(url("/?intro=0"))).toBe("/");
    expect(withoutIntroParam(url("/?intro=0&utm_source=radio#topo"))).toBe("/?utm_source=radio#topo");
    expect(withoutIntroParam(url("/?intro=0&passeio=1"))).toBe("/?passeio=1");
  });
});

describe("withoutParams", () => {
  it("tira intro e passeio e mantém os outros parâmetros e o hash", () => {
    const names = ["intro", "passeio"];
    expect(withoutParams(url("/?passeio=1"), names)).toBe("/");
    expect(withoutParams(url("/?intro=0&passeio=1"), names)).toBe("/");
    expect(withoutParams(url("/?utm_source=radio&passeio=1&intro=0&utm_medium=spot#topo"), names)).toBe(
      "/?utm_source=radio&utm_medium=spot#topo",
    );
    expect(withoutParams(url("/protocolos?passeio=1#lista"), names)).toBe("/protocolos#lista");
  });

  it("tira todas as repetições do parâmetro", () => {
    expect(withoutParams(url("/?passeio=1&passeio=2&a=1"), ["passeio"])).toBe("/?a=1");
  });

  it("sem os parâmetros, devolve o mesmo endereço", () => {
    expect(withoutParams(url("/?a=1#b"), ["intro", "passeio"])).toBe("/?a=1#b");
    expect(withoutParams(url("/"), [])).toBe("/");
  });
});

describe("storageWorks", () => {
  it("confere a escrita e a leitura sem deixar rastro", () => {
    const local = memoryStore({ "rolim.firstSeen": "2026-01-01" });
    expect(storageWorks(local)).toBe(true);
    expect(local.snapshot()).toEqual({ "rolim.firstSeen": "2026-01-01" });
  });

  it("falha com o armazenamento bloqueado", () => {
    expect(storageWorks(brokenStore)).toBe(false);
  });
});

describe("todayLocal", () => {
  afterEach(() => vi.useRealTimers());

  it("usa a data do relógio local, no formato AAAA-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 23, 59));
    expect(todayLocal()).toBe("2026-01-05");
    vi.setSystemTime(new Date(2026, 11, 31, 0, 1));
    expect(todayLocal()).toBe("2026-12-31");
  });
});

describe("BROWSER_ENV", () => {
  it("tem o armazenamento local, a sessão e a troca de endereço", () => {
    expect(typeof BROWSER_ENV.local.get).toBe("function");
    expect(typeof BROWSER_ENV.session.set).toBe("function");
    expect(typeof BROWSER_ENV.replaceUrl).toBe("function");
  });
});

describe("recordSessionEntry", () => {
  it("guarda só a primeira tela da sessão", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/plantao/farmacias"));
    recordSessionEntry(env, firstVisit("/"));
    expect(env.session.get("rolim.entry")).toBe("/plantao/farmacias");
  });

  it("primeiro acesso de verdade: marca a data e não pula a apresentação", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/"));
    expect(env.local.get("rolim.firstSeen")).toBe("2026-10-19");
    expect(env.local.get("rolim.onboarding")).toBeNull();
    expect(env.local.get("rolim.novidades")).toBeNull();
  });

  it.each([
    ["service worker no controle", {}, true],
    ["aviso de instalação dispensado", { "rolim.installDismissed": "1" }, false],
    ["avisos ligados", { "rolim.pushToken": "abc" }, false],
  ])("usuário antigo (%s): sem apresentação, sem passeio e com novidade pendente", (_label, local, controlled) => {
    const env = makeEnv(local);
    recordSessionEntry(env, { ...firstVisit("/"), serviceWorkerControlled: controlled });
    expect(env.local.get("rolim.onboarding")).toBe("v1");
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_DONE);
    expect(env.local.get("rolim.novidades")).toBe("pendente");
    expect(env.local.get("rolim.firstSeen")).toBe("2026-10-19");
  });

  it("primeiro acesso de verdade: o passeio fica ausente (só a apresentação o deixa pendente)", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/"));
    expect(env.local.get(TOUR_KEY)).toBeNull();
  });

  it("com firstSeen gravado, nada muda (mesmo com service worker)", () => {
    const env = makeEnv({ "rolim.firstSeen": "2026-01-01" });
    recordSessionEntry(env, { ...firstVisit("/"), serviceWorkerControlled: true });
    expect(env.local.get("rolim.onboarding")).toBeNull();
    expect(env.local.get(TOUR_KEY)).toBeNull();
    expect(env.local.get("rolim.novidades")).toBeNull();
    expect(env.local.get("rolim.firstSeen")).toBe("2026-01-01");
  });

  it("não reabre uma novidade já vista", () => {
    const env = makeEnv({ "rolim.novidades": NEWS_CURRENT, "rolim.pushToken": "abc" });
    recordSessionEntry(env, firstVisit("/"));
    expect(env.local.get("rolim.novidades")).toBe(NEWS_CURRENT);
  });
});

describe("shouldShowWhatsNew", () => {
  function returningUser(entry: string) {
    const env = makeEnv({ "rolim.pushToken": "abc" });
    recordSessionEntry(env, firstVisit(entry));
    return env;
  }

  it("aparece para o usuário antigo que abriu a Início", () => {
    const env = returningUser("/");
    expect(shouldShowOnboarding(url("/"), env)).toBe(false);
    expect(shouldShowWhatsNew(env)).toBe(true);
  });

  it("some depois de vista", () => {
    const env = returningUser("/");
    markWhatsNewSeen(env);
    expect(env.local.get("rolim.novidades")).toBe(NEWS_CURRENT);
    expect(shouldShowWhatsNew(env)).toBe(false);
  });

  it("nunca para quem chegou por link direto", () => {
    expect(shouldShowWhatsNew(returningUser("/protocolos/zeladoria/x"))).toBe(false);
  });

  it("nunca junto com a apresentação", () => {
    const env = makeEnv({ "rolim.novidades": "pendente" });
    recordSessionEntry(env, firstVisit("/"));
    expect(shouldShowOnboarding(url("/"), env)).toBe(true);
    expect(shouldShowWhatsNew(env)).toBe(false);
  });

  it("não aparece para quem é novo", () => {
    const env = makeEnv();
    recordSessionEntry(env, firstVisit("/"));
    completeOnboarding(env);
    expect(shouldShowWhatsNew(env)).toBe(false);
  });
});
