import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const issues = [];
const counts = { urls: urls.length, jsonLd: 0, noindexInSitemap: 0, wrongCanonicalHost: 0, h1: 0, metadata: 0 };

const text = (html, regex) => html.match(regex)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "";

for (const url of urls) {
  const route = new URL(url).pathname;
  const file = route === "/" ? path.join(dist, "index.html") : path.join(dist, route.replace(/^\/+|\/+$/g, ""), "index.html");
  let html;
  try { html = await readFile(file, "utf8"); } catch { issues.push({ route, issue: "URL del sitemap sin archivo" }); continue; }
  const title = text(html, /<title>([\s\S]*?)<\/title>/i);
  const description = text(html, /<meta name="description" content="([^"]*)"/i);
  const canonical = text(html, /<link rel="canonical" href="([^"]*)"/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (!title || title.length < 18 || title.length > 70 || !description || description.length < 70 || description.length > 165) {
    counts.metadata += 1;
    issues.push({ route, issue: `metadata: title ${title.length}, description ${description.length}` });
  }
  if (!canonical.startsWith("https://www.minoxidilencdmx.com/")) {
    counts.wrongCanonicalHost += 1;
    issues.push({ route, issue: `canonical incorrecta: ${canonical}` });
  }
  if (h1Count !== 1) {
    counts.h1 += 1;
    issues.push({ route, issue: `${h1Count} elementos H1` });
  }
  if (/<meta name="robots" content="noindex/i.test(html)) {
    counts.noindexInSitemap += 1;
    issues.push({ route, issue: "noindex incluido en sitemap" });
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); counts.jsonLd += 1; } catch { issues.push({ route, issue: "JSON-LD inválido" }); }
  }
}

const report = `# Auditoría SEO del HTML final

Fecha: ${new Date().toISOString()}

- URLs indexables revisadas: ${counts.urls}
- Bloques JSON-LD válidos: ${counts.jsonLd}
- Canónicas con host incorrecto: ${counts.wrongCanonicalHost}
- Páginas sin un único H1: ${counts.h1}
- URLs noindex dentro del sitemap: ${counts.noindexInSitemap}
- Metadatos fuera de rango recomendado: ${counts.metadata}

## Detalle

${issues.length ? issues.map((item) => `- ${item.route}: ${item.issue}`).join("\n") : "Sin incidencias."}
`;

await writeFile(path.join(root, "content", "seo-output-audit.md"), report, "utf8");
console.log(report.split("\n").slice(0, 16).join("\n"));
if (issues.length) process.exitCode = 1;
