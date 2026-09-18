import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { editorialGuides, editorialSources } from "../content/editorial-guides.mjs";
import { themeCss, themedHome, fontLinks, mobileBar } from "./theme.mjs";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "content", "site-data.json");
const DIST = path.join(ROOT, "dist");
const SITE_URL = "https://www.minoxidilencdmx.com";

const writtenRoutes = new Set();
const noindexRoutes = new Set();
let imageMetaMap = new Map();

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeEntities(value = "") {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function repairMojibake(value = "") {
  let text = String(value);
  const replacements = [
    ["ÃƒÂ¡", "á"], ["ÃƒÂ©", "é"], ["ÃƒÂ­", "í"], ["ÃƒÂ³", "ó"], ["ÃƒÂº", "ú"], ["ÃƒÂ±", "ñ"],
    ["ÃƒÂ ", "Á"], ["ÃƒÂ‰", "É"], ["ÃƒÂ ", "Í"], ["ÃƒÂ“", "Ó"], ["ÃƒÂš", "Ú"], ["ÃƒÂ‘", "Ñ"],
    ["Ã¡", "á"], ["Ã©", "é"], ["Ã­", "í"], ["Ã³", "ó"], ["Ãº", "ú"], ["Ã±", "ñ"],
    ["Ã ", "Á"], ["Ã‰", "É"], ["Ã ", "Í"], ["Ã“", "Ó"], ["Ãš", "Ú"], ["Ã‘", "Ñ"],
    ["Â¿", "¿"], ["Â¡", "¡"], ["Â«", "«"], ["Â»", "»"], ["Â°", "°"], ["Â£", "£"],
    ["â€“", "–"], ["â€”", "—"], ["â€œ", "“"], ["â€ ", "”"], ["â€˜", "‘"], ["â€™", "’"], ["â€¦", "…"],
    ["âœ✓", "✓"], ["â˜…", "★"], ["â™¥", "♥"], ["â–£", "▣"], ["â—‡", "◇"], ["â—·", "◷"],
    ["âŒ–", "⌖"], ["â†—", "↗"], ["âœ‰", "✉"], ["â–¯", "▯"], ["Â", ""],
    ["recuperaciÃ³n", "recuperación"], ["aplicaciÃ³n", "aplicación"], ["atenciÃ³n", "atención"],
    ["direcciÃ³n", "dirección"], ["Ciudad de MÃ©xico", "Ciudad de México"], ["NezahualcÃ³yotl", "Nezahualcóyotl"]
  ];
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [bad, good] of replacements) text = text.replaceAll(bad, good);
  }
  return text;
}

function stripTags(value = "") {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanHtml(value = "") {
  return repairMojibake(String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/https:\/\/minoxidilencdmx\.com/g, "")
    .replace(/\s(style|id|width|height)="[^"]*"/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim());
}

function routeToFile(route) {
  const clean = route.replace(/^\/+|\/+$/g, "");
  return path.join(DIST, clean, "index.html");
}

async function writeRoute(route, html) {
  const file = routeToFile(route);
  await mkdir(path.dirname(file), { recursive: true });
  const output = optimizeHtmlImages(localizeWordPressMedia(repairMojibake(html)));
  await writeFile(file, output, "utf8");
  const normalized = normalizeRoute(route);
  writtenRoutes.add(normalized);
  if (/<meta name="robots" content="noindex/i.test(output)) {
    noindexRoutes.add(normalized);
  }
}

function imageKeyFromSrc(src = "") {
  try {
    const clean = src.startsWith("http") ? new URL(src).pathname : src;
    if (!clean.startsWith("/assets/images/")) return "";
    return decodeURIComponent(clean.split(/[?#]/)[0]).toLowerCase();
  } catch {
    return "";
  }
}

function optimizedImageSrc(src = "") {
  const key = imageKeyFromSrc(src);
  const meta = key ? imageMetaMap.get(key) : null;
  return meta?.webp || src;
}

function optimizeInlineImageUrls(html = "") {
  return String(html).replace(/url\((['"]?)(\/assets\/images\/[^)'"]+\.(?:jpe?g|png))\1\)/gi, (_match, quote = "", src) => {
    const optimized = optimizedImageSrc(src);
    return `url(${quote}${optimized}${quote})`;
  });
}

function addOrReplaceAttr(tag, name, value) {
  const attr = `${name}="${escapeHtml(value)}"`;
  if (new RegExp(`\\s${name}=`, "i").test(tag)) return tag.replace(new RegExp(`\\s${name}="[^"]*"`, "i"), ` ${attr}`);
  return tag.replace(/>$/, ` ${attr}>`);
}

function optimizeHtmlImages(html = "") {
  let content = optimizeInlineImageUrls(html);
  let meaningfulImageIndex = 0;
  content = content.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\ssrc="([^"]+)"/i);
    const originalSrc = srcMatch ? srcMatch[1] : "";
    const key = imageKeyFromSrc(originalSrc);
    const meta = key ? imageMetaMap.get(key) : null;
    let next = tag;
    if (meta?.webp) next = addOrReplaceAttr(next, "src", meta.webp);
    if (meta?.width && meta?.height) {
      next = addOrReplaceAttr(next, "width", String(meta.width));
      next = addOrReplaceAttr(next, "height", String(meta.height));
    }
    if (!/decoding=/i.test(next)) next = addOrReplaceAttr(next, "decoding", "async");
    const isHeroOrLogo = /brand-logo|hero/i.test(next) || meaningfulImageIndex === 0;
    if (isHeroOrLogo) {
      next = addOrReplaceAttr(next, "loading", "eager");
      next = addOrReplaceAttr(next, "fetchpriority", "high");
    } else {
      if (!/loading=/i.test(next)) next = addOrReplaceAttr(next, "loading", "lazy");
    }
    meaningfulImageIndex += 1;
    return next;
  });
  return content;
}

function localizeWordPressMedia(html = "") {
  return String(html)
    .replace(/https?:\/\/minoxidilencdmx\.com\/wp-content\/uploads\/(\d{4}\/\d{2}\/)?([^"'\s>]+)/gi, (_match, _date, file) => {
      const cleanName = path.basename(file).split("?")[0];
      return `/assets/images/${cleanName}`;
    })
    .replace(/src="data:image\/gif;base64,[^"]*"\s+data-src="([^"]+)"/gi, 'src="$1"')
    .replace(/\s+data-src="\/assets\/images\/([^"]+)"/gi, "")
    .replace(/\s+srcset="[^"]*"/gi, "")
    .replace(/\s+data-srcset="[^"]*"/gi, "");
}

async function optimizeImageAssets() {
  imageMetaMap = new Map();
  let sharp = null;
  try {
    const sharpModule = await import("sharp");
    sharp = sharpModule.default || sharpModule;
  } catch {
    console.log("Aviso: módulo sharp no instalado, omitiendo compresión dinámica WebP.");
    return;
  }
  const imagesDir = path.join(DIST, "assets", "images");
  let files = [];
  try {
    files = readdirSync(imagesDir, { withFileTypes: true }).filter((file) => file.isFile()).map((file) => file.name);
  } catch {
    return;
  }
  await Promise.all(files.map(async (file) => {
    const ext = path.extname(file).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) return;
    const absolute = path.join(imagesDir, file);
    const sourcePath = `/assets/images/${file}`;
    const key = sourcePath.toLowerCase();
    try {
      const image = sharp(absolute, { failOn: "none" }).rotate();
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) return;
      const targetWidth = Math.min(metadata.width, 1600);
      const ratio = targetWidth / metadata.width;
      const targetHeight = Math.round(metadata.height * ratio);
      const webpName = `${path.basename(file, ext)}.webp`;
      const webpPath = path.join(imagesDir, webpName);
      await sharp(absolute, { failOn: "none" })
        .rotate()
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(webpPath);
      imageMetaMap.set(key, {
        width: targetWidth,
        height: targetHeight,
        webp: `/assets/images/${webpName}`
      });
      imageMetaMap.set(`/assets/images/${webpName}`.toLowerCase(), {
        width: targetWidth,
        height: targetHeight,
        webp: `/assets/images/${webpName}`
      });
    } catch {
      imageMetaMap.set(key, { width: 0, height: 0, webp: sourcePath });
    }
  }));
}

function normalizeRoute(route = "/") {
  let clean = String(route).trim();
  if (!clean) return "/";
  try {
    if (/^https?:\/\//i.test(clean)) clean = new URL(clean).pathname;
  } catch {
    clean = "/";
  }
  try {
    clean = decodeURIComponent(clean);
  } catch {
    clean = clean.replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  clean = clean.split("?")[0].split("#")[0].replace(/\\/g, "/");
  if (!clean.startsWith("/")) clean = `/${clean}`;
  clean = clean.replace(/\/{2,}/g, "/");
  if (!path.extname(clean) && !clean.endsWith("/")) clean = `${clean}/`;
  return clean;
}

function routeKey(route = "/") {
  return normalizeRoute(route)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pathFromUrl(url) {
  if (!url) return "";
  try {
    return normalizeRoute(new URL(url).pathname);
  } catch {
    return normalizeRoute(url);
  }
}

function guidePathForPost(post) {
  const text = normalizeText(`${post.title} ${post.slug}`);
  if (/original|clon|pirata|falso|falsificad|autentic|copia/.test(text)) return "/guias/minoxidil-kirkland-original-vs-clon/";
  if (/como.*usar|aplicar|aplicacion|rutina|manual|tutorial|dosis/.test(text)) return "/guias/como-aplicar-minoxidil/";
  if (/efectos.*secundarios|reaccion|seguridad|peligro|riesgo|contraindicacion/.test(text)) return "/guias/efectos-secundarios-minoxidil/";
  if (/shedding|resultados|tiempo|cuanto.*tarda|meses|antes.*despues/.test(text)) return "/guias/resultados-minoxidil-shedding/";
  if (/barba|bigote|candado|mejillas|huecos|crecimiento.*barba/.test(text)) return "/guias/minoxidil-para-barba/";
  if (/mujer|mujeres|femenino|cejas|pestanas/.test(text)) return "/guias/minoxidil-mujeres/";
  if (/espuma|foam|liquido|shampoo|gotero|presentacion/.test(text)) return "/guias/minoxidil-liquido-vs-espuma/";
  if (/comprar|cdmx|mexico|tienda|precio|sucursal|donde.*comprar/.test(text)) return "/guias/comprar-minoxidil-cdmx/";
  if (/alopecia|caida|perdida|dermatologo|diagnostico|entradas|coronilla/.test(text)) return "/guias/caida-cabello-cuando-dermatologo/";
  return "/guias/minoxidil-topico/";
}

function legacyRedirects(data) {
  const rules = new Map();
  const categoryBySlug = new Map(data.categories.map((category) => [category.slug, category.path]));
  const productBySlug = new Map(data.products.map((product) => [product.slug, product.path]));
  const pageBySlug = new Map(data.pages.map((page) => [page.slug, page.path]));

  const addRedirect = (from, to, reason) => {
    const f = normalizeRoute(from);
    const t = normalizeRoute(to);
    if (!f || !t || f === t || f === "/") return;
    rules.set(routeKey(f), { from: f, to: t, status: 301, reason });
  };

  for (const item of [...data.products, ...data.pages]) {
    if (item.oldUrl) addRedirect(pathFromUrl(item.oldUrl), item.path, "imported oldUrl");
  }

  addRedirect("/producto/", "/shop/", "woocommerce base product archive");
  addRedirect("/producto", "/shop/", "woocommerce base product archive");
  addRedirect("/%e2%9c%85como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil/", "/guias/minoxidil-kirkland-original-vs-clon/", "cleaned emoji post slug");
  addRedirect("/%e2%9c%85como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil-2/", "/guias/minoxidil-kirkland-original-vs-clon/", "cleaned emoji post slug");
  addRedirect("/como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil-2/", "/guias/minoxidil-kirkland-original-vs-clon/", "cleaned duplicate post slug");
  addRedirect("/como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil/", "/guias/minoxidil-kirkland-original-vs-clon/", "cleaned duplicate post slug");

  // Prune & consolidate all 293 legacy thin posts to authoritative topical pillar guides
  for (const post of data.posts) {
    const target = guidePathForPost(post);
    addRedirect(post.path, target, "legacy post pillar redirect");
    if (post.oldUrl) addRedirect(pathFromUrl(post.oldUrl), target, "legacy post oldUrl");
  }

  // Redirect legacy blog pagination to /blog/
  for (let p = 2; p <= 50; p++) {
    addRedirect(`/blog/page/${p}/`, "/blog/", "legacy blog pagination redirect");
  }

  for (const product of data.products) {
    addRedirect(`/product/${product.slug}/`, product.path, "woocommerce english product");
    addRedirect(`/shop/${product.slug}/`, product.path, "shop product alias");
    addRedirect(`/producto/${product.slug}`, product.path, "missing trailing slash");

    for (const image of product.images || []) {
      if (image.original && image.local) {
        addRedirect(pathFromUrl(image.original), image.local, "wordpress upload image");
      }
    }
  }

  for (const category of data.categories) {
    addRedirect(`/product-category/${category.slug}/`, category.path, "woocommerce english category");
    addRedirect(`/product_cat/${category.slug}/`, category.path, "woocommerce taxonomy");
    addRedirect(`/categoria/${category.slug}/`, category.path, "spanish category alias");
    addRedirect(`/categoria-producto/${category.slug}/`, category.path, "flattened product category");
  }

  const postCategoryTargets = {
    alopecia: categoryBySlug.get("anticaida-y-recuperar-cabello") || "/blog/",
    minoxidil: categoryBySlug.get("minoxidil") || "/blog/",
    cabello: categoryBySlug.get("anticaida-y-recuperar-cabello") || "/blog/",
    barba: categoryBySlug.get("crecimiento-de-barba") || "/blog/",
    slider: "/",
    "sin-categoria": "/blog/",
    testimonios: "/#testimonios",
    uncategorized: "/blog/",
    youtube: "/blog/",
    productos: "/shop/"
  };
  for (const [slug, target] of Object.entries(postCategoryTargets)) {
    addRedirect(`/category/${slug}/`, target, "wordpress post category");
  }

  const aliases = {
    "/home-2/": "/",
    "/about/": "/quienes-somos/",
    "/blog-2/": "/blog/",
    "/contacto/": "/contact/",
    "/videos/": "/blog/",
    "/youtube-videos/": "/blog/",
    "/cart/": "/shop/",
    "/carrito/": "/shop/",
    "/checkout/": "/shop/",
    "/finalizar-comprar/": "/shop/",
    "/mi-cuenta/": "/contact/",
    "/sucursal/": "/sucursales-y-entregas/",
    "/aviso-de-privacidad/": "/politicas-de-privacidad/",
    "/mayoreo/": "/contact/",
    "/distribuye-mayoreo/": "/contact/"
  };
  for (const [from, to] of Object.entries(aliases)) {
    addRedirect(from, to, "alias");
  }

  return [...rules.values()].sort((a, b) => a.from.localeCompare(b.from));
}

function redirectIndex(data, routes, redirects) {
  const routeItems = [];
  for (const route of routes) routeItems.push({ path: normalizeRoute(route), title: route === "/" ? "Inicio" : route.replace(/^\/|\/$/g, "") });
  for (const product of data.products) routeItems.push({ path: product.path, title: product.name, type: "producto" });
  for (const category of data.categories) routeItems.push({ path: category.path, title: category.name, type: "categoria" });
  for (const page of data.pages) routeItems.push({ path: page.path, title: page.title, type: "pagina" });
  for (const guide of editorialGuides) routeItems.push({ path: guide.path, title: guide.title, type: "guia" });
  const uniqueRoutes = [...new Map(routeItems.map((item) => [routeKey(item.path), item])).values()];
  return {
    generatedAt: new Date().toISOString(),
    redirects,
    routes: uniqueRoutes
  };
}

function whatsappLink(data, productName = "") {
  const text = productName
    ? `Hola, vi su sitio web de Minoxidil en CDMX y quiero informes para comprar: ${productName}`
    : "Hola, vi su sitio web de Minoxidil en CDMX y quiero informes sobre tratamientos originales para barba o cabello";
  return `https://api.whatsapp.com/send?phone=${data.whatsapp}&text=${encodeURIComponent(text)}`;
}

function pickImage(data, includes, fallbackIndex = 0) {
  const hit = data.heroImages.find((image) => image.toLowerCase().includes(includes));
  return hit || data.heroImages[fallbackIndex] || data.products[0]?.image || "";
}

function formatDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
}

function isoDate(date) {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
}

function metaText(value = "", limit = 160) {
  const plain = stripTags(value);
  if (plain.length <= limit) return plain;
  return `${plain.slice(0, limit - 1).trim()}…`;
}

function imageExists(src = "") {
  if (!src) return false;
  const rel = src.replace(/^\/+/, "");
  return existsSync(path.join(DIST, rel)) || existsSync(path.join(ROOT, "public", rel));
}

function productImage(product, data) {
  const image = product.images?.[0]?.src || product.image;
  return imageExists(image) ? image : pickImage(data, "kirkland", 0);
}

function layout(data, page) {
  const pageTitle = page.seoTitle || page.title || data.siteTitle;
  const titleCandidate = page.path === "/"
    ? "Minoxidil en CDMX | Kirkland Original, Sucursal Plaza Guelatao y Entregas"
    : pageTitle.length > 45 ? pageTitle : `${pageTitle} | Minoxidil en CDMX`;
  const title = metaText(titleCandidate, 70);
  const description = metaText(page.description || data.description);
  const image = page.image || data.products[0]?.image || "";
  const socialImage = page.socialImage || "/assets/images/og-minoxidil-todo-mexico.png";
  const canonical = `${SITE_URL}${page.path || "/"}`.replace(/\/+$/, "/");
  const robotsTag = page.robots || "index, follow, max-image-preview:large";

  return `<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${escapeHtml(robotsTag)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${page.type || "website"}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:locale" content="es_MX">
  <meta property="og:site_name" content="Minoxidil en CDMX">
  <meta property="og:image" content="${SITE_URL}${escapeHtml(socialImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${SITE_URL}${escapeHtml(socialImage)}">
  <link rel="preconnect" href="https://api.whatsapp.com">
  ${fontLinks}
  <link rel="stylesheet" href="/assets/site.css">
  <script type="application/ld+json">${JSON.stringify(structuredData(data, page))}</script>
</head>
<body class="${page.bodyClass || ""}">
  <a class="skip-link" href="#contenido">Saltar al contenido principal</a>
  <header class="site-header">
    <div class="container nav-wrap">
      <a class="brand" href="/" aria-label="Minoxidil en CDMX - Inicio">
        <img src="/assets/images/minoxidil-mexico.jpg" alt="Minoxidil en CDMX" class="brand-logo-img" width="220" height="44">
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menú">
        <span class="menu-icon"></span>
      </button>
      <nav class="nav-menu" id="menu" aria-label="Principal">
        <a href="/shop/">Tienda</a>
        <a href="/#precios">Precios</a>
        <a href="/guias/minoxidil-kirkland-original-vs-clon/">Original vs clon</a>
        <a href="/blog/">Guías</a>
        <a href="/sucursales-y-entregas/">Cómo llegar</a>
        <a class="nav-btn" href="${whatsappLink(data)}">WhatsApp 55 6938 0408</a>
      </nav>
    </div>
  </header>
  <main id="contenido">${page.body}</main>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-col brand-col">
        <a href="/" class="footer-brand-logo" aria-label="Minoxidil en CDMX - Inicio">
          <img src="/assets/images/minoxidil-mexico.jpg" alt="Minoxidil en CDMX" class="footer-logo-img" width="200" height="40">
        </a>
        <p>Especialistas en tratamientos para crecimiento de barba y detención de caída del cabello. Distribución de Minoxidil Kirkland 100% original en Ciudad de México y envíos express a toda la República Mexicana.</p>
        <div class="footer-guarantee">
          <span>Producto original. Lote y caducidad visibles antes de pagar.</span>
        </div>
      </div>
      <div class="footer-col">
        <h3>Sucursal en CDMX</h3>
        <p><strong>Plaza Guelatao:</strong> Local 76, Pasillo 5.<br>Calz. Ignacio Zaragoza 406, Juan Escutia, Iztapalapa, CDMX (Metro Guelatao Línea A).</p>
        <p><strong>Horario:</strong> Martes a Domingo de 12:00 PM a 5:00 PM.</p>
        <p><strong>Entregas:</strong> Puntos acordados en CDMX y Nezahualcóyotl.</p>
      </div>
      <div class="footer-col">
        <h3>Contacto Directo</h3>
        <p><strong>WhatsApp:</strong> <a href="${whatsappLink(data)}">55 6938 0408</a></p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
        <p><strong>Envíos:</strong> Paquetería express 24-48 hrs a todo México.</p>
      </div>
      <div class="footer-col">
        <h3>Información y Guías</h3>
        <ul class="footer-links">
          <li><a href="/shop/">Catálogo de Productos</a></li>
          <li><a href="/sucursales-y-entregas/">Sucursales y Entregas Personales</a></li>
          <li><a href="/guias/minoxidil-kirkland-original-vs-clon/">Kirkland Original vs Clon</a></li>
          <li><a href="/blog/">Guías y Consejos de Uso</a></li>
          <li><a href="/envios-a-todo-mexico/">Envíos a Todo México</a></li>
          <li><a href="/terminos-y-condiciones/">Términos y Condiciones</a></li>
          <li><a href="/politicas-de-privacidad/">Aviso de Privacidad</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container footer-bottom-inner">
        <p>© ${new Date().getFullYear()} Minoxidil en CDMX. Todos los derechos reservados.</p>
        <p>Atención personalizada por WhatsApp.</p>
      </div>
    </div>
  </footer>
  ${mobileBar(whatsappLink(data))}
  <script src="/assets/site.js" defer></script>
</body>
</html>`;
}

function structuredData(data, page) {
  const graphs = [
    organizationSchema(data),
    webSiteSchema(data)
  ];
  if (Array.isArray(page.schema)) {
    graphs.push(...page.schema);
  } else if (page.schema) {
    graphs.push(page.schema);
  }
  return {
    "@context": "https://schema.org",
    "@graph": graphs
  };
}

function organizationSchema(data) {
  return {
    "@type": ["Store", "LocalBusiness"],
    "@id": `${SITE_URL}/#localbusiness`,
    name: "Minoxidil en CDMX",
    alternateName: "Minoxidil Kirkland México",
    url: SITE_URL,
    image: `${SITE_URL}/assets/images/minoxidil-mexico.jpg`,
    telephone: "+52 55 6938 0408",
    email: data.email,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Plaza Guelatao Local 76 Pasillo 5, Calz. Ignacio Zaragoza 406",
      addressLocality: "Iztapalapa",
      addressRegion: "Ciudad de México",
      postalCode: "09100",
      addressCountry: "MX"
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 19.3891,
      longitude: -99.0435
    },
    areaServed: [
      { "@type": "City", name: "Ciudad de México" },
      { "@type": "State", name: "Estado de México" },
      { "@type": "Country", name: "México" }
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "12:00",
        closes: "17:00"
      }
    ],
    sameAs: [
      data.social.facebook,
      data.social.instagram,
      data.social.tiktok
    ]
  };
}

function webSiteSchema(data) {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Minoxidil en CDMX | Venta en Sucursal y Entregas Personales",
    description: data.description,
    inLanguage: "es-MX",
    publisher: { "@id": `${SITE_URL}/#localbusiness` }
  };
}

