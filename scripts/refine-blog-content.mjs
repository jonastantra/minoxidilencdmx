import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "content", "site-data.json");
const REPORT_FILE = path.join(ROOT, "content", "blog-refinement-report.md");

const safetyNote = "Nota responsable: el minoxidil puede causar resequedad, irritación o molestias. Si tienes presión alta, problemas del corazón, embarazo, lactancia, piel lastimada, caída repentina o una reacción fuerte, conviene pausar y consultar a un profesional de salud.";

const stopWords = new Set([
  "como", "para", "con", "sin", "que", "una", "unos", "unas", "del", "los", "las", "por", "mas", "menos",
  "minoxidil", "guia", "practica", "directa", "clara", "mexico", "cdmx", "barba", "cabello", "producto",
  "empieces", "rutina", "simple", "caida", "dejes", "ultimo", "piel", "seca", "ignora", "pareja", "normal"
]);

const numberedThemes = [
  ["Rutina realista para empezar", "La mayoría no falla por falta de producto; falla porque empieza con una rutina que no puede sostener."],
  ["Primeras semanas sin desesperarte", "Al principio uno quiere ver cambios cada mañana, pero el avance serio se revisa con calma."],
  ["Piel seca y aplicación diaria", "La resequedad no se ignora. Si la piel se irrita, tarde o temprano abandonas."],
  ["Fotos mensuales y seguimiento", "El espejo diario engaña. Una foto mensual con la misma luz dice más."],
  ["Rasurado, recorte y paciencia", "Rasurarte no mata el avance, pero rasurarte por ansiedad sí puede confundirte."],
  ["Bigote, candado y mejillas", "Cada zona responde distinto. Bigote y barbilla suelen dar señales antes que las mejillas."],
  ["Cantidad correcta de producto", "Más producto no significa más resultado. Muchas veces significa más irritación."],
  ["Constancia antes que marca", "La marca ayuda, pero la constancia es la que permite saber si algo funciona."],
  ["Combinar productos sin saturar", "Dermaroller, shampoo o bálsamo pueden acompañar, pero no todo va al mismo tiempo."],
  ["Compararte menos y medir mejor", "Tu avance se compara contra tu foto inicial, no contra la barba de otra persona."],
  ["Cabello delgado y entradas", "Cuando el cabello se adelgaza, actuar temprano suele ser más sensato que esperar a que avance."],
  ["Coronilla y fotos desde arriba", "La coronilla cambia lento y la luz puede engañar mucho."],
  ["Shampoo, biotina y minoxidil", "Cada cosa tiene su lugar. No conviene venderte la idea de que todo hace lo mismo."],
  ["Caída estacional y alarma real", "No toda caída es igual. Hay que distinguir temporada, estrés, irritación y pérdida progresiva."],
  ["Cuándo pedir diagnóstico", "Si la caída es de golpe, por parches o con comezón fuerte, no lo arregles con otro frasco."],
  ["Huecos pequeños en barba", "Un hueco se trabaja con precisión, no embarrando toda la cara."],
  ["Mejillas despobladas", "Las mejillas suelen ser la prueba de paciencia de casi todos."],
  ["Unión de bigote y candado", "Esa línea preocupa mucho, pero no siempre responde al mismo ritmo que el resto."],
  ["Darle forma mientras crece", "Un recorte bien hecho puede ayudar a que el avance se vea más ordenado."],
  ["Expectativas con huecos", "A veces no se cierra todo, pero mejorar densidad alrededor cambia mucho el aspecto."],
  ["Vello fino y avance inicial", "El vello claro no siempre es poca cosa; puede ser parte del proceso."],
  ["Sol, sudor y aplicación", "Aplicar y salir directo al sol o entrenar sin dejar secar puede molestar la piel."],
  ["Descanso y rutina", "Dormir mal, rascarte o traer la piel irritada puede jugar en contra."],
  ["Shedding sin pánico", "La caída o cambio de vello no siempre significa que todo va mal."],
  ["Producto original y revisable", "En minoxidil hay mucha copia. Conviene comprar algo que puedas revisar."],
  ["Rutinas cortas que sí se cumplen", "Entre más complicada la rutina, más fácil dejarla."],
  ["Antes y después honesto", "Misma luz, misma distancia y nada de filtros: así sí se mide."],
  ["Barba corta mientras avanza", "No necesitas dejar crecer todo desordenado para notar progreso."],
  ["Piel sensible y pausa inteligente", "Pausar a tiempo no es fallar; a veces evita abandonar todo."],
  ["Meta: verte mejor, no obsesionarte", "El tratamiento debe ayudarte, no convertir cada día en angustia."]
];

