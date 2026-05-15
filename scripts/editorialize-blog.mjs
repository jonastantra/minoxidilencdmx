import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "content", "site-data.json");
const REPORT_FILE = path.join(process.cwd(), "content", "blog-editorial-report.md");

const safetyNote = "Nota responsable: el minoxidil puede irritar o resecar la piel. Si tienes presión alta, problemas del corazón, embarazo, lactancia, piel lastimada o una reacción fuerte, consulta a un profesional de salud y lee la etiqueta del producto.";

const angles = {
  beardAdvice: [
    ["No empieces sin una rutina simple", "La mayoría falla no porque el producto sea malo, sino porque lo usa tres días sí y cuatro no. Si vas a usar minoxidil en barba, empieza con una rutina que puedas repetir aunque tengas prisa."],
    ["La barba no sale pareja, y eso es normal", "Muchos se desesperan porque primero aparece vello en bigote o barbilla y los laterales van atrás. No significa que no funcione; significa que cada zona responde a su ritmo."],
    ["La piel seca no se ignora", "Cuando la cara se reseca, la gente se pone más producto pensando que así avanza más. Suele pasar lo contrario: la piel se irrita y abandonan el tratamiento."],
    ["Fotos mensuales, no espejo diario", "El espejo todos los días engaña. Una foto con la misma luz cada mes te dice más que estar revisando cada pelito nuevo."],
    ["No te rasures por ansiedad", "Rasurarte no mata el avance, pero hacerlo cada rato por desesperación puede irritar y hacerte pensar que no hay progreso."],
    ["El candado suele responder antes", "Barbilla y bigote muchas veces son las primeras zonas donde se nota algo. Las mejillas pueden tardar más, y por eso conviene darles tiempo."],
    ["Menos producto, mejor aplicado", "No sirve bañar la cara. Sirve aplicar bien en la zona, dejar secar y ser constante."],
    ["La constancia pesa más que la marca", "Puedes tener buen producto, pero si lo usas sin horario ni cuidado, no vas a saber si realmente te funcionó."],
    ["Combina cuidado, no mezcles por mezclar", "Dermaroller, jabón o bálsamo pueden ayudar a la rutina, pero no todo se usa el mismo día ni sobre piel irritada."],
    ["No compares tu barba con la de otro", "La genética manda mucho. Lo importante es medir tu avance contra tu propia foto inicial."],
    ["Paciencia real: piensa en meses", "Si buscas resultado en dos semanas, te vas a frustrar. La barba es un proceso de meses, no de un fin de semana."],
    ["El vello fino también cuenta", "Ese vello clarito que al inicio parece poca cosa puede ser parte del proceso. No lo desprecies demasiado pronto."],
    ["Lava la cara antes de aplicar", "La piel con grasa, polvo o sudor no ayuda. Una limpieza sencilla mejora la rutina y baja la sensación pegajosa."],
    ["No todo hueco se cierra igual", "Hay huecos que responden y otros que dependen mucho de genética. Aun así, mejorar contorno y densidad cambia bastante la apariencia."],
    ["Cuidado con el sol después de aplicar", "Si aplicas y sales directo al sol, puedes sentir más molestia. Mejor deja secar y cuida la piel."],
    ["El descanso también cuenta", "Dormir mal, rascarte la cara o traer la piel irritada todo el tiempo no ayuda a ningún tratamiento."],
    ["No abandones en shedding", "A veces hay caída o cambio de vello. No siempre es mala señal, pero sí conviene observar y no entrar en pánico."],
    ["Compra producto claro y revisable", "En minoxidil hay mucha copia. Revisa empaque, lote, vendedor y que te den asesoría real."],
    ["No uses más por querer ir rápido", "Más cantidad no significa más barba. Puede significar más irritación."],
    ["Hazlo fácil de repetir", "Pon el producto donde lo veas, define horario y no dependas de estar motivado. La rutina debe jalar sola."],
    ["La barba se cuida mientras crece", "Peinar, lavar e hidratar no es vanidad; hace que lo poco o mucho que tengas se vea mejor."],
    ["Mejillas: la zona que prueba tu paciencia", "Muchos clientes avanzan primero en bigote y barbilla. Las mejillas piden más tiempo y mejor seguimiento."],
    ["Cuando conviene parar y revisar", "Si hay ardor fuerte, mareo, hinchazón o reacción rara, no se aguanta por orgullo. Se pausa y se revisa."],
    ["No hagas rutina de veinte pasos", "Entre más complicada la rutina, más fácil dejarla. Empieza sencillo y agrega solo lo necesario."],
    ["El antes y después debe ser honesto", "Misma luz, misma distancia, sin filtros. Así sabes si sí hubo cambio."],
    ["Barba corta mientras avanza", "Una barba corta y limpia puede verse mejor que dejar crecer todo desordenado esperando volumen."],
    ["El producto no reemplaza diagnóstico", "Si tienes irritación crónica, dermatitis o caída fuerte de cabello, vale más revisar con especialista."],
    ["La meta es verte mejor, no obsesionarte", "El minoxidil puede ser parte del cuidado, pero no debe convertirse en angustia diaria."]
  ],
  gaps: [
    ["Cerrar huecos sin desesperarte", "Los huecos en la barba casi siempre se notan más cuando dejamos crecer todo sin forma. Antes de tirar la toalla, conviene ordenar la barba y medir el avance con calma."],
    ["Mejillas despobladas: qué sí puedes hacer", "Las mejillas son tercas. No prometo milagros, pero una rutina constante, piel limpia y paciencia pueden mejorar bastante cómo se ve la barba."],
    ["El hueco del bigote al candado", "Ese espacio entre bigote y barbilla preocupa mucho. A veces tarda más que el resto, por eso hay que trabajarlo sin saturar la piel."],
    ["Dale forma mientras crece", "No todo se arregla con más producto. Un buen recorte puede disimular huecos mientras el tratamiento hace su parte."],
    ["Cuándo un hueco es genética", "Hay zonas que responden poco. Saberlo no es rendirse; es ajustar expectativas y buscar el estilo que mejor te queda."],
    ["Rutina para huecos pequeños", "Cuando el problema es puntual, lo peor es embarrar toda la cara. Aplica con precisión, cuida la piel y revisa cada mes."]
  ],
  alopecia: [
    ["Caída de cabello: no lo dejes al último", "Cuando alguien llega ya con mucha pérdida, todo es más difícil. Si estás notando entradas, coronilla o cabello más delgado, conviene actuar temprano."],
    ["Minoxidil y constancia en cabello", "En cabello se necesita disciplina. Si aplicas una semana y descansas otra, luego no sabes qué funcionó y qué no."],
    ["La coronilla pide paciencia", "La coronilla suele avanzar silenciosa. Por eso recomiendo fotos desde arriba, con la misma luz, cada mes."],
    ["Entradas: expectativas claras", "Las entradas no siempre responden igual que la coronilla. Aun así, mejorar densidad alrededor cambia mucho el aspecto."],
    ["Shampoo, biotina y minoxidil: cada cosa en su lugar", "El shampoo ayuda al cuero cabelludo, la biotina puede apoyar si hay deficiencia, y el minoxidil trabaja por otra vía. No hay que confundirlos."],
    ["Cuándo buscar diagnóstico", "Si la caída es repentina, por parches o con comezón fuerte, no lo trates como una caída normal. Ahí conviene revisar."]
  ],
  oneMonth: [
    ["Un mes no define tu barba", "Un mes sirve para aprender la rutina y ver cómo reacciona tu piel. Para juzgar resultados, normalmente hace falta más tiempo."],
    ["Qué sí mirar el primer mes", "En vez de buscar barba completa, revisa resequedad, constancia, vello fino y si estás aplicando bien."],
    ["Por qué muchos abandonan al mes", "La gente espera demasiado rápido. Si no ves gran cambio al mes, no significa que todo esté perdido."]
  ],
  duplicates: [
    ["La versión corta y directa", "Este tema ya estaba repetido en el blog, así que aquí va sin vueltas: lo importante, lo que sí revisaría y lo que evitaría."],
    ["La versión de tienda", "Esto lo explico como lo diría en mostrador: primero lo práctico, después los detalles."],
    ["La versión para no regarla", "Si vas empezando, más que hacer mucho, necesitas no cometer los errores que frenan a casi todos."]
  ]
};

