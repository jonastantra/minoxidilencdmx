import { readFile } from "node:fs/promises";
import path from "node:path";

async function run() {
  const jsonPath = path.join("g:", "1.Otros Sitios Web", "minoxidilencdmx", "content", "site-data.json");
  const data = JSON.parse(await readFile(jsonPath, "utf8"));
  
  const extracted = data.products.map(p => {
    // Generar un tag basado en la categoría o en palabras clave
    let tag = "Tratamiento";
    if (/kirkland/i.test(p.name)) {
      if (/foam|espuma/i.test(p.name)) tag = "Espuma Kirkland";
      else tag = "Kirkland Líquido";
    } else if (/biotina/i.test(p.name)) {
      tag = "Biotina";
    } else if (/roller/i.test(p.name)) {
      tag = "Dermaroller";
    } else if (/balsamo|bálsamo/i.test(p.name)) {
      tag = "Bálsamo";
    } else if (/shampoo/i.test(p.name)) {
      tag = "Shampoo";
    } else if (/jabon|jabón/i.test(p.name)) {
      tag = "Jabón";
    } else if (/kit/i.test(p.name)) {
      tag = "Kit Ahorro";
    }

    // Extraer una descripción corta (copy) limpia
    let copy = p.excerpt || "";
    if (!copy && p.description) {
      copy = p.description;
    }
    copy = copy.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (copy.length > 150) {
      copy = copy.slice(0, 147) + "...";
    }
    if (!copy) {
      copy = "Producto original para el crecimiento de barba y cabello. Consulta detalles de aplicación.";
    }

    // Limpiar nombre quitando sufijos de SEO excesivos
    const cleanName = p.name
      .replace(/\s*\|\s*Crecimiento de Barba y Cabello/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      name: cleanName,
      price: p.price || "$250", // fallback
      image: p.image ? path.basename(p.image) : "placeholder.jpg",
      tag: tag,
      copy: copy
    };
  });

  console.log(JSON.stringify(extracted, null, 2));
}

run().catch(console.error);
