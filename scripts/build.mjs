import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { editorialGuides, editorialSources } from "../content/editorial-guides.mjs";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "content", "site-data.json");
const DIST = path.join(ROOT, "dist");
const SITE_URL = "https://www.minoxidilencdmx.com";

const reserved = new Set(["", "shop", "blog", "guias", "producto", "categoria-producto", "assets"]);
const writtenRoutes = new Set();
const noindexRoutes = new Set();
let localImageMap;
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
    ["ÃƒÂ", "Á"], ["ÃƒÂ‰", "É"], ["ÃƒÂ", "Í"], ["ÃƒÂ“", "Ó"], ["ÃƒÂš", "Ú"], ["ÃƒÂ‘", "Ñ"],
    ["Ã¡", "á"], ["Ã©", "é"], ["Ã­", "í"], ["Ã³", "ó"], ["Ãº", "ú"], ["Ã±", "ñ"],
    ["Ã", "Á"], ["Ã‰", "É"], ["Ã", "Í"], ["Ã“", "Ó"], ["Ãš", "Ú"], ["Ã‘", "Ñ"],
    ["Â¿", "¿"], ["Â¡", "¡"], ["Â«", "«"], ["Â»", "»"], ["Â°", "°"], ["Â£", "£"],
    ["â€“", "–"], ["â€”", "—"], ["â€œ", "“"], ["â€", "”"], ["â€˜", "‘"], ["â€™", "’"], ["â€¦", "…"],
    ["âœ“", "✓"], ["â˜…", "★"], ["â™¥", "♥"], ["â–£", "▣"], ["â—‡", "◇"], ["â—·", "◷"],
    ["âŒ–", "⌖"], ["â†—", "↗"], ["âœ‰", "✉"], ["â–¯", "▯"]
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
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/https:\/\/minoxidilencdmx\.com/g, "")
    .replace(/\s(class|style|id|width|height)="[^"]*"/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .trim();
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
  if (/<meta name="robots" content="noindex/i.test(output)) noindexRoutes.add(normalized);
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
    if (!srcMatch) return tag;
    const originalSrc = srcMatch[1];
    const key = imageKeyFromSrc(originalSrc);
    const meta = key ? imageMetaMap.get(key) : null;
    let next = tag;
    if (meta?.webp) next = next.replace(originalSrc, meta.webp);
    if (meta?.width && !/\swidth=/i.test(next)) next = addOrReplaceAttr(next, "width", String(meta.width));
    if (meta?.height && !/\sheight=/i.test(next)) next = addOrReplaceAttr(next, "height", String(meta.height));
    if (!/\sdecoding=/i.test(next)) next = addOrReplaceAttr(next, "decoding", "async");
    const isLogo = /\bbrand-logo\b/i.test(next);
    const isMeaningful = key && !isLogo;
    if (isMeaningful) meaningfulImageIndex += 1;
    if (!/\sloading=/i.test(next)) next = addOrReplaceAttr(next, "loading", isMeaningful && meaningfulImageIndex === 1 ? "eager" : "lazy");
    if (isMeaningful && meaningfulImageIndex === 1 && !/\sfetchpriority=/i.test(next)) next = addOrReplaceAttr(next, "fetchpriority", "high");
    return next;
  });
  return content;
}

function buildLocalImageMap() {
  if (localImageMap) return localImageMap;
  localImageMap = new Map();
  const imagesDir = path.join(DIST, "assets", "images");
  try {
    for (const file of readdirSync(imagesDir, { withFileTypes: true })) {
      if (file.isFile()) localImageMap.set(file.name.toLowerCase(), `/assets/images/${file.name}`);
    }
  } catch {}
  return localImageMap;
}