function breadcrumbSchema(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`
    }))
  };
}

function productSchema(product, data) {
  const numericPrice = parseFloat(String(product.price || "").replace(/[^0-9.]/g, "")) || 300;
  return {
    "@type": "Product",
    "@id": `${SITE_URL}${product.path}#product`,
    name: product.name,
    image: `${SITE_URL}${product.image}`,
    description: stripTags(product.excerpt || product.description).slice(0, 200),
    sku: `MX-${product.id}`,
    brand: {
      "@type": "Brand",
      name: /kirkland/i.test(product.name) ? "Kirkland Signature" : "Minoxidil en CDMX"
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}${product.path}`,
      priceCurrency: "MXN",
      price: numericPrice,
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
      seller: { "@id": `${SITE_URL}/#localbusiness` }
    }
  };
}

function articleSchema(post, data) {
  return {
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: isoDate(post.date),
    dateModified: isoDate(post.modified || post.date),
    author: {
      "@type": "Person",
      name: "Asesor Especialista Minoxidil CDMX",
      url: `${SITE_URL}/quienes-somos/`
    },
    publisher: { "@id": `${SITE_URL}/#localbusiness` },
    image: post.image ? `${SITE_URL}${post.image}` : `${SITE_URL}/assets/images/og-minoxidil-todo-mexico.png`,
    mainEntityOfPage: `${SITE_URL}${post.path}`,
    inLanguage: "es-MX"
  };
}

function itemListSchema(name, pathName, items) {
  return {
    "@type": "ItemList",
    name,
    url: `${SITE_URL}${pathName}`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}${item.path}`,
      name: item.name || item.title
    }))
  };
}

function sitemapEntry(route, data, meta) {
  const normalized = normalizeRoute(route);
  const item = meta.get(normalized) || {};
  const lastmod = item.lastmod || new Date().toISOString().slice(0, 10);
  const changefreq = item.changefreq || (normalized.startsWith("/producto/") ? "weekly" : normalized.startsWith("/blog/") ? "weekly" : "monthly");
  const priority = item.priority || (normalized === "/" ? "1.0" : normalized.startsWith("/shop/") ? "0.9" : normalized.startsWith("/producto/") ? "0.8" : "0.7");
  return [
    "  <url>",
    `    <loc>${SITE_URL}${normalized}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>"
  ].join("\n");
}

function sitemapMeta(data) {
  const meta = new Map();
  const today = new Date().toISOString().slice(0, 10);
  const set = (route, values) => meta.set(normalizeRoute(route), values);

  set("/", { lastmod: today, changefreq: "weekly", priority: "1.0" });
  set("/shop/", { lastmod: today, changefreq: "weekly", priority: "0.9" });
  set("/sucursales-y-entregas/", { lastmod: today, changefreq: "weekly", priority: "0.9" });
  set("/blog/", { lastmod: today, changefreq: "weekly", priority: "0.8" });
  set("/contact/", { lastmod: today, changefreq: "monthly", priority: "0.8" });

  for (const product of data.products) {
    set(product.path, { lastmod: today, changefreq: "weekly", priority: "0.8" });
  }

  for (const category of data.categories) {
    set(category.path, { lastmod: today, changefreq: "weekly", priority: "0.75" });
  }

  for (const guide of editorialGuides) {
    set(guide.path, { lastmod: today, changefreq: "monthly", priority: "0.85" });
  }

  for (const route of ["/envios-a-todo-mexico/", "/devoluciones-y-reembolsos/", "/politicas-de-privacidad/", "/terminos-y-condiciones/", "/quienes-somos/"]) {
    set(route, { lastmod: today, changefreq: "yearly", priority: "0.5" });
  }

  return meta;
}

// ----------------------------------------------------
// UI Page Generators
// ----------------------------------------------------

