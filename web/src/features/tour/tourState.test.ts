import { afterEach, describe, expect, it, vi } from "vitest";
import { recordSessionEntry, shouldShowOnboarding, TOUR_KEY, type EntryContext, type KeyValueStore, type OnboardingEnv } from "@/features/onboarding/onboardingState";
import {
  clearTourRequest,
  consumeTourLinkRequest,
  decideTourOffer,
  getTourRequest,
  markTourDone,
  markTourOffered,
  markTourPending,
  requestTour,
  requestTourFromLink,
  shouldOfferTour,
  subscribeTourRequest,
  TOUR_DONE,
  TOUR_LINK_KEY,
  TOUR_OFFERED_KEY,
  TOUR_PENDING,
  TOUR_VIEWS_KEY,
  type TourOfferInput,
} from "./tourState";

const TODAY = "2026-10-21";

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

const visit = (path = "/"): EntryContext => ({ path, serviceWorkerControlled: false, today: TODAY });

/** Primeiro acesso pela Início que passou pela apresentação e tocou em "Começar a usar". */
function startedFromIntro(entry = "/") {
  const env = makeEnv();
  recordSessionEntry(env, visit(entry));
  markTourPending(env);
  return env;
}

/** Nova sessão (aba fechada e aberta de novo): o localStorage continua. */
function newSession(env: ReturnType<typeof makeEnv>, entry = "/") {
  const next = makeEnv(env.local.snapshot());
  recordSessionEntry(next, visit(entry));
  return next;
}

describe("decideTourOffer", () => {
  const base: TourOfferInput = {
    storageWorks: true,
    state: TOUR_PENDING,
    entry: "/",
    offeredThisSession: false,
    whatsNewPending: false,
    firstSeen: TODAY,
    today: TODAY,
  };

  it("oferece a quem acabou de conhecer o app pela Início", () => {
    expect(decideTourOffer(base)).toBe(true);
  });

  it("nunca com o armazenamento quebrado", () => {
    expect(decideTourOffer({ ...base, storageWorks: false })).toBe(false);
  });

  it.each([
    ["ausente", null, false],
    ["concluído", TOUR_DONE, false],
    ["pendente", TOUR_PENDING, true],
    ["valor desconhecido", "v2", false],
  ])("estado %s", (_label, state, expected) => {
    expect(decideTourOffer({ ...base, state })).toBe(expected);
  });

  it.each([
    ["/", true],
    ["/plantao/farmacias", false],
    ["/protocolos/x", false],
    ["/?passeio=1", false],
    ["/entrar?next=/", false],
    [null, false],
  ])("entrada da sessão %s", (entry, expected) => {
    expect(decideTourOffer({ ...base, entry })).toBe(expected);
  });

  it("não oferece duas vezes na mesma sessão", () => {
    expect(decideTourOffer({ ...base, offeredThisSession: true })).toBe(false);
  });

  it("não oferece junto com a Novidade", () => {
    expect(decideTourOffer({ ...base, whatsNewPending: true })).toBe(false);
  });

  it.each([
    ["0 dias", "2026-10-21", true],
    ["1 dia", "2026-10-20", true],
    ["14 dias", "2026-10-07", true],
    ["15 dias", "2026-10-06", false],
    ["21 dias, no mês anterior", "2026-09-30", false],
    ["ausente", null, false],
    ["inválido", "ontem", false],
    ["no futuro (relógio adiantado), 1 dia", "2026-10-22", true],
    ["no futuro, 15 dias", "2026-11-05", false],
  ])("firstSeen com %s", (_label, firstSeen, expected) => {
    expect(decideTourOffer({ ...base, firstSeen })).toBe(expected);
  });

  it("conta os dias pelo calendário, também na virada do mês e do ano", () => {
    expect(decideTourOffer({ ...base, today: "2026-10-13", firstSeen: "2026-09-29" })).toBe(true);
    expect(decideTourOffer({ ...base, today: "2026-10-14", firstSeen: "2026-09-29" })).toBe(false);
    expect(decideTourOffer({ ...base, today: "2027-01-04", firstSeen: "2026-12-21" })).toBe(true);
    expect(decideTourOffer({ ...base, today: "2027-01-05", firstSeen: "2026-12-21" })).toBe(false);
  });
});

describe("shouldOfferTour", () => {
  it("oferece depois de Começar a usar ou Entrar ou criar conta", () => {
    expect(shouldOfferTour(startedFromIntro(), TODAY)).toBe(true);
  });

  it("não oferece a quem tocou em Pular (estado ausente)", () => {
    const env = makeEnv();
    recordSessionEntry(env, visit("/"));
    expect(env.local.get(TOUR_KEY)).toBeNull();
    expect(shouldOfferTour(env, TODAY)).toBe(false);
  });

  it("nunca para usuário antigo", () => {
    const env = makeEnv({ "rolim.pushToken": "abc" });
    recordSessionEntry(env, visit("/"));
    markTourPending(env);
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_DONE);
    expect(shouldOfferTour(env, TODAY)).toBe(false);
  });

  it("nunca em sessão que começou por link direto, nem nas futuras", () => {
    const env = startedFromIntro("/plantao/farmacias");
    expect(shouldOfferTour(env, TODAY)).toBe(false);
    expect(shouldOfferTour(newSession(env, "/protocolos/x"), TODAY)).toBe(false);
    expect(shouldOfferTour(newSession(env, "/?passeio=1"), TODAY)).toBe(false);
  });

  it("?intro=0 grava o passeio como visto", () => {
    const env = makeEnv();
    recordSessionEntry(env, visit("/?intro=0"));
    markTourPending(env);
    expect(shouldShowOnboarding(new URL("/?intro=0", "https://app.test"), env)).toBe(false);
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_DONE);
    expect(shouldOfferTour(newSession(env), TODAY)).toBe(false);
  });

  it("nunca com o armazenamento quebrado", () => {
    const env: OnboardingEnv = { local: brokenStore, session: memoryStore({ "rolim.entry": "/" }) };
    markTourPending(env);
    expect(shouldOfferTour(env, TODAY)).toBe(false);
  });

  it("nunca junto com a Novidade pendente", () => {
    const env = startedFromIntro();
    env.local.set("rolim.novidades", "pendente");
    expect(shouldOfferTour(env, TODAY)).toBe(false);
  });

  it("deixa de oferecer depois de 14 dias do primeiro acesso", () => {
    const env = startedFromIntro();
    expect(shouldOfferTour(newSession(env), "2026-11-04")).toBe(true);
    expect(shouldOfferTour(newSession(env), "2026-11-05")).toBe(false);
  });
});

