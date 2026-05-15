import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SITE = "https://minoxidilencdmx.com";
const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");
const IMAGE_DIR = path.join(ROOT, "public", "assets", "images");
const DATA_FILE = path.join(CONTENT_DIR, "site-data.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function stripTags(value = "") {
  return decodeEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function slugFileName(url, fallback = "image") {
  const parsed = new URL(url);
  const base = decodeURIComponent(path.basename(parsed.pathname)) || fallback;
  const ext = path.extname(base).toLowerCase() || ".jpg";
  const name = path.basename(base, ext)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${name || fallback}${ext}`;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 MinoxidilStaticMigration/1.0" }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 MinoxidilStaticMigration/1.0" }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}

async function fetchAll(endpoint, params = {}) {
  const items = [];
  for (let page = 1; page <= 20; page += 1) {
    const url = new URL(`${SITE}/wp-json/${endpoint}`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const batch = await fetchJson(url);
    items.push(...batch);
    if (!Array.isArray(batch) || batch.length < 100) break;
    await sleep(200);
  }
  return items;
}

function collectImageUrls(html = "") {
  const urls = new Set();
  const imgRe = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRe.exec(html))) {
    const url = match[1];
    if (url.startsWith("http") && /\.(png|jpe?g|webp|gif)$/i.test(new URL(url).pathname)) {
      urls.add(url);
    }
  }
  return [...urls];
}

async function downloadImage(url, seen) {
  if (!url || !url.startsWith("http")) return null;
  if (seen.has(url)) return seen.get(url);

  let fileName = slugFileName(url);
  let target = path.join(IMAGE_DIR, fileName);
  if (existsSync(target)) {
    const local = `/assets/images/${fileName}`;
    seen.set(url, local);
    return local;
  }
  let counter = 2;
  while (existsSync(target) && !seen.has(url)) {
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    fileName = `${name}-${counter}${ext}`;
    target = path.join(IMAGE_DIR, fileName);
    counter += 1;
  }

  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 MinoxidilStaticMigration/1.0" }
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(target, buffer);
    const local = `/assets/images/${fileName}`;
    seen.set(url, local);
    return local;
  } catch (error) {
    console.warn(`No pude descargar imagen: ${url} (${error.message})`);
    seen.set(url, url);
    return url;
  }
}

function rewriteHtmlImages(html = "", imageMap) {
  let output = html;
  for (const [remote, local] of imageMap.entries()) {
    output = output.split(remote).join(local);
  }
  return output;
}

function categoryPath(category) {
  if (!category?.link) return `/categoria-producto/${category.slug}/`;
  return new URL(category.link).pathname;
}

function moneyFromStorePrices(prices) {
  if (!prices?.price) return "";
  const amount = Number(prices.price) / 10 ** Number(prices.currency_minor_unit ?? 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: prices.currency_code || "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

async function main() {
  await mkdir(CONTENT_DIR, { recursive: true });
  await mkdir(IMAGE_DIR, { recursive: true });

  console.log("Descargando productos, posts, paginas y categorias...");
  const [storeProducts, wpProducts, posts, pages, categories, homeHtml] = await Promise.all([
    fetchAll("wc/store/products", { orderby: "popularity" }),
    fetchAll("wp/v2/product", { _embed: "1" }),
    fetchAll("wp/v2/posts", { _embed: "1" }),
    fetchAll("wp/v2/pages", { _embed: "1" }),
    fetchAll("wp/v2/product_cat"),
    fetchText(SITE)
  ]);

  const wpProductById = new Map(wpProducts.map((item) => [item.id, item]));
  const imageUrls = new Set(collectImageUrls(homeHtml));

  for (const product of storeProducts) {
    for (const image of product.images || []) imageUrls.add(image.src);
    const wpProduct = wpProductById.get(product.id);
    const featured = wpProduct?._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
    if (featured) imageUrls.add(featured);
    for (const url of collectImageUrls(product.description || "")) imageUrls.add(url);
  }

  for (const item of [...posts, ...pages]) {
    const featured = item?._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
    if (featured) imageUrls.add(featured);
    for (const url of collectImageUrls(item.content?.rendered || "")) imageUrls.add(url);
  }

  console.log(`Descargando ${imageUrls.size} imagenes usadas...`);
  const imageMap = new Map();
  for (const url of imageUrls) {
    await downloadImage(url, imageMap);
    await sleep(80);
  }

  const productData = storeProducts.map((product) => {
    const images = (product.images || []).map((image) => ({
      id: image.id,
      src: imageMap.get(image.src) || image.src,
      original: image.src,
      alt: image.alt || product.name
    }));
    const categoriesData = (product.categories || []).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      path: categoryPath(category)
    }));
    return {
      id: product.id,
      slug: product.slug,
      oldUrl: product.permalink,
      path: `/producto/${product.slug}/`,
      name: decodeEntities(product.name),
      excerpt: stripTags(product.short_description || product.description).slice(0, 220),
      description: rewriteHtmlImages(product.description || "", imageMap),
      price: moneyFromStorePrices(product.prices),
      priceHtml: stripTags(product.price_html),
      onSale: product.on_sale,
      type: product.type,
      categories: categoriesData,
      image: images[0]?.src || "",
      images,
      rating: product.average_rating,
      reviewCount: product.review_count,
      inStock: product.is_in_stock
    };
  });

  const categoryData = categories
    .filter((category) => category.count > 0)
    .map((category) => ({
      id: category.id,
      name: decodeEntities(category.name),
      slug: category.slug,
      path: categoryPath(category),
      count: category.count,
      parent: category.parent
    }));

  const postData = posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    path: `/${post.slug}/`,
    title: decodeEntities(post.title?.rendered || ""),
    date: post.date,
    modified: post.modified,
    excerpt: stripTags(post.excerpt?.rendered || post.content?.rendered || "").slice(0, 220),
    content: rewriteHtmlImages(post.content?.rendered || "", imageMap),
    image: imageMap.get(post._embedded?.["wp:featuredmedia"]?.[0]?.source_url) || "",
    oldUrl: post.link
  }));

  const pageData = pages.map((page) => ({
    id: page.id,
    slug: page.slug,
    path: page.slug === "home" ? "/" : `/${page.slug}/`,
    title: decodeEntities(page.title?.rendered || ""),
    excerpt: stripTags(page.excerpt?.rendered || page.content?.rendered || "").slice(0, 220),
    content: rewriteHtmlImages(page.content?.rendered || "", imageMap),
    image: imageMap.get(page._embedded?.["wp:featuredmedia"]?.[0]?.source_url) || "",
    oldUrl: page.link
  }));

  const data = {
    generatedAt: new Date().toISOString(),
    source: SITE,
    brand: "Minoxidil Todo Mexico",
    siteTitle: "Tienda y venta Minoxidil en Mexico CDMX",
    description: "Tratamientos capilares, minoxidil Kirkland, productos para barba y cabello con sucursal en CDMX y envios a todo Mexico.",
    whatsapp: "525569380408",
    email: "ventasminoxidilmexico@gmail.com",
    locations: [
      "Plaza Guelatao Local 76 Pasillo 5, CDMX",
      "Oriente 10 #224 Col Reforma, Nezahualcoyotl"
    ],
    hours: "Martes a Domingo: 12PM - 5PM",
    social: {
      facebook: "https://www.facebook.com/minoxidiltodomexico",
      instagram: "https://www.instagram.com/minoxidiltodomexico",
      tiktok: "https://www.tiktok.com/@minoxidiltodomexico"
    },
    heroImages: [...imageMap.values()].slice(0, 8),
    products: productData,
    categories: categoryData,
    posts: postData,
    pages: pageData,
    notes: {
      duplicateReview: "Revisar posts con titulos muy parecidos antes de republicar contenido nuevo. Se conservaron las URLs para no perder posicionamiento."
    }
  };

  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Listo: ${DATA_FILE}`);
  console.log(`${productData.length} productos, ${postData.length} posts, ${pageData.length} paginas, ${categoryData.length} categorias.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
