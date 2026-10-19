// Mede o JavaScript baixado na primeira visita (gzip) e falha acima do orçamento.
// Grafo inicial = entrada do index.html + imports estáticos + os import()
// que o main.tsx dispara logo ao abrir (router e AuthProvider).
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 300);
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const manifest = JSON.parse(readFileSync(join(DIST, ".vite/manifest.json"), "utf8"));
const STARTUP_DYNAMIC = [/src\/router\.tsx$/, /^_router-/, /src\/auth\/AuthProvider\.tsx$/];

const seen = new Set();
function visit(key) {
  if (seen.has(key)) return;
  seen.add(key);
  for (const dep of manifest[key]?.imports ?? []) visit(dep);
}

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry && k.endsWith("index.html"));
if (!entryKey) throw new Error("Entrada index.html não encontrada no manifest");
visit(entryKey);
for (const dyn of manifest[entryKey].dynamicImports ?? []) {
  if (STARTUP_DYNAMIC.some((re) => re.test(dyn))) visit(dyn);
}

let total = 0;
const rows = [...seen]
  .map((key) => {
    const file = manifest[key].file;
    const kb = gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length / 1024;
    total += kb;
    return { file, kb };
  })
  .sort((a, b) => b.kb - a.kb);

for (const r of rows) console.log(`${r.kb.toFixed(1).padStart(7)} KB  ${r.file}`);
console.log(`JS inicial: ${total.toFixed(1)} KB gzip (orçamento ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) {
  console.error("Orçamento de JavaScript inicial estourado.");
  process.exit(1);
}
