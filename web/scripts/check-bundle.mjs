// Mede o JavaScript baixado na primeira visita (gzip) e falha acima do orçamento.
// Antes da primeira tela = entrada do index.html + imports estáticos + os
// import() que o main.tsx dispara logo ao abrir (router e AuthProvider).
// Logo depois = o Firebase, que o login e os dados da Início pedem depois da
// primeira pintura (authRuntime e módulos de dados). Os dois contam no orçamento.
// Também limita os pedaços sob demanda da apresentação e do passeio e confere
// que o passeio fica fora do pacote inicial e longe do Firebase (DESIGN §11).
// BUNDLE_DIST troca a pasta do build medido (padrão: web/dist).
import { existsSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 300);
const DIST = process.env.BUNDLE_DIST ? resolve(process.env.BUNDLE_DIST) : fileURLToPath(new URL("../dist/", import.meta.url));
const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const manifest = JSON.parse(readFileSync(join(DIST, ".vite/manifest.json"), "utf8"));
const STARTUP_DYNAMIC = [/src\/router\.tsx$/, /^_router-/, /src\/auth\/AuthProvider\.tsx$/];
const AFTER_FIRST_PAINT = [/src\/auth\/authRuntime\.ts$/, /src\/data\/(buildings|notifications|requests|watch)\.ts$/];

/** Pedaços sob demanda com teto próprio (KB gzip) */
const LAZY_CAPS = [
  { title: "Apresentação", src: "src/features/onboarding/OnboardingPage.tsx", jsKb: 9, cssKb: 4 },
  { title: "Passeio", src: "src/features/tour/HomeTour.tsx", jsKb: 8, cssKb: 3 },
];
/** Fontes do pacote inicial: a entrada e os import() do main.tsx ao abrir */
const STARTUP_SOURCES = ["main.tsx", "router.tsx", "auth/AuthProvider.tsx"];
const TOUR_DIR = "features/tour/";
/** O único módulo do passeio que fica no pacote inicial */
const TOUR_STARTUP_ALLOWED = new Set(["features/tour/tourState.ts"]);
const TOUR_ENTRY = "features/tour/HomeTour.tsx";
const FIREBASE_PACKAGE = /^(firebase|@firebase)(\/|$)/;
const FIREBASE_SOURCE = /^(auth\/authRuntime\.ts$|data\/)/;
const FIREBASE_CHUNK = (key, chunk) =>
  /^node_modules\/(firebase|@firebase)\//.test(key) || /^src\/(auth\/authRuntime\.ts$|data\/)/.test(key) || chunk.name === "firebase";

const failures = [];
const gzipKb = (file) => gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length / 1024;

function collect(roots, seen) {
  const found = new Set();
  const visit = (key) => {
    if (seen.has(key) || found.has(key)) return;
    found.add(key);
    for (const dep of manifest[key]?.imports ?? []) visit(dep);
  };
  roots.forEach(visit);
  return found;
}

const dynamicFrom = (keys, patterns) =>
  [...keys].flatMap((key) => manifest[key]?.dynamicImports ?? []).filter((dyn) => patterns.some((re) => re.test(dyn)));

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry && k.endsWith("index.html"));
if (!entryKey) throw new Error("Entrada index.html não encontrada no manifest");
const startup = collect([entryKey, ...dynamicFrom([entryKey], STARTUP_DYNAMIC)], new Set());
const afterPaint = collect(dynamicFrom(startup, AFTER_FIRST_PAINT), startup);
if (afterPaint.size === 0) throw new Error("Pedaço do Firebase (authRuntime/dados) não encontrado no manifest");

function printRows(rows) {
  for (const r of [...rows].sort((a, b) => b.kb - a.kb)) console.log(`${r.kb.toFixed(1).padStart(7)} KB  ${r.file}`);
}

function report(title, keys) {
  const rows = [...keys].map((key) => ({ file: manifest[key].file, kb: gzipKb(manifest[key].file) }));
  const total = rows.reduce((sum, r) => sum + r.kb, 0);
  console.log(`${title}: ${total.toFixed(1)} KB gzip`);
  printRows(rows);
  return total;
}