function productCard(product, data) {
  const image = productImage(product, data);
  const categoryNames = product.categories.map((c) => c.name).slice(0, 2).join(", ");
  const isKirkland = /kirkland/i.test(product.name);
  const badgeText = isKirkland ? "Kirkland Original" : "Disponible";

  return `
    <article class="product-card" data-category="${product.categories.map((c) => c.slug).join(" ")}">
      <div class="product-badge-wrap">
        <span class="badge ${isKirkland ? "badge-kirkland" : "badge-neutral"}">${badgeText}</span>
      </div>
      <a class="product-img-link" href="${product.path}">
        <img src="${image}" alt="${escapeHtml(product.name)}" loading="lazy">
      </a>
      <div class="product-info">
        <span class="product-cat">${escapeHtml(categoryNames)}</span>
        <h3 class="product-title">
          <a href="${product.path}">${escapeHtml(product.name.replace(/\s*\|.*$/, ""))}</a>
        </h3>
        <div class="product-price-row">
          <span class="price-val">${escapeHtml(product.price || product.priceHtml || "Consultar")}</span>
          <a class="btn-wa-sm" href="${whatsappLink(data, product.name)}" aria-label="Comprar por WhatsApp">
            Pedir
          </a>
        </div>
      </div>
    </article>`;
}

