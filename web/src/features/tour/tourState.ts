import { useSyncExternalStore } from "react";
import {
  BROWSER_ENV,
  ENTRY_KEY,
  FIRST_SEEN_KEY,
  NEWS_KEY,
  NEWS_PENDING,
  storageWorks,
  todayLocal,
  TOUR_DONE,
  TOUR_KEY,
  type OnboardingEnv,
} from "@/features/onboarding/onboardingState";

// Quando oferecer o "Passeio pela tela inicial" e os pedidos manuais de
// passeio. Fica no pacote inicial: importa só onboardingState e react. O
// passeio em si (HomeTour) é um pedaço baixado sob demanda.

export { TOUR_DONE, TOUR_KEY };
/** A apresentação terminou por "Começar a usar" ou "Entrar ou criar conta" */
export const TOUR_PENDING = "pendente";
/** Quantas vezes a oferta abriu (local); sai quando o estado vira v1 */
export const TOUR_VIEWS_KEY = "rolim.passeio.vezes";
/** A oferta já abriu nesta sessão */
export const TOUR_OFFERED_KEY = "rolim.passeio.oferecido";
/** Pedido de uso único vindo de /?passeio=1 (sessão) */
export const TOUR_LINK_KEY = "rolim.passeio.pedido";

/** Na 2ª vez que a oferta abre sem resposta, não volta mais */
const MAX_OFFERS = 2;
/** A oferta só vale nos primeiros dias depois do primeiro acesso */
const OFFER_WINDOW_DAYS = 14;
const DAY_MS = 86_400_000;

export type TourMode = "oferta" | "manual";
export type TourOutcome = "concluido" | "saiu" | "acao" | "recusou" | "dispensou";

export interface TourRequest {
  source: "ajuda" | "perfil";
  /** Quem pediu (a linha "Como usar o app"), para devolver o foco; null no Perfil */
  origin: HTMLElement | null;
  /** O pedaço do passeio não carregou */
  onFail?: () => void;
}

// ---------- Decisão pura ----------

export interface TourOfferInput {
  storageWorks: boolean;
  /** rolim.passeio */
  state: string | null;
  /** rolim.entry (pathname + search da primeira tela da sessão) */
  entry: string | null;
  offeredThisSession: boolean;
  whatsNewPending: boolean;
  /** AAAA-MM-DD */
  firstSeen: string | null;
  /** AAAA-MM-DD */
  today: string;
}

/** Dia do calendário (AAAA-MM-DD) em dias desde a época; null se inválido. */
function dayNumber(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  const time = Date.UTC(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(time) ? null : Math.round(time / DAY_MS);
}

function withinOfferWindow(firstSeen: string | null, today: string): boolean {
  if (firstSeen === null) return false;
  const first = dayNumber(firstSeen);
  const now = dayNumber(today);
  if (first === null || now === null) return false;
  // Relógio adiantado no primeiro acesso conta igual, pela distância
  return Math.abs(now - first) <= OFFER_WINDOW_DAYS;
}

export function decideTourOffer(input: TourOfferInput): boolean {
  if (!input.storageWorks || input.state !== TOUR_PENDING) return false;
  // Só em sessão que começou pela Início (nunca por link, atalho, push ou e-mail)
  if (input.entry !== "/") return false;
  if (input.offeredThisSession || input.whatsNewPending) return false;
  return withinOfferWindow(input.firstSeen, input.today);
}

// ---------- API usada pelo CitizenLayout, pela apresentação e pelo passeio ----------

/** CitizenLayout, ao montar, e o passeio, antes de abrir a oferta. */
export function shouldOfferTour(env: OnboardingEnv = BROWSER_ENV, today: string = todayLocal()): boolean {
  return decideTourOffer({
    storageWorks: storageWorks(env.local),
    state: env.local.get(TOUR_KEY),
    entry: env.session.get(ENTRY_KEY),
    offeredThisSession: env.session.get(TOUR_OFFERED_KEY) !== null,
    whatsNewPending: env.local.get(NEWS_KEY) === NEWS_PENDING,
    firstSeen: env.local.get(FIRST_SEEN_KEY),
    today,
  });
}

/** Apresentação: "Começar a usar" e "Entrar ou criar conta" (sem ?rever=1). */
export function markTourPending(env: OnboardingEnv = BROWSER_ENV): void {
  if (env.local.get(TOUR_KEY) === TOUR_DONE) return;
  env.local.set(TOUR_KEY, TOUR_PENDING);
}

function offersSoFar(env: OnboardingEnv): number {
  const value = Number.parseInt(env.local.get(TOUR_VIEWS_KEY) ?? "0", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Oferta, ao abrir: marca a sessão e conta a vez; na 2ª vez, vira v1. */
export function markTourOffered(env: OnboardingEnv = BROWSER_ENV): void {
  env.session.set(TOUR_OFFERED_KEY, "1");
  // Outra aba já concluiu: nada a contar
  if (env.local.get(TOUR_KEY) === TOUR_DONE) return;
  const offers = offersSoFar(env) + 1;
  if (offers >= MAX_OFFERS) {
    markTourDone(env);
    return;
  }
  env.local.set(TOUR_VIEWS_KEY, String(offers));
}

/** Qualquer passeio que começa, ou "Agora não": nunca mais automático. */
export function markTourDone(env: OnboardingEnv = BROWSER_ENV): void {
  env.local.set(TOUR_KEY, TOUR_DONE);
  env.local.remove(TOUR_VIEWS_KEY);
}

/** Loader de /?passeio=1 (Perfil › Ajuda). */
export function requestTourFromLink(env: OnboardingEnv = BROWSER_ENV): void {
  env.session.set(TOUR_LINK_KEY, "1");
}

/** CitizenLayout, na Início: true uma única vez por pedido do link. */
export function consumeTourLinkRequest(env: OnboardingEnv = BROWSER_ENV): boolean {
  if (env.session.get(TOUR_LINK_KEY) === null) return false;
  env.session.remove(TOUR_LINK_KEY);
  return true;
}

// ---------- Pedidos manuais (useSyncExternalStore) ----------

let currentRequest: Readonly<TourRequest> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of [...listeners]) listener();
}

export function subscribeTourRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTourRequest(): Readonly<TourRequest> | null {
  return currentRequest;
}

function getServerTourRequest(): null {
  return null;
}

/** HomeHelp ("Como usar o app") e o CitizenLayout (pedido do Perfil). */
export function requestTour(request: TourRequest): void {
  currentRequest = Object.freeze({ ...request });
  notify();
}

export function clearTourRequest(): void {
  if (currentRequest === null) return;
  currentRequest = null;
  notify();
}

export function useTourRequest(): TourRequest | null {
  return useSyncExternalStore(subscribeTourRequest, getTourRequest, getServerTourRequest);
}
