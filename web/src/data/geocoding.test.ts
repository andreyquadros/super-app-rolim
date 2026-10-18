import { describe, expect, it } from "vitest";
import { addressFromNominatim } from "./geocoding";

describe("addressFromNominatim", () => {
  it("separa logradouro e ignora a cidade como bairro", () => {
    const result = addressFromNominatim(
      { road: "Avenida Porto Alegre", city_district: "Rolim de Moura", house_number: "1234" },
      "Rolim de Moura",
    );
    expect(result).toEqual({ streetType: "Avenida", streetName: "Porto Alegre", number: "1234" });
  });

  it("usa o bairro quando o OpenStreetMap informa", () => {
    expect(addressFromNominatim({ road: "Rua A", suburb: "Centro" }, "Rolim de Moura").neighborhood).toBe("Centro");
  });

  it("compara o nome da cidade sem acentos", () => {
    expect(addressFromNominatim({ city_district: "São Paulo" }, "Sao Paulo").neighborhood).toBeUndefined();
  });
});
