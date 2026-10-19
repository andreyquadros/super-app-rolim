import { describe, expect, it } from "vitest";
import { isNewNotice, seenMarkFor } from "./noticesSeen";

// Segunda-feira, 19/10/2026, 10h (horário local)
const NOW = new Date(2026, 9, 19, 10, 0);
const at = (day: number, hour = 9) => new Date(2026, 9, day, hour, 0);

describe("aviso novo", () => {
  it("é novo quando saiu depois da última visita", () => {
    const seenAt = at(18, 12).getTime();
    expect(isNewNotice(at(19), seenAt, NOW)).toBe(true);
    expect(isNewNotice(at(18, 11), seenAt, NOW)).toBe(false);
    expect(isNewNotice(null, seenAt, NOW)).toBe(false);
    expect(isNewNotice(undefined, seenAt, NOW)).toBe(false);
  });

  it("na primeira visita, só os dos últimos 7 dias contam como novos", () => {
    expect(isNewNotice(at(14), 0, NOW)).toBe(true);
    expect(isNewNotice(at(1), 0, NOW)).toBe(false);
  });

  it("aviso antigo não acende o ponto na primeira visita (mesma regra do chip)", () => {
    // O ponto da aba usa o aviso mais recente: com mais de 7 dias, não é novo
    expect(isNewNotice(at(2), 0, NOW)).toBe(false);
  });
});

describe("marca de visto", () => {
  it("usa a hora do celular quando ela é mais nova que o último aviso", () => {
    expect(seenMarkFor(at(18).getTime(), NOW.getTime())).toBe(NOW.getTime());
  });

  it("relógio do celular atrasado: vale a hora do último aviso mostrado", () => {
    const fromServer = at(19, 11).getTime();
    const mark = seenMarkFor(fromServer, NOW.getTime());
    expect(mark).toBe(fromServer);
    expect(isNewNotice(at(19, 11), mark, NOW)).toBe(false);
  });
});
