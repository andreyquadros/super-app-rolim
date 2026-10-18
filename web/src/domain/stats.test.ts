import { describe, expect, it } from "vitest";
import { countBy, formatDays, summarize } from "./stats";

const now = new Date(2026, 9, 18, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 3600 * 1000);

describe("summarize", () => {
  it("conta abertas, concluídas recentes e tempo médio", () => {
    const stats = summarize(
      [
        { status: "RECEIVED", createdAt: daysAgo(10), statusChangedAt: daysAgo(10) },
        { status: "RECEIVED", createdAt: daysAgo(1), statusChangedAt: daysAgo(1) },
        { status: "IN_PROGRESS", createdAt: daysAgo(5), statusChangedAt: daysAgo(2) },
        { status: "RESOLVED", createdAt: daysAgo(6), statusChangedAt: daysAgo(2) },
        { status: "RESOLVED", createdAt: daysAgo(90), statusChangedAt: daysAgo(80) },
        { status: "CANCELED", createdAt: daysAgo(3), statusChangedAt: daysAgo(3) },
      ],
      now,
    );
    expect(stats.total).toBe(6);
    expect(stats.open).toBe(3);
    expect(stats.byStatus.RESOLVED).toBe(2);
    expect(stats.resolvedLast30).toBe(1);
    expect(stats.avgDaysToResolve).toBeCloseTo(7, 5);
    expect(stats.staleReceived).toBe(1);
  });

  it("lida com lista vazia", () => {
    const stats = summarize([], now);
    expect(stats.total).toBe(0);
    expect(stats.avgDaysToResolve).toBeNull();
  });
});

describe("countBy e formatDays", () => {
  it("ordena do maior para o menor", () => {
    expect(countBy(["a", "b", "a", "c", "a", "b"], (x) => x)).toEqual([
      { key: "a", count: 3 },
      { key: "b", count: 2 },
      { key: "c", count: 1 },
    ]);
  });

  it("formata dias", () => {
    expect(formatDays(null)).toBe("—");
    expect(formatDays(0.3)).toBe("menos de 1 dia");
    expect(formatDays(1)).toBe("1 dia");
    expect(formatDays(3.46)).toBe("3,5 dias");
  });
});
