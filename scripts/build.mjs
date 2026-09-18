import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { editorialGuides, editorialSources } from "../content/editorial-guides.mjs";

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
  if (/como.*usar|aplicar|aplicacion|rutina|manual|tutorial|dosis/.test(text)) return "/guias/como-aplicar-minoxidil/";
  if (/efectos.*secundarios|reaccion|seguridad|peligro|riesgo|contraindicacion/.test(text)) return "/guias/efectos-secundarios-minoxidil/";
  if (/shedding|resultados|tiempo|cuanto.*tarda|meses|antes.*despues/.test(text)) return "/guias/resultados-minoxidil-shedding/";
  if (/barba|bigote|candado|mejillas|huecos|crecimiento.*barba/.test(text)) return "/guias/minoxidil-para-barba/";
  if (/mujer|mujeres|femenino|cejas|pestanas/.test(text)) return "/guias/minoxidil-mujeres/";
  if (/espuma|foam|liquido|shampoo|gotero|presentacion/.test(text)) return "/guias/minoxidil-liquido-vs-espuma/";
  if (/comprar|cdmx|mexico|tienda|precio|sucursal|original|kirkland|donde.*comprar/.test(text)) return "/guias/comprar-minoxidil-cdmx/";
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
    if (!f || !t || f === t) return;
    rules.set(routeKey(f), { from: f, to: t, status: 301, reason });
  };

  for (const item of [...data.products, ...data.pages]) {
    if (item.oldUrl) addRedirect(pathFromUrl(item.oldUrl), item.path, "imported oldUrl");
  }

  addRedirect("/producto/", "/shop/", "woocommerce base product archive");
  addRedirect("/producto", "/shop/", "woocommerce base product archive");
  addRedirect("/%e2%9c%85como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil/", "/como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil/", "cleaned emoji post slug");
  addRedirect("/%e2%9c%85como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil-2/", "/como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil/", "cleaned emoji post slug");
  addRedirect("/como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil-2/", "/como-identificar-minoxidil-kirkland-original-vs-pirata-una-guia-facil/", "cleaned duplicate post slug");

  // ONLY redirect numbered/orphan duplicate posts
  for (const post of data.posts) {
    if (post.isNumbered) {
      const target = guidePathForPost(post);
      addRedirect(post.path, target, "numbered post redirect");
      if (post.oldUrl) addRedirect(pathFromUrl(post.oldUrl), target, "numbered post oldUrl");
    }
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
    "/mayoreo/": "/distribuye-mayoreo/"
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
  for (const post of data.posts.filter((p) => !p.isNumbered)) routeItems.push({ path: post.path, title: post.title, type: "blog" });
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
  <link rel="stylesheet" href="/assets/site.css">
  <script type="application/ld+json">${JSON.stringify(structuredData(data, page))}</script>
</head>
<body class="${page.bodyClass || ""}">
  <a class="skip-link" href="#contenido">Saltar al contenido</a>
  <div class="top-announcement">
    <div class="container top-announcement-inner">
      <span>📍 <strong>Sucursal CDMX:</strong> Plaza Guelatao Local 76 (Metro Guelatao)</span>
      <span>💬 <strong>WhatsApp:</strong> 55 6938 0408</span>
      <span>🕒 <strong>Horario:</strong> Mar a Dom 12:00 PM – 5:00 PM</span>
    </div>
  </div>
  <header class="site-header">
    <div class="container nav-wrap">
      <a class="brand" href="/" aria-label="Minoxidil en CDMX Inicio">
        <div class="brand-badge">CDMX</div>
        <div class="brand-text">
          <span class="brand-title">Minoxidil</span>
          <span class="brand-sub">Kirkland Original en CDMX</span>
        </div>
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menú">
        <span class="menu-icon"></span>
      </button>
      <nav class="nav-menu" id="menu" aria-label="Principal">
        <a href="/">Inicio</a>
        <a href="/shop/">Tienda</a>
        <a href="/sucursales-y-entregas/">Sucursales y Entregas</a>
        <a href="/blog/">Blog</a>
        <a href="/contact/">Contacto</a>
        <a class="nav-btn" href="${whatsappLink(data)}">💬 WhatsApp: 55 6938 0408</a>
      </nav>
    </div>
  </header>
  <main id="contenido">${page.body}</main>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-col brand-col">
        <div class="brand-text footer-brand">
          <span class="brand-title">Minoxidil en CDMX</span>
          <p>Especialistas en tratamientos para crecimiento de barba y detención de caída del cabello. Distribución de Minoxidil Kirkland 100% original en Ciudad de México y envíos a toda la República.</p>
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
        <h3>Información</h3>
        <ul class="footer-links">
          <li><a href="/shop/">Catálogo de Productos</a></li>
          <li><a href="/sucursales-y-entregas/">Sucursales y Entregas Personales</a></li>
          <li><a href="/blog/">Blog y Consejos de Uso</a></li>
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
  <a class="wa-float" href="${whatsappLink(data)}" aria-label="Contactar por WhatsApp">
    <span class="wa-pulse"></span>
    <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C8.86 3 3 8.77 3 15.86c0 2.27.62 4.49 1.78 6.43L3.1 29l6.88-1.77a13.1 13.1 0 0 0 6.06 1.48C23.23 28.71 29 22.95 29 15.86S23.23 3 16.04 3Zm0 23.47c-1.91 0-3.77-.51-5.4-1.48l-.39-.23-4.08 1.05 1.08-3.96-.26-.41a10.54 10.54 0 0 1-1.62-5.58c0-5.86 4.79-10.62 10.67-10.62 5.87 0 10.64 4.76 10.64 10.62 0 5.85-4.77 10.61-10.64 10.61Zm5.84-7.94c-.32-.16-1.88-.92-2.17-1.03-.29-.1-.5-.16-.71.16-.21.31-.82 1.02-1 1.23-.18.21-.37.23-.69.08-.32-.16-1.35-.49-2.57-1.58-.95-.84-1.59-1.88-1.78-2.2-.18-.31-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.31.32-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.7-.97-2.32-.26-.61-.52-.53-.71-.54h-.61c-.21 0-.55.08-.84.39-.29.31-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.25 3.41 5.45 4.78.76.33 1.35.52 1.81.67.76.24 1.46.21 2.01.13.61-.09 1.88-.76 2.14-1.5.26-.73.26-1.36.18-1.5-.08-.13-.29-.21-.61-.37Z"/></svg>
    <span class="wa-float-text">¿Dudas? Escríbenos</span>
  </a>
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

function sitemapMeta(data, blogTotalPages) {
  const meta = new Map();
  const today = new Date().toISOString().slice(0, 10);
  const set = (route, values) => meta.set(normalizeRoute(route), values);

  set("/", { lastmod: today, changefreq: "weekly", priority: "1.0" });
  set("/shop/", { lastmod: today, changefreq: "weekly", priority: "0.9" });
  set("/sucursales-y-entregas/", { lastmod: today, changefreq: "weekly", priority: "0.9" });
  set("/contact/", { lastmod: today, changefreq: "monthly", priority: "0.8" });

  for (const product of data.products) {
    set(product.path, { lastmod: today, changefreq: "weekly", priority: "0.8" });
  }

  for (const category of data.categories) {
    set(category.path, { lastmod: today, changefreq: "weekly", priority: "0.75" });
  }

  for (const guide of editorialGuides) {
    set(guide.path, { lastmod: today, changefreq: "monthly", priority: "0.8" });
  }

  // Include all 243 semantic blog posts in sitemap!
  for (const post of data.posts) {
    if (!post.isNumbered) {
      set(post.path, {
        lastmod: (post.modified || post.date || today).slice(0, 10),
        changefreq: "monthly",
        priority: "0.7"
      });
    }
  }

  for (let page = 1; page <= blogTotalPages; page += 1) {
    set(page === 1 ? "/blog/" : `/blog/page/${page}/`, {
      lastmod: today,
      changefreq: "weekly",
      priority: page === 1 ? "0.8" : "0.5"
    });
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

function homePage(data) {
  const heroImg = pickImage(data, "diseno-sin-titulo-1", 0);
  const featured = data.products.slice(0, 8);
  const storeImage = "/assets/images/diseno-sin-titulo-2.jpg";

  const body = `
    <section class="hero-section" style="--hero-bg: url('${heroImg}')">
      <div class="container hero-content">
        <span class="eyebrow-tag">📍 TIENDA FÍSICA EN CDMX · ENVÍOS A TODO MÉXICO</span>
        <h1 class="hero-headline">
          Minoxidil Kirkland Original en CDMX | Venta en Sucursal y Entregas Personales
        </h1>
        <p class="hero-subtitle">
          El tratamiento comprobado para crecimiento de barba y detención de caída del cabello. Compra con total seguridad y confianza: producto 100% original con lote y caducidad verificables, atención directa en tienda física en Plaza Guelatao y entregas en CDMX o envíos express a todo el país.
        </p>
        <div class="hero-ctas">
          <a class="btn btn-primary btn-large" href="${whatsappLink(data, "Quiero comprar Minoxidil Kirkland en CDMX")}">
            💬 Pedir por WhatsApp (Atención Inmediata)
          </a>
          <a class="btn btn-secondary btn-large" href="/shop/">
            🏷️ Ver Catálogo y Precios
          </a>
        </div>
        <div class="trust-pill-grid">
          <div class="trust-pill">
            <span class="trust-icon">🛡️</span>
            <div>
              <strong>100% Kirkland Original</strong>
              <span>Lote y caducidad comprobable</span>
            </div>
          </div>
          <div class="trust-pill">
            <span class="trust-icon">📍</span>
            <div>
              <strong>Sucursal Plaza Guelatao</strong>
              <span>Local 76, Metro Guelatao Línea A</span>
            </div>
          </div>
          <div class="trust-pill">
            <span class="trust-icon">🤝</span>
            <div>
              <strong>Entregas en CDMX</strong>
              <span>Puntos acordados y envíos rápidos</span>
            </div>
          </div>
          <div class="trust-pill">
            <span class="trust-icon">⭐</span>
            <div>
              <strong>+10 Años de Experiencia</strong>
              <span>Asesoría honesta y personalizada</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Guía de Originalidad -->
    <section class="section section-originality">
      <div class="container">
        <div class="section-header text-center">
          <span class="section-tag">SEGURIDAD Y CONFIANZA</span>
          <h2>Cómo Identificar Minoxidil Kirkland Original vs Pirata</h2>
          <p>En Ciudad de México circulan muchas copias y clones diluidos. Revisa estos 4 puntos antes de comprar para garantizar tu salud y resultados:</p>
        </div>
        <div class="originality-grid">
          <div class="orig-card">
            <div class="orig-num">1</div>
            <h3>Código de Lote y Caducidad</h3>
            <p>La caja sellada y cada uno de los 6 frascos tienen impreso en tinta láser indeleble el mismo número de lote y fecha de vencimiento. Desconfía si están borrados o desfasados.</p>
          </div>
          <div class="orig-card">
            <div class="orig-num">2</div>
            <h3>Gotero Original Graduado</h3>
            <p>El aplicador de Kirkland Signature incluye rosca de seguridad para niños y una marca exacta de 1.0 ml. Las copias suelen incluir goteros genéricos sin graduación precisa.</p>
          </div>
          <div class="orig-card">
            <div class="orig-num">3</div>
            <h3>Color y Aroma Real</h3>
            <p>La fórmula líquida original al 5% tiene una tonalidad ligeramente ámbar/amarillenta con olor característico alcohólico y propilenglicol. Nunca debe oler a perfume ni tener consistencia jabonosa.</p>
          </div>
          <div class="orig-card">
            <div class="orig-num">4</div>
            <h3>Revisión Física en Tienda</h3>
            <p>En nuestra sucursal de Plaza Guelatao (Iztapalapa) puedes revisar los empaques, sellos y números de serie antes de pagar. Te damos total transparencia.</p>
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
            <div class="pricing-price">$300 <small>MXN</small></div>
            <p class="pricing-desc">1 Frasco Kirkland 5% Líquido (60 ml)</p>
            <ul class="pricing-features">
              <li>✓ Ideal para probar tolerancia en la piel</li>
              <li>✓ Duración para 30 días de aplicación</li>
              <li>✓ Asesoría personalizada por WhatsApp</li>
              <li>✓ Entrega en CDMX o sucursal</li>
            </ul>
            <a class="btn btn-primary" href="${whatsappLink(data, "Quiero pedir el paquete de 1 Mes Minoxidil Kirkland ($300)")}">Pedir 1 Mes</a>
          </div>

          <div class="pricing-card">
            <div class="pricing-badge">Avance Notable</div>
            <h3>3 Meses de Minoxidil</h3>
            <div class="pricing-price">$600 <small>MXN</small></div>
            <p class="pricing-desc">3 Frascos Kirkland 5% Líquido (180 ml)</p>
            <ul class="pricing-features">
              <li>✓ Fase clave para brote de vello nuevo</li>
              <li>✓ Ahorro frente a compra individual</li>
              <li>✓ Incluye aplicador graduado</li>
              <li>✓ Entrega personal en CDMX</li>
            </ul>
            <a class="btn btn-primary" href="${whatsappLink(data, "Quiero pedir el paquete de 3 Meses Minoxidil Kirkland ($600)")}">Pedir 3 Meses</a>
          </div>

          <div class="pricing-card featured-pricing">
            <div class="pricing-badge badge-popular">MÁS POPULAR · MEJOR PRECIO</div>
            <h3>6 Meses Caja Sellada</h3>
            <div class="pricing-price">$1,100 <small>MXN</small></div>
            <p class="pricing-desc">Caja Completa Kirkland con 6 Frascos + Gotero Original</p>
            <ul class="pricing-features">
              <li>✓ Caja sellada de fábrica con lote visible</li>
              <li>✓ Incluye gotero aplicador original Kirkland</li>
              <li>✓ Tiempo óptimo para maduración de barba</li>
              <li>✓ El costo mensual más económico</li>
              <li>✓ Entrega inmediata en CDMX</li>
            </ul>
            <a class="btn btn-gold btn-large" href="${whatsappLink(data, "Quiero pedir la Caja de 6 Meses Minoxidil Kirkland ($1,100)")}">Pedir Caja 6 Meses</a>
          </div>

          <div class="pricing-card">
            <div class="pricing-badge">Tratamiento Completo</div>
            <h3>1 Año de Tratamiento</h3>
            <div class="pricing-price">$2,100 <small>MXN</small></div>
            <p class="pricing-desc">2 Cajas Selladas (12 Frascos) + 2 Goteros Originales</p>
            <ul class="pricing-features">
              <li>✓ Ciclo definitivo para vello terminal permanente</li>
              <li>✓ Máximo ahorro garantizado</li>
              <li>✓ Producto sellado con caducidad amplia</li>
              <li>✓ Envío gratis o entrega especial en CDMX</li>
            </ul>
            <a class="btn btn-primary" href="${whatsappLink(data, "Quiero pedir el paquete de 1 Año Minoxidil Kirkland ($2,100)")}">Pedir Tratamiento 1 Año</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Catálogo Rápido -->
    <section class="section section-products">
      <div class="container">
        <div class="section-header-row">
          <div>
            <span class="section-tag">CATÁLOGO COMPLETO</span>
            <h2>Productos Disponibles para Entrega</h2>
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
                Coordinar Visita por WhatsApp
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

    <!-- Guías y Blog -->
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
            <p>Por lo general, los primeros vellos delgados (vellus) comienzan a observarse entre el segundo y tercer mes de uso diario constante (1 ml dos veces al día). La maduración a vello terminal permanente se alcanza entre los 6 y 12 meses de tratamiento continuo.</p>
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
    body
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

function categoryPage(category, data) {
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

function blogPage(data, pageNumber = 1, perPage = 18, semanticPosts = []) {
  const totalPages = Math.max(1, Math.ceil(semanticPosts.length / perPage));
  const current = Math.min(Math.max(1, pageNumber), totalPages);
  const posts = semanticPosts.slice((current - 1) * perPage, current * perPage);

  const prevPath = current > 2 ? `/blog/page/${current - 1}/` : current === 2 ? "/blog/" : "";
  const nextPath = current < totalPages ? `/blog/page/${current + 1}/` : "";

  const pagination = `
    <nav class="blog-pagination" aria-label="Paginación del blog">
      ${prevPath ? `<a class="btn btn-secondary" href="${prevPath}">← Entradas Anteriores</a>` : `<span></span>`}
      <div class="page-numbers">
        ${Array.from({ length: totalPages }, (_, index) => {
          const number = index + 1;
          if (number === 1 || number === totalPages || Math.abs(number - current) <= 2) {
            const pathName = number === 1 ? "/blog/" : `/blog/page/${number}/`;
            return number === current ? `<strong class="page-curr">${number}</strong>` : `<a class="page-link" href="${pathName}">${number}</a>`;
          }
          if (Math.abs(number - current) === 3) return `<span class="page-ellipsis">…</span>`;
          return "";
        }).join("")}
      </div>
      ${nextPath ? `<a class="btn btn-secondary" href="${nextPath}">Siguientes Entradas →</a>` : `<span></span>`}
    </nav>`;

  const body = `
    <section class="page-title-banner">
      <div class="container">
        <span class="eyebrow-tag">BLOG Y ARTÍCULOS</span>
        <h1>Consejos, Guías y Artículos de Minoxidil</h1>
        <p>Información práctica sobre aplicación en barba y cabello, cómo evitar efectos secundarios y compras seguras en CDMX.</p>
      </div>
    </section>

    <!-- Guías Pilares Destacadas -->
    ${current === 1 ? `
      <section class="section section-pillar-guides">
        <div class="container">
          <div class="section-header">
            <span class="section-tag">LECTURAS ESENCIALES</span>
            <h2>Guías Médicas y Fundamentales</h2>
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
    ` : ""}

    <!-- Artículos del Blog -->
    <section class="section blog-feed-section">
      <div class="container">
        <div class="section-header">
          <h2>Artículos Publicados</h2>
          <p>Explora nuestras ${semanticPosts.length} entradas históricas sobre minoxidil, cuidado capilar y crecimiento de barba:</p>
        </div>
        <div class="blog-articles-grid">
          ${posts.map((post) => `
            <article class="blog-post-card">
              <a class="blog-card-img" href="${post.path}">
                <img src="${post.image}" alt="${escapeHtml(post.title)}" loading="lazy">
              </a>
              <div class="blog-card-body">
                <time class="blog-date" datetime="${post.date}">${formatDate(post.date)}</time>
                <h3 class="blog-card-title">
                  <a href="${post.path}">${escapeHtml(post.title)}</a>
                </h3>
                <p class="blog-card-excerpt">${escapeHtml(metaText(post.excerpt, 120))}</p>
                <a class="blog-card-btn" href="${post.path}">Leer artículo →</a>
              </div>
            </article>
          `).join("")}
        </div>
        ${pagination}
      </div>
    </section>
  `;

  const pathName = current === 1 ? "/blog/" : `/blog/page/${current}/`;
  const title = current === 1 ? "Blog de Minoxidil, Barba y Cabello" : `Blog - Página ${current} | Minoxidil en CDMX`;

  return layout(data, {
    title,
    path: pathName,
    description: "Artículos, consejos y guías completas sobre minoxidil en barba y cabello, tiempos de respuesta, aplicación y compra en CDMX.",
    robots: "index, follow, max-image-preview:large",
    schema: [
      itemListSchema("Blog de Minoxidil en CDMX", pathName, posts),
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
            <p>Minoxidil Kirkland original garantizado con entrega en sucursal o envío nacional.</p>
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
    title: "Contacto y Sucursal en CDMX | Minoxidil Todo México",
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
  --brand: #059669;
  --brand-hover: #047857;
  --accent-gold: #d97706;
  --accent-gold-hover: #b45309;
  --navy-dark: #0b1528;
  --navy-surface: #111e38;
  --navy-light: #1e293b;
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --border-focus: #10b981;
  --wa-green: #25d366;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 16px rgba(11,21,40,0.08);
  --shadow-lg: 0 12px 32px rgba(11,21,40,0.12);
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

/* Top Announcement */
.top-announcement {
  background: var(--navy-dark);
  color: #f1f5f9;
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
  background: #ffffff;
  border-bottom: 1px solid var(--border);
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
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
  gap: 0.75rem;
}
.brand-badge {
  background: var(--brand);
  color: #fff;
  font-weight: 900;
  font-size: 0.8rem;
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius-sm);
  letter-spacing: 0.05em;
}
.brand-text { display: flex; flex-direction: column; }
.brand-title {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--navy-dark);
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.brand-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  font-weight: 700;
  font-size: 0.95rem;
}
.nav-menu a:hover {
  color: var(--brand);
}
.nav-btn {
  background: var(--brand);
  color: #ffffff !important;
  padding: 0.6rem 1rem;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}
.nav-btn:hover {
  background: var(--brand-hover);
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
  background: var(--navy-dark);
  position: relative;
}
.menu-icon::before, .menu-icon::after {
  content: "";
  position: absolute;
  width: 22px;
  height: 2px;
  background: var(--navy-dark);
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
    background: #ffffff;
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
}
.btn-primary {
  background: var(--brand);
  color: #ffffff;
}
.btn-primary:hover {
  background: var(--brand-hover);
  color: #ffffff;
}
.btn-secondary {
  background: #ffffff;
  color: var(--navy-dark);
  border-color: var(--border);
}
.btn-secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.btn-gold {
  background: var(--accent-gold);
  color: #ffffff;
}
.btn-gold:hover {
  background: var(--accent-gold-hover);
}
.btn-outline {
  border-color: var(--border);
  background: transparent;
  color: var(--navy-dark);
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

/* Hero Section */
.hero-section {
  position: relative;
  background: linear-gradient(135deg, rgba(11,21,40,0.94) 0%, rgba(17,30,56,0.88) 100%), var(--hero-bg);
  background-size: cover;
  background-position: center;
  color: #ffffff;
  padding: 4.5rem 0 5rem;
}
.hero-content {
  max-width: 840px;
}
.eyebrow-tag {
  display: inline-block;
  background: rgba(217,119,6,0.2);
  color: #fbbf24;
  border: 1px solid rgba(251,191,36,0.3);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  margin-bottom: 1.25rem;
}
.hero-headline {
  font-size: clamp(2.2rem, 5vw, 3.4rem);
  line-height: 1.12;
  font-weight: 900;
  letter-spacing: -0.02em;
  margin: 0 0 1.25rem;
  text-wrap: balance;
}
.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.6;
  color: #cbd5e1;
  margin: 0 0 2rem;
}
.hero-ctas {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 3rem;
}

/* Trust Pill Grid */
.trust-pill-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.trust-pill {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(8px);
  padding: 1rem;
  border-radius: var(--radius-md);
}
.trust-icon { font-size: 1.6rem; flex-shrink: 0; }
.trust-pill strong { display: block; font-size: 0.92rem; color: #ffffff; }
.trust-pill span { display: block; font-size: 0.78rem; color: #94a3b8; }
@media (max-width: 900px) {
  .trust-pill-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 500px) {
  .trust-pill-grid { grid-template-columns: 1fr; }
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
  color: var(--navy-dark);
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

/* Originality Grid */
.originality-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}
.orig-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.75rem;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.orig-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.orig-num {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-full);
  background: #ecfdf5;
  color: var(--brand);
  font-weight: 900;
  font-size: 1.25rem;
  display: grid;
  place-items: center;
  margin-bottom: 1.25rem;
}
.orig-card h3 {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0 0 0.6rem;
  color: var(--navy-dark);
}
.orig-card p {
  font-size: 0.92rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}
@media (max-width: 900px) {
  .originality-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 500px) {
  .originality-grid { grid-template-columns: 1fr; }
}

/* Pricing Grid */
.section-pricing { background: #ffffff; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
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
  font-size: 1.35rem;
  margin: 0 0 0.5rem;
  color: var(--navy-dark);
}
.pricing-price {
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--brand);
  line-height: 1;
  margin-bottom: 0.5rem;
}
.pricing-price small { font-size: 0.9rem; font-weight: 700; color: var(--text-muted); }
.pricing-desc { font-size: 0.9rem; color: var(--text-muted); margin: 0 0 1.5rem; min-height: 2.8em; }
.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
  font-size: 0.88rem;
  color: #334155;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.pricing-card .btn { margin-top: auto; }

.pricing-card.featured-pricing {
  background: #ffffff;
  border: 2px solid var(--accent-gold);
  box-shadow: 0 8px 30px rgba(217,119,6,0.15);
  transform: scale(1.03);
  z-index: 2;
}
.pricing-card.featured-pricing .badge-popular {
  background: var(--accent-gold);
  color: #ffffff;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  display: inline-block;
  font-size: 0.72rem;
}
@media (max-width: 990px) {
  .pricing-grid { grid-template-columns: repeat(2, 1fr); }
  .pricing-card.featured-pricing { transform: none; }
}
@media (max-width: 600px) {
  .pricing-grid { grid-template-columns: 1fr; }
}

/* Product Cards & Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}
.product-card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
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
.badge-kirkland { background: #dbeafe; color: #1e40af; }
.badge-neutral { background: #f1f5f9; color: #475569; }

.product-img-link {
  aspect-ratio: 1;
  background: #f8fafc;
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
  color: var(--brand);
}
.btn-wa-sm {
  background: var(--brand);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}
.btn-wa-sm:hover { background: var(--brand-hover); }

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
  background: #ffffff;
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
.loc-item strong { display: block; font-size: 1.05rem; color: var(--navy-dark); margin-bottom: 0.25rem; }
.loc-item p { margin: 0; font-size: 0.95rem; color: #475569; }
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

/* Guides Preview */
.guides-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.guide-preview-card {
  background: #ffffff;
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
  color: var(--navy-dark);
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

/* FAQ */
.faq-container { max-width: 800px; }
.faq-list { display: flex; flex-direction: column; gap: 0.75rem; }
.faq-item {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.2rem 1.5rem;
}
.faq-item summary {
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--navy-dark);
  cursor: pointer;
}
.faq-item p {
  margin: 0.85rem 0 0;
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.6;
}

/* Final CTA */
.final-cta-section { padding-bottom: 5rem; }
.final-cta-box {
  background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy-surface) 100%);
  color: #ffffff;
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
  color: #cbd5e1;
  max-width: 650px;
  margin: 0 auto 2rem;
}

/* Shop Layout */
.page-title-banner {
  background: var(--navy-dark);
  color: #ffffff;
  padding: 3.5rem 0;
  text-align: center;
}
.page-title-banner h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 900;
  margin: 0.5rem 0;
}
.page-title-banner p {
  color: #cbd5e1;
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
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}
.sidebar-box h3 {
  font-size: 1.15rem;
  margin: 0 0 1rem;
  color: var(--navy-dark);
}
.cat-pill-list { display: flex; flex-direction: column; gap: 0.4rem; }
.cat-pill {
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.92rem;
  font-weight: 600;
  color: #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.15s ease;
}
.cat-pill:hover { background: #f1f5f9; color: var(--brand); }
.cat-pill.active { background: var(--brand); color: #ffffff; }
.cat-pill.active .cat-count { color: #ffffff; opacity: 0.8; }
.cat-count { font-size: 0.8rem; color: var(--text-muted); }

.sidebar-help {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: var(--radius-md);
  padding: 1.5rem;
}
.sidebar-help h4 { margin: 0 0 0.5rem; color: #065f46; font-size: 1.05rem; }
.sidebar-help p { font-size: 0.88rem; color: #047857; margin: 0 0 1rem; }

.shop-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.count-badge { font-weight: 700; color: var(--navy-dark); }
.search-input {
  width: min(360px, 100%);
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  background: #ffffff;
  outline: none;
}
.search-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(5,150,105,0.15); }
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
  background: #ffffff;
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
  color: var(--navy-dark);
}
.detail-price-box {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}
.detail-price {
  display: block;
  font-size: 2rem;
  font-weight: 900;
  color: var(--brand);
}
.stock-status {
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #059669;
  margin-top: 0.35rem;
}
.detail-highlights { margin-bottom: 2rem; font-size: 1.05rem; color: #475569; }
.secure-buy-info {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: #64748b;
}
.product-desc-section { background: #ffffff; border-top: 1px solid var(--border); }
@media (max-width: 768px) {
  .product-detail-grid { grid-template-columns: 1fr; gap: 2rem; }
}

/* Article & Blog */
.article-page-wrap { background: #ffffff; }
.article-header {
  background: var(--navy-dark);
  color: #ffffff;
  padding: 3.5rem 0;
}
.article-header-inner { max-width: 860px; }
.article-cat-badge {
  display: inline-block;
  background: rgba(5,150,105,0.25);
  color: #34d399;
  border: 1px solid rgba(52,211,153,0.3);
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
  color: #cbd5e1;
  flex-wrap: wrap;
}
.guide-summary-lead {
  font-size: 1.15rem;
  color: #cbd5e1;
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
  color: #334155;
}
.article-prose p { margin: 0 0 1.4rem; }
.article-prose h2 {
  font-size: 1.65rem;
  font-weight: 900;
  color: var(--navy-dark);
  margin: 2.5rem 0 1rem;
  line-height: 1.25;
}
.article-prose h3 {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--navy-dark);
  margin: 2rem 0 0.85rem;
}
.article-prose ul, .article-prose ol {
  margin: 0 0 1.5rem;
  padding-left: 1.4rem;
}
.article-prose li { margin-bottom: 0.6rem; }
.article-prose strong { color: var(--navy-dark); font-weight: 800; }

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
.stage-item strong { display: block; font-size: 1.05rem; margin-bottom: 0.4rem; }
.stage-item p { margin: 0; font-size: 0.95rem; }

.local-cdmx-callout {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
  padding: 2rem;
  margin: 2.5rem 0;
}
.cdmx-badge {
  display: inline-block;
  background: var(--brand);
  color: #ffffff;
  font-weight: 800;
  font-size: 0.78rem;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  margin-bottom: 0.75rem;
}
.local-cdmx-callout h3 {
  color: #065f46;
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
  background: #fffbeb;
  border-left: 4px solid var(--accent-gold);
  padding: 1.25rem;
  border-radius: var(--radius-sm);
  margin: 2rem 0;
}
.safety-disclaimer strong { display: block; color: #92400e; margin-bottom: 0.25rem; }
.safety-disclaimer p { margin: 0; font-size: 0.9rem; color: #78350f; }

.article-share-wa {
  background: var(--navy-dark);
  color: #ffffff;
  padding: 2.5rem;
  border-radius: var(--radius-md);
  text-align: center;
  margin-top: 3rem;
}
.article-share-wa strong { font-size: 1.3rem; display: block; margin-bottom: 0.5rem; }
.article-share-wa p { color: #cbd5e1; max-width: 500px; margin: 0 auto 1.5rem; font-size: 0.95rem; }

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
.sidebar-prod-item:hover { border-color: var(--brand); background: #f8fafc; }
.sidebar-prod-item img {
  width: 54px;
  height: 54px;
  object-fit: contain;
  background: #ffffff;
}
.sidebar-prod-item strong { display: block; font-size: 0.88rem; line-height: 1.2; color: var(--navy-dark); }
.sidebar-prod-price { font-size: 0.85rem; color: var(--brand); font-weight: 800; }
.sidebar-loc-reminder { margin-top: 1rem; text-align: center; color: var(--text-muted); }

@media (max-width: 900px) {
  .article-layout { grid-template-columns: 1fr; }
  .sticky-sidebar { position: static; }
}

/* Blog Articles Feed */
.blog-articles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.75rem;
}
.blog-post-card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.blog-post-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.blog-card-img {
  aspect-ratio: 16/9;
  background: #f1f5f9;
  overflow: hidden;
}
.blog-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}
.blog-post-card:hover .blog-card-img img { transform: scale(1.05); }

.blog-card-body {
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.blog-date {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}
.blog-card-title {
  font-size: 1.12rem;
  font-weight: 800;
  line-height: 1.35;
  margin: 0 0 0.75rem;
  color: var(--navy-dark);
}
.blog-card-title a:hover { color: var(--brand); }
.blog-card-excerpt {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0 0 1.25rem;
  flex: 1;
}
.blog-card-btn {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--brand);
}

.blog-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 3.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 1rem;
}
.page-numbers { display: flex; align-items: center; gap: 0.4rem; }
.page-link, .page-curr, .page-ellipsis {
  min-width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.9rem;
}
.page-link { border: 1px solid var(--border); background: #ffffff; }
.page-link:hover { border-color: var(--brand); color: var(--brand); }
.page-curr { background: var(--brand); color: #ffffff; }

@media (max-width: 990px) {
  .blog-articles-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .blog-articles-grid { grid-template-columns: 1fr; }
  .blog-pagination { flex-direction: column; align-items: stretch; }
  .page-numbers { justify-content: center; }
}

/* Contact Grid */
.contact-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.contact-card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 2.2rem;
  text-align: center;
  box-shadow: var(--shadow-sm);
}
.contact-icon { font-size: 2.5rem; display: block; margin-bottom: 1rem; }
.contact-card h3 { font-size: 1.3rem; margin: 0 0 0.6rem; color: var(--navy-dark); }
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
  background: var(--navy-dark);
  color: #cbd5e1;
  padding-top: 4.5rem;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 2.5rem;
  margin-bottom: 3.5rem;
}
.footer-brand .brand-title { color: #ffffff; margin-bottom: 0.75rem; }
.footer-brand p { font-size: 0.92rem; line-height: 1.6; color: #94a3b8; }
.footer-col h3 { font-size: 1.05rem; color: #ffffff; margin: 0 0 1.25rem; font-weight: 800; }
.footer-col p { font-size: 0.9rem; line-height: 1.55; margin: 0 0 0.85rem; }
.footer-col a { color: #f1f5f9; }
.footer-col a:hover { color: #34d399; }
.footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.55rem; font-size: 0.9rem; }
.footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 1.5rem 0;
  font-size: 0.85rem;
  color: #64748b;
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
  color: #ffffff;
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
  color: #ffffff;
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

  await writeFile(path.join(DIST, "assets", "site.css"), css.trim(), "utf8");
  await writeFile(path.join(DIST, "assets", "site.js"), js.trim(), "utf8");
  await writeFile(path.join(DIST, ".nojekyll"), "", "utf8");

  // Generate Core Pages
  await writeRoute("/", homePage(data));
  await writeRoute("/shop/", shopPage(data));
  await writeRoute("/contact/", contactPage(data, "/contact/"));
  await writeRoute("/sucursales-y-entregas/", locationsPage(data));

  // Generate Trust Pages
  for (const route of Object.keys(trustPages)) {
    await writeRoute(route, trustPage(route, data));
  }

  // Generate 9 Foundational Guides
  for (const guide of editorialGuides) {
    await writeRoute(guide.path, guidePage(guide, data));
  }

  // Generate Products
  for (const product of data.products) {
    await writeRoute(product.path, productPage(product, data));
  }

  // Generate Categories
  for (const category of data.categories) {
    await writeRoute(category.path, categoryPage(category, data));
  }

  // Filter semantic vs numbered posts (exclude collisions with reserved routes)
  const reservedSlugs = new Set(["", "shop", "blog", "guias", "producto", "categoria-producto", "assets", "contact", "contacto", "sucursales-y-entregas"]);
  const semanticPosts = data.posts.filter((post) => !post.isNumbered && !reservedSlugs.has(post.slug));
  const blogPerPage = 18;
  const blogTotalPages = Math.max(1, Math.ceil(semanticPosts.length / blogPerPage));

  // GENERATE INDIVIDUAL ARTICLE PAGES FOR ALL SEMANTIC POSTS
  let postCount = 0;
  for (const post of semanticPosts) {
    await writeRoute(post.path, articlePage(post, data));
    postCount++;
  }
  console.log(`${postCount} páginas individuales de blog compiladas con éxito.`);

  console.log(`Generando blog con ${semanticPosts.length} posts legítimos en ${blogTotalPages} páginas...`);
  for (let page = 1; page <= blogTotalPages; page += 1) {
    await writeRoute(page === 1 ? "/blog/" : `/blog/page/${page}/`, blogPage(data, page, blogPerPage, semanticPosts));
  }

  // Routes for Sitemap
  const routes = [
    "/",
    "/shop/",
    "/blog/",
    ...editorialGuides.map((item) => item.path),
    ...Object.keys(trustPages),
    ...data.products.map((item) => item.path),
    ...data.categories.map((item) => item.path),
    ...semanticPosts.map((item) => item.path),
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

  // Redirects for Vercel, Netlify and Apache
  const redirects = legacyRedirects(data);
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
    redirects: redirects.slice(0, 1024).map((rule) => ({
      source: rule.from,
      destination: rule.to,
      permanent: true
    }))
  };
  await writeFile(path.join(DIST, "vercel.json"), `${JSON.stringify(vercel, null, 2)}\n`, "utf8");
  await writeFile(path.join(ROOT, "vercel.json"), `${JSON.stringify(vercel, null, 2)}\n`, "utf8");

  console.log(`\n=============================================`);
  console.log(`Build completado exitosamente en ${DIST}`);
  console.log(`- Productos: ${data.products.length}`);
  console.log(`- Categorías: ${data.categories.length}`);
  console.log(`- Guías pilares: ${editorialGuides.length}`);
  console.log(`- Posts de blog legítimos: ${semanticPosts.length}`);
  console.log(`- URLs totales en sitemap.xml: ${sitemapRoutes.length}`);
  console.log(`- Redirecciones 301 generadas: ${redirects.length}`);
  console.log(`=============================================\n`);
}

main().catch((error) => {
  console.error("Error en build.mjs:", error);
  process.exit(1);
});