const total = report("Antes da primeira tela", startup) + report("Logo depois (Firebase)", afterPaint);
console.log(`JS inicial: ${total.toFixed(1)} KB gzip (orçamento ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) failures.push("Orçamento de JavaScript inicial estourado.");

// ---------- Pedaços sob demanda: o pedaço + as importações estáticas fora do pacote inicial e do Firebase ----------

const startupFiles = new Set([...startup].map((key) => manifest[key].file));

function checkLazyChunk({ title, src, jsKb, cssKb }) {
  const chunk = manifest[src];
  if (!chunk?.isDynamicEntry || startup.has(src) || startupFiles.has(chunk.file)) {
    failures.push(`${title}: ${src} não virou um pedaço separado (foi importado de forma estática no pacote inicial?)`);
    return;
  }
  const keys = collect([src], new Set([...startup, ...afterPaint]));
  const js = [...keys].map((key) => ({ file: manifest[key].file, kb: gzipKb(manifest[key].file) }));
  const css = [...new Set([...keys].flatMap((key) => manifest[key].css ?? []))].map((file) => ({ file, kb: gzipKb(file) }));
  const jsTotal = js.reduce((sum, r) => sum + r.kb, 0);
  const cssTotal = css.reduce((sum, r) => sum + r.kb, 0);
  console.log(`${title}: ${jsTotal.toFixed(1)} KB de JS (teto ${jsKb}) e ${cssTotal.toFixed(1)} KB de CSS (teto ${cssKb}), gzip`);
  printRows([...js, ...css]);
  if (jsTotal > jsKb) failures.push(`${title}: ${jsTotal.toFixed(1)} KB de JS passa do teto de ${jsKb} KB.`);
  if (cssTotal > cssKb) failures.push(`${title}: ${cssTotal.toFixed(1)} KB de CSS passa do teto de ${cssKb} KB.`);
}

LAZY_CAPS.forEach(checkLazyChunk);

// ---------- Guardas do passeio ----------

/** Especificadores importados de forma estática (sem `import type` nem `import()`). */
function staticImports(code) {
  const source = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
  const found = [];
  const clauses = /(?<![\w$.])(import|export)\s+([^;'"`]*?)\s*from\s*["']([^"']+)["']/g;
  for (const [, , clause, spec] of source.matchAll(clauses)) {
    const typeOnly =
      /^type\s/.test(clause) ||
      (/^\{[\s\S]*\}$/.test(clause) &&
        clause
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .every((s) => /^type\s/.test(s)));
    if (!typeOnly) found.push(spec);
  }
  for (const [, spec] of source.matchAll(/(?<![\w$.])import\s*["']([^"']+)["']/g)) found.push(spec);
  return found;
}

const RESOLVE_SUFFIXES = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];

/** Arquivo do projeto, null para pacote (node_modules) ou undefined se não achou. */
function resolveImport(spec, fromFile) {
  const path = spec.replace(/\?.*$/, "");
  let base;
  if (path.startsWith("@/")) base = join(SRC, path.slice(2));
  else if (path.startsWith(".")) base = join(dirname(fromFile), path);
  else return null;
  return RESOLVE_SUFFIXES.map((suffix) => base + suffix).find((file) => existsSync(file) && statSync(file).isFile());
}

/** Fechamento estático a partir das fontes: quem trouxe cada arquivo e os pacotes usados. */
function staticGraph(entries) {
  const parent = new Map(entries.map((file) => [file, null]));
  const packages = new Map();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.shift();
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    for (const spec of staticImports(readFileSync(file, "utf8"))) {
      const target = resolveImport(spec, file);
      if (target === null) {
        if (!packages.has(spec)) packages.set(spec, file);
      } else if (target !== undefined && !parent.has(target)) {
        parent.set(target, file);
        queue.push(target);
      }
    }
  }
  return { parent, packages };
}

function chainTo(graph, file) {
  const steps = [];
  for (let step = file; step; step = graph.parent.get(step)) steps.unshift(relative(SRC, step));
  return steps.join(" → ");
}

// 1. Nenhum módulo do passeio, além do tourState, no pacote inicial
const startupGraph = staticGraph(STARTUP_SOURCES.map((file) => join(SRC, file)));
for (const file of startupGraph.parent.keys()) {
  const rel = relative(SRC, file);
  if (rel.startsWith(TOUR_DIR) && !TOUR_STARTUP_ALLOWED.has(rel)) failures.push(`Passeio no pacote inicial: ${chainTo(startupGraph, file)}`);
}
for (const key of startup) {
  const src = manifest[key].src ?? "";
  if (src.startsWith(`src/${TOUR_DIR}`) && !TOUR_STARTUP_ALLOWED.has(src.slice(4))) failures.push(`Passeio no pacote inicial: ${src}`);
}

// 2. Nada de Firebase no fechamento estático do passeio
const tourEntry = join(SRC, TOUR_ENTRY);
if (!existsSync(tourEntry)) failures.push(`Passeio: ${TOUR_ENTRY} não encontrado`);
else {
  const tourGraph = staticGraph([tourEntry]);
  for (const [spec, from] of tourGraph.packages) {
    if (FIREBASE_PACKAGE.test(spec)) failures.push(`O passeio puxa o Firebase: ${chainTo(tourGraph, from)} → ${spec}`);
  }
  for (const file of tourGraph.parent.keys()) {
    if (FIREBASE_SOURCE.test(relative(SRC, file))) failures.push(`O passeio puxa o Firebase: ${chainTo(tourGraph, file)}`);
  }
}
const tourKey = `src/${TOUR_ENTRY}`;
if (manifest[tourKey]) {
  for (const key of collect([tourKey], new Set())) {
    if (FIREBASE_CHUNK(key, manifest[key])) failures.push(`O pedaço do passeio importa ${key} (Firebase)`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log("Tetos e guardas do passeio: ok");
