import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorMessage } from "@/lib/errors";
import { CACHE_GRACE_MS, createCacheGate, mergeWatchers, shouldHoldSnapshot, type OnData, type OnError, type WatchOptions, type Watcher } from "./watch";

const isEmptyList = (items: readonly unknown[]) => items.length === 0;

function spies<T>() {
  const onData = vi.fn<OnData<T>>();
  const onError = vi.fn<OnError>();
  return { onData, onError };
}

/** Assinatura falsa: o teste decide quando cada "snapshot" chega. */
function fakeWatcher<T>() {
  let data: OnData<T[]> = () => undefined;
  let fail: OnError = () => undefined;
  const received: (WatchOptions | undefined)[] = [];
  const watcher: Watcher<T[]> = (onData, onError, options) => {
    data = onData;
    fail = onError;
    received.push(options);
    return () => undefined;
  };
  return {
    watcher,
    received,
    emit: (items: T[], fromCache: boolean) => data(items, { fromCache }),
    error: (error: Parameters<OnError>[0]) => fail(error),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("shouldHoldSnapshot", () => {
  it("segura só o vazio vindo do cache antes de qualquer entrega", () => {
    expect(shouldHoldSnapshot({ fromCache: true, empty: true, delivered: false })).toBe(true);
  });

  it("entrega o vazio confirmado pelo servidor", () => {
    expect(shouldHoldSnapshot({ fromCache: false, empty: true, delivered: false })).toBe(false);
  });

  it("entrega dados salvos no aparelho", () => {
    expect(shouldHoldSnapshot({ fromCache: true, empty: false, delivered: false })).toBe(false);
  });

  it("depois da primeira entrega acompanha o cache (ex.: exclusão sem internet)", () => {
    expect(shouldHoldSnapshot({ fromCache: true, empty: true, delivered: true })).toBe(false);
  });
});

describe("createCacheGate", () => {
  it("não mostra 'nenhum' com o cache vazio e entrega quando o servidor confirma", () => {
    const { onData, onError } = spies<string[]>();
    const gate = createCacheGate(onData, onError, isEmptyList);

    gate.push([], true);
    expect(onData).not.toHaveBeenCalled();

    gate.push([], false);
    expect(onData).toHaveBeenCalledWith([], { fromCache: false });

    vi.advanceTimersByTime(CACHE_GRACE_MS * 2);
    expect(onError).not.toHaveBeenCalled();
  });

  it("mostra na hora os dados salvos, marcados como vindos do cache", () => {
    const { onData, onError } = spies<string[]>();
    const gate = createCacheGate(onData, onError, isEmptyList);

    gate.push(["farmácia"], true);
    expect(onData).toHaveBeenCalledWith(["farmácia"], { fromCache: true });

    vi.advanceTimersByTime(CACHE_GRACE_MS);
    expect(onError).not.toHaveBeenCalled();
  });

  it("sem servidor e sem nada salvo, avisa 'indisponível' no prazo e se recupera depois", () => {
    const { onData, onError } = spies<string[]>();
    const gate = createCacheGate(onData, onError, isEmptyList);

    gate.push([], true);
    vi.advanceTimersByTime(CACHE_GRACE_MS - 1);
    expect(onError).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onError).toHaveBeenCalledTimes(1);
    const error = onError.mock.calls[0][0];
    expect(error.code).toBe("unavailable");
    expect(errorMessage(error)).toBe("Serviço indisponível no momento. Verifique sua conexão.");

    // A assinatura continua: quando a conexão volta, os dados substituem o erro
    gate.push(["farmácia"], false);
    expect(onData).toHaveBeenCalledWith(["farmácia"], { fromCache: false });
  });

  it("também avisa quando nenhum snapshot chega no prazo", () => {
    const { onData, onError } = spies<string | null>();
    createCacheGate(onData, onError, (value) => value === null);

    vi.advanceTimersByTime(CACHE_GRACE_MS);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onData).not.toHaveBeenCalled();
  });

  it("documento ausente só no cache não vira 'sem cadastro'", () => {
    const { onData, onError } = spies<string | null>();
    const gate = createCacheGate(onData, onError, (value) => value === null);

    gate.push(null, true);
    expect(onData).not.toHaveBeenCalled();

    gate.push(null, false);
    expect(onData).toHaveBeenCalledWith(null, { fromCache: false });
  });

  it("com deliverEmptyFromCache entrega o vazio do cache e não marca prazo", () => {
    const { onData, onError } = spies<string[]>();
    const gate = createCacheGate(onData, onError, isEmptyList, { deliverEmptyFromCache: true });

    gate.push([], true);
    expect(onData).toHaveBeenCalledWith([], { fromCache: true });

    vi.advanceTimersByTime(CACHE_GRACE_MS * 2);
    expect(onError).not.toHaveBeenCalled();
  });

  it("ignora mudança só de metadados, mas avisa quando passa a vir do cache", () => {
    const { onData, onError } = spies<string[]>();
    const gate = createCacheGate(onData, onError, isEmptyList);

    gate.push(["a"], false);
    gate.push(["a"], false, false);
    expect(onData).toHaveBeenCalledTimes(1);

    gate.push(["a"], true, false);
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenLastCalledWith(["a"], { fromCache: true });
  });

  it("repassa erros do Firestore e cancela o prazo", () => {
    const { onData, onError } = spies<string[]>();
    const gate = createCacheGate(onData, onError, isEmptyList);
    const denied = errorFromCode("permission-denied");

    gate.fail(denied);
    vi.advanceTimersByTime(CACHE_GRACE_MS);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(denied);
  });

  it("stop cancela o prazo (tela fechada antes de responder)", () => {
    const { onData, onError } = spies<string[]>();
    const gate = createCacheGate(onData, onError, isEmptyList);

    gate.stop();
    vi.advanceTimersByTime(CACHE_GRACE_MS);
    expect(onError).not.toHaveBeenCalled();
  });
});