function decodeMojibake(value = "") {
  const replacements = new Map([
    ["Â¿", "¿"], ["Â¡", "¡"], ["Ã¡", "á"], ["Ã©", "é"], ["Ã­", "í"], ["Ã³", "ó"], ["Ãº", "ú"], ["Ã±", "ñ"],
    ["Ã", "Á"], ["Ã‰", "É"], ["Ã", "Í"], ["Ã“", "Ó"], ["Ãš", "Ú"], ["Ã‘", "Ñ"], ["â€“", "–"], ["â€”", "—"],
    ["â€œ", "“"], ["â€", "”"], ["â€˜", "‘"], ["â€™", "’"], ["â€¦", "…"], ["âœ…", ""], ["Â", ""]
  ]);
  let output = String(value);
  for (const [bad, good] of replacements) output = output.split(bad).join(good);
  return output;
}

function stripTags(value = "") {
  return decodeMojibake(value.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function htmlEscape(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sentenceCaseTitle(value = "") {
  let title = decodeMojibake(value).replace(/\s+/g, " ").trim();
  title = title
    .replace(/\bSEO optimizado\b/gi, "")
    .replace(/(?:: explicación clara y sin rodeos)+$/gi, "")
    .replace(/(?:: (guía práctica|versión práctica|sin complicarte|actualizado|guía directa|paso a paso|con enfoque real))+$/gi, "")
    .replace(/\s+:/g, ":")
    .replace(/\s{2,}/g, " ")
    .trim();
  title = title.replace(/MINOXIDIL/g, "Minoxidil").replace(/GUIA/g, "guía").replace(/QUE/g, "qué");
  return title;
}

function titleFromSlug(slug = "") {
  const words = slug
    .replace(/-\d+$/g, "")
    .replace(/-\d$/g, "")
    .split("-")
    .filter(Boolean);
  if (!words.length) return "Guía práctica de minoxidil";
  const text = words.join(" ")
    .replace(/\bminoxidil\b/gi, "Minoxidil")
    .replace(/\bkirkland\b/gi, "Kirkland")
    .replace(/\bbarba\b/gi, "barba")
    .replace(/\bcaida\b/gi, "caída")
    .replace(/\bperdida\b/gi, "pérdida");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function firstImage(content = "", fallback = "") {
  const match = content.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
  const src = match?.[1];
  if (src && !src.startsWith("data:")) return src;
  return fallback;
}

function topicFor(post) {
  const key = `${post.title} ${post.slug}`.toLowerCase();
  const numbered = post.slug.match(/^(\d+)-2$/);
  if (numbered) {
    const n = Number(numbered[1]);
    if (n >= 11 && n <= 16) return "alopecia";
    if (n >= 17 && n <= 22) return "gaps";
    if ((n >= 1 && n <= 10) || (n >= 23 && n <= 50)) return "beardAdvice";
  }
  if (key.includes("cerrar huecos")) return "gaps";
  if (key.includes("alopecia") || key.includes("caida") || key.includes("caída") || key.includes("perdida") || key.includes("pérdida")) return "alopecia";
  if (key.includes("solo uso un mes") || key.includes("primeros meses") || key.includes("corto-plazo")) return "oneMonth";
  if (key.includes("consejos barba") || key.includes("minoxidil en la barba") || key.includes("barba")) return "beardAdvice";
  return "duplicates";
}

function numericHint(slug = "") {
  const match = slug.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function pickAngle(post, topic) {
  const list = angles[topic] || angles.duplicates;
  const n = numericHint(post.slug);
  return list[(n - 1) % list.length];
}

function keywordLine(post) {
  const title = `${post.title} ${post.slug}`.toLowerCase();
  if (title.includes("kirkland")) return "minoxidil Kirkland original, barba, cabello, CDMX";
  if (title.includes("shampoo")) return "shampoo, cuero cabelludo, caída, minoxidil";
  if (title.includes("biotina") || title.includes("vitamina")) return "biotina, cabello, uñas, rutina capilar";
  if (title.includes("dermaroller")) return "dermaroller, barba, rutina, cuidado de piel";
  if (title.includes("finaster")) return "finasterida, caída de cabello, dermatólogo";
  return "minoxidil, barba, cabello, México";
}

function buildEditorialPost(post, indexInYear) {
  const originalTitle = sentenceCaseTitle(post.title);
  const topic = topicFor(post);
  const [angleTitle, hook] = pickAngle(post, topic);
  const image = firstImage(post.content, post.image);
  const numbered = post.slug.match(/^(\d+)-2$/);
  const n = numbered ? Number(numbered[1]) : 0;
  const baseDuplicateTitle = originalTitle.includes(" con minoxidil") || originalTitle.includes("explicación clara")
    ? titleFromSlug(post.slug)
    : originalTitle;
  let title = topic === "duplicates" && baseDuplicateTitle.length > 3
    ? `${baseDuplicateTitle}: guía práctica`
    : angleTitle.toLowerCase().includes("minoxidil") ? angleTitle : `${angleTitle} con minoxidil`;
  if (numbered && n >= 1 && n <= 10) title = `${angleTitle} en la barba con minoxidil`;
  if (numbered && n >= 23 && n <= 50) title = `${angleTitle} para barba con minoxidil`;
  title = title.replace(/Minoxidil y constancia en cabello con minoxidil/i, "Constancia en cabello con minoxidil")
    .replace(/Shampoo, biotina y minoxidil: cada cosa en su lugar con minoxidil/i, "Shampoo, biotina y minoxidil: cada cosa en su lugar");
  const localExperience = [
    "Te lo digo como se lo explicaría a alguien que llega a la sucursal con dudas: el tratamiento no se gana por hacerlo complicado, se gana por hacerlo constante.",
    "En barba y cabello hay mucha ansiedad. Uno quiere verse distinto rápido, pero la piel y el folículo no trabajan con prisa.",
    "Por eso este artículo conserva la URL anterior, pero le quité el tono automático y lo dejé como una guía útil, más aterrizada.",
    "Esto lo he visto muchas veces: alguien compra con toda la emoción, se desespera al mes y cambia de producto antes de tener una lectura real.",
    "Mi recomendación casi siempre empieza igual: baja la ansiedad, ordena la rutina y revisa si tu piel está aguantando bien."
  ][indexInYear % 5];

  const caseNotes = {
    beardAdvice: [
      "Caso frecuente: el cliente trae avance en bigote, pero siente que no sirve porque las mejillas van lentas. Ahí no cambio todo; primero reviso constancia, resequedad y fotos.",
      "Caso frecuente: se aplica de más en la noche, amanece con la cara irritada y culpa al producto. Muchas veces el problema fue cantidad y piel sin hidratar.",
      "Caso frecuente: empieza bien dos semanas y luego se le olvida. Para barba, lo aburrido de repetir pesa más que cualquier truco."
    ],
    gaps: [
      "Caso frecuente: el hueco se ve enorme porque la barba alrededor está larga y sin forma. Un recorte parejo puede cambiar mucho mientras trabajas la zona.",
      "Caso frecuente: solo falta unión entre bigote y candado. Esa zona puede tardar, así que conviene tratarla con precisión y no castigar toda la cara.",
      "Caso frecuente: el hueco no desaparece, pero el vello alrededor engrosa. Aun así, visualmente la barba se ve más completa."
    ],
    alopecia: [
      "Caso frecuente: alguien nota más cabello en la almohada y compra lo primero que ve. Antes de eso, hay que revisar si es caída progresiva, estrés, dermatitis o algo repentino.",
      "Caso frecuente: coronilla con poca densidad y fotos engañosas. La luz de baño puede hacerte pensar que un día estás mejor y otro peor.",
      "Caso frecuente: usar shampoo como si fuera tratamiento principal. El shampoo acompaña; no reemplaza una evaluación cuando la caída es fuerte."
    ],
    oneMonth: [
      "Caso frecuente: al mes no ve barba cerrada y piensa que perdió dinero. El primer mes sirve más para adaptar piel y rutina que para juzgar el resultado final.",
      "Caso frecuente: aparece vello fino y lo rasura por desesperación. Antes de decidir, conviene observar si ese vello cambia con el tiempo.",
      "Caso frecuente: cambia de producto cada cuatro semanas. Así nunca sabe qué le hizo bien o qué le irritó."
    ],
    duplicates: [
      "Caso frecuente: el tema ya estaba repetido con otro título. Aquí lo dejo más claro para que la página siga viva, pero aporte algo útil.",
      "Caso frecuente: el post anterior decía mucho y aterrizaba poco. Aquí va la explicación como pregunta de mostrador.",
      "Caso frecuente: se confunde información de barba con cabello. Aunque se parecen, no siempre se evalúan igual."
    ]
  };

  const mistakes = [
    ["Hacerlo todo al mismo tiempo", "Si metes minoxidil, dermaroller, exfoliante, bálsamo, aceites y rasurado fuerte en la misma semana, no vas a saber qué te irritó."],
    ["Medir resultados con mala luz", "Una foto con sombra puede hacerte sentir que no avanzaste. Usa la misma luz, distancia y ángulo."],
    ["Aplicar sobre piel molesta", "Si la piel ya está roja o arde, echar más producto suele empeorar la experiencia."],
    ["Cambiar de rutina por videos", "Cada semana sale un consejo nuevo. Si brincas de método en método, pierdes seguimiento."],
    ["Comprar sin revisar", "En productos populares hay copias. Revisa presentación, lote y compra con alguien que responda dudas."]
  ];

  const closers = [
    "Mi consejo final: hazlo simple, medible y constante. Si tu rutina cabe en tu vida diaria, tienes más oportunidad de sostenerla.",
    "Quédate con esto: no necesitas hacer magia; necesitas repetir bien lo básico y cuidar la piel para no abandonar.",
    "Si vas a invertir en tratamiento, invierte también en seguimiento. Las fotos y la constancia te dicen más que la emoción del primer día.",
    "No te obsesiones con cada milímetro. Busca avance real, piel sana y una rutina que no te fastidie.",
    "Cuando tengas duda, pregunta antes de mezclar o subir cantidad. A veces un ajuste pequeño evita abandonar todo."
  ];

  const practical = topic === "alopecia"
    ? ["Toma fotos con la misma luz, de frente y desde arriba.", "No mezcles productos fuertes si el cuero cabelludo está irritado.", "Si la caída aparece de golpe o por parches, revisa con especialista.", "No abandones solo porque el primer mes no se ve espectacular."]
    : topic === "gaps"
      ? ["Deja crecer por etapas antes de decidir que no funciona.", "Recorta contornos para que los huecos no se vean más grandes.", "Aplica solo donde quieres trabajar, sin empapar toda la cara.", "Hidrata si notas resequedad o descamación."]
      : ["Lava y seca la zona antes de aplicar.", "Usa una cantidad razonable y deja secar.", "Toma fotos mensuales, no diario.", "Si hay irritación fuerte, pausa y revisa."];

  const mistake = mistakes[(numericHint(post.slug) + indexInYear) % mistakes.length];
  const caseNote = (caseNotes[topic] || caseNotes.duplicates)[(numericHint(post.slug) + indexInYear) % (caseNotes[topic] || caseNotes.duplicates).length];
  const closer = closers[(numericHint(post.slug) + indexInYear) % closers.length];

  const structureA = [
    `<p>${htmlEscape(hook)}</p>`,
    `<p>${htmlEscape(localExperience)}</p>`,
    `<p>La idea no es venderte una fantasía. El minoxidil puede ayudar en algunos casos, pero la genética, la constancia, la piel y el tiempo importan bastante. Si alguien te promete barba completa en pocos días, mejor desconfía.</p>`,
    `<h2>Lo que revisaría antes de empezar</h2>`,
    `<p>Primero observa tu punto de partida: zonas con vello fino, huecos reales, resequedad, sensibilidad y qué tan fácil puedes repetir una rutina diaria. A veces el problema no es el producto, sino que se usa sin orden.</p>`,
    `<ul>${practical.map((item) => `<li>${htmlEscape(item)}</li>`).join("")}</ul>`,
    `<h2>Mi forma práctica de verlo</h2>`,
    `<p>Si estás empezando, dale tiempo suficiente para evaluar. Un buen seguimiento sería foto inicial, foto al mes, foto a los tres meses y revisión honesta. No cambies todo cada semana porque entonces nunca sabrás qué te ayudó.</p>`,
    `<p>También cuida lo básico: limpieza, no rascar la zona, no aplicar sobre piel lastimada y no duplicar dosis por desesperación. Más producto no siempre significa mejor resultado; muchas veces solo significa más irritación.</p>`,
    `<h2>Errores que veo seguido</h2>`,
    `<ul><li>Comprar cualquier producto sin revisar origen o presentación.</li><li>Aplicar con la cara sudada o grasosa.</li><li>Compararse con fotos de otra persona.</li><li>Abandonar justo cuando apenas empieza la etapa seria del proceso.</li></ul>`,
    `<h2>Cuándo pedir ayuda</h2>`,
    `<p>Si tienes ardor fuerte, palpitaciones, mareo, hinchazón, dermatitis o caída de cabello muy repentina, no lo resuelvas con otro producto más. Ahí conviene pausar y consultar.</p>`,
    `<p><strong>${htmlEscape(safetyNote)}</strong></p>`,
    `<p>${htmlEscape(closer)}</p>`
  ];

  const structureB = [
    `<p>${htmlEscape(hook)} ${htmlEscape(localExperience)}</p>`,
    `<h2>La parte que casi nadie quiere escuchar</h2>`,
    `<p>No todo depende del producto. También cuenta cómo duermes, si te rascas, si aplicas con la piel limpia, si suspendes cada semana y si estás esperando resultados que no corresponden a tu caso.</p>`,
    `<p>${htmlEscape(caseNote)}</p>`,
    `<h2>Checklist rápido</h2>`,
    `<ul>${practical.map((item) => `<li>${htmlEscape(item)}</li>`).join("")}</ul>`,
    `<h2>Error común: ${htmlEscape(mistake[0])}</h2>`,
    `<p>${htmlEscape(mistake[1])}</p>`,
    `<h2>Cómo lo llevaría yo</h2>`,
    `<p>Primero haría una foto inicial. Después mantendría una rutina sencilla por varias semanas, sin estar cambiando todo. Si la piel responde bien, sigo; si se irrita, ajusto antes de insistir.</p>`,
    `<p><strong>${htmlEscape(safetyNote)}</strong></p>`,
    `<p>${htmlEscape(closer)}</p>`
  ];

  const structureC = [
    `<p>${htmlEscape(hook)}</p>`,
    `<p>Voy a hablarte claro: en internet este tema se exagera mucho. Unos prometen resultados imposibles y otros asustan de más. La realidad suele estar en medio: puede ayudar, pero hay que usarlo con cabeza.</p>`,
    `<h2>Lo que sí cuidaría desde el día uno</h2>`,
    `<p>${htmlEscape(localExperience)}</p>`,
    `<ul>${practical.map((item) => `<li>${htmlEscape(item)}</li>`).join("")}</ul>`,
    `<h2>Una escena bastante común</h2>`,
    `<p>${htmlEscape(caseNote)}</p>`,
    `<h2>Lo que no haría</h2>`,
    `<p>No duplicaría cantidad, no aplicaría sobre piel lastimada, no compararía mi avance con fotos editadas y no compraría productos sin saber qué estoy usando.</p>`,
    `<h2>Señales de que vas bien</h2>`,
    `<p>Vas bien si toleras la rutina, si puedes repetirla sin irritarte y si tus fotos mensuales muestran cambios pequeños pero reales. No todo avance se nota a simple vista en la primera semana.</p>`,
    `<p><strong>${htmlEscape(safetyNote)}</strong></p>`,
    `<p>${htmlEscape(closer)}</p>`
  ];

  const variants = [structureA, structureB, structureC];
  const paragraphs = variants[(numericHint(post.slug) + indexInYear) % variants.length];

  if (image) {
    paragraphs.splice(2, 0, `<p><img src="${image}" alt="${htmlEscape(title)}" loading="lazy"></p>`);
  }

  return {
    title,
    excerpt: stripTags(`${hook} ${localExperience}`).slice(0, 220),
    content: paragraphs.join("\n")
  };
}

function polishLegacy(post) {
  let title = sentenceCaseTitle(post.title);
  let content = decodeMojibake(post.content)
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([.!?])([A-ZÁÉÍÓÚÑ¿¡])/g, "$1 $2")
    .replace(/SEO optimizado/gi, "")
    .replace(/<h1>\s*<\/h1>/gi, "")
    .trim();

  const intro = `<p><strong>Nota actualizada:</strong> este artículo viene de los primeros años del sitio. Conservé la idea original, pero limpié puntuación y formato para que se lea mejor sin perder el tono de experiencia.</p>`;
  if (!content.includes("Nota actualizada:")) content = `${intro}\n${content}`;
  return {
    title,
    excerpt: stripTags(content).slice(0, 220),
    content
  };
}

function reportLine(post, beforeTitle, afterTitle, action) {
  return `- ${post.path} | ${action} | ${beforeTitle} -> ${afterTitle}`;
}

async function main() {
  const data = JSON.parse(await readFile(DATA_FILE, "utf8"));
  const report = [
    "# Reporte editorial del blog",
    "",
    "Se conservaron slugs y URLs. La mejora cambia títulos visibles, extractos y contenido, no borra páginas.",
    "",
    "## Cambios",
    ""
  ];

  let modern = 0;
  let legacy = 0;
  const perYearIndex = new Map();

  data.posts = data.posts.map((post) => {
    const year = new Date(post.date).getFullYear();
    const beforeTitle = post.title;
    if (year >= 2023) {
      const index = perYearIndex.get(year) || 0;
      perYearIndex.set(year, index + 1);
      const edit = buildEditorialPost(post, index);
      modern += 1;
      report.push(reportLine(post, beforeTitle, edit.title, "reescrito 2023/2024"));
      return { ...post, title: edit.title, excerpt: edit.excerpt, content: edit.content, editorialStatus: "rewritten-human-style" };
    }
    const edit = polishLegacy(post);
    legacy += 1;
    report.push(reportLine(post, beforeTitle, edit.title, "pulido legado"));
    return { ...post, title: edit.title, excerpt: edit.excerpt, content: edit.content, editorialStatus: "legacy-polished" };
  });

  const seenModernTitles = new Map();
  data.posts = data.posts.map((post) => {
    const year = new Date(post.date).getFullYear();
    if (year < 2023) return post;
    let title = sentenceCaseTitle(post.title);
    if (title.length < 18 && !title.toLowerCase().includes("minoxidil")) {
      title = `${title} de minoxidil para barba`;
    }
    const count = seenModernTitles.get(title) || 0;
    seenModernTitles.set(title, count + 1);
    if (count === 0) return { ...post, title };
    const suffix = titleFromSlug(post.slug).replace(/^Guía práctica de minoxidil$/i, post.slug);
    const uniqueTitle = `${title}: ${suffix}`;
    if (!seenModernTitles.has(uniqueTitle)) {
      seenModernTitles.set(uniqueTitle, 1);
      return { ...post, title: uniqueTitle };
    }
    return { ...post, title: `${title}: ${suffix} ${count + 1}` };
  });

  data.notes = {
    ...(data.notes || {}),
    editorial: `Se reescribieron ${modern} posts de 2023/2024 y se pulieron ${legacy} posts anteriores. URLs conservadas.`
  };

  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  report.splice(3, 0, `Resumen: ${modern} posts modernos reescritos; ${legacy} posts antiguos pulidos.`);
  await writeFile(REPORT_FILE, `${report.join("\n")}\n`, "utf8");
  console.log(`Editorializacion lista: ${modern} modernos, ${legacy} antiguos.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
