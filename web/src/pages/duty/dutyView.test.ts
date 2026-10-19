import { describe, expect, it } from "vitest";
import { emptyTitle, filterOptions, latestUpdate, MARKER_COLOR, markerColor } from "./dutyView";

describe("tela de plantão", () => {
  it("mostra a contagem nos chips quando a lista chegou", () => {
    const labels = filterOptions("PHARMACY", { plantao: 1, abertas: 2, todas: 3 }).map((f) => f.label);
    expect(labels).toEqual(["De plantão (1)", "Abertas agora (2)", "Todas (3)"]);
  });

  it("não mostra um (0) falso enquanto carrega ou com erro", () => {
    const labels = filterOptions("FUNERAL", null).map((f) => f.label);
    expect(labels).toEqual(["De plantão", "Atendendo agora", "Todas"]);
    expect(labels.join(" ")).not.toMatch(/\(\d+\)/);
  });

  it("mantém os filtros na ordem do endereço (?filtro=)", () => {
    expect(filterOptions("PHARMACY", null).map((f) => f.value)).toEqual(["plantao", "abertas", "todas"]);
  });

  it("escolhe o texto de lista vazia por tipo e filtro", () => {
    expect(emptyTitle("PHARMACY", "plantao")).toBe("Nenhuma farmácia informou plantão agora");
    expect(emptyTitle("PHARMACY", "abertas")).toBe("Nenhuma farmácia aberta agora");
    expect(emptyTitle("FUNERAL", "abertas")).toBe("Nenhuma funerária atendendo agora");
    expect(emptyTitle("FUNERAL", "todas")).toBe("Ainda não há funerárias cadastradas");
  });

  it("usa a atualização mais recente da lista", () => {
    const older = new Date(2026, 9, 18, 8);
    const newer = new Date(2026, 9, 18, 9);
    expect(latestUpdate([{ updatedAt: older }, { updatedAt: null }, { updatedAt: newer }])).toBe(newer);
    expect(latestUpdate([{ updatedAt: null }])).toBeNull();
    expect(latestUpdate([])).toBeNull();
  });

  it("pinta o marcador como a legenda: plantão, aberta, fechada", () => {
    expect(markerColor({ isOnDuty: true, isOpen: false })).toBe(MARKER_COLOR.duty);
    expect(markerColor({ isOnDuty: false, isOpen: true })).toBe(MARKER_COLOR.open);
    expect(markerColor({ isOnDuty: false, isOpen: false })).toBe(MARKER_COLOR.closed);
  });
});
