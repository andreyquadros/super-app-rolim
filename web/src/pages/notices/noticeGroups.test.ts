import { describe, expect, it } from "vitest";
import { groupNotices, noticeGroupOf } from "./noticeGroups";

// Segunda-feira, 19/10/2026, 10h (horário local)
const NOW = new Date(2026, 9, 19, 10, 0);
const at = (day: number, hour = 9) => new Date(2026, 9, day, hour, 0);

describe("grupos de avisos", () => {
  it("separa hoje, últimos 7 dias e mais antigos pelo calendário", () => {
    expect(noticeGroupOf(at(19, 0), NOW)).toBe("hoje");
    expect(noticeGroupOf(at(18, 23), NOW)).toBe("semana");
    expect(noticeGroupOf(at(13, 0), NOW)).toBe("semana");
    expect(noticeGroupOf(at(12, 23), NOW)).toBe("antigos");
    expect(noticeGroupOf(null, NOW)).toBe("antigos");
  });

  it("mantém a ordem recebida e omite grupos vazios", () => {
    const list = [
      { id: "a", sentAt: at(19) },
      { id: "b", sentAt: at(1) },
      { id: "c", sentAt: at(2) },
    ];
    const groups = groupNotices(list, NOW);
    expect(groups.map((g) => g.title)).toEqual(["Hoje", "Mais antigos"]);
    expect(groups[1].items.map((n) => n.id)).toEqual(["b", "c"]);
  });

  it("não altera a lista original", () => {
    const list = Object.freeze([{ sentAt: at(19) }]);
    expect(() => groupNotices(list, NOW)).not.toThrow();
  });
});