function categoryLinks(data, activeSlug = "") {
  return data.categories
    .filter((cat) => cat.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((cat) => {
      const activeClass = cat.slug === activeSlug ? " active" : "";
      return `<a class="cat-pill${activeClass}" href="${cat.path}">${escapeHtml(cat.name)} <span class="cat-count">(${cat.count})</span></a>`;
    })
    .join("");
}

function productPrice(data, slug, fallback) {
  const product = data.products.find((item) => item.slug === slug);
  const value = parseFloat(String(product?.price || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function mxn(value) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function homePage(data) {
  const price1 = productPrice(data, "minoxidil-1-mes-kirkland-liquido-5-3", 250);
  const price3 = productPrice(data, "minoxidil-3-meses-kirkland-liquido-5-2", 600);
  const price6 = productPrice(data, "minoxidil-6-meses-kirkland-liquido-5-2", 1100);
  const price12 = productPrice(data, "minoxidil-12-meses-kirkland-liquido-5-2", 2000);
  const heroImg = "/assets/images/diseno-sin-titulo-2.jpg";
  const featured = data.products.slice(0, 8);

  const body = `
    <!-- Split Hero Section -->
    <section class="hero-section">
      <div class="container hero-grid">
        <div class="hero-content-col">
          <div class="hero-eyebrow">
            <span>📍</span> TIENDA FÍSICA EN CDMX · PLAZA GUELATAO LOCAL 76 · ENVÍOS A TODO MÉXICO
          </div>
          <h1 class="hero-headline">
            Minoxidil Kirkland Original en CDMX | Venta en Sucursal y Entregas Personales
          </h1>
          <p class="hero-subtitle">
            Minoxidil tópico al 5% para caída de cabello y uso en barba. Producto 100% original con lote y caducidad verificables, atención directa en tienda física en Plaza Guelatao y entregas el mismo día en CDMX o envíos express a todo el país.
          </p>
          <div class="hero-ctas">
            <a class="btn btn-primary btn-large" href="${whatsappLink(data, "Quiero comprar Minoxidil Kirkland en CDMX")}">
              💬 Pedir por WhatsApp (Atención Inmediata)
            </a>
            <a class="btn btn-dark btn-large" href="/shop/">
              🏷️ Ver Catálogo y Precios
            </a>
          </div>
          <ul class="hero-trust-list">
            <li><span class="hero-trust-check">✓</span> Kirkland 100% Original con lote láser visible</li>
            <li><span class="hero-trust-check">✓</span> Sucursal física en Plaza Guelatao Local 76</li>
            <li><span class="hero-trust-check">✓</span> Entregas personales en estaciones del Metro CDMX</li>
            <li><span class="hero-trust-check">✓</span> Asesoría honesta sin promesas milagro ni letras chiquitas</li>
          </ul>
        </div>

        <div class="hero-visual-col">
          <div class="hero-card-frame">
            <img src="${heroImg}" alt="Mostrador con Minoxidil Kirkland original en sucursal física CDMX" class="hero-card-img" width="800" height="600">
            <div class="hero-card-content">
              <span class="hero-card-badge">✓ FOTO REAL EN SUCURSAL CDMX</span>
              <h2 class="hero-card-title">Plaza Guelatao Local 76 (Metro Guelatao)</h2>
              <p class="hero-card-desc">Revisa los empaques, sellos de fábrica y fechas de caducidad físicamente en mano antes de pagar en tienda.</p>
              <a class="hero-card-link" href="#sucursales">Ver horarios y cómo llegar a la tienda →</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4 Intent Funnel Tiles -->
    <section class="section section-intents">
      <div class="container">
        <div class="intent-grid">
          <a class="intent-card" href="/guias/minoxidil-para-barba/">
            <div class="intent-icon">🧔</div>
            <h3>Crecimiento de Barba</h3>
            <p>Pasa de vello delgado a barba tupida y cerrada. Conoce la rutina de aplicación y tiempos de maduración.</p>
            <span class="intent-action">Ver guía de barba →</span>
          </a>

          <a class="intent-card" href="/guias/minoxidil-topico/">
            <div class="intent-icon">💇‍♂️</div>
            <h3>Frenar Caída Capilar</h3>
            <p>Minoxidil tópico al 5% para frenar alopecia en entradas y coronilla en hombres y mujeres.</p>
            <span class="intent-action">Ver guía de cabello →</span>
          </a>

          <a class="intent-card" href="/sucursales-y-entregas/">
            <div class="intent-icon">🏬</div>
            <h3>Sucursal Plaza Guelatao</h3>
            <p>Visítanos en Iztapalapa a unos pasos de Metro Guelatao (Línea A). Paga en efectivo o transferencia.</p>
            <span class="intent-action">Ver cómo llegar →</span>
          </a>

          <a class="intent-card" href="/guias/minoxidil-kirkland-original-vs-clon/">
            <div class="intent-icon">🔍</div>
            <h3>Original vs Pirata</h3>
            <p>Aprende los 4 puntos clave para reconocer producto auténtico y evitar imitaciones en CDMX.</p>
            <span class="intent-action">Revisar checklist →</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Guía de Originalidad con Foto de Tienda -->
    <section class="section section-originality">
      <div class="container">
        <div class="section-header text-center">
          <span class="section-tag">SEGURIDAD Y CONFIANZA</span>
          <h2>Cómo Identificar Minoxidil Kirkland Original vs Pirata</h2>
          <p>En Ciudad de México circulan muchas copias y clones diluidos. Revisa estos 4 puntos antes de comprar para garantizar tu salud y resultados:</p>
        </div>

        <div class="authenticity-layout">
          <div class="auth-image-col">
            <div class="auth-image-box">
              <img src="/assets/images/diseno-sin-titulo-1.jpg" alt="Cajas de Minoxidil Kirkland y terminal Clip en mostrador de tienda física" loading="lazy" width="790" height="1000">
              <div class="auth-caption">
                <strong>Mostrador en Plaza Guelatao Local 76:</strong> Inventario sellado de fábrica con lote visible a la vista de todo cliente.
              </div>
            </div>
          </div>

          <div class="auth-points-col">
            <div class="auth-points-list">
              <div class="auth-point">
                <div class="auth-point-num">1</div>
                <div>
                  <h3>Código de Lote y Caducidad en Láser</h3>
                  <p>La base de la caja sellada y cada uno de los 6 frascos tienen impreso en tinta láser indeleble el mismo número de lote y fecha de vencimiento. Desconfía si están borrados, despintados o desfasados.</p>
                </div>
              </div>

              <div class="auth-point">
                <div class="auth-point-num">2</div>
                <div>
                  <h3>Gotero Original Graduado</h3>
                  <p>El aplicador de Kirkland Signature incluye rosca de seguridad para niños (push down & turn) y una marca exacta de 1.0 ml. Las copias suelen incluir goteros genéricos sin graduación precisa.</p>
                </div>
              </div>

              <div class="auth-point">
                <div class="auth-point-num">3</div>
                <div>
                  <h3>Color Ámbar y Aroma Característico</h3>
                  <p>La fórmula líquida original al 5% tiene una tonalidad ligeramente ámbar con olor característico alcohólico y propilenglicol, cristalizando al secar en la piel. Nunca debe oler a perfume ni tener consistencia jabonosa.</p>
                </div>
              </div>

              <div class="auth-point">
                <div class="auth-point-num">4</div>
                <div>
                  <h3>Revisión Física en Tienda</h3>
                  <p>En nuestra sucursal de Plaza Guelatao (Iztapalapa, CDMX) puedes revisar los empaques, sellos y números de serie en persona antes de pagar. Te damos total transparencia.</p>
                </div>
              </div>
            </div>

            <div style="margin-top: 1.75rem;">
              <a class="btn btn-gold" href="/guias/minoxidil-kirkland-original-vs-clon/">
                Leer Guía Completa de Original vs Clon →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Fases y Tiempos de Crecimiento con Foto Real -->
    <section class="section section-timeline">
      <div class="container">
        <div class="section-header text-center">
          <span class="section-tag">QUÉ ESPERAR</span>
          <h2>Fases de Crecimiento: De Vello Incipiente a Barba Cerrada</h2>
          <p>El crecimiento no ocurre de la noche a la mañana. La constancia diaria es la única clave para pasar de vello incipiente a barba cerrada o detener la pérdida capilar con Minoxidil al 5%:</p>
        </div>

        <div class="timeline-photo-box">
          <img src="/assets/images/antes.jpg" alt="Evolución y fases de crecimiento de barba con Minoxidil en cliente real" loading="lazy" width="1290" height="599">
          <div class="timeline-caption">
            Seguimiento de evolución real: fase inicial sin vello, activación folicular con vellus fino, aumento de densidad y consolidación a vello terminal grueso y maduro.
          </div>
        </div>

        <div class="timeline-stages-grid">
          <div class="timeline-stage-card">
            <span class="stage-time-tag">Fase 1 · Mes 1</span>
            <h3>Adaptación Cutánea</h3>
            <p>El folículo capilar se estimula y absorbe el principio activo. En cabello puede presentarse shedding leve (caída natural del pelo débil para iniciar nuevo ciclo).</p>
          </div>

          <div class="timeline-stage-card">
            <span class="stage-time-tag">Fase 2 · Meses 2 a 3</span>
            <h3>Brote de Vellus Fino</h3>
            <p>Aparecen los primeros pelitos delgados y claros en mejillas o zonas despobladas. Es una señal temprana de respuesta al tratamiento.</p>
          </div>

          <div class="timeline-stage-card">
            <span class="stage-time-tag">Fase 3 · Meses 4 a 6</span>
            <h3>Engrosamiento y Pigmento</h3>
            <p>El vello comienza a oscurecerse, engrosar y ganar textura. La barba toma forma definida y los huecos se van conectando de manera continua.</p>
          </div>

          <div class="timeline-stage-card">
            <span class="stage-time-tag">Fase 4 · Meses 6 a 12</span>
            <h3>Consolidación del Vello</h3>
            <p>En quienes responden, parte del vello puede engrosar y oscurecerse. Los resultados varían por genética y edad, y al suspender el tratamiento parte de lo ganado puede perderse.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Paquetes y Precios Destacados -->
    <section class="section section-pricing">
      <div class="container">
        <div class="section-header text-center">
          <span class="section-tag">PRECIOS TRANSPARENTES</span>
          <h2>Paquetes y Tratamientos Más Vendidos</h2>
          <p>Elige el tiempo de tratamiento adecuado según tu meta (barba o cabello). Precios en pesos mexicanos con entrega en CDMX o envío nacional:</p>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <div class="pricing-badge">Prueba Inicial</div>
            <h3>1 Mes de Minoxidil</h3>
            <div class="pricing-price">${mxn(price1)} <small>MXN</small></div>
            <p class="pricing-desc">1 Frasco Kirkland 5% Líquido (60 ml)</p>
            <ul class="pricing-features">
              <li>✓ Ideal para probar tolerancia en la piel</li>
              <li>✓ Duración para 30 días de aplicación diaria</li>
              <li>✓ Asesoría personalizada por WhatsApp</li>
              <li>✓ Entrega en CDMX o sucursal</li>
            </ul>
            <a class="btn btn-dark" href="${whatsappLink(data, "Quiero pedir el paquete de 1 Mes Minoxidil Kirkland (${mxn(price1)})")}">Pedir 1 Mes</a>
          </div>

          <div class="pricing-card">
            <div class="pricing-badge">Avance Notable</div>
            <h3>3 Meses de Minoxidil</h3>
            <div class="pricing-price">${mxn(price3)} <small>MXN</small></div>
            <p class="pricing-desc">3 Frascos Kirkland 5% Líquido (180 ml)</p>
            <ul class="pricing-features">
              <li>✓ Fase clave para brote de vello nuevo</li>
              <li>✓ Ahorro frente a compra individual</li>
              <li>✓ Incluye aplicador graduado</li>
              <li>✓ Entrega personal en CDMX</li>
            </ul>
            <a class="btn btn-dark" href="${whatsappLink(data, "Quiero pedir el paquete de 3 Meses Minoxidil Kirkland (${mxn(price3)})")}">Pedir 3 Meses</a>
          </div>

          <div class="pricing-card featured-pricing">
            <span class="badge-popular">⭐ MÁS VENDIDO · MEJOR PRECIO</span>
            <div class="pricing-badge">Caja Sellada Fábrica</div>
            <h3>6 Meses Caja Completa</h3>
            <div class="pricing-price">${mxn(price6)} <small>MXN</small></div>
            <p class="pricing-desc">Caja Sellada Kirkland con 6 Frascos + Gotero Original</p>
            <ul class="pricing-features">
              <li>✓ Caja sellada de fábrica con lote láser visible</li>
              <li>✓ Incluye gotero aplicador original Kirkland con seguro</li>
              <li>✓ Tiempo óptimo para maduración de barba</li>
              <li>✓ Costo mensual aprox. ${mxn(price6 / 6)}</li>
              <li>✓ Entrega inmediata en CDMX</li>
            </ul>
            <a class="btn btn-gold btn-large" href="${whatsappLink(data, "Quiero pedir la Caja de 6 Meses Minoxidil Kirkland (${mxn(price6)})")}">Pedir Caja 6 Meses</a>
          </div>

          <div class="pricing-card">
            <div class="pricing-badge">Tratamiento Anual</div>
            <h3>1 Año de Tratamiento</h3>
            <div class="pricing-price">${mxn(price12)} <small>MXN</small></div>
            <p class="pricing-desc">2 Cajas Selladas (12 Frascos) + 2 Goteros Originales</p>
            <ul class="pricing-features">
              <li>✓ Cubre un ciclo completo de seguimiento</li>
              <li>✓ Mejor precio por mes</li>
              <li>✓ Producto sellado con caducidad amplia</li>
              <li>✓ Envío gratis o entrega especial en CDMX</li>
            </ul>
            <a class="btn btn-dark" href="${whatsappLink(data, "Quiero pedir el paquete de 1 Año Minoxidil Kirkland (${mxn(price12)})")}">Pedir Tratamiento 1 Año</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Catálogo Rápido -->
    <section class="section section-products">
      <div class="container">
        <div class="section-header-row">
          <div>
            <span class="section-tag">CATÁLOGO EN EXISTENCIA</span>
            <h2>Productos Disponibles para Entrega Inmediata</h2>
          </div>
          <a class="btn btn-outline" href="/shop/">Ver toda la tienda →</a>
        </div>
        <div class="product-grid">
          ${featured.map((p) => productCard(p, data)).join("")}
        </div>
      </div>
    </section>

    <!-- Ubicación y Entregas en CDMX -->
    <section class="section section-location" id="sucursales">
      <div class="container">
        <div class="location-box">
          <div class="location-details">
            <span class="section-tag">VISÍTANOS EN TIENDA</span>
            <h2>Sucursal Plaza Guelatao en CDMX</h2>
            <p>Ven a conocer nuestra tienda física, revisa los productos en persona y llévate tu Minoxidil al instante con pago en efectivo o transferencia:</p>
            
            <div class="loc-item">
              <span class="loc-icon">🏬</span>
              <div>
                <strong>Dirección de la Tienda:</strong>
                <p>Plaza Guelatao, Local 76 (Pasillo 5).<br>Calz. Ignacio Zaragoza 406, Juan Escutia, Iztapalapa, 09100 Ciudad de México, CDMX.</p>
                <p><small>Ubicada a unos pasos de la estación del <strong>Metro Guelatao (Línea A)</strong>.</small></p>
              </div>
            </div>

            <div class="loc-item">
              <span class="loc-icon">🕒</span>
              <div>
                <strong>Horario de Atención:</strong>
                <p>Martes a Domingo: 12:00 PM a 5:00 PM.</p>
              </div>
            </div>

            <div class="loc-item">
              <span class="loc-icon">📦</span>
              <div>
                <strong>Entregas Personales y Envíos:</strong>
                <p>¿No puedes pasar a la plaza? Coordinamos entregas personales en estaciones del Metro acordadas en CDMX y Nezahualcóyotl, o envío express a cualquier código postal de México.</p>
              </div>
            </div>

            <div class="loc-actions">
              <a class="btn btn-primary" href="${whatsappLink(data, "Quiero visitar la sucursal de Plaza Guelatao o acordar una entrega personal en CDMX")}">
                💬 Coordinar Visita por WhatsApp
              </a>
              <a class="btn btn-secondary" href="https://www.google.com/maps/search/?api=1&query=Calzada+Ignacio+Zaragoza+406+Juan+Escutia+Iztapalapa" target="_blank" rel="noreferrer">
                Ver en Google Maps
              </a>
            </div>
          </div>

          <div class="location-map">
            <iframe 
              title="Ubicación Tienda Minoxidil en CDMX Plaza Guelatao"
              src="https://www.google.com/maps?q=Calzada%20Ignacio%20Zaragoza%20406%20Juan%20Escutia%20Iztapalapa%2009100%20Ciudad%20de%20Mexico&output=embed" 
              loading="lazy" 
              referrerpolicy="no-referrer-when-downgrade">
            </iframe>
          </div>
        </div>
      </div>
    </section>

    <!-- Guías y Asesoría -->
    <section class="section section-guides">
      <div class="container">
        <div class="section-header-row">
          <div>
            <span class="section-tag">GUÍAS Y CONSEJOS DE USO</span>
            <h2>Aprende a Usar Minoxidil Correctamente</h2>
          </div>
          <a class="btn btn-outline" href="/blog/">Ver todas las guías →</a>
        </div>
        <div class="guides-preview-grid">
          ${editorialGuides.slice(0, 3).map((guide) => `
            <article class="guide-preview-card">
              <a href="${guide.path}">
                <img src="${guide.image}" alt="${escapeHtml(guide.title)}" loading="lazy">
              </a>
              <div class="guide-preview-content">
                <span class="guide-badge">${escapeHtml(guide.topic)}</span>
                <h3><a href="${guide.path}">${escapeHtml(guide.title)}</a></h3>
                <p>${escapeHtml(guide.description)}</p>
                <a class="read-more" href="${guide.path}">Leer guía completa →</a>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="section section-faq">
      <div class="container faq-container">
        <div class="section-header text-center">
          <span class="section-tag">DUDAS HABITUALES</span>
          <h2>Preguntas Frecuentes sobre Minoxidil en CDMX</h2>
        </div>
        <div class="faq-list">
          <details class="faq-item">
            <summary>¿Puedo pasar a recoger hoy mismo a la sucursal de Plaza Guelatao?</summary>
            <p>Sí, abrimos de martes a domingo de 12:00 PM a 5:00 PM. Te sugerimos mandar un mensaje breve por WhatsApp antes de salir para apartar tu producto y confirmar existencia inmediata.</p>
          </details>
          <details class="faq-item">
            <summary>¿Cómo sé que el Minoxidil Kirkland que venden es 100% original?</summary>
            <p>Todos nuestros lotes son importados directamente y cuentan con fecha de caducidad amplia estampada con láser tanto en la caja como en cada frasco. Puedes revisar físicamente los sellos y el gotero graduado original antes de realizar tu pago.</p>
          </details>
          <details class="faq-item">
            <summary>¿Hacen entregas en estaciones del Metro en CDMX?</summary>
            <p>Sí, coordinamos entregas personales en puntos acordados de la red del Metro de la Ciudad de México y zonas intermedias de Nezahualcóyotl. Escríbenos para agendar hora y estación.</p>
          </details>
          <details class="faq-item">
            <summary>¿Cuáles son las formas de pago disponibles?</summary>
            <p>En sucursal física aceptamos efectivo y transferencia bancaria inmediata. Para entregas personales y envíos nacionales puedes pagar por transferencia bancaria (BBVA, Banamex, etc.) o depósito en OXXO.</p>
          </details>
          <details class="faq-item">
            <summary>¿En cuánto tiempo se ven los primeros resultados en barba o cabello?</summary>
            <p>Por lo general, los primeros vellos delgados (vellus) comienzan a observarse entre el segundo y tercer mes de uso diario constante (1 ml dos veces al día). Los cambios más claros suelen evaluarse entre los 6 y 12 meses de uso constante; los resultados varían por persona y no están garantizados.</p>
          </details>
        </div>
      </div>
    </section>

    <!-- Banner Final CTA -->
    <section class="final-cta-section">
      <div class="container final-cta-box">
        <h2>¿Listo para comenzar tu tratamiento con Minoxidil Original?</h2>
        <p>Escríbenos por WhatsApp. Te asesoramos sin compromiso sobre qué producto te conviene, disponibilidad en tienda y formas de entrega.</p>
        <a class="btn btn-gold btn-large" href="${whatsappLink(data, "Hola, quiero comenzar mi tratamiento y comprar Minoxidil Kirkland en CDMX")}">
          💬 Iniciar Conversación por WhatsApp
        </a>
      </div>
    </section>
  `;

  return layout(data, {
    title: "Minoxidil en CDMX | Kirkland Original, Sucursal Plaza Guelatao y Entregas",
    path: "/",
    description: "Venta de Minoxidil Kirkland 100% Original en Ciudad de México. Tienda física en Plaza Guelatao Local 76, entregas personales en Metro CDMX y envíos express a todo México. Asesoría por WhatsApp.",
    image: heroImg,
    bodyClass: "home-page",
    body: themedHome(data, { whatsappLink, escapeHtml, productImage, productPrice, mxn })
  });
}

function shopPage(data) {
  const body = `
    <section class="page-title-banner">
      <div class="container">
        <span class="eyebrow-tag">CATÁLOGO DE PRODUCTOS</span>
        <h1>Tienda de Minoxidil, Barba y Cuidado Capilar</h1>
        <p>Productos 100% originales disponibles para entrega inmediata en CDMX y envíos express a todo México.</p>
      </div>
    </section>
    <section class="section shop-section">
      <div class="container shop-layout">
        <aside class="shop-sidebar">
          <div class="sidebar-box">
            <h3>Categorías</h3>
            <div class="cat-pill-list">
              <a class="cat-pill active" href="/shop/">Todos los productos <span class="cat-count">(${data.products.length})</span></a>
              ${categoryLinks(data)}
            </div>
          </div>
          <div class="sidebar-help">
            <h4>¿No sabes qué elegir?</h4>
            <p>Te asesoramos directamente por WhatsApp sobre el kit ideal para tu caso.</p>
            <a class="btn btn-primary btn-full" href="${whatsappLink(data, "Hola, necesito asesoría para elegir un producto de minoxidil")}">
              Pedir Asesoría
            </a>
          </div>
        </aside>
        <div class="shop-main">
          <div class="shop-toolbar">
            <span class="count-badge">${data.products.length} productos disponibles</span>
            <input id="search" type="search" class="search-input" placeholder="Buscar producto (Kirkland, biotina, espuma...)" aria-label="Buscar productos">
          </div>
          <div class="product-grid searchable">
            ${data.products.map((product) => productCard(product, data)).join("")}
          </div>
        </div>
      </div>
    </section>`;

  return layout(data, {
    title: "Tienda de Minoxidil y Cuidado Capilar | Precios en CDMX",
    path: "/shop/",
    description: "Catálogo de Minoxidil Kirkland líquido y espuma, biotina, dermaroller y kits para barba y cabello con entrega en CDMX y envíos a México.",
    schema: [
      itemListSchema("Catálogo de productos Minoxidil en CDMX", "/shop/", data.products),
      breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: "Tienda", path: "/shop/" }])
    ],
    body
  });
}

const INDEXABLE_CATEGORY_SLUGS = new Set([
  "minoxidil",
  "minoxidil-kirkland",
  "crecimiento-de-barba",
  "barba-y-bigote",
  "cabello",
  "anticaida-y-recuperar-cabello",
  "maximus"
]);

function categoryPage(category, data) {
  const indexable = INDEXABLE_CATEGORY_SLUGS.has(category.slug);
  const products = data.products.filter((product) => product.categories.some((item) => item.slug === category.slug));

  const body = `
    <section class="page-title-banner">
      <div class="container">
        <span class="eyebrow-tag">CATEGORÍA</span>
        <h1>${escapeHtml(category.name)}</h1>
        <p>Explora nuestras opciones disponibles de ${escapeHtml(category.name.toLowerCase())} con entrega inmediata en CDMX y envíos a todo México.</p>
      </div>
    </section>
    <section class="section shop-section">
      <div class="container shop-layout">
        <aside class="shop-sidebar">
          <div class="sidebar-box">
            <h3>Categorías</h3>
            <div class="cat-pill-list">
              <a class="cat-pill" href="/shop/">Todos los productos</a>
              ${categoryLinks(data, category.slug)}
            </div>
          </div>
        </aside>
        <div class="shop-main">
          <div class="product-grid">
            ${products.map((product) => productCard(product, data)).join("")}
          </div>
        </div>
      </div>
    </section>`;

  return layout(data, {
    title: `${category.name} | Minoxidil en CDMX`,
    path: category.path,
    robots: indexable ? "index, follow, max-image-preview:large" : "noindex, follow",
    description: `Productos de ${category.name} disponibles en CDMX con entrega en sucursal Plaza Guelatao o envío a todo México.`,
    schema: [
      itemListSchema(`Productos de ${category.name}`, category.path, products),
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Tienda", path: "/shop/" },
        { name: category.name, path: category.path }
      ])
    ],
    body
  });
}

function productPage(product, data) {
  const image = productImage(product, data);
  const isKirkland = /kirkland/i.test(product.name);
  const related = data.products
    .filter((p) => p.id !== product.id && p.categories.some((c) => product.categories.some((own) => own.slug === c.slug)))
    .slice(0, 4);

  const cleanDescription = cleanHtml(product.description || product.excerpt || "");

  const body = `
    <section class="section product-detail-section">
      <div class="container product-detail-grid">
        <div class="product-gallery">
          <div class="main-image-wrap">
            <img src="${image}" alt="${escapeHtml(product.name)}" class="product-main-img">
          </div>
        </div>
        <div class="product-summary-col">
          <div class="breadcrumb-trail">
            <a href="/">Inicio</a> / <a href="/shop/">Tienda</a> / <span>${escapeHtml(product.categories[0]?.name || "Producto")}</span>
          </div>
          <span class="badge ${isKirkland ? "badge-kirkland" : "badge-neutral"}">${isKirkland ? "Kirkland Signature 100% Original" : "Producto Disponible"}</span>
          <h1 class="detail-title">${escapeHtml(product.name)}</h1>
          <div class="detail-price-box">
            <span class="detail-price">${escapeHtml(product.price || product.priceHtml || "Consultar precio")}</span>
            <span class="stock-status">✓ En existencia para entrega hoy en CDMX</span>
          </div>
          <div class="detail-highlights">
            <p>${escapeHtml(product.excerpt || "")}</p>
          </div>
          <div class="detail-ctas">
            <a class="btn btn-primary btn-large btn-full" href="${whatsappLink(data, product.name)}">
              💬 Pedir por WhatsApp: 55 6938 0408
            </a>
            <div class="secure-buy-info">
              <span>🛡️ Producto garantizado con lote visible</span>
              <span>📍 Recoge en Plaza Guelatao Local 76</span>
              <span>🚚 Envíos rápidos a todo México</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section product-desc-section">
      <div class="container article-body-wrap">
        <h2>Detalles e Información del Producto</h2>
        <div class="article-prose">
          ${cleanDescription}
        </div>

        <div class="local-cdmx-callout">
          <div class="cdmx-badge">📍 Tienda Física en CDMX</div>
          <h3>¿Cómo comprar este producto en Ciudad de México?</h3>
          <p>
            Puedes pasar directamente a nuestra sucursal ubicada en <strong>Plaza Guelatao Local 76 (Pasillo 5, Iztapalapa, Metro Guelatao Línea A)</strong> en un horario de martes a domingo de 12:00 PM a 5:00 PM, o acordar entrega personal en puntos de CDMX.
          </p>
          <a class="btn btn-primary" href="${whatsappLink(data, product.name)}">
            Confirmar existencia y entrega por WhatsApp
          </a>
        </div>
      </div>
    </section>

    ${related.length ? `
      <section class="section section-related">
        <div class="container">
          <div class="section-header">
            <h2>Productos Relacionados</h2>
          </div>
          <div class="product-grid">
            ${related.map((p) => productCard(p, data)).join("")}
          </div>
        </div>
      </section>
    ` : ""}
  `;

  return layout(data, {
    title: product.name,
    seoTitle: `${product.name.replace(/\s*\|.*$/, "")} | Minoxidil en CDMX`,
    path: product.path,
    description: stripTags(product.excerpt || product.description).slice(0, 160),
    image,
    type: "product",
    robots: "index, follow, max-image-preview:large",
    schema: [
      productSchema(product, data),
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Tienda", path: "/shop/" },
        { name: product.name, path: product.path }
      ])
    ],
    body
  });
}

function blogPage(data) {
  const body = `
    <section class="page-title-banner">
      <div class="container">
        <span class="eyebrow-tag">CENTRO EDITORIAL Y ASESORÍA</span>
        <h1>Guías de Minoxidil, Barba y Cuidado Capilar</h1>
        <p>Aprende a usar Minoxidil con bases reales, expectativas honestas y protocolos seguros para barba y cabello en Ciudad de México.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-header text-center">
          <span class="section-tag">INFORMACIÓN RESPONSABLE</span>
          <h2>Guías Fundamentales y Consejos Prácticos</h2>
          <p>Hemos consolidado más de una década de experiencia atendiendo a clientes en CDMX en 10 guías esenciales para resolver tus dudas antes, durante y después de tu tratamiento:</p>
        </div>

        <div class="guides-main-grid">
          ${editorialGuides.map((guide) => `
            <article class="guide-card-full">
              <a class="guide-card-img" href="${guide.path}">
                <img src="${guide.image}" alt="${escapeHtml(guide.title)}" loading="lazy">
                <span class="guide-card-topic">${escapeHtml(guide.topic)}</span>
              </a>
              <div class="guide-card-body">
                <span class="guide-read-time">⏱️ 5 min de lectura · Guía Verificada</span>
                <h3 class="guide-card-title">
                  <a href="${guide.path}">${escapeHtml(guide.title)}</a>
                </h3>
                <p class="guide-card-desc">${escapeHtml(guide.description)}</p>
                <div class="guide-card-footer">
                  <a class="btn btn-outline btn-sm" href="${guide.path}">Leer Guía Completa →</a>
                  <a class="guide-wa-link" href="${whatsappLink(data, guide.title)}">💬 Preguntar por WhatsApp</a>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    </section>

    <section class="section section-help-banner">
      <div class="container">
        <div class="final-cta-box">
          <h2>¿Tienes una duda específica sobre tu caso?</h2>
          <p>Escríbenos por WhatsApp con una foto o descripción de tu zona a tratar (barba o entradas). Te orientamos sobre qué producto te conviene y cómo aplicarlo sin compromiso.</p>
          <a class="btn btn-gold btn-large" href="${whatsappLink(data, "Hola, tengo dudas sobre mi caso para usar Minoxidil")}">
            💬 Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  `;

  return layout(data, {
    title: "Guías y Consejos de Minoxidil en CDMX | Barba y Cabello",
    path: "/blog/",
    description: "Guías autorizadas y consejos prácticos sobre Minoxidil en CDMX: aplicación en barba y cabello, cómo identificar producto original, shedding y tiempos reales.",
    robots: "index, follow, max-image-preview:large",
    schema: [
      itemListSchema("Guías de Minoxidil en CDMX", "/blog/", editorialGuides),
      breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: "Blog", path: "/blog/" }])
    ],
    body
  });
}

function articlePage(post, data) {
  const isBeard = /barba|bigote|candado|mejillas/i.test(`${post.slug} ${post.title}`);
  const tagText = isBeard ? "Crecimiento de Barba" : "Cuidado Capilar";

  const relatedProducts = data.products
    .filter((p) => isBeard ? /barba|kirkland/i.test(p.name) : /cabello|shampoo|biotina/i.test(p.name))
    .slice(0, 3);

  const body = `
    <article class="article-page-wrap">
      <header class="article-header">
        <div class="container article-header-inner">
          <div class="breadcrumb-trail">
            <a href="/">Inicio</a> / <a href="/blog/">Blog</a> / <span>${escapeHtml(post.title)}</span>
          </div>
          <span class="article-cat-badge">${tagText}</span>
          <h1 class="article-title">${escapeHtml(post.title)}</h1>
          <div class="article-meta-row">
            <span>📅 Publicado: ${formatDate(post.date)}</span>
            <span>⏱️ Lectura: 4 minutos</span>
            <span>📍 Asesoría en CDMX</span>
          </div>
        </div>
      </header>

      <div class="container article-layout">
        <div class="article-main-content">
          <div class="article-prose">
            ${cleanHtml(post.content)}
          </div>

          <div class="article-share-wa">
            <strong>¿Tienes dudas sobre tu caso de barba o cabello?</strong>
            <p>Escríbenos directamente y te asesoramos sobre el producto adecuado y las opciones de entrega hoy en CDMX.</p>
            <a class="btn btn-primary btn-large" href="${whatsappLink(data, `Hola, leí el artículo sobre "${post.title}" y quiero orientación para comprar en CDMX`)}">
              💬 Enviar Consulta por WhatsApp
            </a>
          </div>
        </div>

        <aside class="article-sidebar">
          <div class="sidebar-box sticky-sidebar">
            <h3>Comprar Minoxidil en CDMX</h3>
            <p>Producto 100% Kirkland Original con entrega en sucursal o envío a domicilio.</p>
            
            <div class="sidebar-products-list">
              ${relatedProducts.map((prod) => `
                <a class="sidebar-prod-item" href="${prod.path}">
                  <img src="${productImage(prod, data)}" alt="${escapeHtml(prod.name)}" loading="lazy">
                  <div>
                    <strong>${escapeHtml(prod.name.replace(/\s*\|.*$/, ""))}</strong>
                    <span class="sidebar-prod-price">${escapeHtml(prod.price || "Ver precio")}</span>
                  </div>
                </a>
              `).join("")}
            </div>

            <a class="btn btn-gold btn-full" href="${whatsappLink(data, `Hola, vi el artículo sobre "${post.title}" y quiero comprar en CDMX`)}">
              Pedir por WhatsApp
            </a>

            <div class="sidebar-loc-reminder">
              <small>📍 <strong>Sucursal:</strong> Plaza Guelatao Local 76 (Metro Guelatao, CDMX).</small>
            </div>
          </div>
        </aside>
      </div>
    </article>
  `;

  return layout(data, {
    title: post.title,
    seoTitle: `${post.title} | Minoxidil en CDMX`,
    path: post.path,
    description: metaText(post.excerpt, 155),
    image: post.image,
    type: "article",
    robots: "index, follow, max-image-preview:large",
    schema: [
      articleSchema(post, data),
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Blog", path: "/blog/" },
        { name: post.title, path: post.path }
      ])
    ],
    body
  });
}

function guidePage(guide, data) {
  const sources = editorialSources[guide.topic] || [];

  const body = `
    <article class="article-page-wrap guide-page-wrap">
      <header class="article-header">
        <div class="container article-header-inner">
          <div class="breadcrumb-trail">
            <a href="/">Inicio</a> / <a href="/blog/">Blog</a> / <span>Guía</span>
          </div>
          <span class="article-cat-badge">Guía Médica y Responsable</span>
          <h1 class="article-title">${escapeHtml(guide.title)}</h1>
          <p class="guide-summary-lead">${escapeHtml(guide.summary)}</p>
        </div>
      </header>

      <div class="container article-layout">
        <div class="article-main-content">
          ${guide.image ? `
            <figure class="article-featured-image">
              <img src="${guide.image}" alt="${escapeHtml(guide.title)}" loading="lazy">
            </figure>
          ` : ""}

          <div class="article-prose">
            ${guide.sections.map(([title, text]) => `
              <section>
                <h2>${escapeHtml(title)}</h2>
                <p>${escapeHtml(text)}</p>
              </section>
            `).join("")}

            ${guide.faqs?.length ? `
              <div class="guide-faqs-wrap">
                <h2>Preguntas Frecuentes sobre este tema</h2>
                ${guide.faqs.map(([q, a]) => `
                  <details class="faq-item">
                    <summary>${escapeHtml(q)}</summary>
                    <p>${escapeHtml(a)}</p>
                  </details>
                `).join("")}
              </div>
            ` : ""}

            <div class="local-cdmx-callout">
              <div class="cdmx-badge">📍 Tienda Física en CDMX</div>
              <h3>Adquiere Minoxidil Kirkland Original en Ciudad de México</h3>
              <p>Visita nuestra tienda en Plaza Guelatao Local 76 (Metro Guelatao) o pide entrega personal en CDMX. Confirmamos lotes y caducidad por WhatsApp.</p>
              <a class="btn btn-primary" href="${whatsappLink(data, `Hola, leí la guía sobre "${guide.title}" y quiero informes en CDMX`)}">
                Consultar por WhatsApp
              </a>
            </div>

            ${sources.length ? `
              <div class="guide-sources-box">
                <h4>Fuentes Oficiales y Referencias Médicas</h4>
                <ul>
                  ${sources.map(([name, url]) => `
                    <li><a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)} ↗</a></li>
                  `).join("")}
                </ul>
              </div>
            ` : ""}
          </div>
        </div>

        <aside class="article-sidebar">
          <div class="sidebar-box sticky-sidebar">
            <h3>Comprar en CDMX</h3>
            <p>Minoxidil Kirkland original con entrega en sucursal o envío nacional.</p>
            <a class="btn btn-primary btn-full" href="${whatsappLink(data, `Hola, leí la guía de ${guide.title} y quiero comprar`)}">
              Comprar por WhatsApp
            </a>
            <div class="sidebar-loc-reminder">
              <small>📍 Plaza Guelatao Local 76, CDMX.</small>
            </div>
          </div>
        </aside>
      </div>
    </article>
  `;

  return layout(data, {
    title: guide.title,
    path: guide.path,
    description: guide.description,
    image: guide.image,
    type: "article",
    robots: "index, follow, max-image-preview:large",
    schema: [
      articleSchema(guide, data),
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Blog", path: "/blog/" },
        { name: guide.title, path: guide.path }
      ])
    ],
    body
  });
}

