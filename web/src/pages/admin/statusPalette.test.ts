import { describe, expect, it } from "vitest";
import { STATUS_HEX } from "@/components/map";
import { REQUEST_STATUSES, STATUS_META } from "@/domain/status";

const PALETTE = ["mata", "ipe", "barro", "slate", "gray"];

describe("cores das situações", () => {
  it("toda situação usa uma cor da paleta do app (nada de azul)", () => {
    for (const status of REQUEST_STATUSES) expect(PALETTE).toContain(STATUS_META[status].color);
  });

  it("em andamento é verde, como no app do cidadão", () => {
    expect(STATUS_META.IN_PROGRESS.color).toBe("mata");
  });

  it("cada situação tem um tom próprio no mapa e na barra do painel", () => {
    const hexes = REQUEST_STATUSES.map((s) => STATUS_HEX[s].toLowerCase());
    expect(new Set(hexes).size).toBe(REQUEST_STATUSES.length);
    expect(hexes).not.toContain("#1c7ed6");
  });
});
