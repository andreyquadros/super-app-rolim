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