const topicPacks = [
  {
    id: "postparto",
    match: /postparto|lactancia|embarazo/i,
    title: "Minoxidil y pérdida de cabello postparto: primero calma y diagnóstico",
    intent: "Quien busca esto casi siempre viene asustada porque nota mucho cabello en la regadera o en la almohada después del embarazo.",
    truth: "En postparto puede existir una caída temporal por cambios hormonales, pero no todo se debe tratar igual ni se debe improvisar si hay lactancia.",
    bullets: ["Revisa si estás lactando antes de usar cualquier tratamiento.", "No confundas caída temporal con alopecia progresiva.", "Toma fotos y anota desde cuándo empezó.", "Consulta si la caída viene con dolor, parches o mucha comezón."],
    product: "En tienda te podemos orientar sobre productos capilares, pero en este caso primero importa saber si el momento de salud permite usarlos."
  },
  {
    id: "frontal",
    match: /frontal|entradas|linea|frente/i,
    title: "Pérdida de cabello frontal: qué revisar antes de comprar minoxidil",
    intent: "Cuando la línea frontal cambia, uno lo nota rápido porque altera la cara completa.",
    truth: "Las entradas no responden igual en todos. Puede ayudar cuidar la zona, pero la expectativa debe ser más seria y con seguimiento.",
    bullets: ["Toma fotos de frente con la misma luz.", "Revisa antecedentes familiares.", "No talles la línea frontal con fuerza.", "Si avanza rápido, busca diagnóstico."],
    product: "Para entradas y cabello delgado solemos orientar entre minoxidil, shampoo de apoyo y biotina según el caso."
  },
  {
    id: "areata",
    match: /areata|parches|parche/i,
    title: "Alopecia areata y minoxidil: no lo trates como caída normal",
    intent: "Si ves zonas redondas o parches claros, la duda suele ser si basta con comprar minoxidil.",
    truth: "La alopecia areata necesita revisión profesional. No conviene tapar el problema con una rutina genérica.",
    bullets: ["Observa si el parche crece.", "No rasques ni irrites la zona.", "Consulta antes de mezclar tratamientos.", "Usa fotos para mostrar evolución."],
    product: "Podemos vender productos de apoyo, pero aquí la recomendación honesta es confirmar diagnóstico primero."
  },
  {
    id: "mujeres",
    match: /mujer|mujeres|femenin|cejas|pestañas|pestanas/i,
    title: "Minoxidil en mujeres, cejas o zonas delicadas: cuidado antes que prisa",
    intent: "La búsqueda suele venir por cejas, entradas, cabello delgado o pestañas, y aquí no se vale copiar una rutina de barba.",
    truth: "Las zonas delicadas piden más cuidado. La piel del rostro no se trata igual que la barba de un hombre.",
    bullets: ["No apliques cerca de ojos sin orientación.", "Evita usarlo si hay irritación o heridas.", "Revisa concentración y presentación.", "Si estás embarazada o lactando, consulta."],
    product: "Si buscas cejas, cabello o apoyo con biotina, pregunta antes para elegir algo adecuado y no comprar a ciegas."
  },
  {
    id: "kirkland",
    match: /kirkland|pirata|original|rogaine|copia|falso/i,
    title: "Minoxidil Kirkland original: señales para comprar con más confianza",
    intent: "La duda real es sencilla: nadie quiere pagar por un producto falso ni poner en la piel algo dudoso.",
    truth: "No hay que comprar solo por precio. Presentación, lote, empaque y vendedor importan.",
    bullets: ["Revisa caja, lote y sellos.", "Desconfía de precios demasiado bajos.", "Pide fotos reales si compras a distancia.", "Compra donde te respondan dudas después."],
    product: "Nosotros vendemos minoxidil Kirkland y te podemos mandar fotos, existencia y precio actualizado por WhatsApp."
  },
  {
    id: "aplicacion",
    match: /aplicar|aplicacion|uso|usar|rutina|manual|instructivo|tutorial/i,
    title: "Cómo usar minoxidil sin complicarte: rutina clara y sostenible",
    intent: "La mayoría busca una receta exacta, pero lo que más ayuda es entender qué repetir y qué evitar.",
    truth: "Una rutina simple gana contra una rutina perfecta que solo haces tres días.",
    bullets: ["Lava y seca la zona.", "Aplica con medida y deja secar.", "No dupliques dosis por ansiedad.", "Mide avance cada mes."],
    product: "Si compras con nosotros, te explicamos cómo usarlo según barba, cabello o mantenimiento."
  },
  {
    id: "barba",
    match: /barba|bigote|candado|mejilla|hueco|barbon|vell[oó]|lampino/i,
    title: "Barba con minoxidil: constancia, piel sana y expectativas reales",
    intent: "Casi todos buscan cerrar huecos o llenar mejillas, pero no todos parten del mismo punto.",
    truth: "La barba depende mucho de genética, edad, rutina y tolerancia de la piel.",
    bullets: ["No compares tu avance con otra persona.", "Cuida resequedad e irritación.", "Haz fotos mensuales.", "Dale meses, no días."],
    product: "Vendemos tratamientos para barba y también productos de apoyo como dermaroller, bálsamos y jabones."
  },
  {
    id: "cabello",
    match: /cabello|caida|caída|perdida|pérdida|alopecia|coronilla|finaster|shampoo|biotina/i,
    title: "Caída de cabello y minoxidil: actuar temprano sin comprar por pánico",
    intent: "Quien busca caída de cabello normalmente quiere una respuesta rápida porque cada pelo que cae preocupa.",
    truth: "Hay caídas temporales y caídas progresivas. Antes de prometer resultados, hay que mirar el patrón.",
    bullets: ["Observa entradas, coronilla y densidad.", "No confundas shampoo con tratamiento principal.", "Evita rascar o irritar el cuero cabelludo.", "Consulta si la caída es repentina."],
    product: "Para cabello manejamos minoxidil, shampoo de apoyo y biotina; te orientamos por WhatsApp según tu caso."
  },
  {
    id: "producto",
    match: /biotina|dermaroller|shampoo|balsamo|bálsamo|jabon|jabón|aceite|cera|foam|espuma/i,
    title: "Productos para acompañar minoxidil: qué sí aporta y qué no necesitas",
    intent: "La duda común es si conviene agregar otro producto o si solo estás comprando de más.",
    truth: "Un apoyo puede servir, pero mezclar todo sin orden suele irritar o confundir resultados.",
    bullets: ["Agrega un producto a la vez.", "No uses dermaroller sobre piel irritada.", "El shampoo acompaña, no hace todo.", "La biotina ayuda más si hay deficiencia o rutina incompleta."],
    product: "En la tienda te ayudamos a armar un kit sin meter cosas innecesarias."
  },
  {
    id: "general",
    match: /.*/i,
    title: "Minoxidil explicado sin vueltas: lo que revisaría antes de empezar",
    intent: "Esta búsqueda normalmente viene de alguien que ya leyó mucho, pero todavía no sabe qué hacer.",
    truth: "Lo importante no es saber cien trucos; es elegir una rutina que puedas sostener y revisar con calma.",
    bullets: ["Define tu objetivo: barba, cabello, cejas o mantenimiento.", "Toma una foto inicial.", "Compra producto revisable.", "No ignores señales de irritación."],
    product: "Si quieres comprar, te atendemos por WhatsApp y te decimos qué hay disponible."
  }
];

