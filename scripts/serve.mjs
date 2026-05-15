import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "dist");
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

function loadRedirects() {
  const file = path.join(root, "redirects.json");
  if (!existsSync(file)) return [];
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return data.redirects || [];
  } catch {
    return [];
  }
}

function normalizeRoute(route = "/") {
  let clean = String(route).split("?")[0].split("#")[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {}
  if (!clean.startsWith("/")) clean = `/${clean}`;
  clean = clean.replace(/\/{2,}/g, "/");
  if (!path.extname(clean) && !clean.endsWith("/")) clean = `${clean}/`;
  return clean.toLowerCase();
}

const redirects = loadRedirects();

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  const redirect = redirects.find((rule) => normalizeRoute(rule.from) === normalizeRoute(url.pathname));
  if (redirect) {
    res.writeHead(301, { location: `${redirect.to}${url.search}` });
    res.end();
    return;
  }
  const safePath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  let file = path.join(root, safePath);
  if (!existsSync(file)) file = path.join(root, safePath, "index.html");
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!existsSync(file)) {
    const notFound = path.join(root, "404.html");
    if (existsSync(notFound)) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      createReadStream(notFound).pipe(res);
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("No encontrado");
    return;
  }
  res.writeHead(200, { "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`Servidor listo: http://localhost:${port}`);
});
