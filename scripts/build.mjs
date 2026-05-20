import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "content", "site-data.json");
const DIST = path.join(ROOT, "dist");
const SITE_URL = "https://minoxidilencdmx.com";

const reserved = new Set(["", "shop", "blog", "producto", "categoria-producto", "assets"]);
const writtenRoutes = new Set();
let localImageMap;

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
  await writeFile(file, localizeWordPressMedia(repairMojibake(html)), "utf8");
  writtenRoutes.add(normalizeRoute(route));
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

function legacyRedirects(data) {
  const rules = new Map();
  const categoryBySlug = new Map(data.categories.map((category) => [category.slug, category.path]));
  const productBySlug = new Map(data.products.map((product) => [product.slug, product.path]));
  const pageBySlug = new Map(data.pages.map((page) => [page.slug, page.path]));
  const postBySlug = new Map(data.posts.map((post) => [post.slug, post.path]));

  for (const item of [...data.products, ...data.pages, ...data.posts]) {
    if (item.oldUrl) addRedirect(rules, pathFromUrl(item.oldUrl), item.path, "imported oldUrl");
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
  for (const [from, to] of Object.entries(aliases)) addRedirect(rules, from, to, "manual alias");

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

function productImage(product, data) {
  if (product.image) return product.image;
  const related = data.products.find((item) =>
    item.id !== product.id &&
    item.image &&
    item.categories?.some((category) => product.categories?.some((own) => own.slug === category.slug))
  );
  return related?.image || data.products.find((item) => item.image)?.image || data.heroImages[0] || "";
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
  const title = page.title ? `${page.title} | ${data.siteTitle}` : data.siteTitle;
  const description = page.description || data.description;
  const image = page.image || data.products[0]?.image || "";
  const canonical = `${SITE_URL}${page.path || "/"}`.replace(/\/+$/, "/");
  return `<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${page.type || "website"}">
  ${image ? `<meta property="og:image" content="${SITE_URL}${escapeHtml(image)}">` : ""}
  <link rel="stylesheet" href="/assets/site.css">
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
  <a class="float-wa" href="${whatsappLink(data)}" aria-label="Abrir WhatsApp">WhatsApp</a>
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
    description: product.excerpt,
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
  if (Number(product.rating) > 0 && Number(product.reviewCount) > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(product.rating),
      reviewCount: Number(product.reviewCount)
    };
  }
  return schema;
}

function articleSchema(post, data) {
  const image = post.image || data.heroImages[0] || data.products[0]?.image || "";
  return {
    "@type": "Article",
    "@id": `${SITE_URL}${post.path}#article`,
    headline: post.title,
    description: post.excerpt,
    image: image ? `${SITE_URL}${image}` : undefined,
    datePublished: post.date,
    dateModified: post.modified || post.date,
    author: { "@type": "Organization", name: data.brand },
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
  for (const product of data.products) set(product.path, { lastmod: today, changefreq: "weekly", priority: "0.8" });
  for (const category of data.categories) {
    set(category.path, { lastmod: today, changefreq: "weekly", priority: "0.75" });
    set(`/categoria-producto/${category.slug}/`, { lastmod: today, changefreq: "weekly", priority: "0.65" });
  }
  for (let page = 1; page <= blogTotalPages; page += 1) {
    set(page === 1 ? "/blog/" : `/blog/page/${page}/`, { lastmod: today, changefreq: "weekly", priority: page === 1 ? "0.8" : "0.5" });
  }
  for (const post of data.posts) set(post.path, { lastmod: isoDate(post.modified || post.date) || today, changefreq: "monthly", priority: "0.65" });
  for (const page of data.pages) set(page.path, { lastmod: isoDate(page.modified || page.date) || today, changefreq: "monthly", priority: "0.5" });
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
  const before = pickImage(data, "antes", 1);
  const storeImage = "/assets/images/diseno-sin-titulo-2.jpg";
  const resultImage = "/assets/images/antes.jpg";
  const avatarJuan = "/assets/images/1-3.png";
  const avatarPatricia = "/assets/images/3-1.png";
  const avatarCarlos = "/assets/images/2-2.png";
  const body = `
    <section class="wp-hero home-hero" style="--hero-image:url('${hero}')">
      <div class="wp-hero-inner">
        <span class="eyebrow">Tu cabello merece lo mejor.</span>
        <h1>¡Encuéntranos en la sucursal y descubre la diferencia!</h1>
        <p>Visítanos y deja que nuestros expertos te orienten con minoxidil original, tratamientos para barba y cuidado capilar.</p>
        <div class="hero-actions">
          <a class="button dark" href="/contact/">Tienda física</a>
          <a class="button outline-light" href="/shop/">Tienda online</a>
        </div>
      </div>
    </section>
    <section class="service-intro">
      <span></span>
      <h2>Especialistas en cuidado capilar.</h2>
      <p>Ofrecemos tratamientos personalizados para lograr la mejor versión de tu cabello y barba.</p>
      <div class="service-grid">
        <article><b>⌖</b><h3>Sucursal en CDMX</h3><p>Contamos con tienda en Plaza Guelatao. Atención directa, producto visible y asesoría antes de comprar.</p></article>
        <article><b>↗</b><h3>Envíos express a todo México</h3><p>Enviamos rápido y seguro a tu casa u oficina. Te confirmamos disponibilidad por WhatsApp.</p></article>
        <article><b>◇</b><h3>Experiencia y servicio</h3><p>15 años de experiencia nos respaldan con productos para barba, cabello, biotina y dermaroller.</p></article>
        <article><b>♥</b><h3>98% de satisfacción</h3><p>Clientes felices respaldan nuestra dedicación a la excelencia y atención personalizada.</p></article>
        <article><b>▣</b><h3>Envío rápido y seguro</h3><p>Entregas cuidadas para que recibas tus productos sin esperas ni vueltas innecesarias.</p></article>
        <article><b>★</b><h3>Resultados con seguimiento</h3><p>Te orientamos con expectativas reales, rutina clara y uso responsable del producto.</p></article>
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
        ${before ? `<img src="${before}" alt="Antes y despues con minoxidil">` : ""}
      </div>
    </section>
    <section class="home-feature section-wide">
      <div class="home-feature-media">
        <img src="${storeImage}" alt="Vitrina de productos Minoxidil Kirkland en la sucursal">
      </div>
      <div class="home-feature-copy">
        <span class="eyebrow">Minoxidil todo MÃ©xico en la Ciudad de MÃ©xico</span>
        <h2>Transforma tu cabello en la Ãºnica sucursal de crecimiento en la ciudad.</h2>
        <p>Crecimiento capilar sin vueltas: productos visibles, asesorÃ­a directa y compra por WhatsApp antes de pasar a la sucursal.</p>
        <div class="benefit-list">
          <article><b>★</b><div><h3>Productos de calidad</h3><p>Minoxidil Kirkland, espuma, biotina, dermaroller y tratamientos seleccionados para barba y cabello.</p></div></article>
          <article><b>▰</b><div><h3>Variedad de tratamientos</h3><p>Opciones para crecimiento de barba, recuperaciÃ³n capilar, mantenimiento y cuidado diario.</p></div></article>
          <article><b>●</b><div><h3>Ofertas y promociones</h3><p>Te confirmamos precio, existencia y promociones actuales directamente por WhatsApp.</p></div></article>
        </div>
      </div>
    </section>
    <section class="video-proof section-wide">
      <div class="proof-card">
        <div class="proof-video">
          <iframe title="Video de resultados con minoxidil" src="https://rumble.com/embed/v4365zo/?pub=1tu8ug" loading="lazy" allowfullscreen></iframe>
          <img src="${resultImage}" alt="Antes y despues con minoxidil">
        </div>
        <div class="proof-stats">
          <div><strong>979K</strong><span>Ventas del producto</span></div>
          <div><strong>50,000K</strong><span>Clientes atendidos</span></div>
          <div><strong>15 aÃ±os</strong><span>Experiencia en cuidado capilar</span></div>
          <div><strong>250K</strong><span>EnvÃ­os a todo MÃ©xico</span></div>
        </div>
      </div>
      <div class="proof-copy">
        <h2>Cambia tu look, cambia tu vida. Mira el video ahora.</h2>
        <p>En Minoxidil Todo MÃ©xico nos importa que compres con informaciÃ³n clara: resultados reales, constancia y expectativas honestas antes de empezar.</p>
      </div>
    </section>
    <section class="home-cta">
      <h2>Â¿Tienes alguna pregunta? No dudes en ponerte en contacto con nosotros.</h2>
      <a class="button secondary" href="/contact/">Contactarnos</a>
    </section>
    <section class="community-section section-wide">
      <img src="${resultImage}" alt="Resultados antes y despues con minoxidil">
      <div>
        <span class="eyebrow">Comunidad y seguimiento</span>
        <h2>En Minoxidil Todo MÃ©xico construimos mÃ¡s que cabello: construimos confianza.</h2>
        <p>Nuestro equipo te orienta para elegir tratamiento, resolver dudas y mantener una rutina sencilla. Si vienes a CDMX o compras desde otro estado, te atendemos directo por WhatsApp.</p>
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
        <span class="eyebrow">Testimonios</span>
        <h2>Lo que la gente dice sobre nosotros</h2>
        <p>Experiencias de clientes que buscaron un lugar con productos reales, atenciÃ³n directa y seguimiento.</p>
      </div>
      <div class="testimonial-grid">
        <article><div><img src="${avatarJuan}" alt="Juan Madrigal"><span><strong>Juan Madrigal</strong><small>Ciudad de MÃ©xico</small></span></div><p>Â«Antes de descubrir este lugar mi barba era irregular y mi cabello sin vida. Con asesorÃ­a y constancia notÃ© un cambio real.Â»</p></article>
        <article><div><img src="${avatarPatricia}" alt="Patricia Rivas"><span><strong>Patricia Rivas</strong><small>Guadalajara</small></span></div><p>Â«DespuÃ©s de probar varios productos, aquÃ­ me explicaron quÃ© usar y cÃ³mo hacerlo. Mi cabello se ve mÃ¡s fuerte.Â»</p></article>
        <article><div><img src="${avatarCarlos}" alt="Carlos Marroquin"><span><strong>Carlos Marroquin</strong><small>Monterrey</small></span></div><p>Â«Buscaba resultados reales y atenciÃ³n clara. Me ayudaron a elegir producto y resolver dudas antes de comprar.Â»</p></article>
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
        <h1>Haz que tu cabello crezca: conoce nuestra sucursal en CDMX</h1>
        <p>Producto visible, asesoría directa y atención por WhatsApp para barba, cabello, biotina, dermaroller y minoxidil Kirkland.</p>
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

function productPage(product, data) {
  const related = data.products
    .filter((item) => item.id !== product.id && item.categories.some((category) => product.categories.some((own) => own.slug === category.slug)))
    .slice(0, 4);
  const fallbackImage = productImage(product, data);
  const gallery = product.images.length > 1 ? product.images : product.images.slice(0, 1);
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
        <p>${escapeHtml(product.excerpt)}</p>
        <div class="hero-actions">
          <a class="button" href="${whatsappLink(data, product.name)}">Comprar por WhatsApp</a>
          <a class="button secondary" href="/shop/">Volver a tienda</a>
        </div>
      </div>
    </section>
    <section class="section article-content">
      <h2>Descripcion</h2>
      ${cleanHtml(product.description)}
    </section>
    ${related.length ? `<section class="section"><div class="section-heading"><h2>Productos relacionados</h2></div><div class="product-grid">${related.map((item) => productCard(item, data)).join("")}</div></section>` : ""}`;
  return layout(data, {
    title: product.name,
    path: product.path,
    description: product.excerpt,
    image: fallbackImage,
    type: "product",
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
  const body = `
    <section class="page-hero compact">
      <span class="eyebrow">Categoria</span>
      <h1>${escapeHtml(category.name)}</h1>
      <p>${products.length} productos disponibles para pedir por WhatsApp.</p>
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
    description: `Productos de ${category.name} en Minoxidil Todo Mexico: precios, disponibilidad y pedido por WhatsApp en CDMX y envios a Mexico.`,
    schema: [
      itemListSchema(`Productos de ${category.name}`, category.path, products),
      breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: "Tienda", path: "/shop/" }, { name: category.name, path: category.path }])
    ],
    body
  });
}

function blogPage(data, pageNumber = 1, perPage = 24) {
  const allPosts = data.posts.filter((post) => post.title);
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
      <h1>Guias de minoxidil, barba y cuidado capilar</h1>
      <p>Articulos conservados para mantener posicionamiento y seguir resolviendo dudas frecuentes. Página ${current} de ${totalPages}.</p>
    </section>
    <section class="post-grid">
      ${posts.map((post) => `<article class="post-card">
        ${post.image ? `<a href="${post.path}"><img src="${post.image}" alt="${escapeHtml(post.title)}" loading="lazy"></a>` : ""}
        <div>
          <time>${formatDate(post.date)}</time>
          <h2><a href="${post.path}">${escapeHtml(post.title)}</a></h2>
          <p>${escapeHtml(post.excerpt)}</p>
        </div>
      </article>`).join("")}
    </section>
    ${pagination}`;
  const pathName = current === 1 ? "/blog/" : `/blog/page/${current}/`;
  const title = current === 1 ? "Blog" : `Blog - Página ${current}`;
  return layout(data, {
    title,
    path: pathName,
    description: "Guias y consejos sobre minoxidil, crecimiento de barba y cabello en CDMX y Mexico.",
    schema: [
      itemListSchema("Blog de minoxidil, barba y cabello", pathName, posts),
      breadcrumbSchema([{ name: "Inicio", path: "/" }, { name: "Blog", path: "/blog/" }])
    ],
    body
  });
}

function articlePage(post, data) {
  const body = `
    <article class="article">
      <header>
        <span class="eyebrow">Guia</span>
        <h1>${escapeHtml(post.title)}</h1>
        <time>${formatDate(post.date)}</time>
      </header>
      ${post.image ? `<img class="article-image" src="${post.image}" alt="${escapeHtml(post.title)}">` : ""}
      <div class="article-content">${cleanHtml(post.content)}</div>
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
          if (currentPath.includes('/wp-content/uploads/')) return { path: '/shop/', title: 'Tienda' };
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
  await writeFile(path.join(DIST, "404.html"), notFoundPage(data, index), "utf8");

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
    cleanUrls: true,
    trailingSlash: true,
    redirects: redirects.slice(0, 1024).map((rule) => ({
      source: rule.from,
      destination: rule.to,
      permanent: true
    })),
    rewrites: [{ source: "/(.*)", destination: "/404.html" }]
  };
  await writeFile(path.join(DIST, "vercel.json"), `${JSON.stringify(vercel, null, 2)}\n`, "utf8");

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
.footer{background:#111d17;color:#fff;padding:3rem 1rem;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:2rem}.footer>div{max-width:440px}.footer h2{font-size:1.1rem}.footer p,.footer a{display:block;color:rgba(255,255,255,.76);margin:.45rem 0}.float-wa{position:fixed;right:1rem;bottom:1rem;background:#25d366;color:#0b2415;text-decoration:none;font-weight:800;border-radius:999px;padding:.85rem 1rem;box-shadow:var(--shadow)}
@media (max-width:980px){.menu-toggle{display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:6px;padding:.6rem .8rem}.menu{display:none;position:absolute;left:1rem;right:1rem;top:104px;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:1rem;box-shadow:var(--shadow);flex-direction:column;align-items:flex-start}.menu.open{display:flex}.nav-cta{display:none}.hero,.split,.product-detail,.shop-layout,.footer{grid-template-columns:1fr}.hero{min-height:auto}.hero-copy{padding:2rem 1rem 3rem}.trust-band{grid-template-columns:repeat(2,1fr)}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.post-grid{grid-template-columns:1fr 1fr}.filters{position:static}.contact-panel{margin-left:1rem;margin-right:1rem;display:grid}.topbar{display:none}}
@media (max-width:620px){.nav{padding:.75rem}.brand small{display:none}.hero-media{min-height:300px}.hero h1,.page-hero h1{font-size:2.4rem}.trust-band,.product-grid,.post-grid{grid-template-columns:1fr}.section{padding:3rem 1rem}.product-actions{display:grid}.toolbar{display:grid}.footer{padding-bottom:5rem}}

/* Visual refresh inspired by the original WordPress site */
.brand-logo{display:none}.brand-mark{display:none}.brand span{display:block}.brand strong{font-family:Georgia,serif;font-size:1.55rem;letter-spacing:.02em;text-transform:uppercase}.brand small{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em}.brand:before{content:"";width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#fff,#7ec8ff);box-shadow:inset 0 0 0 10px rgba(6,19,38,.18);display:block}
.site-header{background:#fff}.header-overlay{position:absolute;left:0;right:0;top:0;background:linear-gradient(180deg,rgba(8,22,61,.72),rgba(8,22,61,.28));box-shadow:none;border-bottom:1px solid rgba(255,255,255,.12)}
.header-overlay .topbar{display:none}.header-overlay .nav{min-height:92px}.header-overlay .brand strong,.header-overlay .brand small{color:#fff}.header-overlay .menu a{color:#fff;font-weight:800;text-transform:uppercase;font-size:.82rem}.header-overlay .menu a:hover{text-decoration:none;color:#7ec8ff}.header-overlay .nav-cta{background:#061326;border:1px solid rgba(255,255,255,.2);color:#fff}.header-overlay .menu-toggle{color:#fff;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.28)}
.wp-hero{min-height:760px;display:grid;align-items:center;position:relative;color:#fff;background-image:linear-gradient(90deg,rgba(6,18,68,.9) 0%,rgba(18,61,141,.72) 43%,rgba(32,142,232,.42) 100%),var(--hero-image);background-size:cover;background-position:center;overflow:hidden}
.wp-hero:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 62% 38%,rgba(255,255,255,.12),transparent 28%),linear-gradient(135deg,transparent 0 32%,rgba(255,255,255,.06) 32% 36%,transparent 36% 100%);pointer-events:none}.wp-hero-inner{position:relative;z-index:1;width:min(1180px,calc(100% - 2rem));margin:0 auto;padding-top:80px}.wp-hero .eyebrow{color:#fff;text-transform:none;font-size:1rem}.wp-hero h1{max-width:770px;font-size:clamp(2.8rem,5.5vw,5rem);line-height:1.12;margin:1rem 0;font-weight:900}.wp-hero p{max-width:690px;color:#fff;font-size:1.08rem}.button.dark{background:#061326;color:#fff;border:1px solid rgba(255,255,255,.15)}.button.outline-light{background:#061326;color:#fff;border:1px solid #08a5ff}.center-actions{display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;margin-top:1.2rem}
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
@media (max-width:980px){.header-overlay{position:absolute}.brand-logo{width:150px}.wp-hero{min-height:660px}.service-grid,.location-photo-grid,.contact-main,.not-found{grid-template-columns:1fr}.contact-info-grid{grid-template-columns:repeat(2,1fr)}.photo-band{grid-template-columns:1fr}.photo-stack img{height:320px}.header-overlay .menu{top:80px}.header-overlay .menu a{color:#061326}.shop-layout{grid-template-columns:1fr}.shop-layout .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.filters{position:static}.shop-layout .category-links.vertical{display:flex;overflow:auto;padding-bottom:.5rem}.shop-layout .category-links.vertical a{white-space:nowrap;min-width:max-content}.toolbar{display:grid;gap:.8rem}}
@media (max-width:620px){.wp-hero{min-height:620px}.wp-hero h1{font-size:2.55rem}.service-grid,.contact-info-grid,.photo-stack{grid-template-columns:1fr}.service-grid article{padding:1.5rem}.location-photo{height:290px}.contact-main{gap:2rem}.map-panel iframe{height:360px}.photo-stack img:nth-child(2){margin-top:0}.shop-layout .product-grid{grid-template-columns:1fr}.shop-copy h2{min-height:auto}.shop-hero{text-align:left}.shop-hero h1{font-size:2.5rem}.blog-pagination{grid-template-columns:1fr}.blog-pagination>a:last-child{justify-self:stretch}.blog-pagination .button{width:100%}}
html,body{overflow-x:clip}img{max-width:100%}.float-wa{right:18px;bottom:18px}.page-hero.compact{min-height:260px;padding:4rem 1rem}.page-hero.compact h1{max-width:920px}.page-hero.compact p{max-width:720px;margin-left:auto;margin-right:auto}.shop-layout{width:100%}.filters{min-width:0}.category-links.vertical{min-width:0}.category-links.vertical a{gap:.7rem;align-items:center}.shop-card{min-width:0}.shop-copy h2{overflow-wrap:anywhere}.product-actions{min-width:0}.product-actions .button{white-space:normal;text-align:center}
@media (min-width:981px){.page-hero.compact{text-align:center}.page-hero.compact .eyebrow{display:block}.page-hero.compact h1{margin-left:auto;margin-right:auto}.page-hero.compact p{text-align:center}.shop-layout:not(:has(.toolbar)){max-width:1480px;grid-template-columns:280px 1fr;background:#f7faf7}.shop-layout:not(:has(.toolbar)) .filters{background:#fff;border:1px solid #dce8de;border-radius:8px;padding:1.2rem;box-shadow:0 12px 34px rgba(18,61,42,.06)}.shop-layout:not(:has(.toolbar)) .product-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:1.2rem}}
@media (max-width:980px){.nav{max-width:100%;min-width:0}.brand{min-width:0}.brand strong{font-size:1.1rem}.menu{top:76px}.page-hero.compact{min-height:230px;padding:3rem 1rem}.page-hero.compact h1{font-size:clamp(2rem,9vw,2.65rem);line-height:1.02;overflow-wrap:anywhere;text-wrap:balance}.page-hero.compact p{font-size:1rem;overflow-wrap:anywhere}.shop-layout{padding:2rem 1rem}.shop-layout .category-links.vertical{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem;overflow:visible;padding:0}.shop-layout .category-links.vertical a{min-width:0;max-width:none;white-space:normal;overflow-wrap:anywhere}.shop-layout .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:620px){.topbar{display:none}.nav{padding:.65rem 1rem}.brand-mark{width:42px;height:42px;flex:0 0 42px}.brand small{display:none}.menu-toggle{margin-left:auto}.wp-hero{min-height:560px}.wp-hero-inner{padding-top:58px}.wp-hero h1{font-size:clamp(2.15rem,12vw,3.1rem);line-height:1.05;overflow-wrap:anywhere}.wp-hero p{font-size:1rem}.hero-actions{gap:.7rem}.hero-actions .button{flex:1 1 145px}.shop-layout .category-links.vertical{grid-template-columns:1fr}.shop-layout .product-grid{grid-template-columns:1fr}.category-links.vertical a{font-size:.95rem}.float-wa{right:12px;bottom:12px;width:54px;height:54px;min-height:54px;padding:0;border-radius:50%;font-size:0}.float-wa:after{content:"WA";font-size:1rem}.page-hero.compact{min-height:210px}.page-hero.compact p{white-space:normal}.product-actions{grid-template-columns:1fr}.product-actions .button{width:100%}}

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
.article{max-width:900px;background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 12px 34px rgba(7,29,54,.06);margin:3rem auto;padding:3rem}.article header{border-bottom:1px solid var(--line);padding-bottom:1.4rem;margin-bottom:1.6rem}.article header h1{font-size:clamp(2rem,4.4vw,3.6rem)}.article-content h2,.article-content h3{color:var(--ink)}.article-content a{color:var(--brand)}.article-image{border-radius:8px}
.contact-final{background:linear-gradient(135deg,#071d36,#126bb8)}.map-panel iframe,.location-photo,.feature-image,.gallery img{border-radius:8px;box-shadow:0 18px 50px rgba(7,29,54,.12)}
.footer{background:var(--deep);color:#fff;grid-template-columns:1.2fr 1fr 1fr}.footer p,.footer a{color:rgba(255,255,255,.78)}.float-wa{background:#25d366;color:#082814}
@media (max-width:1200px){.product-grid,.shop-layout .product-grid,.shop-layout:not(:has(.toolbar)) .product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:980px){.topbar{display:none}.nav,.header-overlay .nav{min-height:72px}.menu,.header-overlay .menu{top:76px;background:#fff;border:1px solid var(--line);box-shadow:var(--shadow);border-radius:8px;padding:1rem}.header-overlay .menu a{color:var(--ink)}.shop-layout,.shop-layout:not(:has(.toolbar)){grid-template-columns:1fr}.service-grid,.contact-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.article{margin:1.5rem 1rem;padding:1.5rem}.wp-hero{min-height:560px}}
@media (max-width:620px){.brand-logo{width:42px;height:42px}.brand strong,.header-overlay .brand strong{font-size:1.05rem}.menu-toggle{background:#fff;border:1px solid var(--line);border-radius:8px}.product-grid,.shop-layout .product-grid,.shop-layout:not(:has(.toolbar)) .product-grid,.service-grid,.contact-info-grid{grid-template-columns:1fr}.shop-hero,.page-hero.compact{text-align:left}.footer{grid-template-columns:1fr}.wp-hero h1{font-size:2.35rem}.article header h1{font-size:2rem}}
.section-wide{width:min(1240px,calc(100% - 2rem));margin:0 auto;padding:5rem 0}.home-feature{display:grid;grid-template-columns:.95fr 1fr;gap:3.5rem;align-items:center}.home-feature-media img{width:100%;height:640px;object-fit:cover;border-radius:8px;box-shadow:var(--shadow)}.home-feature-copy h2,.proof-copy h2,.community-section h2,.testimonials-section h2{font-size:clamp(2rem,4vw,3.55rem);line-height:1.08;margin:.55rem 0 1rem;font-weight:900;text-wrap:balance}.home-feature-copy>p,.proof-copy p,.community-section p,.testimonials-section .section-heading p{color:var(--muted);font-size:1.02rem}.benefit-list{display:grid;gap:1rem;margin-top:2rem}.benefit-list article{display:grid;grid-template-columns:72px 1fr;gap:1.25rem;align-items:center;background:#fff;border:1px solid var(--line);border-radius:8px;padding:1.3rem;box-shadow:0 12px 34px rgba(7,29,54,.06)}.benefit-list b{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:var(--brand);color:#fff;font-size:1.35rem}.benefit-list h3{margin:.1rem 0 .35rem}.benefit-list p{margin:0;color:var(--muted)}
.video-proof{text-align:center}.proof-card{overflow:hidden;border-radius:8px;background:var(--deep);box-shadow:var(--shadow)}.proof-video{position:relative;background:#000}.proof-video iframe,.proof-video img{width:100%;aspect-ratio:16/7;display:block;border:0;object-fit:cover}.proof-video iframe{position:absolute;inset:0;z-index:2}.proof-video img{opacity:.52}.proof-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.08);padding:2rem 1rem}.proof-stats div{display:grid;gap:.35rem;color:#fff}.proof-stats strong{font-size:1.75rem;line-height:1}.proof-stats span{color:#7fc4ff;font-weight:800;font-size:.9rem}.proof-copy{max-width:760px;margin:1.8rem auto 0}.home-cta{width:min(1240px,calc(100% - 2rem));margin:3rem auto 5rem;background:linear-gradient(135deg,#126bb8,#1784d6);color:#fff;border-radius:8px;padding:3rem clamp(1.4rem,5vw,4rem);display:flex;align-items:center;justify-content:space-between;gap:2rem}.home-cta h2{font-size:clamp(1.7rem,3vw,2.6rem);line-height:1.18;margin:0;max-width:760px}.home-cta .button.secondary{background:#fff;color:var(--brand);border-color:#fff}
.community-section{display:grid;grid-template-columns:.92fr 1fr;gap:3.5rem;align-items:center}.community-section>img{width:100%;border-radius:8px;box-shadow:var(--shadow)}.community-section ul{list-style:none;padding:0;margin:1.5rem 0 0;display:grid;grid-template-columns:1fr 1fr;gap:.9rem 1.5rem}.community-section li{position:relative;padding-left:1.65rem;color:#30445b}.community-section li:before{content:"";position:absolute;left:0;top:.42rem;width:.72rem;height:.72rem;border-radius:50%;background:var(--brand)}.testimonials-section{padding-top:3rem}.section-heading.centered{display:block;text-align:center;max-width:760px;margin:0 auto 2rem}.testimonial-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.25rem}.testimonial-grid article{background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 12px 34px rgba(7,29,54,.06);padding:1.6rem}.testimonial-grid article>div{display:flex;align-items:center;gap:1rem;margin-bottom:1.4rem}.testimonial-grid img{width:64px;height:64px;border-radius:4px;object-fit:cover}.testimonial-grid strong{display:block}.testimonial-grid small{display:block;color:var(--muted);margin-top:.2rem}.testimonial-grid p{color:#30445b;margin:0}
.map-section{padding-top:3rem}.map-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem}.map-card{overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 16px 44px rgba(7,29,54,.08);display:grid;grid-template-rows:auto minmax(360px,1fr)}.map-card-copy{padding:1.4rem;display:grid;gap:.55rem}.map-card-copy span{color:var(--brand);font-weight:900;text-transform:uppercase;font-size:.78rem}.map-card-copy h3{font-size:1.55rem;line-height:1.1;margin:0}.map-card-copy p{color:var(--muted);margin:0}.map-card-copy .button{justify-self:start;margin-top:.6rem}.map-card iframe{width:100%;height:100%;min-height:360px;border:0;display:block}.contact-summary{display:block;text-align:center;max-width:900px}.contact-summary .contact-copy{max-width:720px;margin:0 auto}.contact-summary .contact-actions,.contact-summary .mini-list{justify-content:center}.contact-summary .mini-list{max-width:620px;margin-left:auto;margin-right:auto}
.contact-panel{background:linear-gradient(135deg,#071d36,#126bb8);color:#fff;border-radius:8px;padding:3rem;box-shadow:var(--shadow)}.contact-panel h2{color:#fff}.contact-panel p{color:rgba(255,255,255,.84)}.contact-panel .eyebrow{color:#ffd47a}.contact-panel .button{background:#fff;color:var(--brand);border-color:#fff}.contact-panel .button:hover{background:#eef6ff;color:#0d5796;border-color:#eef6ff}
@media (max-width:980px){.home-feature,.community-section{grid-template-columns:1fr}.home-feature-media img{height:420px}.proof-stats{grid-template-columns:repeat(2,1fr)}.home-cta{display:grid}.testimonial-grid{grid-template-columns:1fr}.community-section ul{grid-template-columns:1fr}.proof-video iframe,.proof-video img{aspect-ratio:16/9}}
@media (max-width:980px){.map-grid{grid-template-columns:1fr}.map-card{grid-template-rows:auto 340px}}
@media (max-width:620px){.section-wide{padding:3.5rem 0}.home-feature-media img{height:330px}.benefit-list article{grid-template-columns:1fr}.proof-stats{grid-template-columns:1fr}.home-cta{margin:2rem auto 3rem;padding:2rem 1.2rem}.testimonial-grid article{padding:1.25rem}.map-card{grid-template-rows:auto 300px}.map-card iframe{min-height:300px}.map-card-copy .button{width:100%}}
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
  await writeFile(path.join(DIST, "assets", "site.css"), css.trim(), "utf8");
  await writeFile(path.join(DIST, "assets", "site.js"), js.trim(), "utf8");
  await writeFile(path.join(DIST, ".nojekyll"), "", "utf8");

  await writeRoute("/", homePage(data));
  await writeRoute("/shop/", shopPage(data));
  const blogPosts = data.posts.filter((post) => post.title);
  const blogPerPage = 24;
  const blogTotalPages = Math.max(1, Math.ceil(blogPosts.length / blogPerPage));
  for (let page = 1; page <= blogTotalPages; page += 1) {
    await writeRoute(page === 1 ? "/blog/" : `/blog/page/${page}/`, blogPage(data, page, blogPerPage));
  }
  await writeRoute("/contact/", contactPage(data, "/contact/"));
  await writeRoute("/contacto/", contactPage(data, "/contacto/"));

  for (const product of data.products) {
    await writeRoute(product.path, productPage(product, data));
  }
  for (const category of data.categories) {
    await writeRoute(category.path, categoryPage(category, data));
    const alias = `/categoria-producto/${category.slug}/`;
    if (alias !== category.path) await writeRoute(alias, categoryPage({ ...category, path: alias }, data));
  }
  for (const page of data.pages) {
    const first = page.path.replace(/^\/+|\/+$/g, "").split("/")[0];
    if (["contact", "contacto"].includes(page.slug)) continue;
    if (!reserved.has(first) && page.title) await writeRoute(page.path, genericPage(page, data));
  }
  for (const post of data.posts) {
    const first = post.path.replace(/^\/+|\/+$/g, "").split("/")[0];
    if (!reserved.has(first) && post.title) await writeRoute(post.path, articlePage(post, data));
  }

  await writeRoute("/cart/", redirectLikePage(data, "Carrito", "/cart/", "La tienda nueva trabaja por WhatsApp para responder rapido y confirmar disponibilidad."));
  await writeRoute("/checkout/", redirectLikePage(data, "Finalizar compra", "/checkout/", "Para comprar, mandanos mensaje y te confirmamos total, envio y forma de pago."));
  await writeRoute("/my-account/", redirectLikePage(data, "Cuenta", "/my-account/", "Ya no necesitas cuenta para comprar. Te atendemos directo por WhatsApp."));

  const routes = [
    "/",
    "/shop/",
    "/blog/",
    ...data.products.map((item) => item.path),
    ...data.categories.map((item) => item.path),
    ...data.categories.map((item) => `/categoria-producto/${item.slug}/`),
    ...Array.from({ length: blogTotalPages }, (_, index) => index === 0 ? "/blog/" : `/blog/page/${index + 1}/`),
    ...data.pages.map((item) => item.path),
    ...data.posts.map((item) => item.path),
    "/cart/",
    "/checkout/",
    "/my-account/"
  ];
  const uniqueRoutes = [...new Set(routes)].filter(Boolean);
  const sitemapRoutes = [...writtenRoutes].sort();
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