describe("mergeWatchers", () => {
  it("uma consulta vazia só no cache não esconde os pedidos salvos da outra", () => {
    const issues = fakeWatcher<string>();
    const ombudsman = fakeWatcher<string>();
    const { onData, onError } = spies<string[]>();
    mergeWatchers([issues.watcher, ombudsman.watcher])(onData, onError);

    issues.emit(["buraco"], true);
    expect(onData).not.toHaveBeenCalled();

    ombudsman.emit([], true);
    expect(onData).toHaveBeenCalledWith(["buraco"], { fromCache: true });

    vi.advanceTimersByTime(CACHE_GRACE_MS);
    expect(onError).not.toHaveBeenCalled();
  });

  it("pede às partes o vazio do cache para decidir no conjunto", () => {
    const part = fakeWatcher<string>();
    mergeWatchers([part.watcher])(vi.fn(), vi.fn());
    expect(part.received).toEqual([{ deliverEmptyFromCache: true }]);
  });

  it("tudo vazio só no cache: segura e avisa 'indisponível' no prazo", () => {
    const a = fakeWatcher<string>();
    const b = fakeWatcher<string>();
    const { onData, onError } = spies<string[]>();
    mergeWatchers([a.watcher, b.watcher])(onData, onError);

    a.emit([], true);
    b.emit([], true);
    expect(onData).not.toHaveBeenCalled();

    vi.advanceTimersByTime(CACHE_GRACE_MS);
    expect(onError.mock.calls[0][0].code).toBe("unavailable");

    a.emit([], false);
    expect(onData).not.toHaveBeenCalled();
    b.emit([], false);
    expect(onData).toHaveBeenCalledWith([], { fromCache: false });
  });

  it("junta as partes e só marca 'do servidor' quando todas confirmam", () => {
    const a = fakeWatcher<string>();
    const b = fakeWatcher<string>();
    const { onData, onError } = spies<string[]>();
    mergeWatchers([a.watcher, b.watcher])(onData, onError);

    a.emit(["1"], false);
    b.emit(["2"], true);
    expect(onData).toHaveBeenLastCalledWith(["1", "2"], { fromCache: true });

    b.emit(["2"], false);
    expect(onData).toHaveBeenLastCalledWith(["1", "2"], { fromCache: false });
  });

  it("sem consultas entrega a lista vazia na hora", () => {
    const { onData, onError } = spies<string[]>();
    mergeWatchers<string>([])(onData, onError);
    expect(onData).toHaveBeenCalledWith([], { fromCache: false });
    vi.advanceTimersByTime(CACHE_GRACE_MS);
    expect(onError).not.toHaveBeenCalled();
  });
});

/** Erro no formato do Firestore, sem precisar de um banco de verdade. */
function errorFromCode(code: "permission-denied"): Parameters<OnError>[0] {
  return Object.assign(new Error(code), { code, name: "FirebaseError" as const });
}
