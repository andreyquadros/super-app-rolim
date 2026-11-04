import { describe, expect, it } from "vitest";
import { anotherDialogOpen } from "./openDialogs";

/** Raiz falsa: responde só aos seletores que "existem" na página. */
function fakeRoot(present: string[]) {
  const asked: string[] = [];
  const root = {
    querySelector(selector: string): Element | null {
      asked.push(selector);
      const parts = selector.split(",").map((part) => part.trim());
      return parts.some((part) => present.includes(part)) ? ({} as Element) : null;
    },
  };
  return { root, asked };
}

describe("anotherDialogOpen", () => {
  it("vê uma folha nativa aberta", () => {
    expect(anotherDialogOpen(fakeRoot(["dialog[open]"]).root)).toBe(true);
  });

  it("vê um diálogo modal de outro componente", () => {
    expect(anotherDialogOpen(fakeRoot(["[role='dialog'][aria-modal='true']"]).root)).toBe(true);
  });

  it("falso sem nada aberto", () => {
    const { root, asked } = fakeRoot([]);
    expect(anotherDialogOpen(root)).toBe(false);
    // Uma consulta só, com os dois seletores
    expect(asked).toEqual(["dialog[open], [role='dialog'][aria-modal='true']"]);
  });
});
