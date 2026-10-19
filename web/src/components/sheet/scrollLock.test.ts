import { describe, expect, it } from "vitest";
import { acquireScrollLock } from "./scrollLock";

function fakeRoot() {
  const classes = new Set<string>();
  return {
    classes,
    classList: {
      add: (...tokens: string[]) => tokens.forEach((t) => classes.add(t)),
      remove: (...tokens: string[]) => tokens.forEach((t) => classes.delete(t)),
    },
  };
}

describe("acquireScrollLock", () => {
  it("trava a rolagem enquanto houver uma folha aberta", () => {
    const root = fakeRoot();
    const release = acquireScrollLock(root);
    expect(root.classes.has("sheet-open")).toBe(true);
    release();
    expect(root.classes.has("sheet-open")).toBe(false);
  });

  it("com duas folhas empilhadas, fechar a de cima mantém a trava", () => {
    const root = fakeRoot();
    const below = acquireScrollLock(root);
    const above = acquireScrollLock(root);
    above();
    expect(root.classes.has("sheet-open")).toBe(true);
    below();
    expect(root.classes.has("sheet-open")).toBe(false);
  });

  it("soltar a mesma trava duas vezes não solta a de outra folha", () => {
    const root = fakeRoot();
    const first = acquireScrollLock(root);
    const second = acquireScrollLock(root);
    first();
    first();
    expect(root.classes.has("sheet-open")).toBe(true);
    second();
    expect(root.classes.has("sheet-open")).toBe(false);
  });
});