const intros = [
  "Te lo digo como lo explicaría en mostrador, sin vueltas raras.",
  "Aquí prefiero hablar claro porque este tema se presta mucho a promesas exageradas.",
  "Esto lo he visto muchas veces con clientes que llegan con prisa y muchas dudas.",
  "La idea no es asustarte ni venderte magia; es que entiendas qué revisar.",
  "Si llegaste a esta entrada desde Google, seguramente ya leíste varias respuestas repetidas."
];

const closers = [
  "Mi consejo final: mide, pregunta y no cambies todo cada semana.",
  "Si vas a invertir en tratamiento, que sea con seguimiento y no solo por impulso.",
  "Quédate con lo simple: constancia, piel sana y expectativas reales.",
  "Antes de comprar por ansiedad, vale más entender qué problema estás intentando resolver.",
  "Si tienes duda, manda mensaje; es mejor preguntar antes que usar algo mal."
];

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function stripTags(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function titleFromSlug(slug = "") {
  const text = slug
    .replace(/^%e2%9c%85/i, "")
    .replace(/-\d+$/i, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bcaida\b/gi, "caída")
    .replace(/\bperdida\b/gi, "pérdida")
    .replace(/\bcomo\b/gi, "cómo")
    .replace(/\bque\b/gi, "qué")
    .replace(/\baplicacion\b/gi, "aplicación")
    .replace(/\bmas\b/gi, "más")
    .replace(/\bpestanas\b/gi, "pestañas")
    .replace(/\bbalsamo\b/gi, "bálsamo")
    .replace(/\bjabon\b/gi, "jabón");
  if (!text) return "Minoxidil sin rodeos";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function originalFocus(post) {
  const raw = stripTags(post.title || titleFromSlug(post.slug))
    .replace(/: guía práctica$/i, "")
    .replace(/: explicación clara y sin rodeos$/i, "")
    .replace(/\bpara barba con minoxidil\b/gi, "")
    .replace(/\bcon minoxidil\b$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const fallback = titleFromSlug(post.slug);
  return raw.length >= 12 ? raw : fallback;
}

function choosePack(post) {
  const haystack = normalize(`${post.title} ${post.slug}`);
  return topicPacks.find((pack) => pack.match.test(haystack)) || topicPacks.at(-1);
}

function numberedPack(post) {
  const match = post.slug.match(/^(\d+)-2$/);
  if (!match) return null;
  const index = (Number(match[1]) - 1) % numberedThemes.length;
  const [title, truth] = numberedThemes[index];
  return {
    id: "serie-barba",
    title: `${title}: nota rápida sobre minoxidil`,
    intent: "Esta entrada forma parte de las notas cortas del blog, pero la dejé más útil para que no se sienta como texto repetido.",
    truth,
    bullets: ["Mantén la rutina sencilla.", "Observa la piel antes que la emoción.", "Toma fotos cada mes.", "Pregunta si algo te irrita o te causa duda."],
    product: "Si quieres comprar minoxidil o armar rutina de barba, te orientamos por WhatsApp."
  };
}

function keywordsFromPost(post) {
  const words = normalize(post.slug)
    .replace(/[^a-z0-9ñ ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));
  return [...new Set(words)].slice(0, 5);
}

function makeUniqueTitle(post, pack, seenTitles) {
  const slugFocus = titleFromSlug(post.slug);
  const keywords = keywordsFromPost(post);
  const numbered = post.slug.match(/^(\d+)-2$/);
  const slugCore = normalize(slugFocus.replace(/^minoxidil y /i, "").replace(/^minoxidil /i, ""));
  const packCore = normalize(pack.title);
  const tail = pack.title
    .replace(/^Minoxidil y /i, "")
    .replace(/^Minoxidil /i, "")
    .replace(/^Barba con minoxidil: /i, "")
    .replace(/^Productos para acompañar minoxidil: /i, "")
    .replace(/^Cómo usar minoxidil sin complicarte: /i, "")
    .replace(/^Caída de cabello y minoxidil: /i, "");
  let title = numbered
    ? `${pack.title.replace(": nota rápida sobre minoxidil", "")}: parte ${Number(numbered[1])}`
    : packCore.includes(slugCore) ? pack.title : `${slugFocus}: ${tail}`;

  title = title.replace(/\s+/g, " ").replace(/\bMinoxidil Minoxidil\b/g, "Minoxidil").replace(/: :/g, ":").trim();

  if (title.length > 100) title = `${slugFocus}: guía útil`;
  if (title.length > 100 && keywords.length) title = `Minoxidil y ${keywords.slice(0, 3).join(" ")}: guía útil`;
  if (/-2$/.test(post.slug) && !/^\d+-2$/.test(post.slug)) title = `${title}: versión 2`;

  const base = title;
  let count = seenTitles.get(normalize(base)) || 0;
  seenTitles.set(normalize(base), count + 1);
  if (!count) return base;

  const suffix = keywords.length ? keywords.slice(0, 3).join(" ") : post.slug.replace(/-/g, " ");
  title = `${base}: ${suffix}`;
  if (title.length > 100) title = `${base}: caso ${count + 1}`;
  seenTitles.set(normalize(title), 1);
  return title;
}

function cleanLegacyHtml(content = "") {
  return String(content)
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/<h1>\s*<\/h1>/gi, "")
    .trim();
}

function articleBody(post, pack, index) {
  const focus = originalFocus(post);
  const slugFocus = titleFromSlug(post.slug);
  const intro = intros[index % intros.length];
  const closer = closers[(index + 2) % closers.length];
  const keywords = keywordsFromPost(post);
  const originalSummary = post.editorialStatus === "refined-distinct-static" ? "" : stripTags(post.content).slice(0, 260);
  const why = keywords.length
    ? `En esta nota el punto central sale de la búsqueda real: ${keywords.map((word) => titleFromSlug(word).toLowerCase()).join(", ")}. No lo trato como palabra de relleno, sino como una duda de alguien que está intentando decidir bien.`
    : `En esta nota el punto central es ${focus.toLowerCase()}. La idea es aterrizar la duda sin repetir lo mismo que aparece en todos lados.`;

  const caseLine = [
    "Caso típico: alguien compra con emoción, usa el producto unos días, se desespera y cambia de rutina antes de poder medir nada.",
    "Caso típico: la persona cree que necesita más producto, cuando en realidad necesita aplicarlo mejor y cuidar la piel.",
    "Caso típico: se compara con fotos de internet y deja de ver su propio avance.",
    "Caso típico: pregunta tarde, cuando ya irritó la zona por mezclar demasiadas cosas.",
    "Caso típico: el problema sí tiene solución parcial, pero no con una promesa de una semana."
  ][(index + keywords.length) % 5];

  return [
    `<p>${escapeHtml(intro)} En concreto, aquí hablo de ${escapeHtml(slugFocus.toLowerCase())}. ${escapeHtml(pack.intent)}</p>`,
    `<p>${escapeHtml(pack.truth)}</p>`,
    `<h2>Lo importante de este tema</h2>`,
    `<p>${escapeHtml(why)}</p>`,
    `<p>${escapeHtml(post.slug.endsWith("-2") ? "Esta URL quedó como segunda versión histórica, así que la uso para aterrizar el tema desde otro ángulo y no repetir la misma explicación." : `Esta entrada se queda enfocada en ${slugFocus.toLowerCase()}, para que el usuario encuentre una respuesta concreta y no otro texto genérico.`)}</p>`,
    originalSummary ? `<p>De la entrada original conservo la intención: ${escapeHtml(originalSummary)}${originalSummary.length >= 260 ? "..." : ""}</p>` : "",
    `<h2>Lo que revisaría antes de decidir</h2>`,
    `<ul>${pack.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
    `<h2>Una forma más honesta de verlo</h2>`,
    `<p>${escapeHtml(caseLine)}</p>`,
    `<p>No me gusta vender la idea de que todo se arregla igual. Barba, cabello, cejas, entradas o coronilla tienen contextos diferentes. Por eso conviene preguntar, revisar fotos y elegir algo que sí puedas sostener.</p>`,
    `<h2>Errores que evitaría</h2>`,
    `<ul><li>No comprar solo por precio.</li><li>No duplicar cantidad por desesperación.</li><li>No aplicar sobre piel lastimada o irritada.</li><li>No abandonar antes de tener una comparación real.</li></ul>`,
    `<h2>Si quieres comprar o pedir orientación</h2>`,
    `<p>${escapeHtml(pack.product)}</p>`,
    `<p><strong>${escapeHtml(safetyNote)}</strong></p>`,
    `<p>${escapeHtml(closer)}</p>`
  ].filter(Boolean).join("\n");
}

async function main() {
  const data = JSON.parse(await readFile(DATA_FILE, "utf8"));
  const seenTitles = new Map();
  const report = [
    "# Refinamiento editorial del blog",
    "",
    "Se conservaron todas las URLs. No se borraron entradas; se diferenciaron títulos, extractos y contenido.",
    "",
    "## Entradas revisadas",
    ""
  ];

  const stats = new Map();
  data.posts = data.posts.map((post, index) => {
    const pack = numberedPack(post) || choosePack(post);
    const title = makeUniqueTitle(post, pack, seenTitles);
    const body = articleBody(post, pack, index);
    const excerpt = stripTags(body).slice(0, 230);
    stats.set(pack.id, (stats.get(pack.id) || 0) + 1);
    report.push(`- ${post.path} | ${pack.id} | ${post.title} -> ${title}`);
    return {
      ...post,
      title,
      excerpt,
      content: body,
      editorialStatus: "refined-distinct-static",
      editorialTopic: pack.id
    };
  });

  data.notes = {
    ...(data.notes || {}),
    editorial: `Se refinaron ${data.posts.length} entradas con títulos únicos, contenido por tema y CTA modular de venta. URLs conservadas.`
  };

  report.splice(3, 0, `Resumen: ${data.posts.length} entradas revisadas. Temas: ${[...stats.entries()].map(([key, value]) => `${key}: ${value}`).join(", ")}.`);

  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await writeFile(REPORT_FILE, `${report.join("\n")}\n`, "utf8");
  console.log(`Entradas refinadas: ${data.posts.length}`);
  console.log([...stats.entries()].map(([key, value]) => `${key}:${value}`).join(" "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
