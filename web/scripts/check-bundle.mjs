// Mede o JavaScript baixado na primeira visita (gzip) e falha acima do orçamento.
// Antes da primeira tela = entrada do index.html + imports estáticos + os
// import() que o main.tsx dispara logo ao abrir (router e AuthProvider).
// Logo depois = o Firebase, que o login e os dados da Início pedem depois da
// primeira pintura (authRuntime e módulos de dados). Os dois contam no orçamento.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 300);
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const manifest = JSON.parse(readFileSync(join(DIST, ".vite/manifest.json"), "utf8"));
const STARTUP_DYNAMIC = [/src\/router\.tsx$/, /^_router-/, /src\/auth\/AuthProvider\.tsx$/];
const AFTER_FIRST_PAINT = [/src\/auth\/authRuntime\.ts$/, /src\/data\/(buildings|notifications|requests|watch)\.ts$/];

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

function report(title, keys) {
  const rows = [...keys]
    .map((key) => {
      const file = manifest[key].file;
      return { file, kb: gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length / 1024 };
    })
    .sort((a, b) => b.kb - a.kb);
  const total = rows.reduce((sum, r) => sum + r.kb, 0);
  console.log(`${title}: ${total.toFixed(1)} KB gzip`);
  for (const r of rows) console.log(`${r.kb.toFixed(1).padStart(7)} KB  ${r.file}`);
  return total;
}

const total = report("Antes da primeira tela", startup) + report("Logo depois (Firebase)", afterPaint);
console.log(`JS inicial: ${total.toFixed(1)} KB gzip (orçamento ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) {
  console.error("Orçamento de JavaScript inicial estourado.");
  process.exit(1);
}