function locationsPage(data) {
  const body = `
    <section class="page-title-banner">
      <div class="container">
        <span class="eyebrow-tag">UBICACIONES Y PUNTOS DE ENTREGA</span>
        <h1>Sucursales y Entregas Personales en CDMX</h1>
        <p>Compra Minoxidil Kirkland original directamente en tienda física o agenda una entrega personal acordada en Ciudad de México.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="location-box">
          <div class="location-details">
            <span class="section-tag">TIENDA PRINCIPAL</span>
            <h2>Plaza Guelatao Local 76</h2>
            <p>Nuestra sucursal física está establecida para que puedas revisar tus productos con total tranquilidad antes de pagar:</p>
            
            <div class="loc-item">
              <span class="loc-icon">📍</span>
              <div>
                <strong>Dirección Completa:</strong>
                <p>Plaza Guelatao, Local 76 (Pasillo 5).<br>Calzada Ignacio Zaragoza 406, Colonia Juan Escutia, Alcaldía Iztapalapa, C.P. 09100, Ciudad de México.</p>
              </div>
            </div>

            <div class="loc-item">
              <span class="loc-icon">🚇</span>
              <div>
                <strong>Cómo llegar en transporte público:</strong>
                <p>La plaza se ubica a unos pasos de la estación del <strong>Metro Guelatao (Línea A)</strong>, con acceso directo sobre Calzada Ignacio Zaragoza.</p>
              </div>
            </div>

            <div class="loc-item">
              <span class="loc-icon">🕒</span>
              <div>
                <strong>Horario de Atención:</strong>
                <p>Martes a Domingo: 12:00 PM a 5:00 PM.</p>
              </div>
            </div>

            <div class="loc-item">
              <span class="loc-icon">📦</span>
              <div>
                <strong>Entregas Acordadas en Metro CDMX:</strong>
                <p>Para mayor comodidad, coordinamos entregas personales en estaciones del metro en CDMX y puntos de Ciudad Nezahualcóyotl.</p>
              </div>
            </div>

            <div class="loc-actions">
              <a class="btn btn-primary" href="${whatsappLink(data, "Hola, quiero informes para visitar la sucursal de Plaza Guelatao o agendar entrega en CDMX")}">
                💬 Coordinar Entrega por WhatsApp
              </a>
            </div>
          </div>

          <div class="location-map">
            <iframe 
              title="Ubicación Plaza Guelatao Local 76 Minoxidil en CDMX"
              src="https://www.google.com/maps?q=Calzada%20Ignacio%20Zaragoza%20406%20Juan%20Escutia%20Iztapalapa%2009100%20Ciudad%20de%20Mexico&output=embed" 
              loading="lazy" 
              referrerpolicy="no-referrer-when-downgrade">
            </iframe>
          </div>
        </div>
      </div>
    </section>
  `;

  return layout(data, {
    title: "Sucursales y Entregas Personales en CDMX | Minoxidil",
    path: "/sucursales-y-entregas/",
    description: "Sucursal en Plaza Guelatao Local 76 (Iztapalapa, Metro Guelatao) y puntos de entrega acordados en CDMX. Venta de Minoxidil Kirkland original.",
    robots: "index, follow, max-image-preview:large",
    schema: breadcrumbSchema([
      { name: "Inicio", path: "/" },
      { name: "Sucursales y Entregas", path: "/sucursales-y-entregas/" }
    ]),
    body
  });
}

