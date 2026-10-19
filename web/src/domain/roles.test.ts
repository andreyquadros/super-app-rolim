import { describe, expect, it } from "vitest";
import { ROLE_COLOR, ROLE_LABEL } from "./roles";
import type { Role } from "./types";

const ROLES: Role[] = ["ROOT", "CIVIL_SERVANT", "DUTY_MANAGER"];

describe("roles", () => {
  it("o acesso de plantão tem nome claro para quem administra", () => {
    expect(ROLE_LABEL.DUTY_MANAGER).toBe("Responsável por plantão");
  });

  it("todo acesso tem rótulo e cor", () => {
    for (const role of ROLES) {
      expect(ROLE_LABEL[role].length).toBeGreaterThan(0);
      expect(ROLE_COLOR[role].length).toBeGreaterThan(0);
    }
  });

  it("plantão usa o ipê, a cor do destaque de plantão", () => {
    expect(ROLE_COLOR.DUTY_MANAGER).toBe("ipe");
  });
});
