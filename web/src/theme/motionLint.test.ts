import { describe, expect, it } from "vitest";

// Conferência do sistema de movimento (DESIGN §7 e §11): os keyframes só mexem
// em transform, opacity e clip-path (nunca em propriedade de layout) e, nos
// CSS Modules, cada animação usada tem o @keyframes no próprio arquivo (o
// módulo renomeia os keyframes; um nome global ali não acharia nada).

/** O pedaço do node:fs usado aqui (o tsconfig do app não carrega os tipos do Node) */
interface FsLike {
  readdirSync(path: URL, options: { recursive: true }): string[];
  readFileSync(path: URL, encoding: "utf8"): string;
}

// O vitest esvazia os .css importados (até com ?raw): lê do disco
const FS_MODULE = "node:fs";
const fs = (await import(/* @vite-ignore */ FS_MODULE)) as FsLike;
const SRC = new URL("../", import.meta.url);

/** Caminho a partir de src ("theme/motion.css") → conteúdo */
const SOURCES: Readonly<Record<string, string>> = Object.fromEntries(
  fs
    .readdirSync(SRC, { recursive: true })
    .filter((path) => path.endsWith(".css"))
    .map((path) => [path, fs.readFileSync(new URL(path, SRC), "utf8")]),
);

const LAYOUT_PROPERTY = new RegExp(
  [
    "^(min|max)-",
    "^(width|height|inline-size|block-size)$",
    "^(top|right|bottom|left)$",
    "^inset",
    "^margin",
    "^padding",
    "^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-width)?$",
    "^font-size$",
    "^line-height$",
    "^((row|column)-)?gap$",
    "^flex",
    "^grid",
  ].join("|"),
);

/** Palavras do atalho `animation` que não são nome de keyframes */
const KEYWORDS = new Set([
  "none",
  "initial",
  "inherit",
  "unset",
  "revert",
  "revert-layer",
  "infinite",
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse",
  "forwards",
  "backwards",
  "both",
  "running",
  "paused",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "linear",
  "step-start",
  "step-end",
]);

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

function closingBrace(css: string, from: number): number {
  let depth = 1;
  for (let i = from; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return css.length;
}

interface Keyframes {
  name: string;
  body: string;
}

function keyframesIn(css: string): Keyframes[] {
  const source = withoutComments(css);
  return [...source.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)\s*\{/g)].map((match) => {
    const start = (match.index ?? 0) + match[0].length;
    return { name: match[1], body: source.slice(start, closingBrace(source, start)) };
  });
}

/** "rise: height" para cada propriedade de layout animada */
function layoutViolations(css: string): string[] {
  return keyframesIn(css).flatMap(({ name, body }) =>
    [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]).filter((prop) => LAYOUT_PROPERTY.test(prop)).map((prop) => `${name}: ${prop}`),
  );
}

/** Divide no separador só fora de parênteses (cubic-bezier, var, linear…) */
function splitTop(value: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (depth === 0 && separator.test(ch)) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  return [...parts, current].map((p) => p.trim()).filter(Boolean);
}

const isName = (token: string) => /^-?[a-zA-Z_][\w-]*$/.test(token) && !KEYWORDS.has(token);

function animationNames(value: string): string[] {
  const clean = value.replace(/!important/g, "");
  return splitTop(clean, /,/).flatMap((layer) => splitTop(layer, /\s/).filter(isName));
}

/** Nomes usados em animation/animation-name sem @keyframes no mesmo arquivo */
function missingKeyframes(css: string): string[] {
  const source = withoutComments(css);
  const declared = new Set(keyframesIn(source).map((k) => k.name));
  return [...source.matchAll(/(?<![\w-])animation(?:-name)?\s*:\s*([^;{}]+)/g)].flatMap(([, value]) => {
    if (/:(global|local)\b/.test(value)) return [`${value.trim()} (nome global num módulo)`];
    return animationNames(value).filter((name) => !declared.has(name));
  });
}

describe("a própria conferência", () => {
  it("acusa propriedade de layout dentro de keyframes", () => {
    const css = `@keyframes grow { from { height: 0; opacity: 0 } 50% { margin-top: 4px } to { transform: none } }
      @keyframes ok { from { transform: scale(.9); clip-path: inset(0 100% 0 0); border-radius: 4px } }`;
    expect(layoutViolations(css)).toEqual(["grow: height", "grow: margin-top"]);
  });

  it("acusa animação sem keyframes no módulo, ignorando tempos, curvas e palavras-chave", () => {
    const css = `.a { animation: local-in var(--motion-base) cubic-bezier(.2, 0, 0, 1) 120ms both, rise 1s 2; }
      .b { animation: none !important; animation-name: other; animation-delay: calc(var(--i) * 40ms); }
      @keyframes local-in { from { opacity: 0 } }`;
    expect(missingKeyframes(css)).toEqual(["rise", "other"]);
  });
});

describe("sistema de movimento", () => {
  const files = Object.entries(SOURCES);

  it("lê os CSS do app", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(keyframesIn(SOURCES["theme/motion.css"] ?? "").map((k) => k.name)).toContain("rise");
  });

  it("nenhum @keyframes anima propriedade de layout", () => {
    const found = files.flatMap(([path, css]) => layoutViolations(css).map((v) => `${path} › ${v}`));
    expect(found).toEqual([]);
  });

  it("todo nome de animação de um CSS Module tem @keyframes no mesmo arquivo", () => {
    const found = files
      .filter(([path]) => path.endsWith(".module.css"))
      .flatMap(([path, css]) => missingKeyframes(css).map((name) => `${path} › ${name}`));
    expect(found).toEqual([]);
  });
});
