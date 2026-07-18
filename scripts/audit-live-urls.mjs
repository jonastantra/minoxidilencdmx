import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const SITE_URL = "https://www.minoxidilencdmx.com";
const REPORT = path.join(ROOT, "content", "live-url-audit.md");

function normalizeRoute(url = "/") {
  let route = url;
  try {
    route = new URL(url).pathname;
  } catch {}
  try {
    route = decodeURIComponent(route);
  } catch {}
  if (!route.startsWith("/")) route = `/${route}`;
  route = route.split("?")[0].split("#")[0].replace(/\/{2,}/g, "/");
  if (!path.extname(route) && !route.endsWith("/")) route = `${route}/`;
  return route;
}

function key(route) {
  return normalizeRoute(route).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function fetchXml(url) {
  const response = await fetch(url, { headers: { "user-agent": "MinoxidilStaticAudit/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function locs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
}

async function liveUrls() {
  let index;
  let source;
  try {
    source = `${SITE_URL}/sitemap_index.xml`;
    index = await fetchXml(source);
  } catch {
    source = `${SITE_URL}/sitemap.xml`;
    index = await fetchXml(source);
  }
  const discovered = locs(index);
  const sitemapUrls = /<sitemapindex/i.test(index) ? discovered : [];
  const urls = new Set();
  if (!sitemapUrls.length) {
    for (const loc of discovered) urls.add(normalizeRoute(loc));
  }
  for (const sitemapUrl of sitemapUrls) {
    try {
      const xml = await fetchXml(sitemapUrl);
      for (const loc of locs(xml)) {
        if (loc.startsWith(SITE_URL)) urls.add(normalizeRoute(loc));
      }
    } catch (error) {
      console.warn(error.message);
    }
  }
  return { urls: [...urls].sort(), source };
}

async function distUrls() {
  const sitemap = await readFile(path.join(DIST, "sitemap.xml"), "utf8");
  const routes = new Set(locs(sitemap).map(key));
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name === "index.html") {
        const relative = path.relative(DIST, path.dirname(file)).replace(/\\/g, "/");
        routes.add(key(relative ? `/${relative}/` : "/"));
      }
    }
  }
  await walk(DIST);
  return routes;
}

async function redirectUrls() {
  const data = JSON.parse(await readFile(path.join(DIST, "redirects.json"), "utf8"));
  return new Map((data.redirects || []).map((rule) => [key(rule.from), rule]));
}

const [liveResult, built, redirects] = await Promise.all([liveUrls(), distUrls(), redirectUrls()]);
const live = liveResult.urls;
const covered = [];
const redirected = [];
const missing = [];

for (const route of live) {
  const routeKey = key(route);
  if (redirects.has(routeKey)) redirected.push({ route, to: redirects.get(routeKey).to });
  else if (built.has(routeKey)) covered.push(route);
  else missing.push(route);
}

const lines = [
  "# Auditoria de URLs vivas de WordPress",
  "",
  `Generado: ${new Date().toISOString()}`,
  `Sitemaps revisados desde: ${liveResult.source}`,
  "",
  `- URLs vivas detectadas: ${live.length}`,
  `- Cubiertas por pagina estatica: ${covered.length}`,
  `- Cubiertas por redireccion 301: ${redirected.length}`,
  `- Pendientes sin ruta exacta ni redireccion: ${missing.length}`,
  "",
  "## Pendientes",
  "",
  ...(missing.length ? missing.map((route) => `- ${route}`) : ["No quedaron URLs vivas pendientes."]),
  "",
  "## Redirecciones usadas",
  "",
  ...redirected.slice(0, 120).map((item) => `- ${item.route} -> ${item.to}`),
  ...(redirected.length > 120
    ? [`... ${redirected.length - 120} redirecciones mas cubren URLs vivas.`]
    : redirected.length ? [] : ["Ninguna."])
];

await writeFile(REPORT, `${lines.join("\n")}\n`, "utf8");
console.log(`Live URLs: ${live.length}`);
console.log(`Covered: ${covered.length}`);
console.log(`Redirected: ${redirected.length}`);
console.log(`Missing: ${missing.length}`);
