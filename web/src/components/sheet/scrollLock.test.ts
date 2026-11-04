import { describe, expect, it } from "vitest";
import { acquireScrollLock, SCROLL_GUTTER_ATTR } from "./scrollLock";

/** <html> de mentira: classes, atributos e a largura sem a barra de rolagem. */
function fakeRoot(clientWidth = 360) {
  const classes = new Set<string>();
  const attributes = new Map<string, string>();
  return {
    classes,
    attributes,
    clientWidth,
    classList: {
      add: (...tokens: string[]) => tokens.forEach((t) => classes.add(t)),
      remove: (...tokens: string[]) => tokens.forEach((t) => classes.delete(t)),
    },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
  };
}

/** Celular: a barra de rolagem é sobreposta e não ocupa largura. */
const OVERLAY = { innerWidth: 360 };

describe("acquireScrollLock", () => {
  it("trava a rolagem enquanto houver uma folha aberta", () => {
    const root = fakeRoot();
    const release = acquireScrollLock(root, OVERLAY);
    expect(root.classes.has("sheet-open")).toBe(true);
    release();
    expect(root.classes.has("sheet-open")).toBe(false);
  });

  it("com duas folhas empilhadas, fechar a de cima mantém a trava", () => {
    const root = fakeRoot();
    const below = acquireScrollLock(root, OVERLAY);
    const above = acquireScrollLock(root, OVERLAY);
    above();
    expect(root.classes.has("sheet-open")).toBe(true);
    below();
    expect(root.classes.has("sheet-open")).toBe(false);
  });

  it("soltar a mesma trava duas vezes não solta a de outra folha", () => {
    const root = fakeRoot();
    const first = acquireScrollLock(root, OVERLAY);
    const second = acquireScrollLock(root, OVERLAY);
    first();
    first();
    expect(root.classes.has("sheet-open")).toBe(true);
    second();
    expect(root.classes.has("sheet-open")).toBe(false);
  });
});

describe("calha da barra de rolagem", () => {
  it("só reserva a calha quando há barra clássica (computador)", () => {
    const root = fakeRoot(1009);
    const release = acquireScrollLock(root, { innerWidth: 1024 });
    expect(root.attributes.has(SCROLL_GUTTER_ATTR)).toBe(true);
    release();
    expect(root.attributes.has(SCROLL_GUTTER_ATTR)).toBe(false);
  });

  it("não reserva nada com a barra sobreposta do celular", () => {
    const root = fakeRoot(360);
    const release = acquireScrollLock(root, OVERLAY);
    expect(root.attributes.has(SCROLL_GUTTER_ATTR)).toBe(false);
    release();
    expect(root.attributes.has(SCROLL_GUTTER_ATTR)).toBe(false);
  });

  it("a calha sai junto com a última trava, não antes", () => {
    const root = fakeRoot(1009);
    const view = { innerWidth: 1024 };
    const below = acquireScrollLock(root, view);
    // Com a primeira trava a barra some: a segunda não pode medir de novo e tirar a calha
    root.clientWidth = 1024;
    const above = acquireScrollLock(root, view);
    above();
    expect(root.attributes.has(SCROLL_GUTTER_ATTR)).toBe(true);
    below();
    expect(root.attributes.has(SCROLL_GUTTER_ATTR)).toBe(false);
    expect(root.classes.has("sheet-open")).toBe(false);
  });
});
