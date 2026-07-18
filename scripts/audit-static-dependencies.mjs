import { readdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const SITE_HOSTS = new Set(["minoxidilencdmx.com", "www.minoxidilencdmx.com"]);
const REPORT = path.join(ROOT, "content", "static-dependency-audit.md");
const allowedExternalHosts = new Set(["api.whatsapp.com", "www.google.com", "rumble.com", "medlineplus.gov", "www.accessdata.fda.gov"]);

const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
}

function distPath(file) {
  return `/${path.relative(DIST, file).replace(/\\/g, "/")}`;
}

function normalizeLocalPath(value) {
  const clean = value.split(/[?#]/)[0];
  if (!clean || clean === "/") return "/index.html";
  if (clean.endsWith("/")) return `${clean}index.html`;
  return clean;
}

function addSample(map, key, file, ref) {
  const item = map.get(key) || { count: 0, samples: [] };
  item.count += 1;
  if (item.samples.length < 5) item.samples.push({ file: distPath(file), ref });
  map.set(key, item);
}

function routeExists(ref, allDistFiles) {
  const clean = ref.split(/[?#]/)[0];
  if (!clean || clean === "/") return allDistFiles.has("/index.html");
  if (allDistFiles.has(clean)) return true;
  if (allDistFiles.has(`${clean.replace(/\/$/, "")}/index.html`)) return true;
  return false;
}

walk(DIST);

const allDistFiles = new Set(files.map(distPath));
const checkedFiles = files.filter((file) => /\.(html|css|js|xml|txt)$/i.test(file));
const attrRe = /(?:src|href|content|poster|data-src)=["']([^"']+)["']/gi;
const cssUrlRe = /url\((["']?)([^)"'\s]+)\1\)/gi;
const localAssetMissing = [];
const internalMissing = [];
const wordpressRefs = [];
const protocolRelativeRefs = [];
const externalHosts = new Map();
const unexpectedExternalHosts = new Map();

for (const file of checkedFiles) {
  const text = readFileSync(file, "utf8");
  const refs = [];
  for (const re of [attrRe, cssUrlRe]) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text))) refs.push(match[1] || match[2]);
  }

  for (const ref of refs) {
    if (!ref || ref.startsWith("#") || ref.startsWith("mailto:") || ref.startsWith("tel:") || ref.startsWith("data:")) continue;
    if (/wp-content|wp-json|wp-admin|xmlrpc|woocommerce|wp-includes/i.test(ref)) wordpressRefs.push({ file: distPath(file), ref });

    if (/^\/\//.test(ref)) {
      protocolRelativeRefs.push({ file: distPath(file), ref });
      continue;
    }

    if (/^https?:\/\//i.test(ref)) {
      const url = new URL(ref);
      if (SITE_HOSTS.has(url.host)) {
        let pathname = url.pathname;
        try { pathname = decodeURIComponent(pathname); } catch {}
        if (!routeExists(pathname, allDistFiles)) localAssetMissing.push({ file: distPath(file), ref });
      } else {
        addSample(externalHosts, url.host, file, ref);
        if (!allowedExternalHosts.has(url.host)) addSample(unexpectedExternalHosts, url.host, file, ref);
      }
      continue;
    }

    if (ref.startsWith("/")) {
      const target = normalizeLocalPath(ref);
      if (ref.startsWith("/assets/") || ["/styles.css", "/app.js", "/sitemap.xml", "/robots.txt"].includes(ref)) {
        if (!routeExists(ref, allDistFiles)) localAssetMissing.push({ file: distPath(file), ref });
      } else if (!routeExists(target, allDistFiles) && !routeExists(ref, allDistFiles)) {
        internalMissing.push({ file: distPath(file), ref });
      }
    }
  }
}

const failures = [
  ["Referencias WordPress", wordpressRefs],
  ["Assets locales faltantes", localAssetMissing],
  ["Rutas internas faltantes", internalMissing],
  ["Hosts externos no esperados", [...unexpectedExternalHosts.values()]],
  ["URLs protocol-relative", protocolRelativeRefs]
].filter(([, list]) => list.length);

const lines = [
  "# Auditoria de dependencias estaticas",
  "",
  `Fecha: ${new Date().toISOString()}`,
  "",
  "## Resultado",
  "",
  failures.length ? "Estado: revisar antes de publicar." : "Estado: listo para publicar como sitio estatico.",
  "",
  "## Conteo",
  "",
  `- Archivos en dist: ${files.length}`,
  `- HTML revisados: ${files.filter((file) => file.endsWith(".html")).length}`,
  `- Referencias WordPress: ${wordpressRefs.length}`,
  `- Assets locales faltantes: ${localAssetMissing.length}`,
  `- Rutas internas faltantes: ${internalMissing.length}`,
  `- URLs protocol-relative: ${protocolRelativeRefs.length}`,
  "",
  "## Hosts externos permitidos",
  "",
  "Estos no son dependencias de WordPress. Son salidas funcionales o embeds que se mantienen a proposito:",
  "",
  ...[...externalHosts.entries()].sort((a, b) => b[1].count - a[1].count).map(([host, item]) => `- ${host}: ${item.count}`),
  "",
  "## Muestras si hay problemas",
  "",
  "```json",
  JSON.stringify({
    wordpressRefs: wordpressRefs.slice(0, 10),
    localAssetMissing: localAssetMissing.slice(0, 10),
    internalMissing: internalMissing.slice(0, 10),
    unexpectedExternalHosts: [...unexpectedExternalHosts.entries()].map(([host, item]) => ({ host, ...item })),
    protocolRelativeRefs: protocolRelativeRefs.slice(0, 10)
  }, null, 2),
  "```"
];

await writeFile(REPORT, `${lines.join("\n")}\n`, "utf8");

console.log(`Archivos en dist: ${files.length}`);
console.log(`Referencias WordPress: ${wordpressRefs.length}`);
console.log(`Assets locales faltantes: ${localAssetMissing.length}`);
console.log(`Rutas internas faltantes: ${internalMissing.length}`);
console.log(`Hosts externos no esperados: ${unexpectedExternalHosts.size}`);
console.log(failures.length ? "Estado: revisar" : "Estado: listo");

if (failures.length) process.exitCode = 1;