function localizeWordPressMedia(html = "") {
  const images = buildLocalImageMap();
  const fallback = images.get("minoxidil-mexico.jpg") || "/assets/images/minoxidil-mexico.jpg";
  return String(html)
    .replace(/(?:https?:\/\/[^"'()\s,>]+)?\/wp-content\/uploads\/(?:\d{4}\/\d{2}\/)?([^"'()\s,>]+)/gi, (_match, filename) => {
      const clean = filename.split(/[?#]/)[0].toLowerCase();
      return images.get(clean) || fallback;
    })
    .replace(/src="data:image\/gif;base64,[^"]*"\s+data-src="([^"]+)"/gi, 'src="$1"')
    .replace(/\s+data-src="\/assets\/images\/([^"]+)"/gi, "")
    .replace(/\s+srcset="[^"]*"/gi, "")
    .replace(/\s+data-srcset="[^"]*"/gi, "");
}

async function optimizeImageAssets() {
  imageMetaMap = new Map();
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
        .webp({ quality: 78, effort: 4 })
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

function addRedirect(rules, from, to, reason = "legacy") {
  const source = normalizeRoute(from);
  const target = normalizeRoute(to);
  if (source === "/") return;
  if (!source || !target || routeKey(source) === routeKey(target)) return;
  if (!rules.has(routeKey(source))) rules.set(routeKey(source), { from: source, to: target, status: 301, reason });
}

function filenameFromUrl(url = "") {
  try {
    return path.basename(new URL(url).pathname);
  } catch {
    return path.basename(url);
  }
}

function metaText(value = "", max = 158) {
  const text = stripTags(value);
  if (text.length <= max) return text;
  const clipped = text.slice(0, max + 1).replace(/\s+\S*$/, "").replace(/[,:;.-]+$/, "");
  return `${clipped}…`;
}

function guidePathForPost(post) {
  const text = normalizeText(`${post.title} ${post.slug} ${post.excerpt || ""}`);
  if (/mujer|embaraz|lactancia|posparto|postparto/.test(text)) return "/guias/minoxidil-mujeres/";
  if (/barba|bigote|candado|mejilla|lampino|rasur/.test(text)) return "/guias/minoxidil-para-barba/";
  if (/efecto|riesgo|contraindic|irrit|resequ|palpit|seguridad|advertencia|reaccion/.test(text)) return "/guias/efectos-secundarios-minoxidil/";
  if (/aplicar|aplicacion|dosis|frecuencia|rutina|como usar|manual|instructivo/.test(text)) return "/guias/como-aplicar-minoxidil/";
  if (/resultado|meses|tiempo|shedding|antes y despues|constancia|dejar|suspender/.test(text)) return "/guias/resultados-minoxidil-shedding/";
  if (/espuma|foam|liquido|solucion/.test(text)) return "/guias/minoxidil-liquido-vs-espuma/";
  if (/comprar|original|pirata|kirkland|precio|tienda|sucursal|envio|marca/.test(text)) return "/guias/comprar-minoxidil-cdmx/";
  if (/caida|alopecia|cabello|coronilla|entrada|dermatologo|finasteride/.test(text)) return "/guias/caida-cabello-cuando-dermatologo/";
  return "/guias/minoxidil-topico/";
}

function legacyRedirects(data) {
  const rules = new Map();
  const categoryBySlug = new Map(data.categories.map((category) => [category.slug, category.path]));
  const productBySlug = new Map(data.products.map((product) => [product.slug, product.path]));
  const pageBySlug = new Map(data.pages.map((page) => [page.slug, page.path]));
  const postBySlug = new Map(data.posts.map((post) => [post.slug, post.path]));

  for (const item of [...data.products, ...data.pages]) {
    if (item.oldUrl) addRedirect(rules, pathFromUrl(item.oldUrl), item.path, "imported oldUrl");
  }
  for (const post of data.posts) {
    const target = guidePathForPost(post);
    addRedirect(rules, post.path, target, "legacy thin post consolidated by search intent");
    if (post.oldUrl) addRedirect(rules, pathFromUrl(post.oldUrl), target, "legacy post oldUrl consolidated by search intent");
  }

  for (const product of data.products) {
    addRedirect(rules, `/product/${product.slug}/`, product.path, "woocommerce english product");
    addRedirect(rules, `/shop/${product.slug}/`, product.path, "shop product alias");
    addRedirect(rules, `/producto/${product.slug}`, product.path, "missing trailing slash");

    for (const image of product.images || []) {
      if (image.original && image.local) {
        addRedirect(rules, pathFromUrl(image.original), image.local, "wordpress upload image");
      }
    }
  }

  for (const category of data.categories) {
    addRedirect(rules, `/product-category/${category.slug}/`, category.path, "woocommerce english category");
    addRedirect(rules, `/product_cat/${category.slug}/`, category.path, "woocommerce taxonomy");
    addRedirect(rules, `/categoria/${category.slug}/`, category.path, "spanish category alias");
    addRedirect(rules, `/categoria-producto/${category.slug}/`, category.path, "flattened product category");
  }

  const postCategoryTargets = {
    alopecia: categoryBySlug.get("anticaida-y-recuperar-cabello") || "/blog/",
    minoxidil: categoryBySlug.get("minoxidil") || "/blog/",
    cabello: categoryBySlug.get("anticaida-y-recuperar-cabello") || "/blog/",
    barba: categoryBySlug.get("crecimiento-de-barba") || "/blog/",
    slider: "/",
    "sin-categoria": "/blog/",
    testimonios: postBySlug.get("testimonios") || "/blog/",
    uncategorized: "/blog/",
    youtube: pageBySlug.get("youtube-videos") || pageBySlug.get("videos") || "/blog/",
    productos: "/shop/"
  };
  for (const [slug, target] of Object.entries(postCategoryTargets)) {
    addRedirect(rules, `/category/${slug}/`, target, "wordpress post category");
  }

  const aliases = {
    "/home-2/": "/",
    "/about/": "/quienes-somos/",
    "/blog-2/": "/blog/",
    "/contacto/": "/contact/",
    "/videos/": "/blog/",
    "/youtube-videos/": "/blog/",
    "/productos/": "/shop/",
    "/privacy-policy-2/": "/politicas-de-privacidad/",
    "/politicas-de-privacidad-2/": "/politicas-de-privacidad/",
    "/tienda-plaza-guelatao/": "/contact/",
    "/donde-estamos/": "/contact/",
    "/wishlist/": "/shop/",
    "/wishlist-2/": "/shop/",
    "/top-rated-products/": "/shop/",
    "/cart-2/": "/shop/",
    "/cart/": "/shop/",
    "/checkout/": "/shop/",
    "/my-account/": "/shop/",
    "/producto/": "/shop/",
    "/tienda/": "/shop/",
    "/tienda-online/": "/shop/",
    "/comprar-minoxidil/": "/shop/",
    "/carrito/": "/cart/",
    "/finalizar-compra/": "/checkout/",
    "/mi-cuenta/": "/my-account/",
    "/sucursal/": "/contact/",
    "/sucursales/": "/contact/",
    "/sucursal-en-cdmx/": "/contact/",
    "/sucursal-plaza-guelatao/": pageBySlug.get("tienda-plaza-guelatao") || "/contact/",
    "/sucursal-plaza-guelatao-1/": pageBySlug.get("tienda-plaza-guelatao") || "/contact/",
    "/sucursal-plaza-guelatao-2/": pageBySlug.get("tienda-plaza-guelatao") || "/contact/",
    "/contacto-cdmx/": "/contact/",
    "/envios/": pageBySlug.get("envios-a-todo-mexico") || "/shop/",
    "/mayoreo/": pageBySlug.get("distribuye-mayoreo") || "/shop/",
    "/privacidad/": pageBySlug.get("politicas-de-privacidad") || "/politicas-de-privacidad/",
    "/privacy-policy/": pageBySlug.get("politicas-de-privacidad") || "/politicas-de-privacidad/",
    "/terms/": pageBySlug.get("terminos-y-condiciones") || "/terminos-y-condiciones/"
  };
  for (const [from, to] of Object.entries(aliases)) {
    const source = normalizeRoute(from);
    rules.set(routeKey(source), { from: source, to: normalizeRoute(to), status: 301, reason: "manual alias" });
  }
  for (let page = 2; page <= 30; page += 1) addRedirect(rules, `/blog/page/${page}/`, "/blog/", "legacy blog pagination consolidated");

  for (const page of data.pages) {
    if (page.slug.endsWith("-2")) {
      const baseSlug = page.slug.replace(/-2$/, "");
      const target = pageBySlug.get(baseSlug) || postBySlug.get(baseSlug);
      if (target) addRedirect(rules, page.path, target, "duplicate page slug");
    }
  }

  for (const post of data.posts) {
    if (post.slug.endsWith("-2")) {
      const baseSlug = post.slug.replace(/-2$/, "");
      const target = postBySlug.get(baseSlug);
      if (target) addRedirect(rules, post.path, target, "duplicate post slug");
    }
  }

  return [...rules.values()].sort((a, b) => a.from.localeCompare(b.from));
}

function redirectIndex(data, routes, redirects) {
  const routeItems = [];
  for (const route of routes) routeItems.push({ path: normalizeRoute(route), title: route === "/" ? "Inicio" : route.replace(/^\/|\/$/g, "") });
  for (const product of data.products) routeItems.push({ path: product.path, title: product.name, type: "producto" });
  for (const category of data.categories) routeItems.push({ path: category.path, title: category.name, type: "categoria" });
  for (const page of data.pages) routeItems.push({ path: page.path, title: page.title, type: "pagina" });
  for (const post of data.posts) routeItems.push({ path: post.path, title: post.title, type: "blog" });
  const uniqueRoutes = [...new Map(routeItems.map((item) => [routeKey(item.path), item])).values()];
  return {
    generatedAt: new Date().toISOString(),
    redirects,
    routes: uniqueRoutes
  };
}

function whatsappLink(data, productName = "") {
  const text = productName
    ? `Hola, quiero información para comprar: ${productName}`
    : "Hola, quiero información sobre minoxidil y tratamientos para barba o cabello";
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
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function imageExists(src = "") {
  if (!src) return false;
  const name = path.basename(String(src).split(/[?#]/)[0]).toLowerCase();
  return buildLocalImageMap().has(name);
}

function productImage(product, data) {
  if (imageExists(product.image)) return product.image;
  const related = data.products.find((item) =>
    item.id !== product.id &&
    imageExists(item.image) &&
    item.categories?.some((category) => product.categories?.some((own) => own.slug === category.slug))
  );
  return related?.image || data.products.find((item) => imageExists(item.image))?.image || data.heroImages.find(imageExists) || "";
}

function structuredData(data, page) {
  const base = [organizationSchema(data), websiteSchema(data)];
  const pageSchema = page.schema ? (Array.isArray(page.schema) ? page.schema : [page.schema]) : [];
  return {
    "@context": "https://schema.org",
    "@graph": [...base, ...pageSchema]
  };
}

function layout(data, page) {
  const pageTitle = page.seoTitle || page.title || data.siteTitle;
  const titleCandidate = page.path === "/" ? "Minoxidil en CDMX | Sucursal, precios y envío" : pageTitle.length > 48 ? pageTitle : `${pageTitle} | Minoxidil Todo México`;
  const title = metaText(titleCandidate, 68);
  const description = metaText(page.description || data.description);
  const image = page.image || data.products[0]?.image || "";
  const socialImage = page.socialImage || "/assets/images/og-minoxidil-todo-mexico.png";
  const preloadImage = page.preloadImage || image;
  const preloadHref = preloadImage ? optimizedImageSrc(preloadImage) : "";
  const canonical = `${SITE_URL}${page.path || "/"}`.replace(/\/+$/, "/");
  return `<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${page.robots ? `<meta name="robots" content="${escapeHtml(page.robots)}">` : ""}
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${page.type || "website"}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:locale" content="es_MX">
  <meta property="og:image" content="${SITE_URL}${escapeHtml(socialImage)}">
  <meta property="og:image:width" content="1734">
  <meta property="og:image:height" content="907">
  <meta property="og:image:alt" content="Minoxidil Todo México: sucursal en CDMX y envíos a México">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${SITE_URL}${escapeHtml(socialImage)}">
  ${preloadHref ? `<link rel="preload" as="image" href="${escapeHtml(preloadHref)}">` : ""}
  <link rel="preconnect" href="https://api.whatsapp.com">
  <link rel="preload" href="/assets/site.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/assets/site.css"></noscript>
  <script type="application/ld+json">${JSON.stringify(structuredData(data, page))}</script>
</head>
<body class="${page.bodyClass || ""}">
  <a class="skip-link" href="#contenido">Saltar al contenido</a>
  <header class="site-header${page.headerMode === "overlay" ? " header-overlay" : ""}">
    <div class="topbar">
      <span>Sucursal Guelatao: Plaza Guelatao Local 76 Pasillo 5</span>
      <span>WhatsApp: 55 6938 0408</span>
      <span>${escapeHtml(data.hours)}</span>
    </div>
    <nav class="nav" aria-label="Principal">
      <a class="brand" href="/">
        <img class="brand-logo" src="/assets/images/minoxidil-mexico.jpg" alt="Minoxidil Mexico">
        <span><strong>Minoxidil</strong><small>Todo Mexico</small></span>
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
      <div class="menu" id="menu">
        <a href="/">Inicio</a>
        <a href="/contact/">Sucursal en CDMX</a>
        <a href="/sucursales-y-entregas/">Sucursales y entregas</a>
        <a href="/blog/">Blog</a>
        <a href="/shop/">Tienda</a>
        <a href="/categoria-producto/minoxidil-kirkland/">Minoxidil</a>
        <a href="/categoria-producto/crecimiento-de-barba/">Barba y bigote</a>
        <a href="/categoria-producto/anticaida-y-recuperar-cabello/">Cabello</a>
      </div>
      <a class="nav-cta" href="${whatsappLink(data)}">WhatsApp</a>
    </nav>
  </header>
  <main id="contenido">${page.body}</main>
  <footer class="footer">
    <div>
      <h2>Contacto</h2>
      <p>Estamos para ayudarte con productos para barba, cabello y recuperación capilar.</p>
      <p><strong>WhatsApp:</strong> <a href="${whatsappLink(data)}">55 6938 0408</a></p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
    </div>
    <div>
      <h2>Sucursales</h2>
      ${data.locations.map((location) => `<p>${escapeHtml(location)}</p>`).join("")}
      <p>${escapeHtml(data.hours)}</p>
    </div>
    <div>
      <h2>Secciones</h2>
      <a href="/shop/">Tienda</a>
      <a href="/blog/">Blog</a>
      <a href="/envios-a-todo-mexico/">Envios a todo Mexico</a>
      <a href="/terminos-y-condiciones/">Terminos y condiciones</a>
    </div>
  </footer>
  <a class="float-wa" href="${whatsappLink(data)}" aria-label="Abrir WhatsApp">
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16.04 3C8.86 3 3 8.77 3 15.86c0 2.27.62 4.49 1.78 6.43L3.1 29l6.88-1.77a13.1 13.1 0 0 0 6.06 1.48C23.23 28.71 29 22.95 29 15.86S23.23 3 16.04 3Zm0 23.47c-1.91 0-3.77-.51-5.4-1.48l-.39-.23-4.08 1.05 1.08-3.96-.26-.41a10.54 10.54 0 0 1-1.62-5.58c0-5.86 4.79-10.62 10.67-10.62 5.87 0 10.64 4.76 10.64 10.62 0 5.85-4.77 10.61-10.64 10.61Zm5.84-7.94c-.32-.16-1.88-.92-2.17-1.03-.29-.1-.5-.16-.71.16-.21.31-.82 1.02-1 1.23-.18.21-.37.23-.69.08-.32-.16-1.35-.49-2.57-1.58-.95-.84-1.59-1.88-1.78-2.2-.18-.31-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.31.32-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.7-.97-2.32-.26-.61-.52-.53-.71-.54h-.61c-.21 0-.55.08-.84.39-.29.31-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.25 3.41 5.45 4.78.76.33 1.35.52 1.81.67.76.24 1.46.21 2.01.13.61-.09 1.88-.76 2.14-1.5.26-.73.26-1.36.18-1.5-.08-.13-.29-.21-.61-.37Z"/></svg>
    <span>WhatsApp</span>
  </a>
  <script src="/assets/site.js" defer></script>
</body>
</html>`;
}

function organizationSchema(data) {
  return {
    "@type": ["Store", "LocalBusiness"],
    "@id": `${SITE_URL}/#localbusiness`,
    name: data.brand,
    url: SITE_URL,
    image: `${SITE_URL}${data.heroImages[0] || data.products[0]?.image || ""}`,
    telephone: "+52 55 6938 0408",
    email: data.email,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Plaza Guelatao Local 76 Pasillo 5",
      addressLocality: "Iztapalapa",
      addressRegion: "Ciudad de Mexico",
      postalCode: "09100",
      addressCountry: "MX"
    },
    areaServed: ["Ciudad de Mexico", "Estado de Mexico", "Mexico"],
    openingHours: "Tu-Su 12:00-17:00",
    sameAs: Object.values(data.social || {}).filter(Boolean)
  };
}

function websiteSchema(data) {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: data.siteTitle,
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
  const image = productImage(product, data);
  const schema = {
    "@type": "Product",
    "@id": `${SITE_URL}${product.path}#product`,
    name: product.name,
    image: image ? `${SITE_URL}${image}` : undefined,
    description: stripTags(productEditorial(product).summary),
    category: product.categories?.map((category) => category.name).join(", "),
    brand: {
      "@type": "Brand",
      name: /kirkland/i.test(product.name) ? "Kirkland" : data.brand
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "MXN",
      price: Number(String(product.price).replace(/[^\d.]/g, "")) || undefined,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: `${SITE_URL}${product.path}`,
      seller: { "@id": `${SITE_URL}/#localbusiness` }
    }
  };
  return schema;
}

function articleSchema(post, data) {
  const image = post.image || data.heroImages[0] || data.products[0]?.image || "";
  return {
    "@type": "Article",
    "@id": `${SITE_URL}${post.path}#article`,
    headline: post.title,
    description: post.description || post.excerpt,
    image: image ? `${SITE_URL}${image}` : undefined,
    datePublished: post.date || "2026-07-18",
    dateModified: post.modified || post.date || "2026-07-18",
    author: { "@type": "Organization", name: "Equipo editorial de Minoxidil Todo México", url: `${SITE_URL}/quienes-somos/` },
    publisher: { "@id": `${SITE_URL}/#localbusiness` },
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
  const priority = item.priority || (normalized === "/" ? "1.0" : normalized.startsWith("/shop/") ? "0.9" : normalized.startsWith("/producto/") ? "0.8" : "0.6");
  return [
    "  <url>",
    `    <loc>${SITE_URL}${normalized}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>"
  ].join("\n");
}

function sitemapMeta(data, blogTotalPages) {
  const meta = new Map();
  const today = new Date().toISOString().slice(0, 10);
  const set = (route, values) => meta.set(normalizeRoute(route), values);
  set("/", { lastmod: today, changefreq: "weekly", priority: "1.0" });
  set("/shop/", { lastmod: today, changefreq: "weekly", priority: "0.9" });
  set("/contact/", { lastmod: today, changefreq: "monthly", priority: "0.8" });
  set("/contacto/", { lastmod: today, changefreq: "monthly", priority: "0.7" });
  set("/sucursales-y-entregas/", { lastmod: today, changefreq: "monthly", priority: "0.8" });
  for (const product of data.products) set(product.path, { lastmod: today, changefreq: "weekly", priority: "0.8" });
  for (const category of data.categories) {
    set(category.path, { lastmod: today, changefreq: "weekly", priority: "0.75" });
    set(`/categoria-producto/${category.slug}/`, { lastmod: today, changefreq: "weekly", priority: "0.65" });
  }
  for (let page = 1; page <= blogTotalPages; page += 1) {
    set(page === 1 ? "/blog/" : `/blog/page/${page}/`, { lastmod: today, changefreq: "weekly", priority: page === 1 ? "0.8" : "0.5" });
  }
  for (const guide of editorialGuides) set(guide.path, { lastmod: today, changefreq: "monthly", priority: "0.8" });
  for (const route of ["/envios-a-todo-mexico/", "/devoluciones-y-reembolsos/", "/politicas-de-privacidad/", "/terminos-y-condiciones/", "/quienes-somos/"]) {
    set(route, { lastmod: today, changefreq: "yearly", priority: "0.5" });
  }
  return meta;
}

function productCard(product, data) {
  const cats = product.categories.slice(0, 1).map((category) => category.name).join("");
  const image = productImage(product, data);
  const cleanName = product.name
    .replace(/\s*\|\s*Crecimiento de Barba y Cabello/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const chips = [];
  if (/kirkland/i.test(product.name)) chips.push("Kirkland");
  if (/foam|espuma/i.test(product.name)) chips.push("Espuma");
  if (/biotina/i.test(product.name)) chips.push("Biotina");
  if (/derma|roller/i.test(product.name)) chips.push("Dermaroller");
  if (!chips.length && cats) chips.push(cats);
  return `<article class="product-card shop-card" data-category="${product.categories.map((category) => category.slug).join(" ")}">
    <a class="product-image shop-image" href="${product.path}">
      <span class="product-badge">${escapeHtml(chips[0] || "Producto")}</span>
      ${image ? `<img src="${image}" alt="${escapeHtml(product.name)}" loading="lazy">` : ""}
    </a>
    <div class="product-copy shop-copy">
      <span class="eyebrow">${escapeHtml(cats || "Tratamiento capilar")}</span>
      <h2><a href="${product.path}">${escapeHtml(cleanName)}</a></h2>
      <div class="product-meta">
        ${chips.slice(0, 3).map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}
      </div>
      <div class="product-actions shop-actions">
        <strong>${escapeHtml(product.price || product.priceHtml || "Consultar")}</strong>
        <a class="button small" href="${whatsappLink(data, product.name)}">Pedir</a>
      </div>
    </div>
  </article>`;
}

function categoryLinks(data, active = "") {
  return data.categories
    .filter((category) => category.count >= 2)
    .slice(0, 16)
    .map((category) => `<a class="${category.slug === active ? "active" : ""}" href="${category.path}">${escapeHtml(category.name)} <span>${category.count}</span></a>`)
    .join("");
}

function homePage(data) {
  const featured = data.products.slice(0, 8);
  const hero = pickImage(data, "diseno-sin-titulo-1", 0);
  const storeImage = "/assets/images/diseno-sin-titulo-2.jpg";
  const resultImage = "/assets/images/antes.jpg";
  const body = `
    <section class="wp-hero home-hero" style="--hero-image:url('${hero}')">
      <div class="wp-hero-inner">
        <span class="eyebrow">Tienda local en CDMX · Envíos a México</span>
        <h1 class="funnel-hero-title">Minoxidil para barba y cabello con asesoría directa por WhatsApp</h1>
        <p class="funnel-hero-lead">Te ayudamos a elegir tratamiento, confirmar producto original y coordinar envío a todo México o entrega en CDMX/Neza.</p>
        <div class="hero-actions funnel-hero-actions">
          <a class="button dark" href="${whatsappLink(data, "Quiero informes de minoxidil para barba o cabello")}">Pedir informes por WhatsApp</a>
          <a class="button outline-light" href="/shop/">Ver productos</a>
        </div>
      </div>
    </section>
    <section class="funnel-intent">
      <div class="section-heading centered">
        <span class="eyebrow">Empieza por tu caso</span>
        <h2>Ve directo a la información que necesitas.</h2>
        <p>Confirmamos producto, presentación, precio, lote visible y entrega. Para diagnóstico o tratamiento médico, consulta a un profesional.</p>
      </div>
      <div class="funnel-grid">
        <a href="${whatsappLink(data, "Busco minoxidil para crecimiento de barba. Quiero saber qué tratamiento me conviene.")}"><strong>Quiero crecer barba</strong><span>Recomendación de 1, 3, 6 o 12 meses.</span></a>
        <a href="${whatsappLink(data, "Busco minoxidil para entradas, cabello o coronilla. Quiero informes.")}"><strong>Quiero apoyar cabello</strong><span>Orientación clara antes de comprar.</span></a>
        <a href="${whatsappLink(data, "Quiero envío de minoxidil a mi ciudad. Mi estado es:")}"><strong>Quiero envío a México</strong><span>Guía, paquetería y costo confirmado.</span></a>
        <a href="${whatsappLink(data, "Estoy en CDMX/Neza y quiero entrega personal o pasar a sucursal.")}"><strong>Estoy en CDMX o Neza</strong><span>Sucursal, oficina o punto acordado.</span></a>
      </div>
    </section>
    <section class="service-intro">
      <span></span>
      <h2>Una tienda que muestra lo que vende.</h2>
      <p>Información de compra comprobable y límites claros: sin diagnósticos por WhatsApp ni resultados garantizados.</p>
      <div class="service-grid">
        <article><b>⌖</b><h3>Sucursal en CDMX</h3><p>Contamos con tienda en Plaza Guelatao. Atención directa, producto visible y asesoría antes de comprar.</p></article>
        <article><b>↗</b><h3>Envíos express a todo México</h3><p>Enviamos rápido y seguro a tu casa u oficina. Te confirmamos disponibilidad por WhatsApp.</p></article>
        <article><b>◇</b><h3>Producto identificable</h3><p>Antes de pagar puedes confirmar presentación, piezas, lote visible, caducidad y estado del empaque.</p></article>
        <article><b>♥</b><h3>Sin promesas milagro</h3><p>Explicamos qué dice la etiqueta y cuándo una pregunta corresponde a dermatología.</p></article>
        <article><b>▣</b><h3>Envío rápido y seguro</h3><p>Entregas cuidadas para que recibas tus productos sin esperas ni vueltas innecesarias.</p></article>
        <article><b>★</b><h3>Guías con fuentes</h3><p>Las guías principales citan información pública para pacientes y etiquetas regulatorias.</p></article>
      </div>
      <div class="center-actions"><a class="button" href="/contact/">Sucursal y contacto</a><a class="button secondary" href="/shop/">Tienda online</a></div>
    </section>
    <section class="photo-band">
      <div class="photo-copy">
        <span class="eyebrow">Minoxidil todo México en CDMX</span>
        <h2>Productos reales, sucursal real y atención directa.</h2>
        <p>No necesitas un carrito pesado para comprar. Entra al producto, mándanos WhatsApp y te confirmamos precio, existencia y envío.</p>
      </div>
      <div class="photo-stack">
        ${hero ? `<img src="${hero}" alt="Vitrina con minoxidil Kirkland">` : ""}
        <img src="${storeImage}" alt="Productos disponibles en la sucursal de Plaza Guelatao">
      </div>
    </section>
    <section class="home-feature section-wide">
      <div class="home-feature-media">
        <img src="${storeImage}" alt="Vitrina de productos Minoxidil Kirkland en la sucursal">
      </div>
      <div class="home-feature-copy">
        <span class="eyebrow">Minoxidil Todo México en Ciudad de México</span>
        <h2>Revisa el producto antes de comprar.</h2>
        <p>Catálogo visible, atención directa y confirmación por WhatsApp antes de pasar a la sucursal o solicitar envío.</p>
        <div class="benefit-list">
          <article><b>★</b><div><h3>Productos de calidad</h3><p>Minoxidil Kirkland, espuma, biotina, dermaroller y tratamientos seleccionados para barba y cabello.</p></div></article>
          <article><b>▰</b><div><h3>Variedad de tratamientos</h3><p>Opciones para crecimiento de barba, recuperaciÃ³n capilar, mantenimiento y cuidado diario.</p></div></article>
          <article><b>●</b><div><h3>Ofertas y promociones</h3><p>Te confirmamos precio, existencia y promociones actuales directamente por WhatsApp.</p></div></article>
        </div>
      </div>
    </section>
    <section class="video-proof section-wide">
      <div class="proof-card proof-card-factual">
        <div class="proof-video"><img src="${storeImage}" alt="Vitrina real de la tienda Minoxidil Todo México"></div>
        <div class="proof-stats">
          <div><strong>${data.locations.length}</strong><span>Puntos publicados</span></div>
          <div><strong>${data.products.length}</strong><span>Fichas de producto</span></div>
          <div><strong>6 días</strong><span>Martes a domingo</span></div>
          <div><strong>1 a 1</strong><span>Atención por WhatsApp</span></div>
        </div>
      </div>
      <div class="proof-copy"><h2>Datos que puedes comprobar antes de pagar.</h2><p>Dirección, horario, precio, presentación y condiciones de entrega quedan publicados o confirmados por escrito.</p></div>
    </section>
    <section class="home-cta">
      <h2>¿Quieres saber qué kit te conviene antes de comprar?</h2>
      <a class="button secondary" href="${whatsappLink(data, "Quiero que me recomienden un kit de minoxidil para barba o cabello")}">Pedir recomendación</a>
    </section>
    <section class="home-cta legacy-home-cta">
      <h2>Â¿Tienes alguna pregunta? No dudes en ponerte en contacto con nosotros.</h2>
      <a class="button secondary" href="/contact/">Contactarnos</a>
    </section>
    <section class="location-feature section-wide">
      <div>
        <span class="eyebrow">Sucursal, oficinas y entrega local</span>
        <h2>Tres formas seguras de recibir tu tratamiento.</h2>
        <p>Recoge en Plaza Guelatao, coordina en oficinas de Neza o agenda entrega personal en zona oriente. Producto visible, compra clara y pago con confianza.</p>
        <a class="button" href="/sucursales-y-entregas/">Ver pagina dedicada</a>
      </div>
      <div class="location-feature-grid">
        <article><strong>Plaza Guelatao</strong><span>Local 76, Pasillo 5</span></article>
        <article><strong>Oficinas Neza</strong><span>Oriente 10 #224</span></article>
        <article><strong>Zona Oriente</strong><span>Chalco, La Paz, Ixtapaluca, Neza e Iztapalapa</span></article>
      </div>
    </section>
    <section class="community-section section-wide">
      <img src="${resultImage}" alt="Fotografía del archivo de la tienda Minoxidil Todo México">
      <div>
        <span class="eyebrow">Compra informada</span>
        <h2>La confianza empieza con información que se puede verificar.</h2>
        <p>Te orientamos sobre presentación, compra y entrega. Si vienes a CDMX o compras desde otro estado, todo queda confirmado por WhatsApp.</p>
        <ul>
          <li>Tratamientos para barba y cabello.</li>
          <li>Productos visibles y asesorÃ­a antes de comprar.</li>
          <li>EnvÃ­os rÃ¡pidos y seguros a todo MÃ©xico.</li>
          <li>Expectativas claras para medir resultados.</li>
        </ul>
      </div>
    </section>
    <section class="testimonials-section section-wide">
      <div class="section-heading centered">
        <span class="eyebrow">Antes de comprar</span>
        <h2>Tres comprobaciones sencillas.</h2>
        <p>No necesitas confiar en reseñas anónimas: pide evidencia del producto y condiciones por escrito.</p>
      </div>
      <div class="testimonial-grid">
        <article><div><span><strong>1. Presentación</strong><small>Nombre y concentración</small></span></div><p>Compara lo escrito en la caja con la ficha y la confirmación de WhatsApp.</p></article>
        <article><div><span><strong>2. Trazabilidad</strong><small>Lote y caducidad</small></span></div><p>Pide una foto actual si la presentación recibida no coincide con el catálogo.</p></article>
        <article><div><span><strong>3. Total</strong><small>Producto y entrega</small></span></div><p>Confirma piezas, precio total, envío y punto de entrega antes de pagar.</p></article>
      </div>
    </section>
    <section class="section">
      <div class="section-heading">
        <span class="eyebrow">Tienda</span>
        <h2>Productos principales</h2>
        <a href="/shop/">Ver todo</a>
      </div>
      <div class="product-grid">${featured.map((product) => productCard(product, data)).join("")}</div>
    </section>
    <section class="section category-strip">
      <h2>Comprar por categoria</h2>
      <div class="category-links">${categoryLinks(data)}</div>
    </section>
    <section class="section contact-panel">
      <div>
        <span class="eyebrow">Sucursal y asesoria</span>
        <h2>¿Tienes dudas sobre que tratamiento usar?</h2>
        <p>Manda mensaje y te orientamos segun tu objetivo: barba, cabello, cejas, recuperacion capilar o mantenimiento.</p>
      </div>
      <a class="button" href="${whatsappLink(data)}">Hablar por WhatsApp</a>
    </section>`;
  return layout(data, { title: "Minoxidil en CDMX", path: "/", description: data.description, image: hero, bodyClass: "home-page", body });
}

function contactPage(data, route = "/contact/") {
  const hero = "/assets/images/diseno-sin-titulo-2.jpg";
  const neza = "/assets/images/2-6.jpg";
  const wa = whatsappLink(data, "Quiero visitar la sucursal o comprar minoxidil");
  const mapGuelatao = "https://www.google.com/maps?q=Calzada%20Ignacio%20Zaragoza%20406%20Juan%20Escutia%20Iztapalapa%2009100%20Ciudad%20de%20Mexico&output=embed";
  const mapNeza = "https://www.google.com/maps?q=Oriente%2010%20224%20Colonia%20Reforma%20Ciudad%20Nezahualcoyotl%2057840%20Estado%20de%20Mexico&output=embed";
  const body = `
    <section class="wp-hero contact-hero" style="--hero-image:url('${hero}')">
      <div class="wp-hero-inner">
        <span class="eyebrow">Visítanos o contáctanos</span>
        <h1>Sucursal de minoxidil en CDMX y atención en Neza</h1>
        <p>Consulta producto, presentación, precio y disponibilidad por WhatsApp antes de visitarnos.</p>
        <div class="hero-actions">
          <a class="button dark" href="${wa}">WhatsApp</a>
          <a class="button outline-light" href="#ubicaciones">Ver ubicaciones</a>
        </div>
      </div>
    </section>
    <section id="ubicaciones" class="locations-section">
      <div class="location-photo-grid">
        <article class="location-photo">
          <img src="${hero}" alt="Plaza Guelatao Local 76">
          <div><h2>Plaza Guelatao Local 76</h2><p>Plaza Guelatao Local 76, Pasillo 5</p></div>
        </article>
        <article class="location-photo">
          <img src="${neza}" alt="Oficinas en Neza">
          <div><h2>Oficinas en Neza</h2><p>Oriente 10 #224, Colonia Reforma, Ciudad Nezahualcóyotl</p></div>
        </article>
      </div>
      <div class="contact-info-grid">
        <article><b>⌖</b><h3>Ubicación física</h3><p>Calz. Ignacio Zaragoza 406, Juan Escutia, Iztapalapa, 09100 Ciudad de México, CDMX</p></article>
        <article><b>◷</b><h3>Horas de trabajo</h3><p>Martes a Domingo: 12PM – 5PM</p></article>
        <article><b>✉</b><h3>Email</h3><p><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p></article>
        <article><b>▯</b><h3>WhatsApp y números</h3><p><a href="${wa}">55-6938-0408</a></p></article>
      </div>
    </section>
    <section class="map-section section-wide">
      <div class="section-heading centered">
        <span class="eyebrow">Mapas</span>
        <h2>Elige la ubicaciÃ³n que te quede mejor</h2>
        <p>Antes de venir, escrÃ­benos por WhatsApp para confirmar existencia, horario y punto exacto de entrega.</p>
      </div>
      <div class="map-grid">
        <article class="map-card">
          <div class="map-card-copy">
            <span>Plaza Guelatao</span>
            <h3>Local 76, Pasillo 5</h3>
            <p>Calz. Ignacio Zaragoza 406, Juan Escutia, Iztapalapa, 09100 Ciudad de MÃ©xico, CDMX.</p>
            <a class="button secondary" href="https://www.google.com/maps/search/?api=1&query=Calzada+Ignacio+Zaragoza+406+Juan+Escutia+Iztapalapa" target="_blank" rel="noreferrer">Abrir en Google Maps</a>
          </div>
          <iframe title="Mapa Plaza Guelatao Minoxidil" src="${mapGuelatao}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </article>
        <article class="map-card">
          <div class="map-card-copy">
            <span>Oficinas en Neza</span>
            <h3>Colonia Reforma</h3>
            <p>Oriente 10 #224, Col. Reforma, 57840 Ciudad NezahualcÃ³yotl, Estado de MÃ©xico.</p>
            <a class="button secondary" href="https://www.google.com/maps/search/?api=1&query=Oriente+10+224+Colonia+Reforma+Ciudad+Nezahualcoyotl" target="_blank" rel="noreferrer">Abrir en Google Maps</a>
          </div>
          <iframe title="Mapa oficinas Neza Minoxidil" src="${mapNeza}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </article>
      </div>
    </section>
    <section class="contact-main contact-summary">
      <div class="contact-copy">
        <span class="eyebrow">Plaza Guelatao</span>
        <h2>Estamos dentro de Plaza Guelatao, local 76.</h2>
        <p>También puedes encontrarnos en oficinas de Neza. Si vienes por producto, mándanos mensaje antes para confirmar horario, existencia y la mejor forma de llegar.</p>
        <div class="contact-actions">
          <a class="button" href="${wa}">Mandar WhatsApp</a>
          <a class="button secondary" href="https://www.google.com/maps/search/?api=1&query=Calzada+Ignacio+Zaragoza+406+Juan+Escutia+Iztapalapa" target="_blank" rel="noreferrer">Cómo llegar</a>
        </div>
        <div class="mini-list">
          <span>Minoxidil Kirkland líquido y espuma</span>
          <span>Biotina, dermaroller y shampoos</span>
          <span>Asesoría para barba y cabello</span>
        </div>
      </div>
    </section>
    <section class="contact-final">
      <span class="eyebrow">Atención rápida</span>
      <h2>¿Vienes a la sucursal o prefieres envío?</h2>
      <p>Escríbenos y te decimos qué tratamiento te conviene, precio actualizado y disponibilidad.</p>
      <a class="button dark" href="${wa}">Hablar ahora</a>
    </section>`;
  return layout(data, { title: "Sucursal y Contacto", path: route, description: "Sucursal en CDMX, oficinas en Neza y WhatsApp para comprar minoxidil y tratamientos capilares.", image: hero, bodyClass: "contact-page", body });
}

function faqSchema(items = []) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };
}

function locationsPage(data) {
  const wa = whatsappLink(data, "Quiero informacion de sucursales y entregas personales");
  const body = `
    <section class="page-hero compact">
      <span class="eyebrow">Compra presencial y entrega personal</span>
      <h1>Sucursales, oficinas y puntos de entrega en CDMX Oriente.</h1>
      <p>Esta pagina concentra las opciones para comprar minoxidil sin vueltas: puedes visitar el local, pasar por oficinas o acordar un punto publico de entrega.</p>
    </section>
    <section class="location-dedicated section-wide">
      <article class="location-dedicated-card main">
        <span>01 / Tienda fisica</span>
        <h2>Plaza Guelatao Local 76</h2>
        <p>La opcion para quien quiere revisar producto, preguntar rutina y pagar al momento. Escribe antes de venir para confirmar existencia.</p>
        <strong>Calz. Ignacio Zaragoza 406, Juan Escutia, Iztapalapa.</strong>
        <a class="button" href="${wa}">Agendar visita</a>
      </article>
      <article class="location-dedicated-card">
        <span>02 / Oficina</span>
        <h2>Neza Reforma</h2>
        <p>Punto de apoyo para clientes de Estado de Mexico Oriente y recolecciones rapidas.</p>
        <strong>Oriente 10 #224, Colonia Reforma.</strong>
        <a class="button secondary" href="${wa}">Recoger en Neza</a>
      </article>
      <article class="location-dedicated-card accent">
        <span>03 / Entrega personal</span>
        <h2>Chalco, La Paz, Ixtapaluca, Neza e Iztapalapa</h2>
        <p>Acordamos punto publico, recibes tu producto, revisas y pagas al recibir. Ideal para evitar anticipos y envios locales lentos.</p>
        <strong>Metro La Paz, Metro Guelatao, Plaza Sendero y puntos acordados.</strong>
        <a class="button" href="${wa}">Coordinar entrega</a>
      </article>
    </section>
    <section class="section contact-panel">
      <div>
        <span class="eyebrow">Antes de moverte</span>
        <h2>Confirma producto, horario y punto exacto por WhatsApp.</h2>
        <p>Asi evitamos esperas, confirmamos disponibilidad y te decimos la mejor ruta segun tu zona.</p>
      </div>
      <a class="button" href="${wa}">WhatsApp 55 6938 0408</a>
    </section>`;
  return layout(data, { title: "Sucursales y entregas", path: "/sucursales-y-entregas/", description: "Sucursales y puntos de entrega personal para comprar minoxidil en CDMX, Neza y zona oriente.", bodyClass: "locations-page", body });
}

function shopPage(data) {
  const body = `
    <section class="shop-hero">
      <span class="eyebrow">Tienda</span>
      <h1>Productos para barba y cabello</h1>
      <p>Catálogo visual, sin carrito pesado. Elige producto y pide disponibilidad por WhatsApp.</p>
    </section>
    <section class="shop-layout">
      <aside class="filters">
        <h2>Categorias</h2>
        <div class="category-links vertical">
          <a class="active" href="/shop/">Todos <span>${data.products.length}</span></a>
          ${categoryLinks(data)}
        </div>
      </aside>
      <div>
        <div class="toolbar">
          <div><strong>${data.products.length} productos</strong><span> ordenados por popularidad</span></div>
          <input id="search" type="search" placeholder="Kirkland, biotina, shampoo...">
        </div>
        <div class="product-grid searchable">${data.products.map((product) => productCard(product, data)).join("")}</div>
      </div>
    </section>`;
  return layout(data, {
    title: "Tienda",
    path: "/shop/",
    description: "Compra minoxidil, biotina, dermaroller y productos para barba y cabello por WhatsApp.",
    schema: [
      itemListSchema("Catalogo de productos Minoxidil en CDMX", "/shop/", data.products),
      breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: "Tienda", path: "/shop/" }])
    ],
    body
  });
}

function productEditorial(product) {
  const text = normalizeText(product.name);
  const isMinoxidil = /minoxidil/.test(text);
  const isKirkland = /kirkland/.test(text);
  const isFoam = /foam|espuma/.test(text);
  const isEyeArea = /pestana|rimel|ceja/.test(text);
  const isSupplement = /biotina|tableta|vitamina/.test(text);
  const isRoller = /roller|microaguja/.test(text);
  const isGrooming = /pomada|cera|aceite|balsamo|jabon|shampoo|peine|gel/.test(text) && !isMinoxidil;
  const format = isFoam ? "espuma" : isMinoxidil ? "solución tópica" : isSupplement ? "suplemento" : isRoller ? "accesorio de microagujas" : isGrooming ? "producto de cuidado personal" : "producto";
  const brand = isKirkland ? "Kirkland Signature" : /maximus/.test(text) ? "Maximus" : /suavecito|suavecita/.test(text) ? "Suavecito" : "la marca indicada en el empaque";
  const warning = isEyeArea
    ? "Este producto se anuncia para una zona cercana a los ojos. No uses una solución para cuero cabelludo en pestañas o párpados sin indicación de un profesional de salud; evita contacto ocular."
    : isMinoxidil
      ? "El minoxidil es un medicamento. Sigue la etiqueta de la presentación exacta y consulta si tienes enfermedad cardiovascular, presión baja, embarazo, lactancia, piel lesionada o una caída repentina."
      : isSupplement
        ? "Un suplemento no sustituye un diagnóstico ni corrige por sí solo todas las causas de caída. Revisa dosis, ingredientes e interacciones con un profesional."
        : isRoller
          ? "No lo uses sobre piel inflamada, infectada o lesionada ni lo compartas. La microlesión puede cambiar la absorción de productos tópicos."
          : "Suspende si causa irritación importante y revisa siempre ingredientes e instrucciones del fabricante.";
  const summary = `${product.name.replace(/\s*\|.*$/, "").trim()}. ${format[0].toUpperCase()}${format.slice(1)} disponible por ${escapeHtml(product.price || "precio a confirmar")}; confirma existencia, lote y presentación por WhatsApp antes de trasladarte o pagar.`;
  const content = `
    <div class="product-facts" aria-label="Datos de compra">
      <div><span>Presentación</span><strong>${escapeHtml(format)}</strong></div>
      <div><span>Marca</span><strong>${escapeHtml(brand)}</strong></div>
      <div><span>Precio publicado</span><strong>${escapeHtml(product.price || "Confirmar")}</strong></div>
      <div><span>Entrega</span><strong>CDMX, Neza o envío</strong></div>
    </div>
    <h2>Qué vas a recibir</h2>
    <p>La presentación mostrada en las fotografías de esta ficha, cerrada y sujeta a existencia. Antes de pagar te confirmamos número de piezas, contenido, lote visible, caducidad y estado del empaque. Si la presentación disponible cambió, te enviamos una foto actual.</p>
    <h2>Qué revisar antes de comprar</h2>
    <ul><li>Que el nombre, concentración y forma coincidan con lo que buscas.</li><li>Que caja y envases estén cerrados, legibles y sin alteraciones.</li><li>Precio total, costo de envío y punto de entrega.</li><li>Instrucciones y advertencias de la etiqueta; no una dosis copiada de redes sociales.</li></ul>
    <aside class="safety-note"><strong>Uso responsable</strong><p>${escapeHtml(warning)}</p></aside>
    <h2>Lo que sí podemos confirmar</h2>
    <p>Disponibilidad, precio, fotos del producto actual, ubicación de sucursal y opciones de entrega. No diagnosticamos la causa de caída, no prometemos resultados y no sustituimos una consulta médica.</p>
    <h2>Cómo comparar esta ficha con otra opción</h2>
    <p>No compares sólo el precio grande. Revisa cuántas piezas incluye, contenido por envase, forma de aplicación, ingredientes, instrucciones, vigencia y costo total con entrega. Si dos publicaciones usan nombres parecidos pero muestran concentraciones o cantidades distintas, son productos distintos. Pide una fotografía actual del frente, reverso, lote y caducidad cuando el empaque sea decisivo para tu compra.</p>
    <p>La disponibilidad se confirma el mismo día porque el catálogo puede seguir visible aunque una presentación se haya agotado. No transfieras hasta tener por escrito producto, piezas, total y modalidad de entrega.</p>`;
  return { summary, content, risky: isEyeArea || /10%|12%/.test(product.name) };
}

function productPage(product, data) {
  const editorial = productEditorial(product);
  const related = data.products
    .filter((item) => item.id !== product.id && item.categories.some((category) => product.categories.some((own) => own.slug === category.slug)))
    .slice(0, 4);
  const fallbackImage = productImage(product, data);
  const existingGallery = product.images.filter((image) => imageExists(image.src));
  const gallery = existingGallery.length > 1 ? existingGallery : existingGallery.slice(0, 1);
  const visibleGallery = gallery.length ? gallery : [{ src: fallbackImage, alt: product.name }];
  const body = `
    <section class="product-detail">
      <div class="gallery">
        ${visibleGallery.map((image) => image.src ? `<img src="${image.src}" alt="${escapeHtml(image.alt || product.name)}">` : "").join("")}
      </div>
      <div class="detail-copy">
        <span class="eyebrow">${escapeHtml(product.categories.map((category) => category.name).slice(0, 3).join(" / "))}</span>
        <h1>${escapeHtml(product.name)}</h1>
        <p class="price">${escapeHtml(product.price || product.priceHtml || "Consultar precio")}</p>
        <p>${editorial.summary}</p>
        <div class="hero-actions">
          <a class="button" href="${whatsappLink(data, product.name)}">Comprar por WhatsApp</a>
          <a class="button secondary" href="/shop/">Volver a tienda</a>
        </div>
      </div>
    </section>
    <section class="section article-content">
      ${editorial.content}
    </section>
    ${related.length ? `<section class="section"><div class="section-heading"><h2>Productos relacionados</h2></div><div class="product-grid">${related.map((item) => productCard(item, data)).join("")}</div></section>` : ""}`;
  return layout(data, {
    title: product.name,
    seoTitle: product.name.replace(/\s*\|.*$/, "").replace(/\s*Tratamiento 100% Importado\.?/i, "").trim(),
    path: product.path,
    description: stripTags(editorial.summary),
    image: fallbackImage,
    type: "product",
    robots: editorial.risky ? "noindex, follow" : "index, follow, max-image-preview:large",
    schema: [
      productSchema(product, data),
      breadcrumbSchema([
        { name: "Inicio", path: "/" },
        { name: "Tienda", path: "/shop/" },
        { name: product.categories[0]?.name || "Producto", path: product.categories[0]?.path || "/shop/" },
        { name: product.name, path: product.path }
      ])
    ],
    body
  });
}

function categoryPage(category, data) {
  const products = data.products.filter((product) => product.categories.some((item) => item.slug === category.slug));
  const categoryText = normalizeText(category.name);
  const intro = /kirkland|minoxidil/.test(categoryText)
    ? "Compara presentación, concentración, número de piezas y precio. Antes de comprar confirma lote, caducidad y forma exacta; no elijas sólo por una foto o una promesa de resultados."
    : /barba|balsamo|aceite|cera|jabon|peine/.test(categoryText)
      ? "Productos para cuidado y arreglo de barba. Revisa ingredientes, tamaño y función real de cada uno: cuidar, limpiar o peinar no equivale a crear nuevos folículos."
      : /cabello|shampoo|anticaida/.test(categoryText)
        ? "Opciones de cuidado capilar y productos tópicos. La caída súbita, en placas o con inflamación necesita valoración; un shampoo no sustituye el diagnóstico."
        : "Catálogo agrupado por uso y marca para comparar contenido, precio y disponibilidad antes de pedir por WhatsApp.";
  const body = `
    <section class="page-hero compact">
      <span class="eyebrow">Categoria</span>
      <h1>${escapeHtml(category.name)}</h1>
      <p>${intro}</p>
    </section>
    <section class="shop-layout">
      <aside class="filters">
        <h2>Categorias</h2>
        <div class="category-links vertical">${categoryLinks(data, category.slug)}</div>
      </aside>
      <div class="product-grid">${products.map((product) => productCard(product, data)).join("")}</div>
    </section>`;
  return layout(data, {
    title: category.name,
    path: category.path,
    description: `${category.name}: compara productos, precios, presentación y disponibilidad en CDMX o envío a México.`,
    robots: products.length < 2 ? "noindex, follow" : "index, follow, max-image-preview:large",
    schema: [
      itemListSchema(`Productos de ${category.name}`, category.path, products),
      breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: "Tienda", path: "/shop/" }, { name: category.name, path: category.path }])
    ],
    body
  });
}

function blogPage(data, pageNumber = 1, perPage = 24) {
  const allPosts = editorialGuides;
  const totalPages = Math.max(1, Math.ceil(allPosts.length / perPage));
  const current = Math.min(Math.max(1, pageNumber), totalPages);
  const posts = allPosts.slice((current - 1) * perPage, current * perPage);
  const prevPath = current > 2 ? `/blog/page/${current - 1}/` : current === 2 ? "/blog/" : "";
  const nextPath = current < totalPages ? `/blog/page/${current + 1}/` : "";
  const pagination = `<nav class="blog-pagination" aria-label="Paginacion del blog">
    ${prevPath ? `<a class="button secondary" href="${prevPath}">Entradas recientes</a>` : `<span></span>`}
    <div class="page-dots">
      ${Array.from({ length: totalPages }, (_, index) => {
        const number = index + 1;
        if (number === 1 || number === totalPages || Math.abs(number - current) <= 1) {
          const pathName = number === 1 ? "/blog/" : `/blog/page/${number}/`;
          return number === current ? `<strong>${number}</strong>` : `<a href="${pathName}">${number}</a>`;
        }
        if (Math.abs(number - current) === 2) return `<span>...</span>`;
        return "";
      }).join("")}
    </div>
    ${nextPath ? `<a class="button" href="${nextPath}">Entradas anteriores</a>` : `<span></span>`}
  </nav>`;
  const body = `
    <section class="page-hero compact">
      <span class="eyebrow">Blog</span>
      <h1>Guías de minoxidil, barba y cuidado capilar</h1>
      <p>Guías revisadas con fuentes oficiales, límites claros y contexto de compra local. Sin promesas rápidas ni entradas repetidas.</p>
    </section>
    <section class="post-grid">
      ${posts.map((post) => `<article class="post-card">
        ${post.image ? `<a href="${post.path}"><img src="${post.image}" alt="${escapeHtml(post.title)}" loading="lazy"></a>` : ""}
        <div>
          <span class="guide-label">Revisada en julio de 2026</span>
          <h2><a href="${post.path}">${escapeHtml(post.title)}</a></h2>
          <p>${escapeHtml(post.description)}</p>
        </div>
      </article>`).join("")}
    </section>
    ${pagination}`;
  const pathName = current === 1 ? "/blog/" : `/blog/page/${current}/`;
  const title = current === 1 ? "Blog" : `Blog - Página ${current}`;
  return layout(data, {
    title,
    path: pathName,
    description: "Guías responsables sobre minoxidil, caída de cabello, barba, seguridad y compra en CDMX, basadas en fuentes oficiales.",
    schema: [
      itemListSchema("Blog de minoxidil, barba y cabello", pathName, posts),
      breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: "Blog", path: "/blog/" }])
    ],
    body
  });
}

function articlePage(post, data) {
  const shopBlock = articleShopBlock(post, data);
  const body = `
    <article class="article article-with-shop">
      <div class="article-main">
        <header>
          <span class="eyebrow">Guia</span>
          <h1>${escapeHtml(post.title)}</h1>
          <time>${formatDate(post.date)}</time>
        </header>
        ${post.image ? `<img class="article-image" src="${post.image}" alt="${escapeHtml(post.title)}">` : ""}
        <div class="article-content">${cleanHtml(post.content)}</div>
      </div>
      ${shopBlock}
    </article>`;
  return layout(data, {
    title: post.title,
    path: post.path,
    description: post.excerpt,
    image: post.image,
    type: "article",
    schema: [
      articleSchema(post, data),
      breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: "Blog", path: "/blog/" }, { name: post.title, path: post.path }])
    ],
    body
  });
}

function guidePage(guide, data) {
  const body = `
    <article class="article guide-article">
      <header>
        <span class="eyebrow">Guía responsable</span>
        <h1>${escapeHtml(guide.title)}</h1>
        <p class="article-deck">${escapeHtml(guide.summary)}</p>
        <div class="byline"><strong>Equipo editorial de Minoxidil Todo México</strong><span>Última revisión: 18 de julio de 2026 · Información comercial, no consulta médica</span></div>
      </header>
      <img class="article-image" src="${guide.image}" alt="${escapeHtml(guide.title)}">
      <nav class="guide-toc" aria-label="Contenido de la guía"><strong>En esta guía</strong><ol>${guide.sections.map(([title], index) => `<li><a href="#seccion-${index + 1}">${escapeHtml(title)}</a></li>`).join("")}</ol></nav>
      <div class="article-content">
        ${guide.sections.map(([title, text], index) => `<section id="seccion-${index + 1}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></section>`).join("")}
        <aside class="safety-note"><strong>Importante</strong><p>Esta guía ayuda a leer etiquetas y tomar decisiones de compra informadas. Si tienes síntomas, antecedentes médicos, embarazo, lactancia o una caída sin diagnóstico, consulta a un profesional de salud.</p></aside>
        <section class="guide-faq"><h2>Preguntas frecuentes</h2>${guide.faqs.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</section>
        <section class="guide-sources"><h2>Fuentes consultadas</h2><p>Preferimos etiquetas regulatorias e información pública para pacientes. Consulta siempre la etiqueta vigente del producto que tienes.</p><ul>${editorialSources.map((source) => `<li><a href="${source.url}" rel="noopener noreferrer">${escapeHtml(source.name)}</a></li>`).join("")}</ul></section>
      </div>
      <div class="contact-panel"><span class="eyebrow">Compra local</span><h2>¿Quieres confirmar producto y disponibilidad?</h2><p>Te ayudamos con presentación, precio, lote visible, sucursal y envío. Las preguntas médicas requieren un profesional de salud.</p><a class="button" href="${whatsappLink(data, `Quiero información después de leer ${guide.title}`)}">Consultar por WhatsApp</a></div>
    </article>`;
  return layout(data, {
    title: guide.title,
    path: guide.path,
    description: guide.description,
    image: guide.image,
    type: "article",
    robots: "index, follow, max-image-preview:large",
    schema: [
      articleSchema(guide, data),
      faqSchema(guide.faqs),
      breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: "Guías", path: "/blog/" }, { name: guide.title, path: guide.path }])
    ],
    body
  });
}

function relatedArticleProducts(post, data) {
  const text = normalizeText(`${post.title} ${post.slug} ${post.excerpt || ""}`);
  const productMatches = [
    [/biotina|vitamina|unas|uñas/i, ["biotina"]],
    [/shampoo|caida|caída|alopecia|coronilla|frontal|postparto/i, ["shampoo", "biotina", "minoxidil-3-meses"]],
    [/dermaroller|roller|microaguja/i, ["skin-roller", "derma"]],
    [/espuma|foam/i, ["foam", "espuma"]],
    [/balsamo|bálsamo|jabon|jabón|aceite|cera/i, ["balsamo", "jabon", "aceite", "cera"]],
    [/kirkland|original|pirata|rogaine|liquido|líquido/i, ["kirkland", "3-meses", "6-meses"]],
    [/barba|bigote|candado|mejilla|hueco|lampino/i, ["3-meses", "kit-del-barbon", "skin-roller"]]
  ];
  const wanted = productMatches.find(([regex]) => regex.test(text))?.[1] || ["3-meses", "6-meses", "biotina"];
  const picked = [];
  for (const token of wanted) {
    const item = data.products.find((product) => normalizeText(`${product.name} ${product.slug}`).includes(normalizeText(token)));
    if (item && !picked.some((product) => product.path === item.path)) picked.push(item);
  }
  for (const product of data.products) {
    if (picked.length >= 3) break;
    if (!picked.some((item) => item.path === product.path)) picked.push(product);
  }
  return picked.slice(0, 3);
}

function articleShopBlock(post, data) {
  const products = relatedArticleProducts(post, data);
  return `<aside class="article-shop" aria-label="Productos y asesoria">
    <span class="eyebrow">Sucursal y venta</span>
    <h2>¿Quieres comprar minoxidil o revisar tu caso?</h2>
    <p>Te atendemos por WhatsApp antes de que compres: barba, cabello, entradas, coronilla, cejas o rutina de mantenimiento.</p>
    <a class="button" href="${whatsappLink(data, `Hola, vengo de la entrada ${post.title} y quiero orientación para comprar minoxidil`)}">Pedir orientación</a>
    <div class="article-products">
      ${products.map((product) => `<a href="${product.path}">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.price || "Ver producto")}</span>
      </a>`).join("")}
    </div>
  </aside>`;
}

function genericPage(page, data) {
  const body = `
    <article class="article">
      <header>
        <span class="eyebrow">Informacion</span>
        <h1>${escapeHtml(page.title)}</h1>
      </header>
      ${page.image ? `<img class="article-image" src="${page.image}" alt="${escapeHtml(page.title)}">` : ""}
      <div class="article-content">${cleanHtml(page.content)}</div>
    </article>`;
  return layout(data, { title: page.title, path: page.path, description: page.excerpt || data.description, image: page.image, body });
}

const trustPages = {
  "/quienes-somos/": {
    title: "Quiénes somos",
    description: "Conoce la tienda Minoxidil Todo México, nuestras ubicaciones, cómo verificamos el producto y los límites de nuestra orientación.",
    eyebrow: "Tienda local, información comprobable",
    lead: "Vendemos productos para cuidado capilar y barba con atención directa en CDMX y Nezahualcóyotl. Preferimos mostrar producto, precio y condiciones reales antes que prometer resultados.",
    sections: [
      ["Qué hacemos", "Confirmamos inventario, presentación, precio, lote visible, opciones de entrega y ubicación. Atendemos por WhatsApp para que la persona sepa qué producto va a recibir antes de trasladarse o pagar."],
      ["Qué no hacemos", "No diagnosticamos alopecia, no prescribimos medicamentos, no recomendamos minoxidil oral y no garantizamos crecimiento. Cuando la pregunta depende de antecedentes o síntomas, recomendamos consultar a dermatología."],
      ["Cómo trabajamos el contenido", "Las guías separan indicaciones de etiqueta, usos fuera de indicación y consejo comercial. Citamos fuentes regulatorias o de información pública para pacientes y mostramos la fecha de revisión. Corregimos afirmaciones si una etiqueta o fuente cambia."],
      ["Dónde encontrarnos", "Sucursal en Plaza Guelatao, local 76, pasillo 5, CDMX, y punto de atención en Oriente 10 #224, colonia Reforma, Nezahualcóyotl. Confirma horario y existencia por WhatsApp antes de ir."]
    ]
  },
  "/envios-a-todo-mexico/": {
    title: "Envíos de minoxidil a todo México",
    description: "Cómo cotizar y recibir un pedido: existencia, costo, paquetería, empaque, rastreo y datos necesarios.",
    eyebrow: "Compra y entrega",
    lead: "Antes de pagar confirmamos producto exacto, piezas, precio, costo de envío y código postal. No pedimos más datos personales de los necesarios para entregar.",
    sections: [
      ["1. Cotización", "Envía producto, número de piezas y código postal. Respondemos con existencia y total. Si el empaque disponible es distinto a las fotografías del catálogo, enviamos una imagen actual."],
      ["2. Confirmación", "Revisa nombre, concentración, líquido o espuma, piezas, domicilio y teléfono. Conserva la conversación y comprobante de pago."],
      ["3. Envío y rastreo", "Te compartimos paquetería y guía cuando el paquete ha sido documentado. Los tiempos son estimados y dependen del destino y la transportista."],
      ["Paquete dañado o incompleto", "Toma fotos del exterior, guía, sellos y contenido antes de desechar el empaque. Escríbenos el mismo día para revisar el caso con evidencia."]
    ]
  },
  "/devoluciones-y-reembolsos/": {
    title: "Devoluciones y reembolsos",
    description: "Condiciones claras para reportar pedidos dañados, equivocados o incompletos y solicitar revisión.",
    eyebrow: "Política de compra",
    lead: "Por higiene y seguridad, un producto abierto o usado no se puede revender. Sí revisamos errores de surtido, faltantes y daño de transporte documentado.",
    sections: [
      ["Producto equivocado o faltante", "Avísanos dentro de las primeras 48 horas de la entrega y adjunta fotos de la guía, paquete cerrado al recibirlo y contenido completo. Comparamos con el pedido confirmado."],
      ["Daño durante el transporte", "Conserva caja, protección, etiqueta y producto. Necesitamos fotografías claras para levantar reporte con la paquetería."],
      ["Producto abierto", "No aceptamos devoluciones por cambio de opinión una vez roto el sello. Si sospechas un defecto o reacción, deja de usarlo, conserva lote y caducidad y contáctanos; una reacción médica requiere valoración profesional."],
      ["Reembolso", "Cuando procede, confirmamos por escrito importe y método. Los tiempos de reflejo dependen del banco o medio de pago."]
    ]
  },
  "/politicas-de-privacidad/": {
    title: "Aviso de privacidad",
    description: "Qué datos usamos para responder por WhatsApp, preparar pedidos y coordinar envíos, y cómo solicitar su eliminación.",
    eyebrow: "Datos personales",
    lead: "Usamos únicamente los datos necesarios para responder consultas, preparar pedidos y coordinar entregas. No vendemos bases de datos.",
    sections: [
      ["Datos que podemos recibir", "Nombre, teléfono, conversación de compra, domicilio de entrega, código postal y comprobante. No pedimos contraseñas, NIP ni acceso a cuentas."],
      ["Para qué se usan", "Atender la solicitud, confirmar un pedido, entregar, dar seguimiento y cumplir obligaciones aplicables. El sitio estático no crea cuentas ni procesa pagos directamente."],
      ["Proveedores", "WhatsApp, correo y la paquetería procesan la información necesaria bajo sus propios avisos. Sólo compartimos con la transportista los datos requeridos para entregar."],
      ["Acceso o eliminación", "Escribe a ventasminoxidilmexico@gmail.com indicando el teléfono o pedido relacionado. Podemos conservar información cuando exista una obligación legal o una controversia pendiente."]
    ]
  },
  "/terminos-y-condiciones/": {
    title: "Términos y condiciones",
    description: "Condiciones del catálogo, precios, disponibilidad, compra por WhatsApp, uso responsable e información del sitio.",
    eyebrow: "Condiciones del servicio",
    lead: "El sitio es un catálogo. La compra se confirma por WhatsApp con precio, existencia, entrega y forma de pago vigentes.",
    sections: [
      ["Precio y disponibilidad", "Los precios publicados pueden cambiar. Una compra queda confirmada cuando ambas partes validan producto, total, entrega y pago por mensaje."],
      ["Información de salud", "El contenido es educativo y comercial; no es diagnóstico ni prescripción. Sigue la etiqueta y consulta ante síntomas, antecedentes o dudas médicas."],
      ["Imágenes y presentaciones", "Las fotografías identifican productos, pero fabricante, empaque o etiqueta pueden actualizarse. Confirmamos la presentación disponible antes de la compra."],
      ["Uso del sitio", "No está permitido copiar fotografías propias, suplantar la tienda ni usar datos de contacto para fraude. Los enlaces externos se ofrecen como referencia y pueden cambiar."]
    ]
  },
  "/distribuye-mayoreo/": {
    title: "Compras de mayoreo",
    description: "Solicita disponibilidad y cotización de mayoreo con producto, piezas, destino y datos de negocio.",
    eyebrow: "Cotización comercial",
    lead: "Las condiciones de mayoreo dependen de producto, cantidad y destino. No publicamos descuentos ficticios: preparamos una cotización con inventario real.",
    sections: [
      ["Qué enviar", "Producto exacto, cantidad aproximada, ciudad, código postal y si necesitas factura o entrega local."],
      ["Qué confirmamos", "Piezas disponibles, precio unitario, total, tiempo de preparación, envío y vigencia de la cotización."],
      ["Trazabilidad", "Puedes solicitar fotografías del lote y empaque disponible antes de pagar. No aceptes cambios de presentación que no hayan sido confirmados por escrito."],
      ["Iniciar", "Escríbenos por WhatsApp con la frase Cotización de mayoreo y los datos anteriores."]
    ]
  }
};

function trustPage(route, data) {
  const page = trustPages[route];
  const body = `<article class="article trust-article"><header><span class="eyebrow">${escapeHtml(page.eyebrow)}</span><h1>${escapeHtml(page.title)}</h1><p class="article-deck">${escapeHtml(page.lead)}</p></header><div class="article-content">${page.sections.map(([title, text]) => `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></section>`).join("")}<div class="contact-panel"><span class="eyebrow">Atención directa</span><h2>¿Necesitas confirmar un dato?</h2><p>Escríbenos y deja por escrito producto, cantidad y tipo de entrega.</p><a class="button" href="${whatsappLink(data, page.title)}">Abrir WhatsApp</a></div></div></article>`;
  return layout(data, { title: page.title, path: route, description: page.description, robots: "index, follow", schema: breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: page.title, path: route }]), body });
}

function redirectLikePage(data, title, pathName, message) {
  const body = `<section class="page-hero compact"><span class="eyebrow">Compra directa</span><h1>${title}</h1><p>${message}</p><div class="hero-actions"><a class="button" href="${whatsappLink(data)}">Abrir WhatsApp</a><a class="button secondary" href="/shop/">Ver tienda</a></div></section>`;
  return layout(data, { title, path: pathName, description: message, body });
}

function notFoundPage(data, index) {
  const safeIndex = JSON.stringify(index).replace(/</g, "\\u003c");
  const body = `
    <section class="not-found">
      <div>
        <span class="eyebrow">404 controlado</span>
        <h1>No encontramos esta pagina, pero no te vamos a dejar perdido.</h1>
        <p id="nf-message">Estamos buscando la URL mas parecida dentro del sitio nuevo.</p>
        <div class="hero-actions">
          <a class="button" id="nf-primary" href="/shop/">Ir a tienda</a>
          <a class="button secondary" href="/blog/">Ver blog</a>
          <a class="button secondary" href="/contact/">Sucursal y contacto</a>
        </div>
      </div>
      <aside class="nf-panel">
        <strong>URL solicitada</strong>
        <code id="nf-path">/</code>
        <p>Si venias desde Google o desde una URL vieja de WordPress, este sistema intenta mandarte a producto, categoria o entrada relacionada.</p>
        <ol id="nf-suggestions"></ol>
      </aside>
    </section>
    <script>
      window.__REDIRECT_INDEX__ = ${safeIndex};
      (function () {
        const data = window.__REDIRECT_INDEX__ || { redirects: [], routes: [] };
        const current = normalize(location.pathname);
        const pathNode = document.getElementById('nf-path');
        const message = document.getElementById('nf-message');
        const primary = document.getElementById('nf-primary');
        const suggestions = document.getElementById('nf-suggestions');
        if (pathNode) pathNode.textContent = location.pathname + location.search;

        const exact = data.redirects.find((rule) => normalize(rule.from) === current);
        if (exact) {
          if (message) message.textContent = 'Esta URL vieja ya tiene redireccion guardada. Te estamos llevando a la pagina correcta.';
          location.replace(exact.to + location.search);
          return;
        }

        const fallback = inferFallback(current, data.routes || []);
        if (fallback && primary) {
          primary.href = fallback.path;
          primary.textContent = 'Ir a: ' + fallback.title;
          if (message) message.textContent = 'No hubo coincidencia exacta, pero encontramos una pagina parecida.';
        } else if (message) {
          message.textContent = 'No hubo coincidencia exacta. Usa tienda, blog o contacto para seguir navegando.';
        }

        for (const item of bestMatches(current, data.routes || []).slice(0, 5)) {
          const li = document.createElement('li');
          li.innerHTML = '<a href="' + item.path + '">' + escapeHtml(item.title) + '</a>';
          suggestions.appendChild(li);
        }

        function normalize(value) {
          try { value = decodeURIComponent(value); } catch {}
          value = String(value || '/').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
          value = value.split('?')[0].split('#')[0].replace(/\\/+/g, '/');
          if (!value.startsWith('/')) value = '/' + value;
          if (!/\\.[a-z0-9]{2,5}$/.test(value) && !value.endsWith('/')) value += '/';
          return value;
        }

        function words(value) {
          return normalize(value).replace(/\\.[a-z0-9]+$/, '').split(/[^a-z0-9]+/).filter((word) => word.length > 2);
        }

        function scoreRoute(currentPath, route) {
          const currentWords = new Set(words(currentPath));
          const routeWords = new Set([...words(route.path), ...words(route.title)]);
          let score = 0;
          for (const word of currentWords) if (routeWords.has(word)) score += word.length > 6 ? 3 : 1;
          if (normalize(route.path).includes(currentPath.replace(/^\\/|\\/$/g, ''))) score += 8;
          return score;
        }

        function bestMatches(currentPath, routes) {
          return routes
            .map((route) => ({ ...route, score: scoreRoute(currentPath, route) }))
            .filter((route) => route.score > 1)
            .sort((a, b) => b.score - a.score);
        }

        function inferFallback(currentPath, routes) {
          const legacyUploadPath = '/wp-' + 'content/uploads/';
          if (currentPath.includes(legacyUploadPath)) return { path: '/shop/', title: 'Tienda' };
          if (currentPath.includes('/producto/') || currentPath.includes('/product/')) return bestMatches(currentPath, routes).find((item) => item.type === 'producto') || { path: '/shop/', title: 'Tienda' };
          if (currentPath.includes('/categoria') || currentPath.includes('/product-category/') || currentPath.includes('/category/')) return bestMatches(currentPath, routes).find((item) => item.type === 'categoria') || { path: '/shop/', title: 'Tienda' };
          if (currentPath.includes('/tag/') || currentPath.includes('/author/') || currentPath.includes('/feed/')) return { path: '/blog/', title: 'Blog' };
          return bestMatches(currentPath, routes)[0] || null;
        }

        function escapeHtml(value) {
          return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
        }
      })();
    </script>`;
  return layout(data, {
    title: "Pagina no encontrada",
    path: "/404.html",
    description: "Pagina no encontrada. Te ayudamos a llegar a tienda, blog o contacto.",
    bodyClass: "error-page",
    body,
    schema: { "@context": "https://schema.org", "@type": "WebPage", name: "Pagina no encontrada", url: `${SITE_URL}/404.html` }
  }).replace("</head>", "  <meta name=\"robots\" content=\"noindex, follow\">\n</head>");
}

function staticRedirectPage(data, rule) {
  const target = normalizeRoute(rule.to);
  const body = `
    <section class="page-hero compact">
      <span class="eyebrow">Redireccion</span>
      <h1>Movimos esta pagina</h1>
      <p>Esta URL viene del sitio anterior. Te estamos llevando a la version correcta.</p>
      <div class="hero-actions">
        <a class="button" href="${target}">Ir ahora</a>
        <a class="button secondary" href="/shop/">Ver tienda</a>
      </div>
    </section>
    <script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>`;
  return layout(data, {
    title: "Pagina movida",
    path: rule.from,
    description: "Esta pagina fue movida a una URL nueva.",
    body,
    schema: { "@context": "https://schema.org", "@type": "WebPage", name: "Pagina movida", url: `${SITE_URL}${rule.from}` }
  })
    .replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${SITE_URL}${target}">`)
    .replace("</head>", `  <meta name="robots" content="noindex, follow">\n  <meta http-equiv="refresh" content="0; url=${target}">\n</head>`);
}

async function writeRedirectArtifacts(data, routes) {
  const redirects = legacyRedirects(data);
  const index = redirectIndex(data, routes, redirects);
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
    redirects: redirects.slice(0, 1024).map((rule) => ({
      source: rule.from,
      destination: rule.to,
      permanent: true
    }))
  };
  await writeFile(path.join(DIST, "vercel.json"), `${JSON.stringify(vercel, null, 2)}\n`, "utf8");
  await writeFile(path.join(ROOT, "vercel.json"), `${JSON.stringify(vercel, null, 2)}\n`, "utf8");

  const report = [
    "# Auditoria de redirecciones",
    "",
    `Generado: ${new Date().toISOString()}`,
    `Reglas 301 generadas: ${redirects.length}`,
    `Rutas indexadas para 404 inteligente: ${index.routes.length}`,
    "",
    "## Tipos cubiertos",
    "",
    "- URLs importadas desde WordPress (`oldUrl`) para productos, paginas y entradas.",
    "- Alias de WooCommerce en ingles: `/product/` y `/product-category/`.",
    "- Categorias antiguas de blog: `/category/...`.",
    "- Archivos antiguos de `/wp-content/uploads/...` cuando existe imagen local equivalente.",
    "- Alias comerciales: tienda, carrito, checkout, sucursal, privacidad y mayoreo.",
    "",
    "## Reglas principales",
    "",
    ...redirects.slice(0, 120).map((rule) => `- ${rule.from} -> ${rule.to} (${rule.reason})`),
    redirects.length > 120 ? `\n... ${redirects.length - 120} reglas mas en dist/redirects.json` : ""
  ];
  await writeFile(path.join(ROOT, "content", "redirect-audit.md"), `${report.join("\n")}\n`, "utf8");
  return redirects;
}

function duplicateReport(posts) {
  const normalized = new Map();
  const groups = [];
  for (const post of posts) {
    const key = post.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 8)
      .sort()
      .join(" ");
    if (!key) continue;
    if (!normalized.has(key)) normalized.set(key, []);
    normalized.get(key).push(post);
  }
  for (const group of normalized.values()) {
    if (group.length > 1) groups.push(group);
  }
  const lines = [
    "# Reporte de posibles posts repetidos",
    "",
    "No borre estos posts sin revisar datos de trafico en Search Console. El sitio estatico conserva sus URLs; este reporte solo marca candidatos para fusionar contenido despues.",
    ""
  ];
  if (!groups.length) {
    lines.push("No se detectaron titulos exactamente parecidos con la regla actual.");
  } else {
    for (const group of groups) {
      lines.push(`## Grupo (${group.length})`);
      for (const post of group) lines.push(`- ${post.title} - ${post.path}`);
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

const css = `
:root{--ink:#17211c;--muted:#62706a;--line:#dfe7e1;--bg:#f7f8f4;--panel:#ffffff;--brand:#1f6f43;--brand-2:#d99d2b;--deep:#123527;--soft:#eef5ec;--danger:#a53d2d;--radius:8px;--shadow:0 18px 55px rgba(23,33,28,.12)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55}img{max-width:100%;display:block}a{color:inherit}.skip-link{position:absolute;left:-999px;top:auto}.skip-link:focus{left:1rem;top:1rem;z-index:10;background:#fff;padding:.75rem 1rem}
.topbar{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;background:var(--deep);color:#fff;font-size:.86rem;padding:.55rem 1rem}.site-header{background:#fff;position:sticky;top:0;z-index:9;box-shadow:0 1px 0 var(--line)}.nav{max-width:1180px;margin:0 auto;display:flex;align-items:center;gap:1rem;padding:.9rem 1rem}.brand{display:flex;align-items:center;gap:.65rem;text-decoration:none;margin-right:auto}.brand-mark{width:42px;height:42px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:800}.brand small{display:block;color:var(--muted);font-size:.8rem}.menu{display:flex;gap:.9rem;align-items:center;font-size:.93rem}.menu a,.footer a{text-decoration:none}.menu a:hover,.footer a:hover{text-decoration:underline}.menu-toggle{display:none}.nav-cta,.button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border-radius:6px;background:var(--brand);color:#fff;text-decoration:none;padding:.72rem 1rem;font-weight:700;border:0}.button.secondary{background:#fff;color:var(--deep);border:1px solid var(--line)}.button.small{min-height:36px;font-size:.88rem;padding:.55rem .75rem}
.hero{min-height:650px;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.9fr);align-items:stretch;background:var(--deep);color:#fff}.hero-media{min-height:420px;overflow:hidden}.hero-media img{width:100%;height:100%;object-fit:cover}.hero-copy{align-self:center;padding:clamp(2rem,5vw,5rem);max-width:680px}.eyebrow{text-transform:uppercase;letter-spacing:0;font-size:.78rem;color:var(--brand-2);font-weight:800}.hero h1,.page-hero h1{font-size:clamp(2.4rem,6vw,5.2rem);line-height:.98;margin:.45rem 0 1rem}.hero p,.page-hero p{font-size:1.12rem;color:rgba(255,255,255,.86);max-width:640px}.hero-actions{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.4rem}.trust-band{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line)}.trust-band div{background:#fff;padding:1.4rem;text-align:center}.trust-band strong{display:block;font-size:1.9rem;color:var(--brand)}.trust-band span{color:var(--muted)}
.section{max-width:1180px;margin:0 auto;padding:4.5rem 1rem}.split{display:grid;grid-template-columns:1fr .8fr;gap:3rem;align-items:center}.split h2,.section-heading h2,.contact-panel h2,.category-strip h2{font-size:clamp(1.8rem,3vw,3rem);line-height:1.05;margin:.4rem 0 1rem}.feature-image{border-radius:var(--radius);box-shadow:var(--shadow);width:100%;aspect-ratio:4/3;object-fit:cover}.check-list{padding:0;list-style:none}.check-list li{padding:.65rem 0;border-bottom:1px solid var(--line)}.check-list li:before{content:"";display:inline-block;width:.65rem;height:.65rem;border-radius:50%;background:var(--brand);margin-right:.65rem}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}.section-heading a{font-weight:700;color:var(--brand)}
.product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem}.product-card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column;min-height:100%}.product-image{aspect-ratio:1/1;background:var(--soft);display:grid;place-items:center;overflow:hidden}.product-image img{width:100%;height:100%;object-fit:contain;padding:.5rem}.product-copy{padding:1rem;display:flex;flex-direction:column;gap:.65rem;flex:1}.product-copy h2{font-size:1.02rem;line-height:1.25;margin:0}.product-copy h2 a{text-decoration:none}.product-copy p{margin:0;color:var(--muted);font-size:.92rem}.product-actions{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:auto}.product-actions strong,.price{font-size:1.25rem;color:var(--brand)}
.category-strip{padding-top:1rem}.category-links{display:flex;gap:.65rem;flex-wrap:wrap}.category-links a{border:1px solid var(--line);background:#fff;border-radius:999px;padding:.6rem .85rem;text-decoration:none}.category-links a.active{background:var(--deep);color:#fff}.category-links span{color:var(--brand-2);font-weight:700}.category-links.vertical{display:grid;gap:.5rem}.category-links.vertical a{border-radius:6px;display:flex;justify-content:space-between}
.contact-panel{display:flex;align-items:center;justify-content:space-between;gap:2rem;background:var(--deep);color:#fff;max-width:1180px;border-radius:var(--radius);margin-bottom:4rem}.contact-panel p{color:rgba(255,255,255,.82)}.page-hero{background:var(--deep);color:#fff;padding:5rem 1rem}.page-hero.compact{min-height:320px;display:grid;align-content:center}.page-hero>*{max-width:1180px;width:100%;margin-left:auto;margin-right:auto}.page-hero h1{font-size:clamp(2.2rem,5vw,4.6rem)}
.shop-layout{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:260px 1fr;gap:2rem;padding:3rem 1rem}.filters{position:sticky;top:105px;align-self:start}.filters h2,.toolbar label{font-size:1rem}.toolbar{display:flex;align-items:center;gap:1rem;margin-bottom:1rem}.toolbar input{width:min(420px,100%);padding:.8rem;border:1px solid var(--line);border-radius:6px;background:#fff}.product-detail{max-width:1180px;margin:0 auto;padding:4rem 1rem;display:grid;grid-template-columns:.9fr 1.1fr;gap:3rem}.gallery{display:grid;gap:1rem}.gallery img{background:#fff;border:1px solid var(--line);border-radius:var(--radius);aspect-ratio:1/1;object-fit:contain;padding:1rem}.detail-copy{align-self:center}.detail-copy h1{font-size:clamp(2rem,4vw,4rem);line-height:1.05;margin:.4rem 0 1rem}.article{max-width:860px;margin:0 auto;padding:4rem 1rem}.article header h1{font-size:clamp(2rem,5vw,4rem);line-height:1.05;margin:.35rem 0}.article time,.post-card time{color:var(--muted);font-size:.9rem}.article-image{width:100%;max-height:520px;object-fit:cover;border-radius:var(--radius);margin:2rem 0}.article-content{font-size:1.05rem}.article-content h2,.article-content h3{line-height:1.15;margin-top:2rem}.article-content img{height:auto;border-radius:var(--radius);margin:1rem 0}.article-content a{color:var(--brand);font-weight:700}.post-grid{max-width:1180px;margin:0 auto;padding:3rem 1rem;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.post-card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}.post-card img{aspect-ratio:16/10;width:100%;object-fit:cover}.post-card div{padding:1rem}.post-card h2{font-size:1.1rem;line-height:1.25}.post-card a{text-decoration:none}
.footer{background:#111d17;color:#fff;padding:3rem 1rem;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:2rem}.footer>div{max-width:440px}.footer h2{font-size:1.1rem}.footer p,.footer a{display:block;color:rgba(255,255,255,.76);margin:.45rem 0}.float-wa{position:fixed;right:18px;bottom:18px;z-index:80;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:58px;background:linear-gradient(135deg,#25d366 0%,#128c7e 100%);color:#fff;text-decoration:none;font-weight:900;line-height:1;border:2px solid rgba(255,255,255,.88);border-radius:999px;padding:0 18px;box-shadow:0 16px 34px rgba(18,140,126,.36),0 0 0 8px rgba(37,211,102,.12);transition:transform .18s ease,box-shadow .18s ease}.float-wa svg{width:28px;height:28px;fill:currentColor}.float-wa:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 20px 42px rgba(18,140,126,.46),0 0 0 10px rgba(37,211,102,.16)}
@media (max-width:980px){.menu-toggle{display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:6px;padding:.6rem .8rem}.menu{display:none;position:absolute;left:1rem;right:1rem;top:104px;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:1rem;box-shadow:var(--shadow);flex-direction:column;align-items:flex-start}.menu.open{display:flex}.nav-cta{display:none}.hero,.split,.product-detail,.shop-layout,.footer{grid-template-columns:1fr}.hero{min-height:auto}.hero-copy{padding:2rem 1rem 3rem}.trust-band{grid-template-columns:repeat(2,1fr)}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.post-grid{grid-template-columns:1fr 1fr}.filters{position:static}.contact-panel{margin-left:1rem;margin-right:1rem;display:grid}.topbar{display:none}}
@media (max-width:620px){.nav{padding:.75rem}.brand small{display:none}.hero-media{min-height:300px}.hero h1,.page-hero h1{font-size:2.4rem}.trust-band,.product-grid,.post-grid{grid-template-columns:1fr}.section{padding:3rem 1rem}.product-actions{display:grid}.toolbar{display:grid}.footer{padding-bottom:5rem}}

/* Visual refresh inspired by the original WordPress site */
.brand-logo{display:none}.brand-mark{display:none}.brand span{display:block}.brand strong{font-family:Georgia,serif;font-size:1.55rem;letter-spacing:.02em;text-transform:uppercase}.brand small{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em}.brand:before{content:"";width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#fff,#7ec8ff);box-shadow:inset 0 0 0 10px rgba(6,19,38,.18);display:block}
.site-header{background:#fff}.header-overlay{position:absolute;left:0;right:0;top:0;background:linear-gradient(180deg,rgba(8,22,61,.72),rgba(8,22,61,.28));box-shadow:none;border-bottom:1px solid rgba(255,255,255,.12)}
.header-overlay .topbar{display:none}.header-overlay .nav{min-height:92px}.header-overlay .brand strong,.header-overlay .brand small{color:#fff}.header-overlay .menu a{color:#fff;font-weight:800;text-transform:uppercase;font-size:.82rem}.header-overlay .menu a:hover{text-decoration:none;color:#7ec8ff}.header-overlay .nav-cta{background:#061326;border:1px solid rgba(255,255,255,.2);color:#fff}.header-overlay .menu-toggle{color:#fff;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.28)}
.wp-hero{min-height:760px;display:grid;align-items:center;position:relative;color:#fff;background-image:linear-gradient(90deg,rgba(6,18,68,.9) 0%,rgba(18,61,141,.72) 43%,rgba(32,142,232,.42) 100%),var(--hero-image);background-size:cover;background-position:center;overflow:hidden}
.wp-hero:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 62% 38%,rgba(255,255,255,.12),transparent 28%),linear-gradient(135deg,transparent 0 32%,rgba(255,255,255,.06) 32% 36%,transparent 36% 100%);pointer-events:none}.wp-hero-inner{position:relative;z-index:1;width:min(1180px,calc(100% - 2rem));margin:0 auto;padding-top:80px}.wp-hero .eyebrow{color:#fff;text-transform:none;font-size:1rem}.home-hero .wp-hero-inner>h1:not(.funnel-hero-title),.home-hero .wp-hero-inner>p:not(.funnel-hero-lead),.home-hero .wp-hero-inner>.hero-actions:not(.funnel-hero-actions){display:none}.wp-hero h1{max-width:770px;font-size:clamp(2.8rem,5.5vw,5rem);line-height:1.12;margin:1rem 0;font-weight:900}.wp-hero p{max-width:690px;color:#fff;font-size:1.08rem}.button.dark{background:#061326;color:#fff;border:1px solid rgba(255,255,255,.15)}.button.outline-light{background:#061326;color:#fff;border:1px solid #08a5ff}.center-actions{display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;margin-top:1.2rem}
.funnel-intent{background:#f4f7fb;padding:4.5rem 1rem;border-bottom:1px solid var(--line)}.funnel-intent .centered{text-align:center;display:block;max-width:880px;margin:0 auto 1.6rem}.funnel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;max-width:1180px;margin:0 auto}.funnel-grid a{display:flex;min-height:150px;flex-direction:column;justify-content:space-between;gap:1rem;background:#fff;border:1px solid #dbeafe;border-left:4px solid var(--brand);border-radius:8px;padding:1.35rem;color:var(--ink);box-shadow:0 18px 44px rgba(13,35,72,.10)}.funnel-grid a:hover{transform:translateY(-3px);box-shadow:0 24px 54px rgba(13,35,72,.16)}.funnel-grid strong{font-size:1.1rem}.funnel-grid span{color:var(--muted);line-height:1.5}
.service-intro{padding:5rem 1rem 4rem;background:#fff;text-align:center}.service-intro>span{display:inline-block;width:9px;height:9px;background:#061326;box-shadow:230px 0 0 #061326;margin-bottom:1rem}.service-intro h2{font-size:clamp(2rem,3vw,3rem);line-height:1.05;margin:.4rem 0}.service-intro>p{max-width:760px;margin:0 auto 2.4rem;color:#33455b}.service-grid{width:min(1320px,100%);margin:0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.6rem;text-align:left}.service-grid article{min-height:230px;border:1px solid #dfe7f0;border-radius:8px;background:#fff;padding:2.3rem;transition:transform .2s ease,box-shadow .2s ease}.service-grid article:hover{transform:translateY(-3px);box-shadow:0 24px 70px rgba(13,35,72,.12)}.service-grid b,.contact-info-grid b{display:block;color:#1785d6;font-size:2rem;margin-bottom:1rem}.service-grid h3,.contact-info-grid h3{font-size:1.25rem;margin:.4rem 0;color:#061326}.service-grid p,.contact-info-grid p{color:#314156;margin:0}
.photo-band{background:#f4f7fb;padding:5rem 1rem;display:grid;grid-template-columns:minmax(260px,420px) minmax(0,760px);gap:3rem;align-items:center;justify-content:center}.photo-copy h2{font-size:clamp(2rem,4vw,3.8rem);line-height:1.03;margin:.5rem 0}.photo-copy p{color:#475870}.photo-stack{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.photo-stack img{width:100%;height:430px;object-fit:cover;border-radius:8px;box-shadow:0 24px 70px rgba(13,35,72,.18)}.photo-stack img:nth-child(2){margin-top:3rem}
.contact-hero{min-height:710px;background-image:linear-gradient(90deg,rgba(20,9,76,.86) 0%,rgba(27,35,98,.70) 45%,rgba(32,12,88,.36) 100%),var(--hero-image);background-position:center}.locations-section{background:#fff;padding:6rem 1rem 4rem}.location-photo-grid{width:min(1280px,100%);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:2rem}.location-photo{height:340px;position:relative;overflow:hidden;border-radius:8px;box-shadow:0 22px 60px rgba(5,18,40,.14)}.location-photo:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,17,39,.08),rgba(8,17,39,.72))}.location-photo img{width:100%;height:100%;object-fit:cover}.location-photo div{position:absolute;z-index:1;left:2rem;right:2rem;bottom:1.7rem;color:#fff}.location-photo h2{font-size:1.7rem;margin:0 0 .35rem}.location-photo p{font-size:1.12rem;margin:0}.contact-info-grid{width:min(1280px,100%);margin:2rem auto 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1.5rem}.contact-info-grid article{background:#fff;box-shadow:0 22px 70px rgba(16,43,78,.08);border:1px solid #eef2f6;border-radius:8px;padding:2.2rem;text-align:center;min-height:210px}.contact-info-grid a{text-decoration:none;color:#314156}
.contact-main{padding:4rem 1rem 6rem;background:#fff;display:grid;grid-template-columns:minmax(260px,480px) minmax(0,620px);justify-content:center;gap:5rem;align-items:center}.contact-copy{text-align:center}.contact-copy h2,.contact-final h2{font-size:clamp(2.2rem,4vw,3.7rem);line-height:1.04;margin:.5rem 0}.contact-copy p{color:#4a5b71}.contact-actions{display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;margin:1.5rem 0}.mini-list{display:grid;gap:.7rem;margin-top:1.4rem}.mini-list span{padding:.75rem 1rem;border-radius:999px;background:#f2f7fb;color:#26384d}.map-panel iframe{width:100%;height:470px;border:0;border-radius:8px;box-shadow:0 24px 70px rgba(13,35,72,.16)}.contact-final{margin:0 auto 5rem;width:min(1120px,calc(100% - 2rem));border-radius:8px;background:linear-gradient(120deg,#061326,#123b6e 52%,#1684d6);color:#fff;text-align:center;padding:4rem 1rem}.contact-final p{max-width:620px;margin:0 auto 1.5rem;color:rgba(255,255,255,.82)}
.shop-hero{background:#0d3d2a;color:#fff;padding:3.8rem 1rem 3.2rem;text-align:center}.shop-hero .eyebrow{color:#f2b232}.shop-hero h1{font-size:clamp(2.2rem,4vw,4rem);line-height:1;margin:.35rem auto .75rem;max-width:860px}.shop-hero p{max-width:620px;margin:0 auto;color:rgba(255,255,255,.84)}
.shop-layout{max-width:1480px;grid-template-columns:290px 1fr;gap:2.2rem;padding:2.4rem 1rem 4rem;background:#f7faf7}.filters{top:110px}.filters h2{font-size:1.2rem;margin:0 0 1.2rem;color:#18231f}.shop-layout .category-links.vertical{gap:.65rem}.shop-layout .category-links.vertical a{background:#fff;border:1px solid #dce8de;box-shadow:0 8px 24px rgba(18,61,42,.04);border-radius:8px;padding:.9rem 1rem;color:#1f2b26;font-size:1rem}.shop-layout .category-links.vertical a span{color:#dc9a16}.shop-layout .category-links.vertical a.active,.shop-layout .category-links.vertical a:hover{background:#0d3d2a;color:#fff;text-decoration:none}.toolbar{justify-content:space-between;background:#fff;border:1px solid #dce8de;border-radius:8px;padding:.9rem 1rem;margin-bottom:1.25rem}.toolbar div{display:grid}.toolbar div strong{color:#0d3d2a}.toolbar div span{color:#6c7c73;font-size:.9rem}.toolbar input{border-color:#dce8de;background:#f8fbf8}
.shop-layout .product-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:1.2rem}.shop-card{border:1px solid #dce8de;border-radius:8px;background:#fff;box-shadow:0 12px 34px rgba(18,61,42,.06);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.shop-card:hover{transform:translateY(-4px);border-color:#b9d1bf;box-shadow:0 24px 60px rgba(18,61,42,.12)}.shop-image{position:relative;aspect-ratio:1/1;background:#f0f7ef;margin:10px;border-radius:6px}.shop-image img{padding:.9rem;object-fit:contain;transition:transform .18s ease}.shop-card:hover .shop-image img{transform:scale(1.04)}.product-badge{position:absolute;left:.75rem;top:.75rem;z-index:1;background:#fff;color:#0d3d2a;border:1px solid #dce8de;border-radius:999px;padding:.3rem .55rem;font-size:.72rem;font-weight:800;text-transform:uppercase}.shop-copy{padding:0 1.15rem 1.15rem;gap:.65rem}.shop-copy .eyebrow{color:#dc9a16;font-size:.75rem;line-height:1.2}.shop-copy h2{font-size:1.08rem;line-height:1.18;min-height:3.8em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.product-meta{display:flex;gap:.4rem;flex-wrap:wrap;min-height:26px}.product-meta span{font-size:.73rem;border:1px solid #dce8de;color:#607267;background:#fbfdfb;border-radius:999px;padding:.22rem .5rem}.shop-actions{align-items:end}.shop-actions strong{font-size:1.35rem;color:#08733f}.shop-actions .button{background:#1d7747;border-radius:7px;min-width:92px}
.blog-pagination{max-width:1180px;margin:0 auto 4rem;padding:0 1rem;display:grid;grid-template-columns:1fr auto 1fr;gap:1rem;align-items:center}.blog-pagination>a:last-child{justify-self:end}.page-dots{display:flex;gap:.45rem;align-items:center;justify-content:center;flex-wrap:wrap}.page-dots a,.page-dots strong,.page-dots span{min-width:38px;height:38px;border-radius:6px;display:grid;place-items:center;text-decoration:none;border:1px solid var(--line);background:#fff;color:var(--ink);font-weight:700}.page-dots strong{background:var(--brand);color:#fff;border-color:var(--brand)}.page-dots span{border-color:transparent;background:transparent}
.not-found{min-height:calc(100vh - 260px);display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,420px);gap:2rem;align-items:center;width:min(1180px,calc(100% - 2rem));margin:0 auto;padding:5rem 0}.not-found h1{font-size:clamp(2.4rem,5vw,4.8rem);line-height:1.02;margin:.5rem 0}.not-found p{color:#475870;font-size:1.05rem}.nf-panel{border:1px solid var(--line);border-radius:8px;background:#fff;box-shadow:0 20px 60px rgba(13,35,72,.1);padding:2rem}.nf-panel strong{display:block;margin-bottom:.8rem;color:var(--ink)}.nf-panel code{display:block;overflow:auto;border-radius:6px;background:#f2f6f9;color:#102136;padding:.9rem;margin-bottom:1rem}.nf-panel ol{display:grid;gap:.65rem;margin:1rem 0 0;padding-left:1.2rem}.nf-panel a{color:var(--brand);font-weight:800}
@media (max-width:1200px){.shop-layout .product-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:980px){.header-overlay{position:absolute}.brand-logo{width:150px}.wp-hero{min-height:660px}.service-grid,.location-photo-grid,.contact-main,.not-found{grid-template-columns:1fr}.funnel-grid,.contact-info-grid{grid-template-columns:repeat(2,1fr)}.photo-band{grid-template-columns:1fr}.photo-stack img{height:320px}.header-overlay .menu{top:80px}.header-overlay .menu a{color:#061326}.shop-layout{grid-template-columns:1fr}.shop-layout .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.filters{position:static}.shop-layout .category-links.vertical{display:flex;overflow:auto;padding-bottom:.5rem}.shop-layout .category-links.vertical a{white-space:nowrap;min-width:max-content}.toolbar{display:grid;gap:.8rem}}
@media (max-width:620px){.wp-hero{min-height:620px}.wp-hero h1{font-size:2.55rem}.service-grid,.contact-info-grid,.photo-stack,.funnel-grid{grid-template-columns:1fr}.service-grid article{padding:1.5rem}.location-photo{height:290px}.contact-main{gap:2rem}.map-panel iframe{height:360px}.photo-stack img:nth-child(2){margin-top:0}.shop-layout .product-grid{grid-template-columns:1fr}.shop-copy h2{min-height:auto}.shop-hero{text-align:left}.shop-hero h1{font-size:2.5rem}.blog-pagination{grid-template-columns:1fr}.blog-pagination>a:last-child{justify-self:stretch}.blog-pagination .button{width:100%}}
html,body{overflow-x:clip}img{max-width:100%}.float-wa{right:18px;bottom:18px}.page-hero.compact{min-height:260px;padding:4rem 1rem}.page-hero.compact h1{max-width:920px}.page-hero.compact p{max-width:720px;margin-left:auto;margin-right:auto}.shop-layout{width:100%}.filters{min-width:0}.category-links.vertical{min-width:0}.category-links.vertical a{gap:.7rem;align-items:center}.shop-card{min-width:0}.shop-copy h2{overflow-wrap:anywhere}.product-actions{min-width:0}.product-actions .button{white-space:normal;text-align:center}
@media (min-width:981px){.page-hero.compact{text-align:center}.page-hero.compact .eyebrow{display:block}.page-hero.compact h1{margin-left:auto;margin-right:auto}.page-hero.compact p{text-align:center}.shop-layout:not(:has(.toolbar)){max-width:1480px;grid-template-columns:280px 1fr;background:#f7faf7}.shop-layout:not(:has(.toolbar)) .filters{background:#fff;border:1px solid #dce8de;border-radius:8px;padding:1.2rem;box-shadow:0 12px 34px rgba(18,61,42,.06)}.shop-layout:not(:has(.toolbar)) .product-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:1.2rem}}
@media (max-width:980px){.nav{max-width:100%;min-width:0}.brand{min-width:0}.brand strong{font-size:1.1rem}.menu{top:76px}.page-hero.compact{min-height:230px;padding:3rem 1rem}.page-hero.compact h1{font-size:clamp(2rem,9vw,2.65rem);line-height:1.02;overflow-wrap:anywhere;text-wrap:balance}.page-hero.compact p{font-size:1rem;overflow-wrap:anywhere}.shop-layout{padding:2rem 1rem}.shop-layout .category-links.vertical{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem;overflow:visible;padding:0}.shop-layout .category-links.vertical a{min-width:0;max-width:none;white-space:normal;overflow-wrap:anywhere}.shop-layout .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:620px){.topbar{display:none}.nav{padding:.65rem 1rem}.brand-mark{width:42px;height:42px;flex:0 0 42px}.brand small{display:none}.menu-toggle{margin-left:auto}.wp-hero{min-height:560px}.wp-hero-inner{padding-top:58px}.wp-hero h1{font-size:clamp(2.15rem,12vw,3.1rem);line-height:1.05;overflow-wrap:anywhere}.wp-hero p{font-size:1rem}.hero-actions{gap:.7rem}.hero-actions .button{flex:1 1 145px}.shop-layout .category-links.vertical{grid-template-columns:1fr}.shop-layout .product-grid{grid-template-columns:1fr}.category-links.vertical a{font-size:.95rem}.float-wa{right:14px;bottom:14px;width:58px;height:58px;min-height:58px;padding:0;border-radius:50%}.float-wa span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.page-hero.compact{min-height:210px}.page-hero.compact p{white-space:normal}.product-actions{grid-template-columns:1fr}.product-actions .button{width:100%}}

/* Unified design layer: one visual system for every generated route. */
:root{--ink:#101a2a;--muted:#5d6b7e;--line:#dce4ee;--bg:#f5f7fb;--panel:#fff;--brand:#126bb8;--brand-2:#f3a51b;--deep:#071d36;--soft:#eef5fb;--radius:8px;--shadow:0 18px 50px rgba(7,29,54,.12)}
body{font-family:Inter,Arial,Helvetica,sans-serif;color:var(--ink);background:var(--bg);font-size:16px;line-height:1.58}
a{text-decoration:none}.menu a:hover,.footer a:hover,.section-heading a:hover{text-decoration:none;color:var(--brand)}
.site-header,.header-overlay{position:sticky!important;top:0;left:auto;right:auto;background:#fff!important;background-image:none!important;border-bottom:1px solid var(--line);box-shadow:0 10px 30px rgba(7,29,54,.06);z-index:20}
.topbar,.header-overlay .topbar{display:flex;background:var(--deep);color:#fff;min-height:38px;align-items:center;font-size:.88rem;padding:.45rem 1rem}
.nav,.header-overlay .nav{min-height:86px;max-width:1240px;padding:1rem;gap:1rem}
.brand{gap:.75rem}.brand-logo{display:block!important;width:48px;height:48px;border-radius:50%;object-fit:cover;box-shadow:inset 0 0 0 1px var(--line)}.brand:before,.brand-mark{display:none!important}
.brand strong,.header-overlay .brand strong{font-family:Arial,Helvetica,sans-serif;color:var(--ink);font-size:1.35rem;line-height:1;text-transform:none;letter-spacing:0;font-weight:900}.brand small,.header-overlay .brand small{display:block;color:var(--muted);font-size:.82rem;text-transform:none;letter-spacing:.02em;margin-top:.22rem}
.menu,.header-overlay .menu{gap:1.05rem;font-size:.96rem}.menu a,.header-overlay .menu a{color:var(--ink);font-weight:700;text-transform:none;font-size:.96rem;line-height:1}.menu a:hover,.header-overlay .menu a:hover{color:var(--brand)}
.nav-cta,.header-overlay .nav-cta,.button,.button.dark,.button.outline-light{background:var(--brand);color:#fff;border:1px solid var(--brand);border-radius:8px;box-shadow:none}.nav-cta:hover,.button:hover{background:#0d5796;border-color:#0d5796}.button.secondary{background:#fff;color:var(--deep);border:1px solid var(--line)}.button.secondary:hover{background:var(--soft);border-color:#b7c9dc}
.wp-hero,.contact-hero,.shop-hero,.page-hero{background-color:var(--deep);color:#fff}.wp-hero{min-height:660px;padding-top:0;background-image:linear-gradient(90deg,rgba(7,29,54,.90),rgba(18,107,184,.60)),var(--hero-image)}.wp-hero-inner{padding-top:0}.contact-hero{min-height:620px;background-image:linear-gradient(90deg,rgba(7,29,54,.88),rgba(18,107,184,.58)),var(--hero-image)}.shop-hero,.page-hero.compact{background:linear-gradient(135deg,#071d36,#126bb8);text-align:center}
.wp-hero .eyebrow,.shop-hero .eyebrow,.page-hero .eyebrow,.contact-final .eyebrow{color:#ffd47a}.wp-hero h1,.shop-hero h1,.page-hero h1,.article header h1{font-family:Arial,Helvetica,sans-serif;font-weight:900;letter-spacing:0;text-wrap:balance}.wp-hero p,.shop-hero p,.page-hero p{color:rgba(255,255,255,.86)}
.service-intro,.locations-section,.contact-main,.section,.post-grid,.shop-layout{background:var(--bg)}.service-grid article,.contact-info-grid article,.post-card,.product-card,.toolbar,.filters,.nf-panel{background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 12px 34px rgba(7,29,54,.06)}
.service-grid h3,.contact-info-grid h3,.product-copy h2,.post-card h2,.filters h2,.toolbar strong{color:var(--ink)}.service-grid p,.contact-info-grid p,.product-copy p,.post-card p,.article-content,.article-content p{color:#24364b}.service-grid b,.contact-info-grid b{color:var(--brand)}
.shop-layout,.shop-layout:not(:has(.toolbar)){max-width:1240px;grid-template-columns:280px 1fr;gap:1.5rem;background:var(--bg);padding:2.5rem 1rem 4rem}.shop-layout .category-links.vertical a,.category-links.vertical a{background:#fff;border-color:var(--line);box-shadow:none;color:var(--ink)}.shop-layout .category-links.vertical a.active,.shop-layout .category-links.vertical a:hover,.category-links a.active{background:var(--brand);border-color:var(--brand);color:#fff}.category-links span,.shop-layout .category-links.vertical a span{color:var(--brand-2)}
.toolbar{padding:1rem;margin-bottom:1.25rem}.toolbar input{border-color:var(--line);background:#fff}.product-grid,.shop-layout .product-grid,.shop-layout:not(:has(.toolbar)) .product-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:1.15rem}.shop-card,.product-card{border-color:var(--line);box-shadow:0 12px 34px rgba(7,29,54,.06)}.shop-card:hover{border-color:#b7c9dc;box-shadow:0 20px 54px rgba(7,29,54,.12)}.shop-image,.product-image{background:#f7fafd}.product-badge{color:var(--brand);border-color:var(--line)}.shop-copy .eyebrow{color:var(--brand-2)}.product-meta span{border-color:var(--line);background:#f8fbff;color:var(--muted)}.shop-actions strong,.product-actions strong,.price{color:#0d5796}.shop-actions .button{background:var(--brand);border-color:var(--brand)}
.post-grid{padding-top:2.5rem}.post-card{overflow:hidden}.post-card div{padding:1.2rem}.post-card h2{font-size:1.14rem;margin:.6rem 0}.post-card a{color:var(--ink)}.post-card img{aspect-ratio:16/9}.blog-pagination{max-width:1240px}.page-dots strong{background:var(--brand);border-color:var(--brand)}
.article{max-width:900px;background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 12px 34px rgba(7,29,54,.06);margin:3rem auto;padding:3rem}.article header{border-bottom:1px solid var(--line);padding-bottom:1.4rem;margin-bottom:1.6rem}.article header h1{font-size:clamp(2rem,4.4vw,3.6rem)}.article-content h2,.article-content h3{color:var(--ink)}.article-content a{color:var(--brand)}.article-image{border-radius:8px}.article-with-shop{max-width:1180px;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:2rem;align-items:start}.article-main{min-width:0}.article-shop{position:sticky;top:110px;background:#f7faf8;border:1px solid #d9e7de;border-radius:8px;padding:1.25rem;box-shadow:0 12px 30px rgba(15,70,41,.08)}.article-shop h2{font-size:1.35rem;line-height:1.15;margin:.35rem 0 .7rem}.article-shop p{font-size:.95rem;color:#405466}.article-shop .button{width:100%;justify-content:center;margin:.5rem 0 1rem}.article-products{display:grid;gap:.75rem}.article-products a{display:grid;grid-template-columns:62px 1fr;gap:.7rem;align-items:center;text-decoration:none;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:8px;padding:.65rem}.article-products img{width:62px;height:62px;object-fit:contain;background:#fff}.article-products strong{font-size:.86rem;line-height:1.18}.article-products span{color:var(--brand-strong);font-weight:800;font-size:.9rem}@media(max-width:980px){.article-with-shop{display:block}.article-shop{position:static;margin-top:2rem}}
.contact-final{background:linear-gradient(135deg,#071d36,#126bb8)}.map-panel iframe,.location-photo,.feature-image,.gallery img{border-radius:8px;box-shadow:0 18px 50px rgba(7,29,54,.12)}
.footer{background:var(--deep);color:#fff;grid-template-columns:1.2fr 1fr 1fr}.footer p,.footer a{color:rgba(255,255,255,.78)}.float-wa{background:linear-gradient(135deg,#25d366 0%,#128c7e 100%);color:#fff}
@media (max-width:1200px){.product-grid,.shop-layout .product-grid,.shop-layout:not(:has(.toolbar)) .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:980px){.topbar{display:none}.nav,.header-overlay .nav{min-height:72px}.menu,.header-overlay .menu{top:76px;background:#fff;border:1px solid var(--line);box-shadow:var(--shadow);border-radius:8px;padding:1rem}.header-overlay .menu a{color:var(--ink)}.shop-layout,.shop-layout:not(:has(.toolbar)){grid-template-columns:1fr}.service-grid,.contact-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.article{margin:1.5rem 1rem;padding:1.5rem}.wp-hero{min-height:560px}}
@media (max-width:620px){.brand-logo{width:42px;height:42px}.brand strong,.header-overlay .brand strong{font-size:1.05rem}.menu-toggle{background:#fff;border:1px solid var(--line);border-radius:8px}.product-grid,.shop-layout .product-grid,.shop-layout:not(:has(.toolbar)) .product-grid,.service-grid,.contact-info-grid{grid-template-columns:1fr}.shop-hero,.page-hero.compact{text-align:left}.footer{grid-template-columns:1fr}.wp-hero h1{font-size:2.35rem}.article header h1{font-size:2rem}}
.section-wide{width:min(1240px,calc(100% - 2rem));margin:0 auto;padding:5rem 0}.home-feature{display:grid;grid-template-columns:.95fr 1fr;gap:3.5rem;align-items:center}.home-feature-media img{width:100%;height:640px;object-fit:cover;border-radius:8px;box-shadow:var(--shadow)}.home-feature-copy h2,.proof-copy h2,.community-section h2,.testimonials-section h2{font-size:clamp(2rem,4vw,3.55rem);line-height:1.08;margin:.55rem 0 1rem;font-weight:900;text-wrap:balance}.home-feature-copy>p,.proof-copy p,.community-section p,.testimonials-section .section-heading p{color:var(--muted);font-size:1.02rem}.benefit-list{display:grid;gap:1rem;margin-top:2rem}.benefit-list article{display:grid;grid-template-columns:72px 1fr;gap:1.25rem;align-items:center;background:#fff;border:1px solid var(--line);border-radius:8px;padding:1.3rem;box-shadow:0 12px 34px rgba(7,29,54,.06)}.benefit-list b{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:var(--brand);color:#fff;font-size:1.35rem}.benefit-list h3{margin:.1rem 0 .35rem}.benefit-list p{margin:0;color:var(--muted)}
.video-proof{text-align:center}.proof-card{overflow:hidden;border-radius:8px;background:var(--deep);box-shadow:var(--shadow)}.proof-video{position:relative;background:#000}.proof-video iframe,.proof-video img{width:100%;aspect-ratio:16/7;display:block;border:0;object-fit:cover}.proof-video iframe{position:absolute;inset:0;z-index:2}.proof-video img{opacity:.52}.proof-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.08);padding:2rem 1rem}.proof-stats div{display:grid;gap:.35rem;color:#fff}.proof-stats strong{font-size:1.75rem;line-height:1}.proof-stats span{color:#7fc4ff;font-weight:800;font-size:.9rem}.proof-copy{max-width:760px;margin:1.8rem auto 0}.home-cta{width:min(1240px,calc(100% - 2rem));margin:3rem auto 5rem;background:linear-gradient(135deg,#126bb8,#1784d6);color:#fff;border-radius:8px;padding:3rem clamp(1.4rem,5vw,4rem);display:flex;align-items:center;justify-content:space-between;gap:2rem}.home-cta h2{font-size:clamp(1.7rem,3vw,2.6rem);line-height:1.18;margin:0;max-width:760px}.home-cta .button.secondary{background:#fff;color:var(--brand);border-color:#fff}
.community-section{display:grid;grid-template-columns:.92fr 1fr;gap:3.5rem;align-items:center}.community-section>img{width:100%;border-radius:8px;box-shadow:var(--shadow)}.community-section ul{list-style:none;padding:0;margin:1.5rem 0 0;display:grid;grid-template-columns:1fr 1fr;gap:.9rem 1.5rem}.community-section li{position:relative;padding-left:1.65rem;color:#30445b}.community-section li:before{content:"";position:absolute;left:0;top:.42rem;width:.72rem;height:.72rem;border-radius:50%;background:var(--brand)}.testimonials-section{padding-top:3rem}.section-heading.centered{display:block;text-align:center;max-width:760px;margin:0 auto 2rem}.testimonial-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.25rem}.testimonial-grid article{background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 12px 34px rgba(7,29,54,.06);padding:1.6rem}.testimonial-grid article>div{display:flex;align-items:center;gap:1rem;margin-bottom:1.4rem}.testimonial-grid img{width:64px;height:64px;border-radius:4px;object-fit:cover}.testimonial-grid strong{display:block}.testimonial-grid small{display:block;color:var(--muted);margin-top:.2rem}.testimonial-grid p{color:#30445b;margin:0}
.location-feature{display:grid;grid-template-columns:.92fr 1.08fr;gap:2rem;align-items:stretch}.location-feature>div:first-child{background:#061326;color:#fff;border-radius:8px;padding:2rem}.location-feature p{color:#c8d4e2;line-height:1.7}.location-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.location-feature-grid article,.location-dedicated-card{background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 12px 34px rgba(7,29,54,.06);display:flex;flex-direction:column;gap:.75rem;padding:1.5rem}.location-feature-grid strong{font-size:1.2rem}.location-feature-grid span{color:var(--muted)}.location-dedicated{display:grid;grid-template-columns:1.1fr .9fr .9fr;gap:1rem}.location-dedicated-card{min-height:360px}.location-dedicated-card.main{background:#061326;color:#fff}.location-dedicated-card.main p{color:#c8d4e2}.location-dedicated-card.accent{border-color:var(--brand);box-shadow:inset 4px 0 0 var(--brand)}.location-dedicated-card span{color:var(--brand);font-weight:900;text-transform:uppercase;font-size:.78rem;letter-spacing:.08em}.location-dedicated-card h2{font-size:clamp(1.8rem,3vw,2.7rem);line-height:1.05;margin:.2rem 0}.location-dedicated-card p{color:var(--muted);line-height:1.7}.location-dedicated-card strong{margin-top:auto}
.map-section{padding-top:3rem}.map-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem}.map-card{overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 16px 44px rgba(7,29,54,.08);display:grid;grid-template-rows:auto minmax(360px,1fr)}.map-card-copy{padding:1.4rem;display:grid;gap:.55rem}.map-card-copy span{color:var(--brand);font-weight:900;text-transform:uppercase;font-size:.78rem}.map-card-copy h3{font-size:1.55rem;line-height:1.1;margin:0}.map-card-copy p{color:var(--muted);margin:0}.map-card-copy .button{justify-self:start;margin-top:.6rem}.map-card iframe{width:100%;height:100%;min-height:360px;border:0;display:block}.contact-summary{display:block;text-align:center;max-width:900px}.contact-summary .contact-copy{max-width:720px;margin:0 auto}.contact-summary .contact-actions,.contact-summary .mini-list{justify-content:center}.contact-summary .mini-list{max-width:620px;margin-left:auto;margin-right:auto}
.contact-panel{background:linear-gradient(135deg,#071d36,#126bb8);color:#fff;border-radius:8px;padding:3rem;box-shadow:var(--shadow)}.contact-panel h2{color:#fff}.contact-panel p{color:rgba(255,255,255,.84)}.contact-panel .eyebrow{color:#ffd47a}.contact-panel .button{background:#fff;color:var(--brand);border-color:#fff}.contact-panel .button:hover{background:#eef6ff;color:#0d5796;border-color:#eef6ff}
@media (max-width:980px){.home-feature,.community-section,.location-feature,.location-dedicated{grid-template-columns:1fr}.location-feature-grid{grid-template-columns:1fr}.home-feature-media img{height:420px}.proof-stats{grid-template-columns:repeat(2,1fr)}.home-cta{display:grid}.testimonial-grid{grid-template-columns:1fr}.community-section ul{grid-template-columns:1fr}.proof-video iframe,.proof-video img{aspect-ratio:16/9}}
@media (max-width:980px){.map-grid{grid-template-columns:1fr}.map-card{grid-template-rows:auto 340px}}
@media (max-width:620px){.section-wide{padding:3.5rem 0}.home-feature-media img{height:330px}.benefit-list article{grid-template-columns:1fr}.proof-stats{grid-template-columns:1fr}.home-cta{margin:2rem auto 3rem;padding:2rem 1.2rem}.testimonial-grid article{padding:1.25rem}.map-card{grid-template-rows:auto 300px}.map-card iframe{min-height:300px}.map-card-copy .button{width:100%}}
.article-deck{font-size:1.2rem;line-height:1.65;color:#405466;max-width:760px}.byline{display:grid;gap:.25rem;margin-top:1.25rem;color:var(--ink)}.byline span{font-size:.88rem;color:var(--muted)}.guide-article{max-width:980px}.guide-toc{background:#f4f8fb;border:1px solid var(--line);border-radius:8px;padding:1.4rem 1.6rem;margin:1.5rem 0 2.5rem}.guide-toc ol{columns:2;gap:2rem;margin:.8rem 0 0;padding-left:1.2rem}.guide-toc li{break-inside:avoid;margin:.45rem 0}.guide-toc a{color:var(--brand);font-weight:700}.guide-article .article-content section{scroll-margin-top:110px}.safety-note{border-left:5px solid #b7791f;background:#fff8e7;border-radius:4px;padding:1.25rem 1.4rem;margin:2rem 0}.safety-note strong{display:block;color:#744b09;font-size:1.05rem}.safety-note p{margin:.45rem 0 0;color:#51360b}.guide-faq details{border:1px solid var(--line);border-radius:8px;background:#fff;margin:.75rem 0;padding:1rem 1.1rem}.guide-faq summary{cursor:pointer;font-weight:800;color:var(--ink)}.guide-faq details p{margin:.8rem 0 0}.guide-sources{border-top:1px solid var(--line);margin-top:2.5rem;padding-top:.5rem}.guide-sources li{margin:.5rem 0}.guide-label{color:var(--brand);font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.product-facts{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:8px;overflow:hidden;margin-bottom:2.5rem}.product-facts div{background:#fff;padding:1rem;display:grid;gap:.3rem}.product-facts span{color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}.product-facts strong{color:var(--ink)}.trust-article{max-width:900px}.proof-card-factual .proof-video img{opacity:1}.testimonial-grid article>div:has(img){display:flex}.testimonial-grid article>div:not(:has(img)){min-height:54px}.testimonial-grid article small{color:var(--brand)}
@media (max-width:760px){.guide-toc ol{columns:1}.product-facts{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.product-facts{grid-template-columns:1fr}}
`;

const js = `
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
    const query = search.value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    for (const card of cards) {
      const text = card.textContent.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      card.hidden = query && !text.includes(query);
    }
  });
}
`;

async function main() {
  const data = JSON.parse(await readFile(DATA_FILE, "utf8"));
  await rm(DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, "assets"), { recursive: true });
  await cp(path.join(ROOT, "public"), DIST, { recursive: true, force: true });
  await mkdir(path.join(DIST, "assets"), { recursive: true });
  await optimizeImageAssets();
  await writeFile(path.join(DIST, "assets", "site.css"), css.trim(), "utf8");
  await writeFile(path.join(DIST, "assets", "site.js"), js.trim(), "utf8");
  await writeFile(path.join(DIST, ".nojekyll"), "", "utf8");

  await writeRoute("/", homePage(data));
  await writeRoute("/shop/", shopPage(data));
  const blogPosts = editorialGuides;
  const blogPerPage = 24;
  const blogTotalPages = Math.max(1, Math.ceil(blogPosts.length / blogPerPage));
  for (let page = 1; page <= blogTotalPages; page += 1) {
    await writeRoute(page === 1 ? "/blog/" : `/blog/page/${page}/`, blogPage(data, page, blogPerPage));
  }
  await writeRoute("/contact/", contactPage(data, "/contact/"));
  await writeRoute("/sucursales-y-entregas/", locationsPage(data));
  for (const guide of editorialGuides) await writeRoute(guide.path, guidePage(guide, data));
  for (const route of Object.keys(trustPages)) await writeRoute(route, trustPage(route, data));

  for (const product of data.products) {
    await writeRoute(product.path, productPage(product, data));
  }
  for (const category of data.categories) {
    await writeRoute(category.path, categoryPage(category, data));
  }

  const routes = [
    "/",
    "/shop/",
    "/blog/",
    ...editorialGuides.map((item) => item.path),
    ...Object.keys(trustPages),
    ...data.products.map((item) => item.path),
    ...data.categories.map((item) => item.path),
    ...Array.from({ length: blogTotalPages }, (_, index) => index === 0 ? "/blog/" : `/blog/page/${index + 1}/`),
    "/contact/",
    "/sucursales-y-entregas/"
  ];
  const uniqueRoutes = [...new Set(routes)].filter(Boolean);
  const sitemapRoutes = [...writtenRoutes].filter((route) => !noindexRoutes.has(route)).sort();
  const meta = sitemapMeta(data, blogTotalPages);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => sitemapEntry(route, data, meta)).join("\n")}\n</urlset>\n`;
  await writeFile(path.join(DIST, "sitemap.xml"), sitemap, "utf8");
  await writeFile(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, "utf8");
  const redirects = await writeRedirectArtifacts(data, uniqueRoutes);
  const routeKeys = new Set(uniqueRoutes.map(routeKey));
  for (const rule of redirects) {
    if (!path.extname(rule.from) && !routeKeys.has(routeKey(rule.from))) {
      await writeRoute(rule.from, staticRedirectPage(data, rule));
    }
  }
  await writeFile(path.join(ROOT, "content", "duplicate-posts-report.md"), duplicateReport(data.posts), "utf8");

  console.log(`Build listo en ${DIST}`);
  console.log(`${data.products.length} productos, ${data.categories.length} categorias, ${data.posts.length} posts.`);
  console.log(`${redirects.length} redirecciones legacy generadas.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