describe("markTourPending", () => {
  it("deixa pendente quem ainda não viu", () => {
    const env = makeEnv();
    markTourPending(env);
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_PENDING);
  });

  it("nunca sobrescreve v1", () => {
    const env = makeEnv({ [TOUR_KEY]: TOUR_DONE });
    markTourPending(env);
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_DONE);
  });
});

describe("markTourOffered", () => {
  it("1ª vez: marca a sessão e conta a vez; volta numa sessão futura", () => {
    const env = startedFromIntro();
    markTourOffered(env);
    expect(env.session.get(TOUR_OFFERED_KEY)).toBe("1");
    expect(env.local.get(TOUR_VIEWS_KEY)).toBe("1");
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_PENDING);
    // Fechou sem escolher: nesta sessão não volta
    expect(shouldOfferTour(env, TODAY)).toBe(false);
    expect(shouldOfferTour(newSession(env), TODAY)).toBe(true);
  });

  it("2ª vez: vira v1, a contagem sai e não volta mais", () => {
    const first = startedFromIntro();
    markTourOffered(first);
    const second = newSession(first);
    markTourOffered(second);
    expect(second.local.get(TOUR_KEY)).toBe(TOUR_DONE);
    expect(second.local.get(TOUR_VIEWS_KEY)).toBeNull();
    expect(shouldOfferTour(newSession(second), TODAY)).toBe(false);
  });

  it("não volta a contar quando outra aba já concluiu", () => {
    const env = makeEnv({ [TOUR_KEY]: TOUR_DONE });
    markTourOffered(env);
    expect(env.local.get(TOUR_VIEWS_KEY)).toBeNull();
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_DONE);
  });

  it("ignora uma contagem corrompida", () => {
    const env = makeEnv({ [TOUR_KEY]: TOUR_PENDING, [TOUR_VIEWS_KEY]: "abc" });
    markTourOffered(env);
    expect(env.local.get(TOUR_VIEWS_KEY)).toBe("1");
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_PENDING);
  });
});

describe("markTourDone", () => {
  it("grava v1 e limpa a contagem", () => {
    const env = startedFromIntro();
    markTourOffered(env);
    markTourDone(env);
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_DONE);
    expect(env.local.get(TOUR_VIEWS_KEY)).toBeNull();
    expect(shouldOfferTour(newSession(env), TODAY)).toBe(false);
  });

  it("vale também para o passeio manual de quem nunca foi oferecido", () => {
    const env = makeEnv();
    markTourDone(env);
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_DONE);
  });
});

describe("pedido pelo link /?passeio=1", () => {
  it("é consumido uma única vez", () => {
    const env = makeEnv();
    expect(consumeTourLinkRequest(env)).toBe(false);
    requestTourFromLink(env);
    expect(env.session.get(TOUR_LINK_KEY)).toBe("1");
    expect(consumeTourLinkRequest(env)).toBe(true);
    expect(consumeTourLinkRequest(env)).toBe(false);
    expect(env.session.get(TOUR_LINK_KEY)).toBeNull();
  });

  it("não mexe no estado da oferta", () => {
    const env = startedFromIntro();
    requestTourFromLink(env);
    expect(env.local.get(TOUR_KEY)).toBe(TOUR_PENDING);
  });
});

describe("requestTour e clearTourRequest", () => {
  afterEach(() => clearTourRequest());

  it("requestTour notifica quem assina, e clearTourRequest limpa", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTourRequest(listener);
    const onFail = vi.fn();

    requestTour({ source: "ajuda", origin: null, onFail });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getTourRequest()).toEqual({ source: "ajuda", origin: null, onFail });

    clearTourRequest();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getTourRequest()).toBeNull();

    unsubscribe();
    requestTour({ source: "perfil", origin: null });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getTourRequest()?.source).toBe("perfil");
  });

  it("o retrato é estável entre leituras (useSyncExternalStore)", () => {
    requestTour({ source: "perfil", origin: null });
    expect(getTourRequest()).toBe(getTourRequest());
  });

  it("guarda uma cópia: mudar o objeto de quem pediu não muda o pedido", () => {
    const request = { source: "ajuda" as const, origin: null };
    requestTour(request);
    expect(getTourRequest()).not.toBe(request);
    expect(Object.isFrozen(getTourRequest())).toBe(true);
  });

  it("limpar sem pedido não notifica ninguém", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTourRequest(listener);
    clearTourRequest();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("um novo pedido substitui o anterior", () => {
    requestTour({ source: "ajuda", origin: null });
    requestTour({ source: "perfil", origin: null });
    expect(getTourRequest()?.source).toBe("perfil");
  });
});
