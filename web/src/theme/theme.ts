import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from "@mantine/core";

// Verde "Zona da Mata" — cor institucional principal
const mata: MantineColorsTuple = [
  "#e8f6ee", "#d1ecdd", "#a3d7bb", "#72c297", "#4aaf79", "#31a366", "#229c5c", "#14874c", "#0d7a49", "#00653a",
];
// Amarelo-ipê — destaque e chamadas para ação secundárias
const ipe: MantineColorsTuple = [
  "#fff8e0", "#ffefca", "#ffdd99", "#ffca62", "#ffbb36", "#ffb118", "#ffab03", "#e39500", "#ca8400", "#af7100",
];
// Barro/terracota — alertas e indeferimentos
const barro: MantineColorsTuple = [
  "#fdede8", "#f4dad3", "#e9b3a5", "#df8a74", "#d6684b", "#d15231", "#cf4623", "#b73817", "#a43012", "#90250b",
];
// Ardósia — estado neutro "recebida"
const slate: MantineColorsTuple = [
  "#eef3f7", "#dfe5ea", "#bcc9d4", "#97abbd", "#7892aa", "#64829e", "#597a99", "#486885", "#3d5c78", "#2d4f6b",
];
// Escuro esverdeado: o Mantine tira daqui o fundo de campos, gavetas, menus e
// do SegmentedControl no tema escuro (em vez do cinza neutro). Os tons 6 e 7
// são as superfícies do app (--app-surface e --app-paper em global.css).
// 0 texto (12,7:1 no campo) · 2 apagado · 3 dica do campo (4,6:1) · 4 bordas
// · 5 realce · 6 campos e cartões · 7 fundo · 8 trilho do SegmentedControl
const dark: MantineColorsTuple = [
  "#dfe6e1", "#c3cec7", "#a7b5ac", "#7f8d85", "#3b4842", "#2c3731", "#1b231f", "#141a17", "#101512", "#0b0f0d",
];

/** Texto secundário ("dimmed") com contraste AA nos dois temas. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  // Erros de formulário em barro (a paleta do app), com contraste AA
  light: { "--mantine-color-dimmed": "#56655c", "--mantine-color-error": "#a43012" },
  dark: { "--mantine-color-dimmed": "#a7b5ac", "--mantine-color-error": "#df8a74" },
});

export const theme = createTheme({
  primaryColor: "mata",
  primaryShade: { light: 8, dark: 8 },
  colors: { mata, ipe, barro, slate, dark },
  fontFamily: "'Public Sans Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "ui-monospace, 'SF Mono', 'Roboto Mono', monospace",
  headings: {
    fontFamily: "'Fraunces Variable', Georgia, 'Times New Roman', serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 2.75rem)", lineHeight: "1.08" },
      h2: { fontSize: "clamp(1.45rem, 1.2rem + 1vw, 1.9rem)", lineHeight: "1.15" },
      h3: { fontSize: "1.25rem", lineHeight: "1.25" },
    },
  },
  defaultRadius: "md",
  radius: { xs: "4px", sm: "8px", md: "12px", lg: "18px", xl: "28px" },
  shadows: {
    xs: "0 1px 2px rgba(16, 40, 28, 0.06)",
    sm: "0 1px 3px rgba(16, 40, 28, 0.08), 0 1px 2px rgba(16, 40, 28, 0.04)",
    md: "0 8px 24px -8px rgba(16, 40, 28, 0.18)",
    lg: "0 18px 40px -12px rgba(16, 40, 28, 0.28)",
  },
  cursorType: "pointer",
  focusRing: "auto",
  // Objetos simples (sem Componente.extend): importar o componente aqui o
  // colocaria no pacote inicial mesmo em telas que não o usam.
  components: {
    Button: { defaultProps: { radius: "xl" } },
    ActionIcon: { defaultProps: { radius: "xl", variant: "subtle" } },
    Badge: { defaultProps: { radius: "sm", variant: "light" } },
    Card: { defaultProps: { radius: "lg", withBorder: true } },
    Paper: { defaultProps: { radius: "lg" } },
    TextInput: { defaultProps: { size: "md" } },
    PasswordInput: { defaultProps: { size: "md" } },
    SegmentedControl: { defaultProps: { radius: "xl" } },
    // O X dos diálogos e gavetas do Mantine não tem nome acessível por padrão
    Modal: { defaultProps: { radius: "lg", centered: true, closeButtonProps: { "aria-label": "Fechar" } } },
    Drawer: { defaultProps: { closeButtonProps: { "aria-label": "Fechar" } } },
  },
});
