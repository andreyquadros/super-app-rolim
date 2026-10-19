import { storageGet, storageRemove, storageSet } from "@/lib/safeStorage";

// Regras de quando mostrar a apresentação dos primeiros acessos e a
// "Novidade" (funerárias) para quem já usava o app. As decisões são funções
// puras; o acesso ao armazenamento entra por OnboardingEnv (testável).

const ONBOARDING_KEY = "rolim.onboarding";
const VIEWS_KEY = "rolim.onboarding.vezes";
const FIRST_SEEN_KEY = "rolim.firstSeen";
const NEWS_KEY = "rolim.novidades";
const ENTRY_KEY = "rolim.entry";
const INTRO_SHOWN_KEY = "rolim.introShown";
const PROBE_KEY = "rolim.probe";

export const ONBOARDING_DONE = "v1";
export const NEWS_PENDING = "pendente";
export const NEWS_CURRENT = "2026-10-funerarias";
/** Na 2ª exibição sem conclusão a apresentação não volta mais */
const MAX_VIEWS = 2;
/** Marcas deixadas pela versão anterior do app */
const RETURNING_USER_KEYS = ["rolim.installDismissed", "rolim.pushToken"] as const;

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface OnboardingEnv {
  /** localStorage (sempre via safeStorage) */
  local: KeyValueStore;
  /** sessionStorage com cópia em memória */
  session: KeyValueStore;
  /** Troca o endereço da barra sem navegar (tira o ?intro=0) */
  replaceUrl?: (from: URL, to: string) => void;
}

export interface EntryContext {
  /** pathname + search da primeira tela aberta nesta sessão */
  path: string;
  /** Já existe um service worker no controle (visita anterior) */
  serviceWorkerControlled: boolean;
  /** AAAA-MM-DD */
  today: string;
}

// ---------- Decisões puras ----------

export interface OnboardingInput {
  storageWorks: boolean;
  completed: boolean;
  entry: string | null;
  pathname: string;
  introShown: boolean;
  /** ?intro=0 (links de divulgação, testes, Lighthouse) */
  introOff: boolean;
}

export type OnboardingDecision = "show" | "skip" | "disable";

export function decideOnboarding(input: OnboardingInput): OnboardingDecision {
  if (input.introOff) return "disable";
  if (!input.storageWorks || input.completed) return "skip";
  // Só quem abriu o app pela tela inicial: links diretos nunca são interceptados
  if (input.entry !== "/" || input.pathname !== "/") return "skip";
  if (input.introShown) return "skip";
  return "show";
}

export interface WhatsNewInput {
  news: string | null;
  entry: string | null;
  completed: boolean;
  introShown: boolean;
}

export function decideWhatsNew(input: WhatsNewInput): boolean {
  return input.news === NEWS_PENDING && input.entry === "/" && input.completed && !input.introShown;
}

/** Quem já usava o app antes de existir rolim.firstSeen. */
export function isReturningUser(local: KeyValueStore, serviceWorkerControlled: boolean): boolean {
  return serviceWorkerControlled || RETURNING_USER_KEYS.some((key) => local.get(key) !== null);
}