function contactPage(data, route = "/contact/") {
  const body = `
    <section class="page-title-banner">
      <div class="container">
        <span class="eyebrow-tag">ATENCIÓN AL CLIENTE</span>
        <h1>Contacto y Asesoría Directa en CDMX</h1>
        <p>Resolvemos todas tus preguntas sobre Minoxidil Kirkland, lotes, existencias y entregas.</p>
      </div>
    </section>

    <section class="section">
      <div class="container contact-grid">
        <div class="contact-card">
          <span class="contact-icon">💬</span>
          <h3>WhatsApp Directo</h3>
          <p>La forma más rápida de consultar precios, existencias y coordinar entregas inmediatas:</p>
          <a class="contact-link" href="${whatsappLink(data)}">55 6938 0408</a>
          <p class="contact-time">Respondemos en minutos (Mar a Dom 12pm – 5pm)</p>
        </div>

        <div class="contact-card">
          <span class="contact-icon">🏬</span>
          <h3>Tienda Física en CDMX</h3>
          <p>Plaza Guelatao Local 76, Pasillo 5.<br>Calz. Ignacio Zaragoza 406, Iztapalapa, CDMX.<br>A pasos de Metro Guelatao.</p>
          <a class="contact-link" href="/sucursales-y-entregas/">Ver cómo llegar →</a>
        </div>

        <div class="contact-card">
          <span class="contact-icon">✉️</span>
          <h3>Correo Electrónico</h3>
          <p>Para dudas sobre compras, mayoreo o facturación:</p>
          <a class="contact-link" href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>
        </div>
      </div>
    </section>
  `;

  return layout(data, {
    title: "Contacto y Sucursal en CDMX | Minoxidil en CDMX",
    path: route,
    description: "Contacto por WhatsApp al 55 6938 0408 y sucursal en Plaza Guelatao Local 76, Iztapalapa, CDMX.",
    robots: "index, follow",
    body
  });
}

const trustPages = {
  "/quienes-somos/": {
    title: "Quiénes Somos | Minoxidil en CDMX",
    description: "Conoce nuestra historia con más de 10 años asesorando en cuidado capilar y barba en Ciudad de México.",
    eyebrow: "MÁS DE 10 AÑOS DE TRAYECTORIA",
    lead: "Somos una tienda especializada en tratamientos para el crecimiento de barba y la detención de la caída capilar, con tienda física en Plaza Guelatao (Iztapalapa, CDMX).",
    sections: [
      ["Nuestra Misión", "Brindar a nuestros clientes acceso a productos 100% originales de marcas líderes como Kirkland Signature, con asesoría honesta, transparente y sin promesas milagro."],
      ["Por Qué Elegirnos", "En el mercado de minoxidil existen demasiadas falsificaciones. En nuestra tienda te mostramos los números de lote y la fecha de caducidad antes de que pagues. Nuestra reputación de más de una década respalda cada frasco que vendemos."],
      ["Dónde Estamos", "Nos encontramos dentro de Plaza Guelatao (Local 76, Pasillo 5) sobre Calzada Ignacio Zaragoza, a unos pasos de la estación del Metro Guelatao."]
    ]
  },
  "/envios-a-todo-mexico/": {
    title: "Envíos a Todo México | Minoxidil en CDMX",
    description: "Información sobre nuestros envíos express en 24 a 48 horas a cualquier parte de la República Mexicana.",
    eyebrow: "COBERTURA NACIONAL",
    lead: "Si estás fuera de la Ciudad de México, enviamos tu tratamiento de forma segura a cualquier código postal del país.",
    sections: [
      ["Paqueterías Utilizadas", "Trabajamos con las paqueterías más confiables: DHL, FedEx y Estafeta. Al documentar tu paquete te enviamos de inmediato tu número de guía rastreable."],
      ["Tiempos de Entrega", "Los envíos express toman habitualmente de 24 a 48 horas hábiles en llegar a ciudades principales. Para zonas extendidas puede tomar de 3 a 5 días."],
      ["Empaque Protegido", "Tu producto va debidamente protegido y embalado de forma discreta para asegurar que llegue en perfectas condiciones."]
    ]
  },
  "/devoluciones-y-reembolsos/": {
    title: "Devoluciones y Reembolsos | Minoxidil en CDMX",
    description: "Conoce nuestras políticas transparentes de garantía, reemplazo y devoluciones en Minoxidil en CDMX. Producto original y respaldo garantizado.",
    eyebrow: "GARANTÍA DE COMPRA",
    lead: "Tu tranquilidad es lo más importante para nosotros.",
    sections: [
      ["Garantía de Originalidad", "Garantizamos al 100% que todo el Minoxidil Kirkland que vendemos es original de importación de Costco USA, sellado y con lote verificable."],
      ["Condiciones para Reportes", "Si tu paquete llega con algún daño atribuible a la paquetería o recibiste una presentación distinta a la solicitada, contáctanos dentro de las 48 horas posteriores a la entrega con fotos de la guía y el producto para coordinar su reposición inmediata."]
    ]
  },
  "/politicas-de-privacidad/": {
    title: "Aviso de Privacidad | Minoxidil en CDMX",
    description: "Aviso de privacidad de Minoxidil en CDMX: conoce cómo protegemos tus datos personales y cuidamos la confidencialidad de tus pedidos y envíos.",
    eyebrow: "PROTECCIÓN DE DATOS",
    lead: "Cuidamos la confidencialidad de tu información personal.",
    sections: [
      ["Uso de la Información", "Los datos que nos proporcionas por WhatsApp o correo (nombre, dirección de entrega y teléfono) se utilizan exclusivamente para procesar y entregar tu pedido. No vendemos ni compartimos tus datos con terceros ajenos a la entrega."]
    ]
  },
  "/terminos-y-condiciones/": {
    title: "Términos y Condiciones | Minoxidil en CDMX",
    description: "Términos y condiciones comerciales de Minoxidil en CDMX: lineamientos de compra, entrega local en sucursal, envíos nacionales y uso responsable.",
    eyebrow: "CONDICIONES DE VENTA",
    lead: "Lineamientos de compra y asesoría en Minoxidil en CDMX.",
    sections: [
      ["Naturaleza del Servicio", "El sitio funciona como catálogo informativo y comercial. Las compras y pagos se confirman de común acuerdo por WhatsApp o en mostrador."],
      ["Descargo de Responsabilidad Médica", "El contenido publicado tiene fines informativos y cosméticos. El minoxidil es un producto tópico; no sustituye la consulta con un médico dermatólogo."]
    ]
  }
};

function trustPage(route, data) {
  const page = trustPages[route];
  const body = `
    <section class="page-title-banner">
      <div class="container">
        <span class="eyebrow-tag">${escapeHtml(page.eyebrow)}</span>
        <h1>${escapeHtml(page.title)}</h1>
        <p>${escapeHtml(page.lead)}</p>
      </div>
    </section>
    <section class="section">
      <div class="container article-body-wrap">
        <div class="article-prose">
          ${page.sections.map(([title, text]) => `
            <section>
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(text)}</p>
            </section>
          `).join("")}
        </div>
      </div>
    </section>
  `;

  return layout(data, {
    title: page.title,
    path: route,
    description: page.description,
    robots: "index, follow",
    body
  });
}

function notFoundPage(data, index) {
  const body = `
    <section class="section not-found-section">
      <div class="container not-found-container">
        <div class="not-found-code">404</div>
        <h1>Página No Encontrada</h1>
        <p>La página que buscas ha cambiado de dirección o no existe. Te invitamos a explorar nuestras secciones principales:</p>
        <div class="hero-ctas">
          <a class="btn btn-primary" href="/">Ir a la Página Principal</a>
          <a class="btn btn-secondary" href="/shop/">Ver Catálogo de Productos</a>
          <a class="btn btn-secondary" href="/blog/">Ver Blog y Guías</a>
        </div>
      </div>
    </section>
  `;

  return layout(data, {
    title: "Página No Encontrada | Minoxidil en CDMX",
    path: "/404.html",
    description: "La página solicitada no fue encontrada.",
    robots: "noindex, follow",
    body
  });
}

// ----------------------------------------------------
// Modern Unified Stylesheet
// ----------------------------------------------------

