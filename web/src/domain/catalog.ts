// Catálogos de categorias (zeladoria) e tipos (ouvidoria).
// Os valores são os mesmos do backend antigo para facilitar a migração.

export const ISSUE_CATEGORIES = [
  { value: "lighting", label: "Iluminação pública", hint: "Poste apagado, lâmpada piscando", department: "Iluminação Pública" },
  { value: "pavement", label: "Ruas e calçadas", hint: "Buraco, asfalto, calçada quebrada", department: "Secretaria de Obras" },
  { value: "sanitation", label: "Limpeza e saneamento", hint: "Lixo, entulho, esgoto, bueiro", department: "Limpeza Urbana e Saneamento" },
  { value: "vegetation", label: "Mato e árvores", hint: "Terreno com mato alto, poda, árvore caída", department: "Parques e Jardins" },
  { value: "signage", label: "Sinalização e trânsito", hint: "Placa, faixa, semáforo", department: "Trânsito" },
  { value: "others", label: "Outro problema", hint: "Algo que não está na lista", department: "Secretaria de Administração" },
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]["value"];

export const OMBUDSMAN_TYPES = [
  { value: "compliment", label: "Elogio", tone: "positive" },
  { value: "suggestion", label: "Sugestão", tone: "neutral" },
  { value: "service_delay", label: "Demora no atendimento", tone: "negative" },
  { value: "poor_service", label: "Atendimento ruim", tone: "negative" },
  { value: "employee_conduct", label: "Conduta de servidor", tone: "negative" },
  { value: "infrastructure", label: "Estrutura da unidade", tone: "negative" },
  { value: "accessibility", label: "Acessibilidade", tone: "negative" },
  { value: "administrative", label: "Questão administrativa", tone: "neutral" },
  { value: "others", label: "Outro assunto", tone: "neutral" },
] as const;

export type OmbudsmanType = (typeof OMBUDSMAN_TYPES)[number]["value"];

export const STREET_TYPES = ["Rua", "Avenida", "Travessa", "Alameda", "Linha", "Estrada", "Rodovia", "Praça", "Outro"] as const;

export type StreetType = (typeof STREET_TYPES)[number];

export function categoryOf(value: string) {
  return ISSUE_CATEGORIES.find((c) => c.value === value) ?? ISSUE_CATEGORIES[ISSUE_CATEGORIES.length - 1];
}

export function ombudsmanTypeOf(value: string) {
  return OMBUDSMAN_TYPES.find((t) => t.value === value) ?? OMBUDSMAN_TYPES[OMBUDSMAN_TYPES.length - 1];
}

/** "Avenida Norte Sul" → { streetType: "Avenida", streetName: "Norte Sul" } */
export function splitStreet(road: string): { streetType: StreetType; streetName: string } {
  const trimmed = road.trim().replace(/\s+/g, " ");
  const aliases: Record<string, StreetType> = { "R.": "Rua", "Av.": "Avenida", "Tv.": "Travessa", "Rod.": "Rodovia" };
  const [first, ...rest] = trimmed.split(" ");
  const normalized = aliases[first] ?? STREET_TYPES.find((t) => t.toLowerCase() === first?.toLowerCase());
  if (normalized && rest.length > 0) return { streetType: normalized, streetName: rest.join(" ") };
  return { streetType: "Rua", streetName: trimmed };
}