/** O mesmo endereço sem o parâmetro intro (mantém os demais). */
export function withoutIntroParam(url: URL): string {
  const params = new URLSearchParams(url.search);
  params.delete("intro");
  const search = params.toString();
  return `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
}

// ---------- Armazenamento do navegador ----------

const localStore: KeyValueStore = { get: storageGet, set: storageSet, remove: storageRemove };

// sessionStorage pode lançar exceção (modo privado, dados bloqueados)
const sessionMemory = new Map<string, string>();
const sessionStore: KeyValueStore = {
  get(key) {
    try {
      return window.sessionStorage.getItem(key) ?? sessionMemory.get(key) ?? null;
    } catch {
      return sessionMemory.get(key) ?? null;
    }
  },
  set(key, value) {
    sessionMemory.set(key, value);
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // fica só a cópia em memória
    }
  },
  remove(key) {
    sessionMemory.delete(key);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // nada a remover
    }
  },
};

function replaceBrowserUrl(from: URL, to: string): void {
  // Só na carga inicial (ou no voltar): numa navegação interna a barra ainda
  // mostra a tela anterior, que não deve ser trocada
  if (window.location.pathname !== from.pathname || window.location.search !== from.search) return;
  window.history.replaceState(window.history.state, "", to);
}

const BROWSER_ENV: OnboardingEnv = { local: localStore, session: sessionStore, replaceUrl: replaceBrowserUrl };

function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function browserEntryContext(): EntryContext {
  const controlled = "serviceWorker" in navigator && navigator.serviceWorker.controller !== null;
  return { path: window.location.pathname + window.location.search, serviceWorkerControlled: controlled, today: localDate(new Date()) };
}

/** Teste de escrita e leitura: sem armazenamento a apresentação voltaria sempre. */
function storageWorks(local: KeyValueStore): boolean {
  local.set(PROBE_KEY, "1");
  const works = local.get(PROBE_KEY) === "1";
  local.remove(PROBE_KEY);
  return works;
}

function viewsSoFar(local: KeyValueStore): number {
  const value = Number.parseInt(local.get(VIEWS_KEY) ?? "0", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

// ---------- API usada por main.tsx, router.tsx, CitizenLayout e telas ----------

/** main.tsx, antes do roteador: guarda a entrada da sessão e marca usuários antigos. */
export function recordSessionEntry(env: OnboardingEnv = BROWSER_ENV, context: EntryContext = browserEntryContext()): void {
  if (env.session.get(ENTRY_KEY) === null) env.session.set(ENTRY_KEY, context.path);
  // Lê antes de gravar: a ausência de firstSeen é o que marca o primeiro acesso
  if (env.local.get(FIRST_SEEN_KEY) !== null) return;
  if (isReturningUser(env.local, context.serviceWorkerControlled)) {
    env.local.set(ONBOARDING_KEY, ONBOARDING_DONE);
    if (env.local.get(NEWS_KEY) === null) env.local.set(NEWS_KEY, NEWS_PENDING);
  }
  env.local.set(FIRST_SEEN_KEY, context.today);
}

/** Loader da rota index: true → redirect("/boas-vindas"). */
export function shouldShowOnboarding(url: URL, env: OnboardingEnv = BROWSER_ENV): boolean {
  const decision = decideOnboarding({
    storageWorks: storageWorks(env.local),
    completed: env.local.get(ONBOARDING_KEY) === ONBOARDING_DONE,
    entry: env.session.get(ENTRY_KEY),
    pathname: url.pathname,
    introShown: env.session.get(INTRO_SHOWN_KEY) !== null,
    introOff: url.searchParams.get("intro") === "0",
  });

  if (decision === "disable") {
    env.local.set(ONBOARDING_KEY, ONBOARDING_DONE);
    env.replaceUrl?.(url, withoutIntroParam(url));
    return false;
  }
  if (decision === "skip") return false;

  env.session.set(INTRO_SHOWN_KEY, "1");
  const views = viewsSoFar(env.local) + 1;
  if (views >= MAX_VIEWS) {
    env.local.set(ONBOARDING_KEY, ONBOARDING_DONE);
    env.local.remove(VIEWS_KEY);
  } else {
    env.local.set(VIEWS_KEY, String(views));
  }
  return true;
}

/** Pular, Começar a usar, Entrar ou login bem-sucedido. */
export function completeOnboarding(env: OnboardingEnv = BROWSER_ENV): void {
  env.local.set(ONBOARDING_KEY, ONBOARDING_DONE);
  env.local.remove(VIEWS_KEY);
}

/** "Novidade" (funerárias) para quem já usava o app. */
export function shouldShowWhatsNew(env: OnboardingEnv = BROWSER_ENV): boolean {
  return decideWhatsNew({
    news: env.local.get(NEWS_KEY),
    entry: env.session.get(ENTRY_KEY),
    completed: env.local.get(ONBOARDING_KEY) === ONBOARDING_DONE,
    introShown: env.session.get(INTRO_SHOWN_KEY) !== null,
  });
}

export function markWhatsNewSeen(env: OnboardingEnv = BROWSER_ENV): void {
  env.local.set(NEWS_KEY, NEWS_CURRENT);
}