const css = `
:root {
  --brand: #B45309;
  --brand-hover: #92400E;
  --brand-light: #FEF3C7;
  --brand-light-border: #FDE68A;
  --dark-slate: #1C1917;
  --dark-surface: #292524;
  --dark-card: #0F172A;
  --bg-page: #FAF9F6;
  --bg-card: #FFFFFF;
  --bg-subtle: #F5F3EF;
  --text-main: #1C1917;
  --text-secondary: #44403C;
  --text-muted: #78716C;
  --border: #E7E5E4;
  --border-subtle: #F0EEEB;
  --wa-green: #25D366;
  --wa-green-hover: #1EBE5D;
  --wa-green-dark: #128C7E;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 3px rgba(28,25,23,0.04);
  --shadow-md: 0 4px 16px rgba(28,25,23,0.06);
  --shadow-lg: 0 12px 32px rgba(28,25,23,0.1);
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font-sans);
  color: var(--text-main);
  background: var(--bg-page);
  line-height: 1.6;
  font-size: 16px;
  overflow-x: clip;
}
img { max-width: 100%; height: auto; display: block; }
a { color: inherit; text-decoration: none; }

.container {
  width: min(1200px, calc(100% - 2rem));
  margin-left: auto;
  margin-right: auto;
}

/* Accessibility: Hidden Skip Link */
.skip-link {
  position: absolute;
  top: -9999px;
  left: -9999px;
  background: var(--brand);
  color: #FFFFFF;
  padding: 0.65rem 1.25rem;
  z-index: 10000;
  font-weight: 700;
  text-decoration: none;
  border-radius: 0 0 6px 6px;
  box-shadow: var(--shadow-md);
}
.skip-link:focus {
  top: 0;
  left: 1rem;
}

/* Top Announcement Bar */
.top-announcement {
  background: var(--dark-slate);
  color: #F5F5F4;
  font-size: 0.85rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.top-announcement-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
@media (max-width: 768px) {
  .top-announcement { display: none; }
}

/* Header & Nav */
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #FFFFFF;
  border-bottom: 1px solid var(--border);
  box-shadow: 0 2px 10px rgba(28,25,23,0.03);
}
.nav-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  gap: 1rem;
}
.brand {
  display: flex;
  align-items: center;
}
.brand-logo-img {
  height: 44px;
  width: auto;
  max-width: 220px;
  object-fit: contain;
  display: block;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 1.4rem;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-secondary);
}
.nav-menu a {
  transition: color 0.15s ease;
}
.nav-menu a:hover {
  color: var(--brand);
}
.nav-btn {
  background: var(--wa-green) !important;
  color: #FFFFFF !important;
  padding: 0.6rem 1.1rem;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease !important;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(37,211,102,0.3);
}
.nav-btn:hover {
  background: var(--wa-green-hover) !important;
}

.menu-toggle {
  display: none;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.5rem;
  cursor: pointer;
}
.menu-icon {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--dark-slate);
  position: relative;
}
.menu-icon::before, .menu-icon::after {
  content: "";
  position: absolute;
  width: 22px;
  height: 2px;
  background: var(--dark-slate);
  left: 0;
}
.menu-icon::before { top: -6px; }
.menu-icon::after { top: 6px; }

@media (max-width: 900px) {
  .menu-toggle { display: block; }
  .nav-menu {
    display: none;
    position: absolute;
    top: 72px;
    left: 0;
    right: 0;
    background: #FFFFFF;
    flex-direction: column;
    align-items: flex-start;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
  }
  .nav-menu.open { display: flex; }
  .nav-btn { width: 100%; text-align: center; margin-top: 0.5rem; }
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.4rem;
  border-radius: var(--radius-sm);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  text-align: center;
  line-height: 1.3;
}
.btn-primary {
  background: var(--wa-green);
  color: #FFFFFF;
}
.btn-primary:hover {
  background: var(--wa-green-hover);
  color: #FFFFFF;
}
.btn-secondary {
  background: #FFFFFF;
  color: var(--dark-slate);
  border-color: var(--border);
}
.btn-secondary:hover {
  background: #F5F5F4;
  border-color: #D6D3D1;
  color: var(--dark-slate);
}
.btn-dark {
  background: var(--dark-slate);
  color: #FFFFFF;
}
.btn-dark:hover {
  background: var(--dark-surface);
  color: #FFFFFF;
}
.btn-gold {
  background: var(--brand);
  color: #FFFFFF;
}
.btn-gold:hover {
  background: var(--brand-hover);
  color: #FFFFFF;
}
.btn-outline {
  border-color: var(--border);
  background: transparent;
  color: var(--dark-slate);
}
.btn-outline:hover {
  border-color: var(--brand);
  color: var(--brand);
}
.btn-large {
  padding: 0.95rem 1.8rem;
  font-size: 1.05rem;
}
.btn-full { width: 100%; }
.btn-sm {
  padding: 0.5rem 0.9rem;
  font-size: 0.85rem;
}

/* Split Hero Section */
.hero-section {
  background: linear-gradient(180deg, #FAF9F6 0%, #F5F3EF 100%);
  border-bottom: 1px solid var(--border);
  padding: 3.5rem 0 4.5rem;
}
.hero-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 3.5rem;
  align-items: center;
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--brand-light);
  color: var(--brand-hover);
  border: 1px solid var(--brand-light-border);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-full);
  margin-bottom: 1.25rem;
}
.hero-headline {
  font-size: clamp(2.1rem, 4.5vw, 3.1rem);
  line-height: 1.15;
  font-weight: 900;
  color: var(--dark-slate);
  letter-spacing: -0.025em;
  margin: 0 0 1.25rem;
  text-wrap: balance;
}
.hero-subtitle {
  font-size: 1.12rem;
  line-height: 1.65;
  color: var(--text-secondary);
  margin: 0 0 2rem;
}
.hero-ctas {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}
.hero-trust-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.92rem;
  color: var(--text-secondary);
  font-weight: 600;
}
.hero-trust-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.hero-trust-check {
  color: #059669;
  font-weight: 900;
}

.hero-card-frame {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  position: relative;
}
.hero-card-img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
}
.hero-card-content {
  padding: 1.5rem;
}
.hero-card-badge {
  display: inline-block;
  background: #DCFCE7;
  color: #166534;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}
.hero-card-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--dark-slate);
  margin: 0 0 0.4rem;
}
.hero-card-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 1rem;
  line-height: 1.5;
}
.hero-card-link {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--brand);
}

@media (max-width: 900px) {
  .hero-grid { grid-template-columns: 1fr; gap: 2.5rem; }
  .hero-trust-list { grid-template-columns: 1fr; }
}

/* 4 Intent Funnel Tiles */
.section-intents {
  padding: 0 0 2rem;
}
.intent-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  margin-top: -2.5rem;
  position: relative;
  z-index: 10;
}
.intent-card {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-decoration: none;
  color: inherit;
}
.intent-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--brand);
}
.intent-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}
.intent-card h3 {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: var(--dark-slate);
}
.intent-card p {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin: 0 0 1rem;
  line-height: 1.5;
  flex: 1;
}
.intent-action {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--brand);
}
@media (max-width: 1024px) {
  .intent-grid { grid-template-columns: repeat(2, 1fr); margin-top: 2rem; }
}
@media (max-width: 550px) {
  .intent-grid { grid-template-columns: 1fr; }
}

/* Sections */
.section { padding: 4.5rem 0; }
.section-header { margin-bottom: 3rem; }
.section-header.text-center { text-align: center; max-width: 760px; margin-left: auto; margin-right: auto; }
.section-tag {
  display: inline-block;
  color: var(--brand);
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}
.section-header h2 {
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
  color: var(--dark-slate);
}
.section-header p {
  color: var(--text-muted);
  font-size: 1.05rem;
  margin: 0;
}
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

/* Authenticity Showcase */
.authenticity-layout {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 3.5rem;
  align-items: center;
}
.auth-image-box {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}
.auth-image-box img {
  width: 100%;
  aspect-ratio: 4/5;
  object-fit: cover;
}
.auth-caption {
  padding: 1rem 1.25rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
  background: var(--bg-page);
  border-top: 1px solid var(--border);
}
.auth-points-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.auth-point {
  display: flex;
  gap: 1.25rem;
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  transition: transform 0.15s ease;
}
.auth-point:hover {
  transform: translateX(4px);
  border-color: var(--brand);
}
.auth-point-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand-hover);
  font-weight: 900;
  font-size: 1.1rem;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.auth-point h3 {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0 0 0.35rem;
  color: var(--dark-slate);
}
.auth-point p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
@media (max-width: 900px) {
  .authenticity-layout { grid-template-columns: 1fr; gap: 2rem; }
}

/* Timeline Customer Results */
.timeline-photo-box {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  margin-bottom: 2.5rem;
  text-align: center;
}
.timeline-photo-box img {
  width: 100%;
  max-height: 480px;
  object-fit: cover;
}
.timeline-caption {
  padding: 1rem;
  font-size: 0.88rem;
  color: var(--text-muted);
  background: var(--bg-subtle);
  border-top: 1px solid var(--border);
}
.timeline-stages-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
}
.timeline-stage-card {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  border-top: 4px solid var(--brand);
  box-shadow: var(--shadow-sm);
}
.stage-time-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}
.timeline-stage-card h3 {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: var(--dark-slate);
}
.timeline-stage-card p {
  font-size: 0.88rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}
@media (max-width: 990px) {
  .timeline-stages-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 550px) {
  .timeline-stages-grid { grid-template-columns: 1fr; }
}

/* Pricing Grid */
.section-pricing { background: #FFFFFF; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  align-items: stretch;
}
.pricing-card {
  background: var(--bg-page);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.pricing-card.featured-pricing {
  background: #FFFFFF;
  border: 2px solid var(--brand);
  box-shadow: 0 8px 30px rgba(180,83,9,0.15);
  transform: scale(1.02);
  z-index: 2;
}
.pricing-card.featured-pricing:hover {
  transform: scale(1.02) translateY(-4px);
}
.badge-popular {
  background: var(--brand);
  color: #FFFFFF;
  padding: 0.3rem 0.7rem;
  border-radius: var(--radius-sm);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  display: inline-block;
  margin-bottom: 0.75rem;
}
.pricing-badge {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}
.pricing-card h3 {
  font-size: 1.3rem;
  margin: 0 0 0.5rem;
  color: var(--dark-slate);
}
.pricing-price {
  font-size: 2.3rem;
  font-weight: 900;
  color: var(--dark-slate);
  line-height: 1;
  margin-bottom: 0.5rem;
}
.pricing-price small {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-muted);
}
.pricing-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 1.5rem;
  min-height: 2.8em;
}
.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
  font-size: 0.88rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.pricing-card .btn { margin-top: auto; }
@media (max-width: 990px) {
  .pricing-grid { grid-template-columns: repeat(2, 1fr); }
  .pricing-card.featured-pricing { transform: none; }
  .pricing-card.featured-pricing:hover { transform: translateY(-4px); }
}
@media (max-width: 550px) {
  .pricing-grid { grid-template-columns: 1fr; }
}

/* Product Cards & Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}
.product-card {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.product-badge-wrap {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 3;
}
.badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-full);
}
.badge-kirkland { background: #DCFCE7; color: #166534; }
.badge-neutral { background: #F5F5F4; color: #57534E; }

.product-img-link {
  aspect-ratio: 1;
  background: #FAFAF9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 1.5rem;
}
.product-img-link img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.2s ease;
}
.product-card:hover .product-img-link img { transform: scale(1.05); }

.product-info {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.product-cat {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 700;
  margin-bottom: 0.35rem;
}
.product-title {
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.3;
  margin: 0 0 1rem;
  min-height: 2.6em;
}
.product-title a:hover { color: var(--brand); }
.product-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  gap: 0.5rem;
}
.price-val {
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--dark-slate);
}
.btn-wa-sm {
  background: var(--wa-green);
  color: #FFFFFF;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 0.45rem 0.95rem;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}
.btn-wa-sm:hover { background: var(--wa-green-hover); color: #FFFFFF; }

@media (max-width: 1024px) {
  .product-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
}
@media (max-width: 480px) {
  .product-grid { grid-template-columns: 1fr; }
}

/* Location Section */
.location-box {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 2.5rem;
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}
.location-details {
  padding: 3rem;
}
.loc-item {
  display: flex;
  gap: 1rem;
  margin: 1.5rem 0;
}
.loc-icon { font-size: 1.5rem; flex-shrink: 0; line-height: 1.2; }
.loc-item strong { display: block; font-size: 1.05rem; color: var(--dark-slate); margin-bottom: 0.25rem; }
.loc-item p { margin: 0; font-size: 0.95rem; color: var(--text-secondary); }
.loc-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 2rem;
}
.location-map iframe {
  width: 100%;
  height: 100%;
  min-height: 420px;
  border: 0;
}
@media (max-width: 900px) {
  .location-box { grid-template-columns: 1fr; }
  .location-details { padding: 2rem; }
  .location-map iframe { min-height: 320px; }
}

/* Guides Grid (Preview & Full) */
.guides-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.guide-preview-card {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}
.guide-preview-card img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
}
.guide-preview-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.guide-badge {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--brand);
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}
.guide-preview-content h3 {
  font-size: 1.15rem;
  line-height: 1.3;
  margin: 0 0 0.75rem;
  color: var(--dark-slate);
}
.guide-preview-content p {
  font-size: 0.92rem;
  color: var(--text-muted);
  margin: 0 0 1.25rem;
  flex: 1;
}
.read-more {
  font-weight: 700;
  color: var(--brand);
  font-size: 0.9rem;
}
@media (max-width: 768px) {
  .guides-preview-grid { grid-template-columns: 1fr; }
}

/* Full Guides Hub (/blog/) */
.guides-main-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}
.guide-card-full {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.guide-card-full:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--brand);
}
.guide-card-img {
  width: 100%;
  aspect-ratio: 16/9;
  position: relative;
  overflow: hidden;
  background: var(--bg-subtle);
}
.guide-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.guide-card-full:hover .guide-card-img img {
  transform: scale(1.04);
}
.guide-card-topic {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(28,25,23,0.85);
  color: #FFFFFF;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.3rem 0.65rem;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}
.guide-card-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.guide-read-time {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}
.guide-card-title {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.3;
  margin: 0 0 0.75rem;
  color: var(--dark-slate);
}
.guide-card-title a:hover { color: var(--brand); }
.guide-card-desc {
  font-size: 0.92rem;
  color: var(--text-secondary);
  line-height: 1.55;
  margin: 0 0 1.5rem;
  flex: 1;
}
.guide-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}
.guide-wa-link {
  font-size: 0.88rem;
  font-weight: 700;
  color: #059669;
}
@media (max-width: 768px) {
  .guides-main-grid { grid-template-columns: 1fr; }
}

/* FAQ */
.faq-container { max-width: 800px; }
.faq-list { display: flex; flex-direction: column; gap: 0.75rem; }
.faq-item {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.2rem 1.5rem;
}
.faq-item summary {
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--dark-slate);
  cursor: pointer;
}
.faq-item p {
  margin: 0.85rem 0 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
}

/* Final CTA */
.final-cta-section { padding-bottom: 5rem; }
.final-cta-box {
  background: linear-gradient(135deg, var(--dark-slate) 0%, var(--dark-surface) 100%);
  color: #FFFFFF;
  padding: 3.5rem 2rem;
  border-radius: var(--radius-lg);
  text-align: center;
  box-shadow: var(--shadow-lg);
}
.final-cta-box h2 {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 900;
  margin: 0 0 1rem;
}
.final-cta-box p {
  font-size: 1.1rem;
  color: #D6D3D1;
  max-width: 650px;
  margin: 0 auto 2rem;
}

/* Shop Layout */
.page-title-banner {
  background: var(--dark-slate);
  color: #FFFFFF;
  padding: 3.5rem 0;
  text-align: center;
}
.page-title-banner h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 900;
  margin: 0.5rem 0;
}
.page-title-banner p {
  color: #D6D3D1;
  max-width: 650px;
  margin: 0 auto;
  font-size: 1.05rem;
}
.shop-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2.5rem;
}
.shop-sidebar { display: flex; flex-direction: column; gap: 1.5rem; }
.sidebar-box {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}
.sidebar-box h3 {
  font-size: 1.15rem;
  margin: 0 0 1rem;
  color: var(--dark-slate);
}
.cat-pill-list { display: flex; flex-direction: column; gap: 0.4rem; }
.cat-pill {
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.15s ease;
}
.cat-pill:hover { background: #F5F5F4; color: var(--brand); }
.cat-pill.active { background: var(--dark-slate); color: #FFFFFF; }
.cat-pill.active .cat-count { color: #FFFFFF; opacity: 0.8; }
.cat-count { font-size: 0.8rem; color: var(--text-muted); }

.sidebar-help {
  background: #DCFCE7;
  border: 1px solid #BBF7D0;
  border-radius: var(--radius-md);
  padding: 1.5rem;
}
.sidebar-help h4 { margin: 0 0 0.5rem; color: #166534; font-size: 1.05rem; }
.sidebar-help p { font-size: 0.88rem; color: #15803D; margin: 0 0 1rem; }

.shop-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.count-badge { font-weight: 700; color: var(--dark-slate); }
.search-input {
  width: min(360px, 100%);
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  background: #FFFFFF;
  outline: none;
}
.search-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(180,83,9,0.15); }
@media (max-width: 900px) {
  .shop-layout { grid-template-columns: 1fr; }
}

/* Product Detail */
.product-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 3.5rem;
  align-items: start;
}
.main-image-wrap {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2.5rem;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.main-image-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
.breadcrumb-trail {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}
.breadcrumb-trail a { color: var(--brand); font-weight: 600; }
.detail-title {
  font-size: clamp(1.8rem, 3.5vw, 2.5rem);
  line-height: 1.2;
  margin: 0.75rem 0 1.25rem;
  color: var(--dark-slate);
}
.detail-price-box {
  background: var(--bg-page);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}
.detail-price {
  display: block;
  font-size: 2rem;
  font-weight: 900;
  color: var(--dark-slate);
}
.stock-status {
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #059669;
  margin-top: 0.35rem;
}
.detail-highlights { margin-bottom: 2rem; font-size: 1.05rem; color: var(--text-secondary); }
.secure-buy-info {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}
.product-desc-section { background: #FFFFFF; border-top: 1px solid var(--border); }
@media (max-width: 768px) {
  .product-detail-grid { grid-template-columns: 1fr; gap: 2rem; }
}

/* Article & Guide */
.article-page-wrap { background: #FFFFFF; }
.article-header {
  background: var(--dark-slate);
  color: #FFFFFF;
  padding: 3.5rem 0;
}
.article-header-inner { max-width: 860px; }
.article-cat-badge {
  display: inline-block;
  background: rgba(180,83,9,0.3);
  color: #FBBF24;
  border: 1px solid rgba(251,191,36,0.3);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  margin-bottom: 0.75rem;
}
.article-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  line-height: 1.18;
  margin: 0 0 1rem;
}
.article-meta-row {
  display: flex;
  gap: 1.5rem;
  font-size: 0.88rem;
  color: #D6D3D1;
  flex-wrap: wrap;
}
.guide-summary-lead {
  font-size: 1.15rem;
  color: #E7E5E4;
  line-height: 1.6;
  margin: 0.5rem 0 0;
}

.article-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 3.5rem;
  padding: 3.5rem 1rem;
  max-width: 1200px;
}
.article-main-content { min-width: 0; }
.article-featured-image {
  margin: 0 0 2rem;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
}
.article-featured-image img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }
.article-featured-image figcaption {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  padding: 0.5rem;
}

.article-prose {
  font-size: 1.08rem;
  line-height: 1.75;
  color: var(--text-secondary);
}
.article-prose p { margin: 0 0 1.4rem; }
.article-prose h2 {
  font-size: 1.65rem;
  font-weight: 900;
  color: var(--dark-slate);
  margin: 2.5rem 0 1rem;
  line-height: 1.25;
}
.article-prose h3 {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--dark-slate);
  margin: 2rem 0 0.85rem;
}
.article-prose ul, .article-prose ol {
  margin: 0 0 1.5rem;
  padding-left: 1.4rem;
}
.article-prose li { margin-bottom: 0.6rem; }
.article-prose strong { color: var(--dark-slate); font-weight: 800; }

.treatment-stages-grid {
  display: grid;
  gap: 1rem;
  margin: 1.5rem 0 2rem;
}
.stage-item {
  background: var(--bg-page);
  border: 1px solid var(--border);
  border-left: 4px solid var(--brand);
  border-radius: var(--radius-sm);
  padding: 1.25rem;
}
.stage-item strong { display: block; font-size: 1.05rem; margin-bottom: 0.4rem; color: var(--dark-slate); }
.stage-item p { margin: 0; font-size: 0.95rem; }

.local-cdmx-callout {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: var(--radius-md);
  padding: 2rem;
  margin: 2.5rem 0;
}
.cdmx-badge {
  display: inline-block;
  background: #059669;
  color: #FFFFFF;
  font-weight: 800;
  font-size: 0.78rem;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  margin-bottom: 0.75rem;
}
.local-cdmx-callout h3 {
  color: #065F46;
  font-size: 1.4rem;
  margin: 0 0 0.75rem;
}
.local-cdmx-callout p { color: #166534; font-size: 0.98rem; }
.callout-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.25rem;
}

.safety-disclaimer {
  background: #FFFBEB;
  border-left: 4px solid var(--brand);
  padding: 1.25rem;
  border-radius: var(--radius-sm);
  margin: 2rem 0;
}
.safety-disclaimer strong { display: block; color: #92400E; margin-bottom: 0.25rem; }
.safety-disclaimer p { margin: 0; font-size: 0.9rem; color: #78350F; }

.article-share-wa {
  background: var(--dark-slate);
  color: #FFFFFF;
  padding: 2.5rem;
  border-radius: var(--radius-md);
  text-align: center;
  margin-top: 3rem;
}
.article-share-wa strong { font-size: 1.3rem; display: block; margin-bottom: 0.5rem; }
.article-share-wa p { color: #D6D3D1; max-width: 500px; margin: 0 auto 1.5rem; font-size: 0.95rem; }

.sticky-sidebar {
  position: sticky;
  top: 90px;
}
.sidebar-products-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 1.25rem 0;
}
.sidebar-prod-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}
.sidebar-prod-item:hover { border-color: var(--brand); background: var(--bg-page); }
.sidebar-prod-item img {
  width: 54px;
  height: 54px;
  object-fit: contain;
  background: #FFFFFF;
}
.sidebar-prod-item strong { display: block; font-size: 0.88rem; line-height: 1.2; color: var(--dark-slate); }
.sidebar-prod-price { font-size: 0.85rem; color: var(--brand); font-weight: 800; }
.sidebar-loc-reminder { margin-top: 1rem; text-align: center; color: var(--text-muted); }

@media (max-width: 900px) {
  .article-layout { grid-template-columns: 1fr; }
  .sticky-sidebar { position: static; }
}

/* Contact Grid */
.contact-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.contact-card {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 2.2rem;
  text-align: center;
  box-shadow: var(--shadow-sm);
}
.contact-icon { font-size: 2.5rem; display: block; margin-bottom: 1rem; }
.contact-card h3 { font-size: 1.3rem; margin: 0 0 0.6rem; color: var(--dark-slate); }
.contact-card p { color: var(--text-muted); font-size: 0.92rem; margin: 0 0 1rem; }
.contact-link { font-size: 1.15rem; font-weight: 800; color: var(--brand); display: block; }
.contact-time { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; }
@media (max-width: 768px) {
  .contact-grid { grid-template-columns: 1fr; }
}

/* 404 */
.not-found-section { text-align: center; padding: 6rem 0; }
.not-found-code { font-size: 6rem; font-weight: 900; color: var(--brand); line-height: 1; margin-bottom: 1rem; }

/* Footer */
.site-footer {
  background: var(--dark-slate);
  color: #D6D3D1;
  padding-top: 4.5rem;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 2.5rem;
  margin-bottom: 3.5rem;
}
.footer-logo-img {
  height: 40px;
  width: auto;
  max-width: 200px;
  object-fit: contain;
  display: block;
  margin-bottom: 1rem;
  filter: brightness(0) invert(1);
}
.footer-brand p { font-size: 0.92rem; line-height: 1.6; color: #A8A29E; }
.footer-guarantee {
  margin-top: 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #FBBF24;
}
.footer-col h3 { font-size: 1.05rem; color: #FFFFFF; margin: 0 0 1.25rem; font-weight: 800; }
.footer-col p { font-size: 0.9rem; line-height: 1.55; margin: 0 0 0.85rem; }
.footer-col a { color: #F5F5F4; }
.footer-col a:hover { color: #34D399; }
.footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.55rem; font-size: 0.9rem; }
.footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 1.5rem 0;
  font-size: 0.85rem;
  color: #78716C;
}
.footer-bottom-inner {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}
@media (max-width: 900px) {
  .footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 500px) {
  .footer-grid { grid-template-columns: 1fr; }
}

/* Floating WhatsApp */
.wa-float {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  background: var(--wa-green);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-full);
  box-shadow: 0 8px 25px rgba(37,211,102,0.4);
  font-weight: 800;
  font-size: 0.95rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.wa-float:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 30px rgba(37,211,102,0.5);
  color: #FFFFFF;
}
.wa-float svg { width: 26px; height: 26px; flex-shrink: 0; }
.wa-pulse {
  position: absolute;
  inset: -4px;
  border-radius: var(--radius-full);
  border: 2px solid var(--wa-green);
  animation: wa-pulse-anim 2s infinite;
  pointer-events: none;
}
@keyframes wa-pulse-anim {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.3); opacity: 0; }
}
@media (max-width: 600px) {
  .wa-float { padding: 0.75rem; border-radius: 50%; }
  .wa-float-text { display: none; }
}
`;

