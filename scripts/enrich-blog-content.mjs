import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "content", "site-data.json");

function decodeMojibake(value = "") {
  const replacements = [
    ["Â¿", "¿"], ["Â¡", "¡"], ["Ã¡", "á"], ["Ã©", "é"], ["Ã­", "í"], ["Ã³", "ó"], ["Ãº", "ú"], ["Ã±", "ñ"],
    ["Ã ", "Á"], ["Ã‰", "É"], ["Ã ", "Í"], ["Ã“", "Ó"], ["Ãš", "Ú"], ["Ã‘", "Ñ"], ["â€“", "–"], ["â€”", "—"],
    ["â€œ", "“"], ["â€ ", "”"], ["â€˜", "‘"], ["â€™", "’"], ["â€¦", "…"], ["âœ…", ""], ["Â", ""],
    ["recuperaciÃ³n", "recuperación"], ["aplicaciÃ³n", "aplicación"], ["atenciÃ³n", "atención"]
  ];
  let output = String(value);
  for (const [bad, good] of replacements) output = output.split(bad).join(good);
  return output;
}

function cleanTitle(rawTitle, slug) {
  let title = decodeMojibake(rawTitle || "").trim();

  // Strip duplicate AI suffixes
  title = title.replace(/(?::\s*(?:explicado sin vueltas|lo que revisaría antes de empezar|rutina clara y sostenible|guía útil|Kirkland original|señales para comprar con más confianza|constancia, piel sana y expectativas reales|qué sí aporta y qué no necesitas|actuar temprano sin comprar por pánico|guía práctica|versión práctica|con enfoque real|paso a paso))+/gi, "");
  title = title.replace(/:\s*parte \d+/gi, "");
  title = title.replace(/\s*:\s*$/, "").trim();

  // Clean specific titles that became single words
  const singleWordTitles = {
    "tendencias": "Tendencias en Tratamientos con Minoxidil para Barba y Cabello",
    "ciclo-de-uso": "Entendiendo el Ciclo de Uso de Minoxidil para Maximizar Resultados",
    "innovaciones": "Innovaciones en Fórmulas y Presentaciones de Minoxidil",
    "desarrollo": "Desarrollo Folicular: Cómo Crece la Barba con Minoxidil",
    "precauciones": "Precauciones Esenciales al Usar Minoxidil en Rostro y Cuero Cabelludo",
    "revolucion": "La Revolución del Minoxidil para Crecimiento de Barba en México",
    "estudios-clinicos": "Estudios Clínicos sobre la Efectividad del Minoxidil al 5%",
    "recetas-caseras": "Recetas Caseras vs Minoxidil: Mitos y Realidades para la Barba",
    "estrategias": "Estrategias Clave para Cerrar Huecos en la Barba con Minoxidil",
    "cuidado-facial": "Cuidado Facial y Rutina Anti-Resequedad con Minoxidil",
    "masculinidad": "El Cuidado de la Barba: Estilo, Densidad y Minoxidil",
    "marcas": "Marcas de Minoxidil en México: Comparativa Kirkland vs Otras Opciones",
    "protocolo": "Protocolo Paso a Paso para Aplicar Minoxidil en la Barba",
    "investigacion": "Investigación Científica: Cómo Actúa el Minoxidil en los Folículos",
    "preguntas": "Preguntas Frecuentes sobre el Tratamiento con Minoxidil al 5%",
    "secreto": "El Secreto de la Constancia con Minoxidil: Tiempos y Expectativas",
    "advertencias": "Advertencias y Efectos Secundarios Comunes del Minoxidil Tópico",
    "alternativas": "Alternativas y Complementos al Minoxidil: Biotina y Dermaroller",
    "acondicionador": "Acondicionador y Aceites para Barba: Cómo Cuidarla Durante el Tratamiento",
    "eficacia": "Eficacia Comprobada del Minoxidil: Qué Dice la Ciencia",
    "aplicacion": "Guía de Aplicación de Minoxidil: Dosificación y Horarios",
    "innovacion": "Nuevas Fórmulas de Minoxidil: Líquido vs Espuma",
    "experiencia": "Experiencias y Etapas Reales al Usar Minoxidil en la Barba",
    "preguntas-frecuentes": "Preguntas Frecuentes sobre Minoxidil en Barba y Cabello",
    "riesgos": "Riesgos y Cuidados al Usar Minoxidil Tópico",
    "recomendaciones": "Recomendaciones Prácticas para no Abandonar tu Tratamiento de Minoxidil",
    "uso": "Uso Diario de Minoxidil: Mañana y Noche sin Irritar la Piel",
    "comparacion": "Comparación: Minoxidil Kirkland vs Otras Marcas en México",
    "dosis": "Dosis Exacta de Minoxidil: Por Qué 1 ml es la Medida Correcta",
    "mujeres": "Minoxidil en Mujeres: Cuidados, Dosis y Recomendaciones",
    "blog": "Consejos y Artículos sobre Minoxidil, Barba y Cabello"
  };

  if (singleWordTitles[slug]) {
    return singleWordTitles[slug];
  }

  // Capitalize nicely if lowercase
  if (title.length < 5 || /^\d+$/.test(title)) {
    title = slug.replace(/%e2%9c%85/gi, "").replace(/-/g, " ").trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Clean mojibake / encoding characters
  title = title.replace(/%e2%9c%85/gi, "").replace(/^[-:\s]+|[-:\s]+$/g, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return title;
}

function generateCleanArticleContent(post, title) {
  const isBeard = /barba|bigote|candado|mejillas|vellus|huecos/i.test(`${post.slug} ${title}`);
  const isHair = /cabello|pelo|alopecia|caida|entradas|coronilla/i.test(`${post.slug} ${title}`);
  const isKirkland = /kirkland|original|pirata|clon|importado/i.test(`${post.slug} ${title}`);
  const isRoutine = /aplicar|uso|rutina|manual|tutorial|dosis|veces/i.test(`${post.slug} ${title}`);
  const isShedding = /shedding|etapa|meses|tiempo|resultados/i.test(`${post.slug} ${title}`);

  let focusTheme = "el uso responsable y constante de minoxidil para lograr resultados visibles";
  if (isBeard) focusTheme = "el crecimiento, engrosamiento y cobertura de la barba utilizando minoxidil al 5%";
  else if (isHair) focusTheme = "el fortalecimiento folicular y prevención de la caída del cabello con minoxidil tópico";
  else if (isKirkland) focusTheme = "cómo verificar la autenticidad del Minoxidil Kirkland original frente a imitaciones";
  else if (isRoutine) focusTheme = "la rutina correcta de aplicación paso a paso para evitar errores e irritación";
  else if (isShedding) focusTheme = "las etapas de crecimiento, el efecto shedding inicial y los tiempos reales de respuesta";

  const imageTag = post.image
    ? `<figure class="article-featured-image"><img src="${post.image}" alt="${title}" loading="lazy"><figcaption>${title}</figcaption></figure>`
    : "";

  return `
    <p class="lead-paragraph">
      Cuando se trata de <strong>${title.toLowerCase()}</strong>, la clave principal no es buscar trucos mágicos ni fórmulas milagro, sino entender con claridad cómo funciona el tratamiento, qué esperar en cada etapa y cómo mantener una rutina constante sin lastimar tu piel.
    </p>

    ${imageTag}

    <h2>Puntos Fundamentales sobre ${title}</h2>
    <p>
      El minoxidil al 5% es el principio activo con mayor respaldo científico para estimular la circulación sanguínea hacia los folículos pilosos. En el contexto de ${focusTheme}, existen factores indispensables que debes tener en cuenta antes y durante su aplicación:
    </p>
    <ul>
      <li><strong>Constancia antes que cantidad:</strong> Aplicar más de 1 ml por dosis no acelera el crecimiento; solo aumenta la probabilidad de resequedad o irritación en la piel.</li>
      <li><strong>Piel limpia y seca:</strong> Lava siempre el área con agua tibia y jabón neutro antes de la aplicación para permitir la absorción completa del producto.</li>
      <li><strong>El tiempo necesario:</strong> El ciclo folicular requiere entre 3 y 6 meses continuos para transformar el vello delgado (vellus) en cabello o vello de barba maduro y permanente.</li>
      <li><strong>Control de la resequedad:</strong> Si sientes tirantez o notas descamación, utiliza crema hidratante o aceite especial para barba al menos 4 horas después de haber aplicado el minoxidil.</li>
    </ul>

    <h2>Etapas del Tratamiento y Qué Esperar</h2>
    <p>
      Uno de los mayores motivos por los cuales las personas abandonan el minoxidil es la falta de información sobre las fases naturales del proceso:
    </p>
    <div class="treatment-stages-grid">
      <div class="stage-item">
        <strong>Mes 1: Adaptación y posible Shedding</strong>
        <p>Es común experimentar descamación leve o incluso caída temporal del vello débil (fase de recambio folicular o <em>shedding</em>). Esto es normal y señala que los folículos se preparan para un nuevo ciclo de crecimiento más fuerte.</p>
      </div>
      <div class="stage-item">
        <strong>Meses 2 a 3: Aparición de Vello Fino</strong>
        <p>Comienzan a brotar pequeños vellos delgados y claros en zonas donde antes no había actividad folicular. Continúa con tu dosis habitual de 1 ml cada 12 horas o 1 vez al día.</p>
      </div>
      <div class="stage-item">
        <strong>Meses 4 a 6+: Maduración y Densidad</strong>
        <p>Los vellos se oscurecen, ganan grosor y se integran de forma uniforme, logrando una cobertura mucho más densa tanto en barba como en cabello.</p>
      </div>
    </div>

    <h2>Errores Frecuentes que Debes Evitar</h2>
    <ul>
      <li><strong>Comprar producto sin verificar su autenticidad:</strong> En el mercado abundan copias o clones diluidos. Revisa siempre el lote impreso en caja y frascos, el gotero dosificador original y compra con distribuidores establecidos.</li>
      <li><strong>Suspender bruscamente el tratamiento:</strong> El proceso debe retirarse gradualmente una vez alcanzados los resultados definitivos para evitar perder el vello que aún no ha madurado por completo.</li>
      <li><strong>Aplicar sobre piel irritada o quemada por el sol:</strong> Si tu piel está roja o lastimada, pausa uno o dos días e hidrata antes de continuar.</li>
    </ul>

    <div class="local-cdmx-callout">
      <div class="cdmx-badge">📍 Tienda Física en CDMX y Envíos a Todo México</div>
      <h3>¿Buscas Minoxidil Kirkland 100% Original en Ciudad de México?</h3>
      <p>
        En <strong>Minoxidil en CDMX</strong> contamos con sucursal física en <strong>Plaza Guelatao Local 76 (Pasillo 5, Iztapalapa, Metro Guelatao Línea A)</strong>, además de entregas personales acordadas en puntos de CDMX y envíos express por paquetería a toda la República Mexicana.
      </p>
      <p>
        Te mostramos los lotes y caducidad de los frascos antes de comprar para que tengas total tranquilidad de que estás adquiriendo producto original de Kirkland Signature.
      </p>
      <div class="callout-actions">
        <a class="button whatsapp-btn" href="https://api.whatsapp.com/send?phone=525569380408&text=${encodeURIComponent(`Hola, leí el artículo sobre "${title}" y quiero informes para comprar Minoxidil Kirkland en CDMX.`)}">
          Consultar existencias por WhatsApp: 55 6938 0408
        </a>
        <a class="button secondary" href="/shop/">Ver Catálogo y Precios</a>
      </div>
    </div>

    <div class="safety-disclaimer">
      <strong>Aviso de Responsabilidad y Salud</strong>
      <p>
        El minoxidil tópico al 5% es de uso cosmético/capilar. Si padeces problemas cardíacos, presión arterial anormal, estás en periodo de embarazo o lactancia, o presentas reacciones alérgicas severas (como mareos o taquicardia), suspende de inmediato su uso y consulta a un médico dermatólogo.
      </p>
    </div>
  `.trim();
}

async function run() {
  console.log("Leyendo content/site-data.json...");
  const raw = await readFile(DATA_FILE, "utf8");
  const data = JSON.parse(decodeMojibake(raw));

  console.log(`Posts totales: ${data.posts.length}`);

  let updatedCount = 0;
  const cleanedPosts = [];

  for (const post of data.posts) {
    const isNumbered = /^(\d+)(-2)?$/.test(post.slug);
    if (isNumbered) {
      post.isNumbered = true;
      cleanedPosts.push(post);
      continue;
    }

    // Semantic post: Clean title and enrich content
    post.title = cleanTitle(post.title, post.slug);
    post.isNumbered = false;
    post.excerpt = decodeMojibake(post.excerpt || "")
      .replace(/En concreto, aquí hablo de.*/gi, "")
      .replace(/Te lo digo como lo explicaría.*/gi, "")
      .trim();

    if (!post.excerpt || post.excerpt.length < 50) {
      post.excerpt = `Guía práctica y completa sobre ${post.title.toLowerCase()}. Consejos de aplicación, tiempos de resultado y compra en CDMX.`;
    }

    post.content = generateCleanArticleContent(post, post.title);

    // Assign appropriate image if missing or generic
    if (!post.image || post.image.includes("og-minoxidil")) {
      const isBeard = /barba|bigote|candado|mejillas/i.test(`${post.slug} ${post.title}`);
      post.image = isBeard
        ? "/assets/images/resultados-de-minoxidil-en-la-barba-1-1024x585.jpg"
        : "/assets/images/aplicacion-de-minoxidil-en-el-cuero-cabelludo-1024x585.jpg";
    }

    updatedCount++;
    cleanedPosts.push(post);
  }

  data.posts = cleanedPosts;

  // Clean mojibake in products, pages and site metadata
  data.brand = "Minoxidil en CDMX";
  data.siteTitle = "Minoxidil en CDMX | Kirkland Original, Sucursal Plaza Guelatao y Entregas";
  data.description = "Venta de Minoxidil Kirkland 100% Original en Ciudad de México. Tienda física en Plaza Guelatao Local 76, entregas personales y envíos a todo México. Asesoría por WhatsApp.";

  for (const prod of data.products || []) {
    prod.name = decodeMojibake(prod.name);
    prod.description = decodeMojibake(prod.description);
    prod.excerpt = decodeMojibake(prod.excerpt);
  }

  for (const cat of data.categories || []) {
    cat.name = decodeMojibake(cat.name);
  }

  for (const page of data.pages || []) {
    page.title = decodeMojibake(page.title);
    page.content = decodeMojibake(page.content);
    page.excerpt = decodeMojibake(page.excerpt);
  }

  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Listo: ${updatedCount} posts semánticos enriquecidos y limpiados con éxito.`);
}

run().catch(err => {
  console.error("Error al enriquecer posts:", err);
  process.exit(1);
});
