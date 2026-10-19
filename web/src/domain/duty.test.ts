import { describe, expect, it } from "vitest";
import { DUTY_META, dutyTypeFromSlug, isDutyType } from "./duty";

describe("plantões", () => {
  it("traduz o caminho público para o tipo", () => {
    expect(dutyTypeFromSlug("farmacias")).toBe("PHARMACY");
    expect(dutyTypeFromSlug("funerarias")).toBe("FUNERAL");
    expect(dutyTypeFromSlug("outra")).toBeNull();
    expect(dutyTypeFromSlug(undefined)).toBeNull();
  });

  it("reconhece apenas farmácias e funerárias como plantão", () => {
    expect(isDutyType("FUNERAL")).toBe(true);
    expect(isDutyType("PUBLIC")).toBe(false);
    expect(DUTY_META.FUNERAL.path).toBe("/plantao/funerarias");
  });
});

import { dutyCounts, filterDuty, isStale, sortDuty } from "./duty";

const unit = (name: string, isOnDuty: boolean, isOpen: boolean, lat = 0) => ({ name, isOnDuty, isOpen, lat, lng: 0, updatedAt: null });

describe("lista de plantão", () => {
  const list = [unit("Bela", false, true, 1), unit("Central", true, false, 5), unit("Jardim", false, false, 0), unit("Aurora", true, true, 9)];

  it("conta e filtra plantão, abertas e todas", () => {
    expect(dutyCounts(list)).toEqual({ plantao: 2, abertas: 3, todas: 4 });
    expect(filterDuty(list, "plantao").map((u) => u.name)).toEqual(["Central", "Aurora"]);
    expect(filterDuty(list, "abertas")).toHaveLength(3);
  });

  it("ordena plantão antes de abertas, mesmo com distância menor", () => {
    expect(sortDuty(list, (u) => u.lat).map((u) => u.name)).toEqual(["Central", "Aurora", "Bela", "Jardim"]);
    expect(sortDuty(list).map((u) => u.name)).toEqual(["Aurora", "Central", "Bela", "Jardim"]);
  });

  it("marca informação com mais de 24 h como desatualizada", () => {
    const now = new Date(2026, 9, 19, 12);
    expect(isStale(new Date(2026, 9, 19, 1), now)).toBe(false);
    expect(isStale(new Date(2026, 9, 18, 10), now)).toBe(true);
    expect(isStale(null, now)).toBe(true);
  });
});