const js = `
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const search = document.querySelector('#search');
  if (search) {
    const cards = [...document.querySelectorAll('.searchable .product-card')];
    search.addEventListener('input', () => {
      const query = search.value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
      for (const card of cards) {
        const text = card.textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        card.style.display = query && !text.includes(query) ? 'none' : '';
      }
    });
  }
});
`;

async function main() {
  console.log("Iniciando build de Minoxidil en CDMX...");
  const rawData = await readFile(DATA_FILE, "utf8");
  const data = JSON.parse(repairMojibake(rawData));

  await rm(DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, "assets"), { recursive: true });
  await cp(path.join(ROOT, "public"), DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, "assets"), { recursive: true });

  console.log("Optimizando imágenes...");
  await optimizeImageAssets();

  await writeFile(path.join(DIST, "assets", "site.css"), (css + themeCss).trim(), "utf8");
  await writeFile(path.join(DIST, "assets", "site.js"), js.trim(), "utf8");
  await writeFile(path.join(DIST, ".nojekyll"), "", "utf8");

  // Generate Core Pages
  await writeRoute("/", homePage(data));
  await writeRoute("/shop/", shopPage(data));
  await writeRoute("/contact/", contactPage(data, "/contact/"));
  await writeRoute("/sucursales-y-entregas/", locationsPage(data));
  await writeRoute("/blog/", blogPage(data));

  // Generate Trust Pages
  for (const route of Object.keys(trustPages)) {
    await writeRoute(route, trustPage(route, data));
  }

  // Generate 10 Foundational Guides
  for (const guide of editorialGuides) {
    await writeRoute(guide.path, guidePage(guide, data));
  }
  console.log(`${editorialGuides.length} guías pilares compiladas con éxito.`);

  // Generate Products
  for (const product of data.products) {
    await writeRoute(product.path, productPage(product, data));
  }

  // Generate Categories
  for (const category of data.categories) {
    await writeRoute(category.path, categoryPage(category, data));
  }

  // Routes for Sitemap (high-authority canonical URLs only)
  const routes = [
    "/",
    "/shop/",
    "/blog/",
    ...editorialGuides.map((item) => item.path),
    ...Object.keys(trustPages),
    ...data.products.map((item) => item.path),
    ...data.categories.map((item) => item.path),
    "/contact/",
    "/sucursales-y-entregas/"
  ];

  const uniqueRoutes = [...new Set(routes)].filter(Boolean);
  const sitemapRoutes = [...writtenRoutes].filter((route) => !noindexRoutes.has(route)).sort();
  const meta = sitemapMeta(data);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => sitemapEntry(route, data, meta)).join("\n")}\n</urlset>\n`;
  await writeFile(path.join(DIST, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, "utf8");

  // Redirects for Vercel, Netlify and Apache
  // No permitir que un redirect tape una página que sí existe (ej. /blog/ se iba a la guía de barba)
  // y resolver cadenas A -> B -> C a un solo salto A -> C.
  const liveRoutes = new Set([...writtenRoutes].map((route) => routeKey(route)));
  const rawRedirects = legacyRedirects(data).filter((rule) => !liveRoutes.has(routeKey(rule.from)));
  const redirectMap = new Map(rawRedirects.map((rule) => [routeKey(rule.from), rule]));
  const redirects = rawRedirects.map((rule) => {
    let to = rule.to;
    const seen = new Set([routeKey(rule.from)]);
    while (redirectMap.has(routeKey(to)) && !seen.has(routeKey(to))) {
      seen.add(routeKey(to));
      to = redirectMap.get(routeKey(to)).to;
    }
    return { ...rule, to };
  }).filter((rule) => routeKey(rule.from) !== routeKey(rule.to));
  const index = redirectIndex(data, uniqueRoutes, redirects);

  await writeFile(path.join(DIST, "redirects.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await writeFile(path.join(DIST, "404.html"), optimizeHtmlImages(localizeWordPressMedia(repairMojibake(notFoundPage(data, index)))), "utf8");

  const netlifyLines = [
    "# Legacy WordPress -> static site redirects",
    ...redirects.map((rule) => `${rule.from} ${rule.to} ${rule.status}!`),
    "/product/:slug /producto/:slug 301",
    "/product-category/:slug /categoria-producto/:slug 301",
    "/tag/:slug /blog/ 301",
    "/author/:slug /blog/ 301",
    "/* /404.html 404"
  ];
  await writeFile(path.join(DIST, "_redirects"), `${netlifyLines.join("\n")}\n`, "utf8");

  const htaccessLines = [
    "ErrorDocument 404 /404.html",
    "RewriteEngine On",
    ...redirects.map((rule) => `Redirect 301 ${rule.from} ${rule.to}`)
  ];
  await writeFile(path.join(DIST, ".htaccess"), `${htaccessLines.join("\n")}\n`, "utf8");

  const vercel = {
    buildCommand: "npm run build",
    outputDirectory: "dist",
    cleanUrls: true,
    trailingSlash: true,
    headers: [{
      source: "/assets/(.*)",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
    }],
    redirects: [
      // El subdominio de Vercel duplicaba el sitio completo: todo va al dominio canónico.
      {
        source: "/:path*",
        has: [{ type: "host", value: "minoxidilencdmx.vercel.app" }],
        destination: `${SITE_URL}/:path*`,
        permanent: true
      },
      ...redirects.slice(0, 1000).map((rule) => ({
        source: rule.from,
        destination: rule.to,
        permanent: true
      }))
    ]
  };
  await writeFile(path.join(DIST, "vercel.json"), `${JSON.stringify(vercel, null, 2)}\n`, "utf8");
  await writeFile(path.join(ROOT, "vercel.json"), `${JSON.stringify(vercel, null, 2)}\n`, "utf8");

  console.log(`\n=============================================`);
  console.log(`Build completado exitosamente en ${DIST}`);
  console.log(`- Productos: ${data.products.length}`);
  console.log(`- Categorías: ${data.categories.length}`);
  console.log(`- Guías pilares: ${editorialGuides.length}`);
  console.log(`- Entradas heredadas 301 consolidadas: ${data.posts.length}`);
  console.log(`- URLs totales en sitemap.xml: ${sitemapRoutes.length}`);
  console.log(`- Redirecciones 301 generadas: ${redirects.length}`);
  console.log(`=============================================\n`);
}

main().catch((error) => {
  console.error("Error en build.mjs:", error);
  process.exit(1);
});
