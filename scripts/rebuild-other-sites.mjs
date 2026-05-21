import { copyFile, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definir rutas relativas seguras
const root = path.resolve(__dirname, '..');
const sourceImages = path.join(root, 'dist', 'assets', 'images');
const otherRoot = path.resolve(root, '..');

const phone = '55-6938-0408';
const whatsapp = '525569380408';

// Cargar y procesar productos dinámicamente desde el sitio principal
const jsonPath = path.join(root, 'content', 'site-data.json');
let allProducts = [];

try {
  const rawData = JSON.parse(await readFile(jsonPath, 'utf8'));
  allProducts = rawData.products.map(p => {
    let tag = 'Tratamiento';
    if (/kirkland/i.test(p.name)) {
      if (/foam|espuma/i.test(p.name)) tag = 'Espuma Kirkland';
      else tag = 'Kirkland Liquido';
    } else if (/biotina/i.test(p.name)) {
      tag = 'Biotina';
    } else if (/roller/i.test(p.name)) {
      tag = 'Dermaroller';
    } else if (/balsamo|bálsamo/i.test(p.name)) {
      tag = 'Balsamo';
    } else if (/shampoo/i.test(p.name)) {
      tag = 'Shampoo';
    } else if (/jabon|jabón/i.test(p.name)) {
      tag = 'Jabon';
    } else if (/kit/i.test(p.name)) {
      tag = 'Kit Ahorro';
    }

    let copy = p.excerpt || '';
    if (!copy && p.description) {
      copy = p.description;
    }
    copy = copy.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (copy.length > 150) {
      copy = copy.slice(0, 147) + '...';
    }
    if (!copy) {
      copy = 'Producto original para el crecimiento de barba y cabello. Consulta detalles de aplicacion.';
    }

    const cleanName = p.name
      .replace(/\s*\|\s*Crecimiento de Barba y Cabello/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      name: cleanName,
      price: p.price || '$250',
      image: p.image ? path.basename(p.image) : 'placeholder.jpg',
      tag: tag,
      copy: copy
    };
  });
  console.log(`Loaded ${allProducts.length} products dynamically from site-data.json`);
} catch (err) {
  console.error(`Error loading site-data.json: ${err.message}. Using fallback.`);
  allProducts = [
    {
      name: '1 Mes Minoxidil Kirkland Liquido 5%',
      price: '$250',
      image: '1-mes-minoxidil-kirkland-low-1.jpg',
      tag: 'Kirkland Liquido',
      copy: 'Una botella para empezar sin comprar de mas. Ideal si quieres probar constancia y rutina.',
    }
  ];
}

const sites = [
  {
    key: 'neza',
    dir: path.join(otherRoot, 'nuevaminoxidil', 'nuevaminoxidil'),
    brand: 'Minoxidil CDMX Neza',
    shortBrand: 'CDMX Neza',
    domain: 'https://www.minoxidilcdmxneza.com/',
    title: 'Minoxidil en CDMX y Neza | Entrega express hoy mismo',
    description:
      'Minoxidil Kirkland en CDMX, Plaza Guelatao y zona Neza/Oriente. Entrega rapida local, pago al recibir en mano y asesoria directa por WhatsApp.',
    theme: 'neza',
    accent: '#f97316', // Cambio a Naranja Express de última milla
    heroImage: 'diseno-sin-titulo-2.jpg',
    location: 'Plaza Guelatao Local 76 Pasillo 5 e Iztapalapa/Neza/Los Reyes/Chalco/Ixtapaluca',
    promise: '¿Lo necesitas hoy? Entregas personales gratis y pago contra entrega el mismo dia.',
    h1: 'Minoxidil en CDMX y Neza, con entrega personal el mismo dia',
    subtitle:
      'No dejes tu dinero a ciegas ni esperes envios locales lentos. Si estas en Neza, Chalco, La Paz, Ixtapaluca o Iztapalapa, te entregamos gratis en mano y pagas al recibir.',
    primaryCta: 'Coordinar entrega hoy',
    secondaryCta: 'Ver puntos de entrega',
    sections: [
      ['Entrega en 2 Horas', 'Coordinamos tu entrega personal en estaciones de metro y puntos seguros del oriente el mismo dia.'],
      ['Puntos Físicos y Sucursal', 'Ven al Local 76 Pasillo 5 en Plaza Guelatao o coordina entrega segura en Neza, La Paz, Chalco e Ixtapaluca.'],
      ['Pago al Recibir', 'Sin depositos por adelantado. Evita fraudes en internet: te entregamos fisicamente y pagas al verificar tu producto.'],
    ],
    products: allProducts,
    imageSet: ['diseno-sin-titulo-2.jpg', '2-6.jpg', '1-mes-minoxidil-kirkland-low-1.jpg', '3-meses-1.jpg', '6-meses.jpg', '12-meses.jpg', '6-meses-espuma.jpg', 'biotina-low.jpg', 'dermaroller.jpg', 'balsamo12.jpg'],
    posts: [
      post('Donde comprar minoxidil en Neza sin esperar envios', 'Neza tiene mucha oferta, pero esperar 3 a 5 dias por un envio de paqueteria local no tiene sentido si puedes coordinar una entrega personal hoy mismo. Si vas a comprar, busca entrega local coordinada por WhatsApp. Pregunta disponibilidad, acuerda punto y recibe tu tratamiento el mismo dia.'),
      post('Plaza Guelatao: tu punto de entrega directo y seguro', 'Recoger tu tratamiento en Plaza Guelatao Local 76 Pasillo 5 es la forma mas segura. Evitas fraudes de internet, ves el lote impreso en la botella y cuentas con asesoria directa del vendedor al momento.'),
      post('Entregas personales en el Metro: Zaragoza, Guelatao y Peñon', 'Para quienes se mueven en transporte publico, las entregas en torniquetes de Metro Guelatao o Zaragoza son ideales. Ahorras pasajes, es seguro y recibes tu producto en minutos de forma coordinada.'),
      post('Como comprar minoxidil hoy en Neza y pagar al recibir', 'No arriesgues tu dinero depositando en paginas web dudosas. Exige entregas personales y pago contra entrega. Nosotros te llevamos el producto fsico en Nezahualcoyotl, Los Reyes, Ixtapaluca, Chalco o Iztapalapa y le pagas al repartidor cuando lo tengas en tus manos.'),
      post('Liquido o espuma: ¿cual es mejor para el ritmo de la ciudad?', 'El liquido al 5% es el mas economico y efectivo para iniciar. La espuma seca en la mitad de tiempo, ideal si sales temprano al trabajo o la escuela en la CDMX y no quieres sentir la cara humeda en el transporte.'),
    ],
    faq: [
      ['¿Cual es el tiempo de entrega?', 'Si coordinas tu entrega antes de las 4:00 PM, te entregamos personalmente el mismo dia en Metro Guelatao, Zaragoza, Tepalcates, Metro La Paz, Chalco, Ixtapaluca o a domicilio local en Neza e Iztapalapa.'],
      ['¿Puedo pagar al recibir para evitar fraudes?', 'Sí, totalmente. Entregamos físicamente en mano para tu total seguridad contra fraudes y delincuencia en línea. Pagas al repartidor o en sucursal en efectivo o transferencia al recibir y verificar tu producto físicamente, sin depósitos previos.'],
      ['¿Hacen envíos al resto de México?', 'Sí, enviamos a toda la República con tarifa fija de $140 MXN (FedEx/Estafeta), incluyendo zonas extendidas o de difícil acceso como Michoacán (Buenavista CP 60700), Guerrero (Tlapa CP 41300), Oaxaca (Pinotepa Nacional CP 71600) y Chiapas (Ocosingo CP 29950) sin cargos adicionales.'],
      ['¿Son productos originales?', 'Totalmente. Puedes revisar la caja, codigos de barras y numero de lote en nuestro local de Plaza Guelatao antes de pagar.'],
    ],
  },
  {
    key: 'todo-mexico',
    dir: path.join(otherRoot, 'minoxidiltodomexico', 'minoxidiltodomexico'),
    brand: 'Minoxidil Todo Mexico',
    shortBrand: 'Todo Mexico',
    domain: 'https://www.minoxidiltodomexico.com/',
    title: 'Minoxidil Todo Mexico | Envio nacional por WhatsApp',
    description:
      'Compra minoxidil Kirkland para barba y cabello con envio a todo Mexico por $140 fijo. Entregas personales gratis y pago contra entrega en CDMX.',
    theme: 'mexico',
    accent: '#137a45',
    heroImage: 'diseno-sin-titulo-1.jpg',
    location: 'Envios a todo Mexico desde CDMX',
    promise: 'Envio nacional tarifa fija de $140 y entregas personales gratis con pago contra entrega en CDMX.',
    h1: 'Minoxidil para todo Mexico, con envio a tarifa plana de $140',
    subtitle:
      'Arma tu tratamiento por meses, confirma disponibilidad por WhatsApp y recibe de forma segura en cualquier parte de la Republica mexicana.',
    primaryCta: 'Cotizar envio',
    secondaryCta: 'Ver paquetes',
    sections: [
      ['Envio Nacional $140', 'Costo de envio parejo a todo Mexico, incluyendo de forma garantizada zonas extendidas de dificil acceso.'],
      ['Entregas Contra Entrega CDMX', 'Entrega personal gratis y pago contra entrega al recibir en CDMX y area metropolitana para tu seguridad.'],
      ['Compra guiada', 'Te ayudamos a elegir liquido, espuma o complemento sin venderte cosas que no necesitas.'],
    ],
    products: allProducts,
    imageSet: ['marcas-de-minoxidil.png', 'diseno-sin-titulo-1.jpg', '1-mes-minoxidil-kirkland-low-1.jpg', '2-meses.jpg', '3-meses-1.jpg', '6-meses.jpg', '12-meses.jpg', '6-meses-espuma.jpg', 'biotina-low.jpg', 'dermaroller.jpg', 'balsamo12.jpg'],
    posts: [
      post('Minoxidil con envio a todo Mexico: como comprar sin enredarte', 'La compra debe ser simple: eliges paquete, mandas datos, confirmas total y recibes guia. Si una tienda te da mil rodeos o no te enseña producto, mejor pausa. En tratamientos largos, la confianza vale mas que ahorrar unos pesos.'),
      post('Que paquete conviene si vives fuera de CDMX', 'Si estas lejos, 3 o 6 meses suele ser mas practico que pedir de uno en uno. Pagas menos envios y no cortas la rutina. Un mes solo lo recomiendo si de verdad quieres probar sensacion y disciplina antes de invertir mas.'),
      post('Minoxidil liquido vs espuma para envios nacionales', 'El liquido es el mas pedido por precio y rendimiento. La espuma se acomoda a quien quiere secado rapido. Para envio, ambos se pueden mandar; la decision depende mas de tu piel, rutina y presupuesto que de la ciudad donde vivas.'),
      post('Como revisar tu pedido cuando llega', 'Abre el paquete con calma, revisa caja, botellas, cantidad y presentacion. Guarda foto por si necesitas aclaracion. No tires etiquetas ni empaque el primer dia. Comprar bien tambien es revisar bien cuando recibes.'),
      post('Envios a estados: lo que debes tener listo', 'Ten nombre completo, calle, colonia, CP, municipio, estado y referencias. Suena basico, pero muchos retrasos salen de datos incompletos. Si quieres que llegue rapido, empieza por mandar direccion completa desde el primer mensaje.'),
    ],
    faq: [
      ['¿Envían a todo México?', 'Sí, enviamos a toda la República con tarifa fija de $140 MXN (FedEx/Estafeta/Redpack), incluyendo de forma garantizada zonas extendidas y de difícil acceso (como Michoacán Buenavista CP 60700/Apatzingán CP 60600/Lázaro Cárdenas CP 60950, Guerrero Tlapa CP 41300/Ometepec CP 41700, Oaxaca Pinotepa Nacional CP 71600/Juchitán CP 70000, Chiapas Ocosingo CP 29950/Motozintla CP 30900, Sierra de Chihuahua Guachochi CP 33180/Guadalupe y Calvo CP 33470, etc.) sin cobros sorpresa. En CDMX y área metropolitana no hacemos envíos de paquetería local; ofrecemos entregas personales gratis con pago contra entrega al momento para tu total seguridad sin depósitos previos.'],
      ['¿Que paquete recomiendan?', 'Para empezar con seriedad, 3 meses. Para ahorrar y no cortar rutina, 6 meses.'],
      ['¿Puedo pedir mayoreo?', 'Si. Conviene escribir con ciudad, cantidad aproximada y presentacion que buscas.'],
    ],
  },
  {
    key: 'kirkland',
    dir: path.join(otherRoot, 'minoxidilkirkland', 'minoxidilkirkland'),
    brand: 'Kirkland Minoxidil Mexico',
    shortBrand: 'Kirkland Mexico',
    domain: 'https://minoxidilkirklandmexico.net/',
    title: '🔥 Minoxidil Kirkland ORIGINAL CDMX | Resultados Barba en 30 Días | Iztapalapa y Nezahualcóyotl',
    description: '✅ Minoxidil Kirkland ORIGINAL en CDMX. 🎯 Resultados GARANTIZADOS para barba y cabello. 📍 Sucursal Plaza Guelatao Iztapalapa. 🤝 Entregas personales GRATIS y pago contra entrega en CDMX, Nezahualcóyotl y zona Oriente. 💬 WhatsApp 55-6938-0408',
    keywords: 'minoxidil cdmx, minoxidil kirkland iztapalapa, crecimiento barba cdmx, minoxidil nezahualcóyotl, plaza guelatao minoxidil, tratamiento capilar méxico, minoxidil original, kirkland autentico',
    theme: 'kirkland',
    accent: '#dc2626',
    heroImage: '1-mes-minoxidil-kirkland-low-1.jpg',
    location: '📍 Sucursal Plaza Guelatao, Iztapalapa | Horario: Mar-Dom 12-5 PM',
    promise: 'Entregas personales GRATIS y pago contra entrega en CDMX y Neza para tu seguridad.',
    h1: 'Minoxidil Kirkland ORIGINAL CDMX | Resultados en 30 Días',
    subtitle: 'Productos Kirkland 100% auténticos para el crecimiento de barba y cabello en CDMX, Neza y zona Oriente. Sucursal física en Plaza Guelatao, Iztapalapa.',
    primaryCta: 'Pedir por WhatsApp',
    secondaryCta: 'Verificar Autenticidad',
    sections: [
      ['Minoxidil Kirkland', 'Productos Kirkland 100% originales para crecimiento de barba y cabello. Sucursal física.'],
      ['Original Garantizado', 'Te decimos qué revisar: caja, botella, lote impreso y holograma para total seguridad.'],
      ['Entregas Contra Entrega CDMX', 'Entrega personal gratis en CDMX, Iztapalapa, Nezahualcóyotl y zona Oriente. Recibe, revisa en mano y paga al recibir.'],
    ],
    products: allProducts,
    imageSet: ['1-mes-minoxidil-kirkland-low-1.jpg', '2-meses.jpg', '3-meses-1.jpg', '6-meses.jpg', '12-meses.jpg', '6-meses-espuma.jpg', 'diseno-sin-titulo-1.jpg', 'minoxidil5.jpg', 'minoxidil10-md.jpg'],
    posts: [
      post('Minoxidil Kirkland original: que revisar primero', 'Empieza por lo visible: caja, botella, etiqueta, lote y coherencia de la presentacion. No necesitas ser experto, pero si poner atencion. Si el vendedor no puede explicar que vende, ahi ya tienes una respuesta.'),
      post('Kirkland liquido 5%: para quien conviene', 'El liquido es el clasico porque rinde bien y suele tener mejor precio. Conviene a quien no se complica con aplicacion and puede dejar secar. Si odias sensacion liquida, tal vez la espuma te acomode mejor.'),
      post('Kirkland espuma: cuando vale pagar mas', 'La espuma suele gustar por secado y textura. No es magia ni necesariamente "mas fuerte". Vale la pena si tu rutina necesita algo mas comodo o si el liquido te molesta demasiado en la piel.'),
      post('1, 3, 6 o 12 meses: como pensar el paquete', 'Un mes prueba disciplina. Tres meses ya permiten revisar avance con mas sentido. Seis meses bajan vueltas. Doce meses son para quien ya sabe que no va a abandonar. Elige por constancia, no por impulso.'),
      post('Por que Kirkland se busca tanto en Mexico', 'Porque es una marca conocida, facil de identificar y con presentaciones populares. Justo por eso tambien se presta a copias y vendedores improvisados. Comprar Kirkland exige revisar mas, no menos.'),
    ],
    faq: [
      ['¿El Minoxidil Kirkland es original en CDMX?', '✅ SÍ, vendemos Minoxidil Kirkland 100% ORIGINAL importado directamente. Garantizamos autenticidad con factura y garantía. Ubicados en Plaza Guelatao, Iztapalapa.'],
      ['¿En cuánto tiempo veo resultados con Minoxidil?', '🎯 La mayoría de nuestros clientes ven resultados visibles en 4-8 semanas. Aplicación diaria constante es clave. Resultados completos en 3-6 meses.'],
      ['¿Hacen entregas personales en CDMX y Neza?', '🤝 ¡SÍ! Ofrecemos entregas personales GRATIS en Iztapalapa, Nezahualcóyotl, Los Reyes La Paz, Chalco e Ixtapaluca. No arriesgues tu dinero depositando antes por internet; te entregamos físicamente, revisas tu producto en mano y pagas contra entrega.'],
      ['¿Hacen envíos al resto de México?', '📦 Sí. Enviamos a toda la República con tarifa fija de $140 MXN, incluyendo zonas extendidas o de difícil acceso (como Michoacán Buenavista CP 60700/Apatzingán CP 60600/Lázaro Cárdenas CP 60950, Guerrero Tlapa CP 41300/Ometepec CP 41700, Oaxaca Pinotepa Nacional CP 71600/Juchitán CP 70000, Chiapas Ocosingo CP 29950/Motozintla CP 30900, Sierra de Chihuahua Guachochi CP 33180/Guadalupe y Calvo CP 33470, etc.) vía FedEx/Estafeta.'],
      ['¿Atienden en sucursal física?', '📍 SÍ, sucursal en Plaza Guelatao, Iztapalapa. Local 76. Horario: Martes a Domingo, 12 PM - 5 PM. WhatsApp: 55-6938-0408']
    ],
  },
];

function post(title, body) {
  return {
    title,
    excerpt: body.split('. ').slice(0, 2).join('. ') + '.',
    body,
  };
}

function packageJson(site) {
  return `${JSON.stringify(
    {
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        '@vitejs/plugin-react': '^5.0.0',
        vite: '^7.0.0',
        typescript: '^5.8.3',
        react: '^18.3.1',
        'react-dom': '^18.3.1',
      },
      devDependencies: {},
    },
    null,
    2,
  )}\n`;
}

function indexHtml(site) {
  let extraTags = '';
  let schemasCode = '';

  if (site.key === 'kirkland') {
    extraTags = `
    <meta name="keywords" content="${escapeHtml(site.keywords || '')}">
    <meta property="og:site_name" content="Minoxidil México" />
    <meta property="og:locale" content="es_MX" />
    <meta name="twitter:title" content="🔥 Minoxidil Kirkland ORIGINAL CDMX | Resultados en 30 Días" />
    <meta name="twitter:description" content="✅ Minoxidil Kirkland 100% auténtico. 🎯 Resultados garantizados para barba. 📍 Iztapalapa y Nezahualcóyotl. 🚚 Envío GRATIS" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large" />
    <meta name="googlebot" content="index, follow" />
    <meta name="geo.region" content="MX-CDMX" />
    <meta name="geo.placename" content="Iztapalapa, Ciudad de México" />
    <meta name="geo.position" content="19.414006;-99.022519" />
    <meta name="ICBM" content="19.414006, -99.022519" />
    `;

    const orgSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Minoxidil México",
      "alternateName": ["Tienda Minoxidil CDMX", "Minoxidil Iztapalapa", "Minoxidil Nezahualcóyotl", "Minoxidil Kirkland CDMX"],
      "url": site.domain.replace(/\/$/, ""),
      "logo": `${site.domain.replace(/\/$/, "")}/images/logo.png`,
      "description": "Venta de Minoxidil Kirkland 100% ORIGINAL en CDMX. Resultados garantizados para crecimiento de barba y cabello. Sucursal en Plaza Guelatao Iztapalapa. Envío gratis en CDMX y Nezahualcóyotl.",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Calz. Ignacio Zaragoza 406, Local 76, Plaza Guelatao",
        "addressLocality": "Iztapalapa",
        "addressRegion": "CDMX",
        "postalCode": "09100",
        "addressCountry": "MX"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "19.414006",
        "longitude": "-99.022519"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+52-55-6938-0408",
        "contactType": "customer service",
        "areaServed": ["CDMX", "Iztapalapa", "Nezahualcóyotl", "Estado de México"],
        "availableLanguage": "Spanish"
      },
      "sameAs": [
        "https://wa.me/5569380408"
      ],
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "12:00",
        "closes": "17:00"
      },
      "areaServed": ["CDMX", "Iztapalapa", "Nezahualcóyotl", "Estado de México"],
      "priceRange": "$$",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "156",
        "bestRating": "5",
        "worstRating": "1"
      }
    };

    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Minoxidil México",
      "alternateName": "Tienda Minoxidil CDMX",
      "url": site.domain.replace(/\/$/, ""),
      "description": "Tienda oficial de Minoxidil Kirkland ORIGINAL en CDMX. Resultados garantizados para barba y cabello. Envío gratis en Iztapalapa y Nezahualcóyotl.",
      "publisher": {
        "@type": "Organization",
        "name": "Minoxidil México",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "156"
        }
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${site.domain.replace(/\/$/, "")}/tienda.html?search={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    };

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": site.faq.map(f => ({
        "@type": "Question",
        "name": f[0],
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f[1]
        }
      }))
    };

    schemasCode = `
    <script type="application/ld+json">${JSON.stringify(orgSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(websiteSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
    `;
  } else {
    const schema = {
      '@context': 'https://schema.org',
      '@type': site.key === 'todo-mexico' ? 'Store' : 'LocalBusiness',
      name: site.brand,
      url: site.domain,
      telephone: phone,
      description: site.description,
      areaServed: site.key === 'todo-mexico' ? 'Mexico' : ['Ciudad de Mexico', 'Nezahualcoyotl'],
      sameAs: [],
    };
    schemasCode = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  // Agregar fuentes modernas específicas para los diseños
  let fontLink = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap" rel="stylesheet">';
  if (site.key === 'kirkland' || site.key === 'neza') {
    fontLink = '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">';
  }

  return `<!doctype html>
<html lang="es-MX">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(site.title)}</title>
    <meta name="description" content="${escapeHtml(site.description)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    ${fontLink}
    <link rel="canonical" href="${site.domain}" />
    <meta property="og:title" content="${escapeHtml(site.title)}" />
    <meta property="og:description" content="${escapeHtml(site.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${site.domain}" />
    <meta property="og:image" content="${site.domain}site-images/${site.heroImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    ${extraTags}
    ${schemasCode}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

// -------------------------------------------------------------
// PLANTILLAS DE APLICACIÓN REACT (BIFURCADAS POR SITIO)
// -------------------------------------------------------------

// 1. App clásica (para Todo México)
function appTsx(site) {
  const data = JSON.stringify(site, null, 2);

  return `import { useMemo, useState } from 'react';

type Product = {
  name: string;
  price: string;
  image: string;
  tag: string;
  copy: string;
};

type Post = {
  title: string;
  excerpt: string;
  body: string;
};

type SiteData = {
  brand: string;
  shortBrand: string;
  domain: string;
  title: string;
  description: string;
  theme: string;
  accent: string;
  heroImage: string;
  location: string;
  promise: string;
  h1: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  sections: string[][];
  products: Product[];
  posts: Post[];
  faq: string[][];
};

const SITE = ${data} as SiteData;
const WHATSAPP = 'https://wa.me/${whatsapp}?text=' + encodeURIComponent('Hola, quiero informacion de ' + SITE.brand);

function App() {
  const [activePost, setActivePost] = useState(0);
  const [formData, setFormData] = useState({ nombre: '', email: '', asunto: '', mensaje: '' });
  const [formStatus, setFormStatus] = useState('idle');

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: any) => {
    e.preventDefault();
    setFormStatus('sending');
    setTimeout(() => {
      setFormStatus('success');
    }, 1200);
  };

  const selected = SITE.posts[activePost];
  const productGroups = useMemo(() => SITE.products.slice(0, 6), []);

  return (
    <main className={\`site theme-\${SITE.theme}\`}>
      <Header />
      
      {/* HERO */}
      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">{SITE.location}</p>
          <h1>{SITE.h1}</h1>
          <p className="lead">{SITE.subtitle}</p>
          <div className="hero-actions">
            <a className="button primary" href={WHATSAPP}>{SITE.primaryCta}</a>
            <a className="button secondary" href="#envios">Ver Envios y Entregas</a>
          </div>
        </div>
        <div className="hero-media">
          <img src={\`/site-images/\${SITE.heroImage}\`} alt={SITE.brand} />
          <div className="hero-note">
            <strong>{SITE.shortBrand}</strong>
            <span>{SITE.promise}</span>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE ENVÍOS Y ENTREGAS */}
      <section className="envio-calc-section" id="envios">
        <div className="section-heading">
          <p className="eyebrow">Envíos y Entregas</p>
          <h2>Envíos Seguros a Todo México y Entregas CDMX</h2>
          <p>Manejamos esquemas transparentes y seguros tanto para entregas locales como envíos nacionales.</p>
        </div>
        <div className="calc-container">
          <div className="calc-inputs" style={{ background: '#fdfbf7', border: '1px solid var(--line)', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📍</div>
            <h3>Entregas Personales Gratis (Pago Contra Entrega)</h3>
            <p style={{ margin: '12px 0', fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)' }}>
              Para tu total seguridad y para evitar cualquier tipo de fraude o delincuencia en línea, 
              <strong> no te solicitamos depósitos ni transferencias por adelantado</strong> en la CDMX y Área Metropolitana. 
              Te entregamos el producto directamente en tus manos y pagas al momento de recibir y verificar el producto físicamente.
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6', margin: '12px 0', color: 'var(--muted)', listStyleType: 'disc' }}>
              <li><strong>Sucursal Física:</strong> Plaza Guelatao Local 76 Pasillo 5, Iztapalapa.</li>
              <li><strong>Puntos de Entrega:</strong> Torniquetes de Metro Guelatao, Zaragoza y Tepalcates.</li>
              <li><strong>Horario Flexible:</strong> Coordinamos la hora que mejor te acomode por WhatsApp.</li>
            </ul>
            <a className="button primary block" href={WHATSAPP} style={{ marginTop: 'auto' }}>
              Coordinar Entrega Personal
            </a>
          </div>
          
          <div className="calc-results" style={{ background: '#fdfbf7', border: '1px solid var(--line)', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
            <h3>Envío Nacional: Tarifa Fija $140 MXN</h3>
            <p style={{ margin: '12px 0', fontSize: '14px', lineHeight: '1.6', color: 'var(--ink)' }}>
              Si te encuentras fuera de la CDMX y EdoMex, mandamos tu tratamiento directo a tu domicilio en cualquier Estado de la República. 
              El costo de envío es <strong>parejo de $140 MXN a todo México</strong>, sin cargos extras ocultos.
            </p>
            <p style={{ margin: '12px 0', fontSize: '13px', lineHeight: '1.6', color: 'var(--muted)' }}>
              🎯 <strong>Zonas de Difícil Acceso / Zonas Extendidas:</strong> Cubre de forma garantizada y sin costo adicional regiones como Michoacán (Apatzingán, Uruapan, Lázaro Cárdenas en zonas rurales), Guerrero (zonas de la Montaña y Costa Chica), Oaxaca, Chiapas y códigos postales distantes donde normalmente cobran cargos adicionales de paquetería.
            </p>
            <ul style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6', margin: '12px 0', color: 'var(--muted)', listStyleType: 'disc' }}>
              <li><strong>Paqueterías seguras:</strong> FedEx, Estafeta y Redpack enviados desde la Ciudad de México.</li>
              <li><strong>Rastreo Garantizado:</strong> Te compartimos tu número de guía de inmediato para seguir el trayecto.</li>
            </ul>
            <a className="button secondary block" href={WHATSAPP} style={{ marginTop: 'auto' }}>
              Cotizar Envío Nacional
            </a>
          </div>
        </div>
      </section>

      {/* VENTAJAS DE COBERTURA */}
      <section className="proof-strip" aria-label="Ventajas">
        {SITE.sections.map(([title, copy]) => (
          <article key={title}>
            <span />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      {/* CATÁLOGO */}
      <section className="products" id="productos">
        <div className="section-heading">
          <p className="eyebrow">Productos</p>
          <h2>Catalogo completo sincronizado</h2>
          <p>Todos los productos y tratamientos disponibles para su entrega y envio.</p>
        </div>
        <div className="product-grid">
          {SITE.products.map((product) => (
            <article className="product-card" key={product.name}>
              <div className="product-image">
                <img src={\`/site-images/\${product.image}\`} alt={product.name} />
                <b>{product.tag}</b>
              </div>
              <div className="product-body">
                <h3>{product.name}</h3>
                <p>{product.copy}</p>
                <div className="product-buy">
                  <strong>{product.price}</strong>
                  <a href={WHATSAPP}>Pedir por WhatsApp</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* GUIA RAPIDA */}
      <section className="editorial" id="guia">
        <div>
          <p className="eyebrow">Guia rapida</p>
          <h2>Compra como alguien que ya sabe que revisar</h2>
        </div>
        <div className="guide-grid">
          {productGroups.map((product, index) => (
            <article key={product.name}>
              <small>0{index + 1}</small>
              <h3>{product.tag}</h3>
              <p>{product.copy}</p>
            </article>
          ))}
        </div>
      </section>

      {/* BLOG */}
      <section className="blog" id="blog">
        <div className="section-heading align-left">
          <p className="eyebrow">Blog</p>
          <h2>Entradas propias e informacion de valor</h2>
          <p>Articulos informativos sobre la aplicacion, la constancia y los detalles de tu tratamiento.</p>
        </div>
        <div className="blog-layout">
          <div className="blog-list">
            {SITE.posts.map((post, index) => (
              <button className={activePost === index ? 'active' : ''} key={post.title} onClick={() => setActivePost(index)}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{post.title}</strong>
                <small>{post.excerpt}</small>
              </button>
            ))}
          </div>
          <article className="post-reader">
            <p className="eyebrow">Entrada seleccionada</p>
            <h3>{selected.title}</h3>
            <p>{selected.body}</p>
            <a className="button primary" href={WHATSAPP}>Preguntar por este tema</a>
          </article>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <section className="faq" id="preguntas">
        <div className="section-heading">
          <p className="eyebrow">Preguntas</p>
          <h2>Lo que conviene aclarar antes de pagar</h2>
        </div>
        <div className="faq-grid">
          {SITE.faq.map(([question, answer]) => (
            <article key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      {/* SUCURSALES */}
      <section className="sucursal-section" id="sucursal">
        <div className="section-heading">
          <p className="eyebrow">🛡️ Compra 100% Segura Sin Fraudes</p>
          <h2>Puntos de Recolección Física y Entregas en Mano</h2>
          <p>Para tu total tranquilidad y seguridad, evita fraudes digitales y transferencias sospechosas en internet. Te invitamos a recoger tu tratamiento directamente en nuestras instalaciones físicas. Revisa los hologramas de seguridad, el lote de importación original y la fecha de caducidad con el producto en tu mano antes de realizar tu pago contra entrega.</p>
        </div>
        
        <div className="sucursales-grid">
          <div className="sucursal-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Plaza Guelatao (Iztapalapa / CDMX)</h3>
            <p className="address" style={{ flexGrow: 1, fontSize: '0.92rem', lineHeight: '1.6' }}>
              <strong>Dirección:</strong> Calz. Ignacio Zaragoza 406, Juan Escutia, Iztapalapa, 09100 Ciudad de México, CDMX.<br />
              <span className="detalles-tienda" style={{ display: 'inline-block', marginTop: '6px' }}>Dentro de Plaza Guelatao, Local 76, Pasillo 5. Local comercial físico establecido.</span>
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.88rem', color: '#16a34a' }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: '4px' }}>🏬 Recolección Directa en Tienda:</strong>
              Ven directamente a nuestro local dentro de la Plaza. Nuestro personal te atenderá cara a cara, podrás verificar el Minoxidil original y realizar tu pago seguro en mano (efectivo o transferencia) al momento.
            </div>
            <div className="map-container" style={{ marginBottom: '16px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3764.0822180862024!2d-99.02517622387796!3d19.397023881874288!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1e2334005b757%3A0xb3cf516ea278f244!2sPlaza%20Guelatao!5e0!3m2!1ses-419!2smx!4v1716300000000!5m2!1ses-419!2smx"
                width="100%" 
                height="250" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Plaza Guelatao"
              ></iframe>
            </div>
            <a className="button primary block" href={'https://wa.me/525569380408?text=' + encodeURIComponent('Hola, me interesa agendar recolección personal de Minoxidil en la sucursal de Plaza Guelatao.')}>
              Agendar Recolección en Plaza Guelatao
            </a>
          </div>
          
          <div className="sucursal-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Oficinas en Neza (EdoMex)</h3>
            <p className="address" style={{ flexGrow: 1, fontSize: '0.92rem', lineHeight: '1.6' }}>
              <strong>Dirección:</strong> Oriente 10 #224, Colonia Reforma, 57840 Ciudad Nezahualcóyotl, Estado de México.<br />
              <span className="detalles-tienda" style={{ display: 'inline-block', marginTop: '6px' }}>Punto de distribución oficial para recolecciones y atención exprés.</span>
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.88rem', color: '#16a34a' }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: '4px' }}>🏢 Recolección Física en Oficinas:</strong>
              Punto ideal para entregas directas en la zona de Neza. Ven por tu tratamiento, revísalo detalladamente y realiza tu pago contra entrega en mano de manera rápida y segura.
            </div>
            <div className="map-container" style={{ marginBottom: '16px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3764.120015949581!2d-99.01426462387802!3d19.395350381875416!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1e25d2b70f0ab%3A0xc3b84ca3b006a8f1!2sOte.%2010%20224%2C%20Reforma%2C%2057840%20Ciudad%20Nezahualc%C3%B3yotl%2C%20M%C3%A9x.!5e0!3m2!1ses-419!2smx!4v1716300000000!5m2!1ses-419!2smx"
                width="100%" 
                height="250" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Oficinas en Neza"
              ></iframe>
            </div>
            <a className="button primary block" href={'https://wa.me/525569380408?text=' + encodeURIComponent('Hola, me interesa agendar recolección personal de Minoxidil en las oficinas de Neza.')}>
              Agendar Recolección en Neza
            </a>
          </div>

          <div className="sucursal-card" style={{ display: 'flex', flexDirection: 'column', border: '2px solid #137a45', background: '#f0fdf4' }}>
            <div className="badge-oriente" style={{ background: '#137a45', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontWeight: '900', fontSize: '0.75rem', alignSelf: 'flex-start', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🔥 Zona Oriente - Entregas Personales Gratis
            </div>
            <h3>Entregas Personales en Chalco, La Paz, Ixtapaluca, Neza e Iztapalapa</h3>
            <p className="address" style={{ flexGrow: 1, fontSize: '0.92rem', lineHeight: '1.6' }}>
              Si vives en el Estado de México Oriente, las paqueterías suelen cobrarte tarifas de "zona extendida" y tardar días. Nosotros te entregamos <strong>hoy mismo</strong> en mano y <strong>sin costo de envío</strong> en: <br />
              • <strong>Chalco:</strong> Plaza Sendero Chalco, Plaza Cortijo y Centro de Chalco (Kiosco principal).<br />
              • <strong>Los Reyes La Paz:</strong> Estación Metro La Paz (Línea A), Plaza La Paz.<br />
              • <strong>Ixtapaluca:</strong> Plaza Sendero Ixtapaluca (área de comida o entrada principal) y Galerías Ixtapaluca.<br />
              • <strong>Ciudad Neza:</strong> Av. Chimalhuacán, Plaza Ciudad Jardín, Metro Nezahualcóyotl o Metro Impulsora.<br />
              • <strong>Iztapalapa:</strong> Metro Guelatao, Metro Tepalcates, Metro Constitución de 1917 y zonas colindantes.
            </p>
            <div style={{ background: '#ffffff', border: '1px solid #dcfce7', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.88rem', color: '#16a34a' }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: '4px' }}>🤝 Pago Contra Entrega en Mano:</strong>
              Nos vemos en un punto público y seguro. Inspeccionas tu tratamiento de Minoxidil original, confirmas sellos de fábrica y caducidad, y pagas en mano por transferencia o efectivo al recibir. ¡Cero anticipos!
            </div>
            <div className="map-container" style={{ marginBottom: '16px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15065.733560641209!2d-98.92429402517173!3d19.262523281878345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85ce1e672728f11b%3A0x6a090b8fca2066c0!2sPlaza%20Sendero%20Ixtapaluca!5e0!3m2!1ses-419!2smx!4v1716300000000!5m2!1ses-419!2smx"
                width="100%" 
                height="250" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Puntos de Entrega Oriente"
              ></iframe>
            </div>
            <a className="button primary block" href={'https://wa.me/525569380408?text=' + encodeURIComponent('Hola, vivo en la zona Oriente y quiero agendar una entrega personal contra entrega (Chalco / La Paz / Ixtapaluca / Neza / Iztapalapa).')}>
              Agendar Entrega en Oriente
            </a>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="contacto-section" id="contacto">
        <div className="contacto-container">
          <div className="contacto-info">
            <p className="eyebrow">Contacto</p>
            <h2>Información de Contacto General</h2>
            <p>Estamos para servirte. Contáctanos por cualquiera de estos medios o envíanos un mensaje directo.</p>
            
            <div className="info-detalles">
              <div className="info-item">
                <strong>WhatsApp</strong>
                <span><a href={WHATSAPP} style={{ color: 'var(--accent)', fontWeight: 800 }}>55-6938-0408</a></span>
              </div>
              <div className="info-item">
                <strong>Email</strong>
                <span>ventaminoxidilmexico@gmail.com</span>
              </div>
              <div className="info-item">
                <strong>Horario</strong>
                <span>Mar-Dom, 12PM - 5PM</span>
              </div>
            </div>
          </div>
          
          <div className="contacto-form-card">
            <h3>Envíanos un Mensaje</h3>
            <p className="form-sub">¿Tienes alguna pregunta? Nos encantaría ayudarte.</p>
            
            <form onSubmit={handleFormSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre Completo</label>
                  <input 
                    type="text" 
                    id="nombre" 
                    name="nombre" 
                    placeholder="Tu nombre" 
                    required 
                    value={formData.nombre} 
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Correo Electrónico</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="tu@email.com" 
                    required 
                    value={formData.email} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="asunto">Asunto</label>
                <select 
                  id="asunto" 
                  name="asunto" 
                  required 
                  value={formData.asunto} 
                  onChange={handleInputChange}
                >
                  <option value="">Selecciona un tema</option>
                  <option value="Consulta sobre Barba">Consulta sobre crecimiento de barba</option>
                  <option value="Consulta sobre Cabello">Consulta sobre crecimiento de cabello</option>
                  <option value="Duda sobre Envío">Duda sobre envío express o nacional</option>
                  <option value="Duda sobre Originalidad">Duda sobre originalidad y lotes</option>
                  <option value="Otro Asunto">Otro asunto</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="mensaje">Mensaje</label>
                <textarea 
                  id="mensaje" 
                  name="mensaje" 
                  rows={4} 
                  placeholder="Escribe tu mensaje aquí..." 
                  required 
                  value={formData.mensaje} 
                  onChange={handleInputChange}
                ></textarea>
              </div>
              
              <button type="submit" className="button primary block" disabled={formStatus === 'sending'}>
                {formStatus === 'idle' && 'Enviar Mensaje'}
                {formStatus === 'sending' && 'Enviando...'}
                {formStatus === 'success' && '¡Mensaje Enviado con Éxito! ✓'}
              </button>
              
              {formStatus === 'success' && (
                <div className="form-success-alert">
                  <p>¡Gracias por escribirnos, <strong>{formData.nombre}</strong>!</p>
                  <p>Te responderemos a <strong>{formData.email}</strong> o WhatsApp lo antes posible.</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      <Footer />
      <a className="float-wa" href={WHATSAPP}>WhatsApp</a>
    </main>
  );
}

function Header() {
  return (
    <header className="header">
      <a className="brand" href="#inicio" aria-label={SITE.brand}>
        <span>{SITE.shortBrand.charAt(0)}</span>
        <strong>{SITE.brand}</strong>
      </a>
      <nav>
        <a href="#envios">Envios y Entregas</a>
        <a href="#productos">Productos</a>
        <a href="#sucursal">Sucursales</a>
        <a href="#guia">Guia</a>
        <a href="#blog">Blog</a>
        <a href="#preguntas">Preguntas</a>
        <a href="#contacto">Contacto</a>
      </nav>
      <a className="mini-wa" href={WHATSAPP}>WhatsApp</a>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>{SITE.brand}</strong>
        <p>{SITE.description}</p>
      </div>
      <div>
        <a href="#productos">Productos</a>
        <a href="#sucursal">Sucursales</a>
        <a href="#blog">Blog</a>
        <a href="#contacto">Contacto</a>
      </div>
    </footer>
  );
}

export default App;
`;
}

// 2. App para Kirkland (Premium Dark Mode con Bento e Interactividad de Originalidad)
function appTsxKirkland(site) {
  const data = JSON.stringify(site, null, 2);

  return `import { useMemo, useState } from 'react';

type Product = {
  name: string;
  price: string;
  image: string;
  tag: string;
  copy: string;
};

type Post = {
  title: string;
  excerpt: string;
  body: string;
};

type SiteData = {
  brand: string;
  shortBrand: string;
  domain: string;
  title: string;
  description: string;
  theme: string;
  accent: string;
  heroImage: string;
  location: string;
  promise: string;
  h1: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  sections: string[][];
  products: Product[];
  posts: Post[];
  faq: string[][];
};

const SITE = ${data} as SiteData;
const WHATSAPP = 'https://wa.me/${whatsapp}?text=' + encodeURIComponent('Hola, quiero mas informacion de ' + SITE.brand);

function App() {
  const [activePost, setActivePost] = useState(0);
  const [activeVerifyStep, setActiveVerifyStep] = useState(0);
  const [catalogFilter, setCatalogFilter] = useState('kirkland'); // 'kirkland', 'all', 'others'
  const [formData, setFormData] = useState({ nombre: '', email: '', asunto: '', mensaje: '' });
  const [formStatus, setFormStatus] = useState('idle');

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: any) => {
    e.preventDefault();
    setFormStatus('sending');
    setTimeout(() => {
      setFormStatus('success');
    }, 1200);
  };

  const selectedPost = SITE.posts[activePost];

  const filteredProducts = useMemo(() => {
    if (catalogFilter === 'kirkland') {
      return SITE.products.filter(p => /kirkland|espuma/i.test(p.name));
    } else if (catalogFilter === 'others') {
      return SITE.products.filter(p => !/kirkland|espuma/i.test(p.name));
    }
    return SITE.products;
  }, [catalogFilter]);

  const verifySteps = [
    {
      title: 'Lote Grabado a Laser',
      detail: 'Las botellas legitimas de Kirkland tienen el lote impreso en amarillo o grabado directamente en la base en la parte inferior trasera. Este lote debe coincidir con el codigo impreso en la parte inferior de la caja de carton de 6 botellas.',
      highlight: 'Lote y caja coincidente.'
    },
    {
      title: 'Tapa Presiona y Gira',
      detail: 'La tapa cuenta con un sistema child-proof rigido contra niños. Para abrir, se debe presionar con fuerza hacia abajo antes de girar. La tipografia de la tapa original esta grabada con relieve limpio y el anillo inferior de plastico se rompe en el primer uso.',
      highlight: 'Tapa child-proof con relieve.'
    },
    {
      title: 'Consistencia y Microcristales',
      detail: 'El minoxidil al 5% liquido es transparente o ligeramente amarillento y tiene olor a alcohol y propilenglicol. Ante bajas temperaturas durante su importacion, puede presentar pequeños cristales al fondo que se disuelven facilmente agitando a temperatura ambiente.',
      highlight: 'Solucion saturada al 5%.'
    },
    {
      title: 'Tipografia de Etiquetas',
      detail: 'Las etiquetas traseras del producto original son de papel adhesivo de alta calidad con textos nítidos en español e inglés. No deben tener bordes borrosos, textos pixelados ni colores opacos. El código de barras y advertencias son perfectamente legibles.',
      highlight: 'Textos y barras nitidos.'
    }
  ];

  return (
    <main className="site theme-kirkland">
      {/* HEADER */}
      <header className="header">
        <a className="brand" href="#inicio" aria-label={SITE.brand}>
          <span className="logo-k">K</span>
          <strong>{SITE.brand}</strong>
        </a>
        <nav>
          <a href="#autenticidad">Autenticidad</a>
          <a href="#productos">Catalogo</a>
          <a href="#sucursal">Sucursales</a>
          <a href="#cobertura">Cobertura</a>
          <a href="#testimonios">Testimonios</a>
          <a href="#blog">Blog</a>
          <a href="#preguntas">FAQ</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <a className="mini-wa" href={WHATSAPP}>WhatsApp</a>
      </header>

      {/* HERO */}
      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">{SITE.location}</p>
          <h1>{SITE.h1}</h1>
          <p className="lead">{SITE.subtitle}</p>
          <div className="hero-actions">
            <a className="button primary" href={WHATSAPP}>{SITE.primaryCta}</a>
            <a className="button secondary" href="#autenticidad">{SITE.secondaryCta}</a>
          </div>
        </div>
        <div className="hero-media">
          <img src={\`/site-images/\${SITE.heroImage}\`} alt={SITE.brand} />
          <div className="hero-note">
            <strong>{SITE.shortBrand}</strong>
            <span>{SITE.promise}</span>
          </div>
        </div>
      </section>

      {/* SECCIÓN INTERACTIVA DE AUTENTICIDAD (BENTO GRID) */}
      <section className="autenticidad" id="autenticidad">
        <div className="section-heading">
          <p className="eyebrow">Control de Calidad</p>
          <h2>Guia Interactiva de Originalidad</h2>
          <p>Aprende a diferenciar el Kirkland original de imitaciones baratas con estos cuatro puntos clave de seguridad.</p>
        </div>
        <div className="verify-bento">
          <div className="verify-nav">
            {verifySteps.map((step, idx) => (
              <button 
                key={step.title}
                className={activeVerifyStep === idx ? 'active' : ''}
                onClick={() => setActiveVerifyStep(idx)}
              >
                <span>0{idx + 1}</span>
                <strong>{step.title}</strong>
                <small>{step.highlight}</small>
              </button>
            ))}
          </div>
          <div className="verify-details-card">
            <h3>{verifySteps[activeVerifyStep].title}</h3>
            <p>{verifySteps[activeVerifyStep].detail}</p>
            <div className="details-badge">Validado por Distribuidor Autorizado</div>
            <a className="button primary" href={WHATSAPP}>Pedir fotos reales de lote actual</a>
          </div>
        </div>
      </section>

      {/* CATÁLOGO DE PRODUCTOS CON FILTRO */}
      <section className="products" id="productos">
        <div className="section-heading">
          <p className="eyebrow">Tratamientos</p>
          <h2>Selecciona tu tratamiento original</h2>
          <p>Disponemos del catalogo completo de Minoxidil en CDMX. Filtra para ver las opciones Kirkland o productos complementarios.</p>
          
          <div className="catalog-tabs">
            <button className={catalogFilter === 'kirkland' ? 'active' : ''} onClick={() => setCatalogFilter('kirkland')}>
              Minoxidil Kirkland
            </button>
            <button className={catalogFilter === 'all' ? 'active' : ''} onClick={() => setCatalogFilter('all')}>
              Todo el Catalogo
            </button>
            <button className={catalogFilter === 'others' ? 'active' : ''} onClick={() => setCatalogFilter('others')}>
              Jabones y Complementos
            </button>
          </div>
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <article className="product-card" key={product.name}>
              <div className="product-image">
                <img src={\`/site-images/\${product.image}\`} alt={product.name} />
                <b>{product.tag}</b>
              </div>
              <div className="product-body">
                <h3>{product.name}</h3>
                <p>{product.copy}</p>
                <div className="product-buy">
                  <strong>{product.price}</strong>
                  <a href={WHATSAPP}>Pedir por WhatsApp</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* COBERTURA DE ENTREGAS */}
      <section className="cobertura" id="cobertura">
        <div className="section-heading">
          <p className="eyebrow">Logística y Cobertura</p>
          <h2>Entregas Personales y Envíos Nacionales</h2>
          <p>Ofrecemos entregas personales gratis y pago contra entrega en CDMX y EdoMex para tu total seguridad (sin depósitos previos). Para el resto del país, envíos por paquetería con tarifa fija de $140 MXN.</p>
        </div>
        <div className="cobertura-grid">
          <div className="cobertura-card cdmx">
            <h3>📍 CDMX e Iztapalapa</h3>
            <ul className="cobertura-list">
              <li><strong>Iztapalapa</strong> (Entrega Gratis)</li>
              <li>Xochimilco</li>
              <li>Tláhuac</li>
              <li>Coyoacán</li>
              <li>Benito Juárez</li>
              <li>Venustiano Carranza</li>
            </ul>
            <div className="cobertura-time">🕒 Entrega Personal: 1-2 días hábiles</div>
          </div>
          
          <div className="cobertura-card edomex">
            <h3>📍 Nezahualcóyotl y EdoMex</h3>
            <ul className="cobertura-list">
              <li><strong>Nezahualcóyotl</strong> (Entrega Gratis)</li>
              <li>Ecatepec</li>
              <li>Los Reyes</li>
              <li>Chimalhuacán</li>
              <li>La Paz</li>
              <li>Texcoco</li>
            </ul>
            <div className="cobertura-time">🕒 Entrega Personal: 1-2 días hábiles</div>
          </div>

          <div className="cobertura-card nacional" style={{ border: '1px solid rgba(220, 38, 38, 0.3)', background: 'rgba(220, 38, 38, 0.02)' }}>
            <h3>📦 Envío Nacional Fijo $140</h3>
            <ul className="cobertura-list">
              <li><strong>Tarifa Plana Nacional</strong></li>
              <li>Michoacán (Apatzingán, Uruapan, Lázaro C.)</li>
              <li>Guerrero (Montaña, Costa Chica)</li>
              <li>Oaxaca y Chiapas (Zonas serranas)</li>
              <li>FedEx / Estafeta / Redpack</li>
            </ul>
            <div className="cobertura-time">🕒 Envíos: 2-5 días hábiles con guía</div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="testimonios" id="testimonios">
        <div className="section-heading">
          <p className="eyebrow">Opiniones reales</p>
          <h2>Lo que dicen nuestros clientes</h2>
          <p>Resultados reales y opiniones de compradores de CDMX y Nezahualcóyotl.</p>
        </div>
        <div className="testimonios-grid">
          <div className="testimonial-card">
            <div className="stars">⭐⭐⭐⭐⭐</div>
            <p className="quote">"Excelente servicio en Iztapalapa. Mi barba creció increíblemente con el Kirkland que compré aquí. 100% recomendado."</p>
            <div className="user">
              <strong>Carlos M.</strong>
              <span>Iztapalapa, CDMX</span>
            </div>
          </div>
          
          <div className="testimonial-card">
            <div className="stars">⭐⭐⭐⭐⭐</div>
            <p className="quote">"La entrega en Nezahualcóyotl fue súper rápida. El producto es original y ya veo resultados. Muy profesionales."</p>
            <div className="user">
              <strong>Javier R.</strong>
              <span>Nezahualcóyotl, EdoMex</span>
            </div>
          </div>
          
          <div className="testimonial-card">
            <div className="stars">⭐⭐⭐⭐⭐</div>
            <p className="quote">"Compré para mi esposo y los resultados han sido excelentes. La atención por WhatsApp es muy buena."</p>
            <div className="user">
              <strong>María L.</strong>
              <span>Xochimilco, CDMX</span>
            </div>
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section className="blog" id="blog">
        <div className="section-heading align-left">
          <p className="eyebrow">Blog de Kirkland</p>
          <h2>Notas y Resolucion de Mitos sobre Kirkland</h2>
          <p>Informacion basada en ciencia, lotes de importacion y uso responsable.</p>
        </div>
        <div className="blog-layout">
          <div className="blog-list">
            {SITE.posts.map((post, index) => (
              <button className={activePost === index ? 'active' : ''} key={post.title} onClick={() => setActivePost(index)}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{post.title}</strong>
                <small>{post.excerpt}</small>
              </button>
            ))}
          </div>
          <article className="post-reader">
            <p className="eyebrow">Analisis del Articulo</p>
            <h3>{selectedPost.title}</h3>
            <p>{selectedPost.body}</p>
            <a className="button primary" href={WHATSAPP}>Consultar por este tema</a>
          </article>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="preguntas">
        <div className="section-heading">
          <p className="eyebrow">Preguntas Frecuentes</p>
          <h2>Respuestas rapidas y sin rodeos</h2>
        </div>
        <div className="faq-grid">
          {SITE.faq.map(([question, answer]) => (
            <article key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      {/* SUCURSALES */}
      <section className="sucursal-section" id="sucursal">
        <div className="section-heading">
          <p className="eyebrow">🛡️ Compra Kirkland 100% Auténtico y Seguro</p>
          <h2>Puntos de Recolección Física y Contra Entrega</h2>
          <p>No pongas en riesgo tu dinero depositando por adelantado en páginas web dudosas o esperando envíos locales lentos que pueden perderse. Te invitamos a recoger tu Minoxidil Kirkland original directamente en nuestras instalaciones físicas. Podrás revisar el sellado original de fábrica, lote de importación y fecha de caducidad con el producto en mano antes de realizar tu pago contra entrega.</p>
        </div>
        
        <div className="sucursales-grid">
          <div className="sucursal-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Plaza Guelatao (Iztapalapa / CDMX)</h3>
            <p className="address" style={{ flexGrow: 1, fontSize: '0.92rem', lineHeight: '1.6' }}>
              <strong>Dirección:</strong> Calz. Ignacio Zaragoza 406, Juan Escutia, Iztapalapa, 09100 Ciudad de México, CDMX.<br />
              <span className="detalles-tienda" style={{ display: 'inline-block', marginTop: '6px' }}>Dentro de Plaza Guelatao, Local 76, Pasillo 5. Local comercial físico establecido.</span>
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.88rem', color: '#16a34a' }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: '4px' }}>🏬 Recolección Directa en Tienda:</strong>
              Ven directamente a nuestro local dentro de la Plaza. Nuestro personal te atenderá en persona, podrás inspeccionar tu Minoxidil Kirkland y pagar de forma segura en efectivo o transferencia rápida al momento de recibirlo.
            </div>
            <div className="map-container" style={{ marginBottom: '16px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3764.0822180862024!2d-99.02517622387796!3d19.397023881874288!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1e2334005b757%3A0xb3cf516ea278f244!2sPlaza%20Guelatao!5e0!3m2!1ses-419!2smx!4v1716300000000!5m2!1ses-419!2smx"
                width="100%" 
                height="250" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Plaza Guelatao"
              ></iframe>
            </div>
            <a className="button primary block" href={'https://wa.me/525569380408?text=' + encodeURIComponent('Hola, me interesa agendar recolección personal de Minoxidil Kirkland en la sucursal de Plaza Guelatao.')}>
              Agendar Recolección en Plaza Guelatao
            </a>
          </div>
          
          <div className="sucursal-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Oficinas en Neza (EdoMex)</h3>
            <p className="address" style={{ flexGrow: 1, fontSize: '0.92rem', lineHeight: '1.6' }}>
              <strong>Dirección:</strong> Oriente 10 #224, Colonia Reforma, 57840 Ciudad Nezahualcóyotl, Estado de México.<br />
              <span className="detalles-tienda" style={{ display: 'inline-block', marginTop: '6px' }}>Punto de distribución oficial para recolecciones y entregas rápidas de Kirkland.</span>
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.88rem', color: '#16a34a' }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: '4px' }}>🏢 Recolección Física en Oficinas:</strong>
              Ven por tu tratamiento original de Minoxidil Kirkland directamente a nuestras oficinas en Neza. Te entregamos tu tratamiento en mano para que lo verifiques antes de pagar de forma directa.
            </div>
            <div className="map-container" style={{ marginBottom: '16px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3764.120015949581!2d-99.01426462387802!3d19.395350381875416!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1e25d2b70f0ab%3A0xc3b84ca3b006a8f1!2sOte.%2010%20224%2C%20Reforma%2C%2057840%20Ciudad%20Nezahualc%C3%B3yotl%2C%20M%C3%A9x.!5e0!3m2!1ses-419!2smx!4v1716300000000!5m2!1ses-419!2smx"
                width="100%" 
                height="250" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Oficinas en Neza"
              ></iframe>
            </div>
            <a className="button primary block" href={'https://wa.me/525569380408?text=' + encodeURIComponent('Hola, me interesa agendar recolección personal de Minoxidil Kirkland en las oficinas de Neza.')}>
              Agendar Recolección en Neza
            </a>
          </div>

          <div className="sucursal-card" style={{ display: 'flex', flexDirection: 'column', border: '2px solid #dc2626', background: '#1c1f26' }}>
            <div className="badge-oriente" style={{ background: '#dc2626', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontWeight: '900', fontSize: '0.75rem', alignSelf: 'flex-start', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🔥 Zona Oriente - Entregas Personales Gratis
            </div>
            <h3 style={{ color: '#fff' }}>Entregas Personales en Chalco, La Paz, Ixtapaluca, Neza e Iztapalapa</h3>
            <p className="address" style={{ flexGrow: 1, fontSize: '0.92rem', lineHeight: '1.6', color: '#9ca3af' }}>
              Si vives en el Estado de México Oriente, las paqueterías suelen cobrarte tarifas de "zona extendida" y tardar días. Nosotros te entregamos <strong>hoy mismo</strong> en mano y <strong>sin costo de envío</strong> en: <br />
              • <strong>Chalco:</strong> Plaza Sendero Chalco, Plaza Cortijo y Centro de Chalco (Kiosco principal).<br />
              • <strong>Los Reyes La Paz:</strong> Estación Metro La Paz (Línea A), Plaza La Paz.<br />
              • <strong>Ixtapaluca:</strong> Plaza Sendero Ixtapaluca (área de comida o entrada principal) y Galerías Ixtapaluca.<br />
              • <strong>Ciudad Neza:</strong> Av. Chimalhuacán, Plaza Ciudad Jardín, Metro Nezahualcóyotl o Metro Impulsora.<br />
              • <strong>Iztapalapa:</strong> Metro Guelatao, Metro Tepalcates, Metro Constitución de 1917 y zonas colindantes.
            </p>
            <div style={{ background: '#111827', border: '1px solid rgba(220, 38, 38, 0.3)', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.88rem', color: '#f3f4f6' }}>
              <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>🤝 Pago Contra Entrega en Mano:</strong>
              Nos vemos en un punto público y seguro. Inspeccionas tu tratamiento de Minoxidil Kirkland original, confirmas sellos de fábrica y caducidad, y pagas en mano por transferencia o efectivo al recibir. ¡Cero anticipos!
            </div>
            <div className="map-container" style={{ marginBottom: '16px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15065.733560641209!2d-98.92429402517173!3d19.262523281878345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85ce1e672728f11b%3A0x6a090b8fca2066c0!2sPlaza%20Sendero%20Ixtapaluca!5e0!3m2!1ses-419!2smx!4v1716300000000!5m2!1ses-419!2smx"
                width="100%" 
                height="250" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Puntos de Entrega Oriente"
              ></iframe>
            </div>
            <a className="button primary block" href={'https://wa.me/525569380408?text=' + encodeURIComponent('Hola, vivo en la zona Oriente y quiero agendar una entrega personal contra entrega de Minoxidil Kirkland.')}>
              Agendar Entrega en Oriente
            </a>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="contacto-section" id="contacto">
        <div className="contacto-container">
          <div className="contacto-info">
            <p className="eyebrow">Contacto Kirkland Mexico</p>
            <h2>Información de Contacto General</h2>
            <p>Estamos para servirte. Contáctanos por cualquiera de estos medios o envíanos un mensaje directo.</p>
            
            <div className="info-detalles">
              <div className="info-item">
                <strong>WhatsApp</strong>
                <span><a href={WHATSAPP} style={{ color: 'var(--accent)', fontWeight: 800 }}>55-6938-0408</a></span>
              </div>
              <div className="info-item">
                <strong>Email</strong>
                <span>ventaminoxidilmexico@gmail.com</span>
              </div>
              <div className="info-item">
                <strong>Horario</strong>
                <span>Mar-Dom, 12PM - 5PM</span>
              </div>
            </div>
          </div>
          
          <div className="contacto-form-card">
            <h3>Envíanos un Mensaje</h3>
            <p className="form-sub">¿Tienes alguna pregunta? Nos encantaría ayudarte.</p>
            
            <form onSubmit={handleFormSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre Completo</label>
                  <input 
                    type="text" 
                    id="nombre" 
                    name="nombre" 
                    placeholder="Tu nombre" 
                    required 
                    value={formData.nombre} 
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Correo Electrónico</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="tu@email.com" 
                    required 
                    value={formData.email} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="asunto">Asunto</label>
                <select 
                  id="asunto" 
                  name="asunto" 
                  required 
                  value={formData.asunto} 
                  onChange={handleInputChange}
                >
                  <option value="">Selecciona un tema</option>
                  <option value="Consulta sobre Barba">Consulta sobre crecimiento de barba</option>
                  <option value="Consulta sobre Cabello">Consulta sobre crecimiento de cabello</option>
                  <option value="Duda sobre Envío">Duda sobre envío express o nacional</option>
                  <option value="Duda sobre Originalidad">Duda sobre originalidad y lotes</option>
                  <option value="Otro Asunto">Otro asunto</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="mensaje">Mensaje</label>
                <textarea 
                  id="mensaje" 
                  name="mensaje" 
                  rows={4} 
                  placeholder="Escribe tu mensaje aquí..." 
                  required 
                  value={formData.mensaje} 
                  onChange={handleInputChange}
                ></textarea>
              </div>
              
              <button type="submit" className="button primary block" disabled={formStatus === 'sending'}>
                {formStatus === 'idle' && 'Enviar Mensaje'}
                {formStatus === 'sending' && 'Enviando...'}
                {formStatus === 'success' && '¡Mensaje Enviado con Éxito! ✓'}
              </button>
              
              {formStatus === 'success' && (
                <div className="form-success-alert">
                  <p>¡Gracias por escribirnos, <strong>{formData.nombre}</strong>!</p>
                  <p>Te responderemos a <strong>{formData.email}</strong> o WhatsApp lo antes posible.</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div>
          <strong>{SITE.brand}</strong>
          <p>Distribucion especializada de Kirkland Minoxidil 5% original en Mexico. Informacion transparente para tu cuidado personal.</p>
        </div>
        <div>
          <a href="#autenticidad">Autenticidad</a>
          <a href="#productos">Catalogo</a>
          <a href="#sucursal">Sucursales</a>
          <a href="#cobertura">Cobertura</a>
          <a href="#blog">Blog</a>
          <a href="#contacto">Contacto</a>
        </div>
      </footer>
      <a className="float-wa" href={WHATSAPP}>WhatsApp</a>
    </main>
  );
}

export default App;
`;
}

// 3. App para Neza (Tema Naranja/Logístico Exprés de Barrio, Entregas en 2 Horas y Local Físico)
function appTsxNeza(site) {
  const data = JSON.stringify(site, null, 2);

  return `import { useMemo, useState, useEffect } from 'react';

type Product = {
  name: string;
  price: string;
  image: string;
  tag: string;
  copy: string;
};

type Post = {
  title: string;
  excerpt: string;
  body: string;
};

type SiteData = {
  brand: string;
  shortBrand: string;
  domain: string;
  title: string;
  description: string;
  theme: string;
  accent: string;
  heroImage: string;
  location: string;
  promise: string;
  h1: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  sections: string[][];
  products: Product[];
  posts: Post[];
  faq: string[][];
};

const SITE = ${data} as SiteData;

function App() {
  const [activePost, setActivePost] = useState(0);
  const [selectedPunto, setSelectedPunto] = useState(0);
  const [catalogFilter, setCatalogFilter] = useState('immediate'); // 'immediate', 'all'
  const [timeLeft, setTimeLeft] = useState('00h 00m 00s');
  const [formData, setFormData] = useState({ nombre: '', email: '', asunto: '', mensaje: '' });
  const [formStatus, setFormStatus] = useState('idle');

  const selectedPost = SITE.posts[activePost];

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: any) => {
    e.preventDefault();
    setFormStatus('sending');
    setTimeout(() => {
      setFormStatus('success');
    }, 1200);
  };

  const filteredProducts = useMemo(() => {
    if (catalogFilter === 'immediate') {
      return SITE.products.filter(p => /kirkland|biotina|dermaroller/i.test(p.name));
    }
    return SITE.products;
  }, [catalogFilter]);

  const puntosEntrega = [
    {
      id: 'local',
      title: 'Sucursal Plaza Guelatao (Iztapalapa)',
      desc: 'Visita nuestra tienda fisica en Plaza Guelatao (Local 76, Pasillo 5, junto a Calzada Ignacio Zaragoza). Revisa caducidades, lotes y hologramas en tu mano antes de pagar.',
      horario: 'Martes a Domingo - De 12:00 PM a 5:00 PM',
      tiempo: '🟢 Recogida Inmediata en Local 76',
      costo: '¡GRATIS!',
      waMsg: 'Hola, quiero pasar a recoger Minoxidil en la SUCURSAL de Plaza Guelatao hoy.'
    },
    {
      id: 'lapaz',
      title: 'Metro La Paz (Linea A) - Los Reyes',
      desc: 'Punto de entrega express en el area de torniquetes de Metro La Paz. Excelente opcion para la gente de Los Reyes, La Paz, San Vicente Chicoloapan y la carretera federal.',
      horario: 'Lunes a Sabado - Coordinar hora por WhatsApp',
      tiempo: '⚡ Entrega en menos de 2 horas (Acordado hoy)',
      costo: '¡GRATIS!',
      waMsg: 'Hola, quiero comprar Minoxidil hoy con entrega express en METRO LA PAZ.'
    },
    {
      id: 'ixtapaluca',
      title: 'Ixtapaluca (Punto de Encuentro)',
      desc: 'Entrega personal gratis y segura en puntos concurridos de Ixtapaluca como Plaza Sendero. Verificas producto fisicamente y pagas contra entrega.',
      horario: 'Lunes a Sabado - Acordar hora por WhatsApp',
      tiempo: '🤝 Coordinado para hoy mismo',
      costo: '¡GRATIS!',
      waMsg: 'Hola, me interesa comprar Minoxidil con entrega personal en IXTAPALUCA.'
    },
    {
      id: 'chalco',
      title: 'Chalco (Punto de Encuentro)',
      desc: 'Entregas personales gratis coordinadas en zonas centricas y transitadas de Chalco (cerca del Palacio Municipal o centros comerciales). Seguridad total contra robos e internet.',
      horario: 'Lunes a Sabado - Acordar hora por WhatsApp',
      tiempo: '🤝 Entrega personal coordinada',
      costo: '¡GRATIS!',
      waMsg: 'Hola, quiero coordinar la entrega personal de Minoxidil en CHALCO.'
    },
    {
      id: 'guelatao',
      title: 'Metros Guelatao, Zaragoza y Tepalcates',
      desc: 'Entrega sin costo en los torniquetes o andenes de Metro Guelatao (Linea A), Zaragoza (Linea 1) o Tepalcates (Linea A). Recibe y paga en mano.',
      horario: 'Lunes a Sabado - De 11:00 AM a 7:00 PM',
      tiempo: '⚡ Entrega express en 1 a 2 horas',
      costo: '¡GRATIS!',
      waMsg: 'Hola, me interesa comprar Minoxidil hoy con entrega express en el Metro.'
    },
    {
      id: 'domicilio',
      title: 'Entrega a Domicilio (Neza/Iztapalapa)',
      desc: 'Mandamos a un repartidor local en moto directo a tu casa o negocio en Nezahualcoyotl o Iztapalapa. Pagas en efectivo o transferencia únicamente al recibir en mano.',
      horario: 'Pedidos antes de las 4:00 PM se entregan hoy mismo',
      tiempo: '🏍️ Repartidor en moto llega hoy mismo',
      costo: '$50 MXN (Pago contra entrega)',
      waMsg: 'Hola, me interesa la entrega express a DOMICILIO en Neza/Iztapalapa con pago al recibir.'
    }
  ];

  const currentPunto = puntosEntrega[selectedPunto];
  const WHATSAPP_BASE = 'https://wa.me/525569380408?text=';
  const customWaLink = WHATSAPP_BASE + encodeURIComponent(currentPunto.waMsg);
  const generalWaLink = WHATSAPP_BASE + encodeURIComponent('Hola, me interesa comprar express en Neza del sitio ' + SITE.brand);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(16, 0, 0, 0); // Límite de corte 4:00 PM
      
      if (now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      
      const diff = target.getTime() - now.getTime();
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(
        \`\${String(hrs).padStart(2, '0')}h \${String(mins).padStart(2, '0')}m \${String(secs).padStart(2, '0')}s\`
      );
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="site theme-neza">
      {/* TOP BAR EXPRESS ALERTA BRUTALISTA */}
      <div className="express-bar">
        <span>⚡ <strong>ENTREGA HOY MISMO:</strong> Pide en los proximos <strong className="timer-countdown">{timeLeft}</strong> para recibir hoy en metro o a domicilio en Neza.</span>
      </div>

      {/* HEADER */}
      <header className="header">
        <a className="brand" href="#inicio" aria-label={SITE.brand}>
          <span className="logo-n">N</span>
          <strong>{SITE.brand}</strong>
        </a>
        <nav>
          <a href="#entregas">Puntos de Entrega</a>
          <a href="#productos">Catalogo Express</a>
          <a href="#sucursal">Sucursales</a>
          <a href="#blog">Blog de Barrio</a>
          <a href="#preguntas">Preguntas</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <a className="mini-wa" href={generalWaLink}>Pedir hoy</a>
      </header>

      {/* HERO ENFOCADO EN VELOCIDAD Y CERCANÍA */}
      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">📦 SERVICIO LOCAL AL INSTANTE</p>
          <h1>{SITE.h1}</h1>
          <p className="lead">{SITE.subtitle}</p>
          <div className="hero-actions">
            <a className="button primary" href={generalWaLink}>{SITE.primaryCta}</a>
            <a className="button secondary" href="#entregas">Ubicaciones y Horarios</a>
          </div>
        </div>
        <div className="hero-media">
          <img src={\`/site-images/\${SITE.heroImage}\`} alt={SITE.brand} />
          <div className="hero-note-express">
            <strong>🏠 CDMX Oriente y Nezahualcoyotl</strong>
            <span>{SITE.promise}</span>
          </div>
        </div>
      </section>

      {/* SIMULADOR DE ENTREGA LOCAL INTERACTIVO */}
      <section className="entregas" id="entregas">
        <div className="section-heading">
          <p className="eyebrow">Logistica en 2 Horas</p>
          <h2>Puntos de Entrega Express e Inmediata</h2>
          <p>Evita fraudes y delincuencia en internet. Con nuestras entregas personales gratis y pago contra entrega, recibes el producto físico en tus manos y pagas al momento de recibir.</p>
        </div>
        
        <div className="puntos-grid">
          <div className="puntos-nav">
            {puntosEntrega.map((punto, idx) => (
              <button 
                key={punto.id}
                className={selectedPunto === idx ? 'active' : ''}
                onClick={() => setSelectedPunto(idx)}
              >
                <div className="punto-header">
                  <strong>{punto.title}</strong>
                  <span className="punto-cost-badge">{punto.costo === '¡GRATIS!' ? 'Gratis' : '+$50'}</span>
                </div>
                <span className="tag-horario">{punto.horario}</span>
              </button>
            ))}
          </div>
          
          <div className="punto-info-card">
            <h3>Ubicacion: {currentPunto.title}</h3>
            <p className="punto-desc">{currentPunto.desc}</p>
            
            <div className="punto-stats-grid">
              <div className="stat-box">
                <span className="stat-label">Costo de Entrega</span>
                <strong className="stat-value highlight">{currentPunto.costo}</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Tiempo Estimado</span>
                <strong className="stat-value">{currentPunto.tiempo}</strong>
              </div>
            </div>

            <div className="punto-meta">
              <strong>Horario Coordinado:</strong>
              <span>{currentPunto.horario}</span>
            </div>
            
            <a className="button primary block" href={customWaLink}>
              Coordinar Entrega en {currentPunto.title}
            </a>
          </div>
        </div>
      </section>

      {/* CATÁLOGO RAPIDO */}
      <section className="products" id="productos">
        <div className="section-heading">
          <p className="eyebrow">Stock Local Listo</p>
          <h2>Catalogo de Productos y Tratamientos</h2>
          <p>Disponemos del inventario completo de Minoxidil CDMX para entrega inmediata en Neza y Guelatao.</p>
          
          <div className="catalog-tabs">
            <button className={catalogFilter === 'immediate' ? 'active' : ''} onClick={() => setCatalogFilter('immediate')}>
              Stock para Entrega Hoy (Kirkland / Biotina / Roller)
            </button>
            <button className={catalogFilter === 'all' ? 'active' : ''} onClick={() => setCatalogFilter('all')}>
              Ver Catalogo Completo
            </button>
          </div>
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => {
            const isImmediate = /kirkland|biotina|dermaroller/i.test(product.name);
            return (
              <article className="product-card" key={product.name}>
                <div className="product-image">
                  <img src={\`/site-images/\${product.image}\`} alt={product.name} />
                  <b className="product-tag">{product.tag}</b>
                  <span className={\`stock-badge \${isImmediate ? 'immediate' : 'standard'}\`}>
                    {isImmediate ? '⚡ Entrega en 2h' : '📦 Disponible'}
                  </span>
                </div>
                <div className="product-body">
                  <h3>{product.name}</h3>
                  <p>{product.copy}</p>
                  <div className="product-buy">
                    <strong>{product.price}</strong>
                    <a href={WHATSAPP_BASE + encodeURIComponent('Hola, me interesa comprar ' + product.name + ' con entrega express el dia de hoy.')}>
                      Pedir Hoy mismo
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SUCURSALES */}
      <section className="sucursal-section" id="sucursal">
        <div className="section-heading">
          <p className="eyebrow">📍 Cobertura Local Segura en Zona Oriente</p>
          <h2>Puntos de Recolección y Entregas Personales en Neza, Iztapalapa, Chalco, La Paz e Ixtapaluca</h2>
          <p style={{ maxWidth: '850px', margin: '0 auto 20px auto', lineHeight: '1.6', fontSize: '1.1rem', color: 'var(--muted)' }}>
            ¡Evita fraudes y envíos locales tardados! Al ser locales de la zona Oriente de la Ciudad de México y Estado de México, te ofrecemos dos opciones 100% seguras: <strong>recolección física directa en nuestra sucursal y oficinas</strong>, o <strong>entrega personal gratis en mano</strong> en los puntos más concurridos de tu municipio. Sin depósitos previos, verificas originalidad en persona y pagas al recibir.
          </p>
        </div>
        
        <div className="sucursales-grid">
          <div className="sucursal-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Sucursal Plaza Guelatao (Límite Iztapalapa - Neza)</h3>
            <p className="address" style={{ flexGrow: 1, fontSize: '0.92rem', lineHeight: '1.6' }}>
              <strong>Dirección:</strong> Calz. Ignacio Zaragoza 406, Juan Escutia, Iztapalapa, 09100 Ciudad de México, CDMX.<br />
              <span className="detalles-tienda" style={{ display: 'inline-block', marginTop: '6px' }}>Dentro de Plaza Guelatao, Local 76, Pasillo 5. Local físico establecido para entregas directas y asesoría en persona.</span>
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.88rem', color: '#16a34a' }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: '4px' }}>🏬 Recolección Directa en Tienda:</strong>
              Ven a nuestro local comercial dentro de la Plaza. Nuestro personal te atenderá cara a cara, te mostrará los códigos de autenticidad del Minoxidil y pagarás seguro al verificar el producto.
            </div>
            <div className="map-container" style={{ marginBottom: '16px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3764.0822180862024!2d-99.02517622387796!3d19.397023881874288!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1e2334005b757%3A0xb3cf516ea278f244!2sPlaza%20Guelatao!5e0!3m2!1ses-419!2smx!4v1716300000000!5m2!1ses-419!2smx"
                width="100%" 
                height="250" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Plaza Guelatao"
              ></iframe>
            </div>
            <a className="button primary block" href={'https://wa.me/525569380408?text=' + encodeURIComponent('Hola, quiero pasar a recoger Minoxidil en la sucursal de Plaza Guelatao hoy.')}>
              Recoger en Plaza Guelatao
            </a>
          </div>
          
          <div className="sucursal-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Oficinas de Distribución Neza</h3>
            <p className="address" style={{ flexGrow: 1, fontSize: '0.92rem', lineHeight: '1.6' }}>
              <strong>Dirección:</strong> Oriente 10 #224, Colonia Reforma, 57840 Ciudad Nezahualcóyotl, Estado de México.<br />
              <span className="detalles-tienda" style={{ display: 'inline-block', marginTop: '6px' }}>Punto de distribución y oficinas de atención exprés para compras directas de Minoxidil.</span>
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.88rem', color: '#16a34a' }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: '4px' }}>🏢 Recolección Física en Oficinas:</strong>
              Recoge hoy mismo de manera directa. Contamos con stock constante de tratamientos Kirkland. Te entregamos en mano y realizas tu pago al recibir.
            </div>
            <div className="map-container" style={{ marginBottom: '16px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3764.120015949581!2d-99.01426462387802!3d19.395350381875416!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1e25d2b70f0ab%3A0xc3b84ca3b006a8f1!2sOte.%2010%20224%2C%20Reforma%2C%2057840%20Ciudad%20Nezahualc%C3%B3yotl%2C%20M%C3%A9x.!5e0!3m2!1ses-419!2smx!4v1716300000000!5m2!1ses-419!2smx"
                width="100%" 
                height="250" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Oficinas en Neza"
              ></iframe>
            </div>
            <a className="button primary block" href={'https://wa.me/525569380408?text=' + encodeURIComponent('Hola, me interesa pasar a las oficinas de Neza por mi Minoxidil.')}>
              Recoger en Oficinas Neza
            </a>
          </div>
 
          <div className="sucursal-card" style={{ display: 'flex', flexDirection: 'column', border: '3px solid #f97316', background: '#fffbeb' }}>
            <div className="badge-oriente" style={{ background: '#f97316', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontWeight: '900', fontSize: '0.75rem', alignSelf: 'flex-start', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🔥 Cobertura Total Oriente - Sin Envíos Caros
            </div>
            <h3>Entregas Personales en Chalco, La Paz, Ixtapaluca, Neza e Iztapalapa</h3>
            <p className="address" style={{ flexGrow: 1, fontSize: '0.92rem', lineHeight: '1.6' }}>
              Si vives en el Estado de México Oriente, las paqueterías suelen cobrarte tarifas de "zona extendida" y tardar días. Nosotros te entregamos <strong>hoy mismo</strong> en mano y <strong>sin costo de envío</strong> en: <br />
              • <strong>Chalco:</strong> Plaza Sendero Chalco, Plaza Cortijo y Centro de Chalco (Kiosco principal).<br />
              • <strong>Los Reyes La Paz:</strong> Estación Metro La Paz (Línea A), Plaza La Paz.<br />
              • <strong>Ixtapaluca:</strong> Plaza Sendero Ixtapaluca (área de comida o entrada principal) y Galerías Ixtapaluca.<br />
              • <strong>Ciudad Neza:</strong> Av. Chimalhuacán, Plaza Ciudad Jardín, Metro Nezahualcóyotl o Metro Impulsora.<br />
              • <strong>Iztapalapa:</strong> Metro Guelatao, Metro Tepalcates, Metro Constitución de 1917 y zonas colindantes.
            </p>
            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.88rem', color: '#c2410c' }}>
              <strong style={{ color: '#9a3412', display: 'block', marginBottom: '4px' }}>🤝 Compra segura contra entrega en mano:</strong>
              Nos vemos en un punto público y seguro. Inspeccionas tu caja de Minoxidil Kirkland, confirmas lote de importación original y caducidad, y pagas en mano por transferencia o efectivo al recibir. ¡Cero depósitos previos!
            </div>
            <div className="map-container" style={{ marginBottom: '16px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15065.733560641209!2d-98.92429402517173!3d19.262523281878345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85ce1e672728f11b%3A0x6a090b8fca2066c0!2sPlaza%20Sendero%20Ixtapaluca!5e0!3m2!1ses-419!2smx!4v1716300000000!5m2!1ses-419!2smx"
                width="100%" 
                height="250" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Puntos de Entrega Oriente"
              ></iframe>
            </div>
            <a className="button primary block" href={'https://wa.me/525569380408?text=' + encodeURIComponent('Hola, vivo en la zona Oriente y quiero agendar una entrega personal contra entrega (Chalco / La Paz / Ixtapaluca / Neza / Iztapalapa).')}>
              Agendar Entrega Personal en Oriente
            </a>
          </div>
        </div>

        {/* CÓMO FUNCIONA NUESTRA LOGÍSTICA CONTRA ENTREGA EN EL ORIENTE */}
        <div style={{ marginTop: '40px', background: '#fdf6f0', border: '2px solid #f97316', borderRadius: '8px', padding: '28px', boxShadow: 'var(--brutal-shadow)', textAlign: 'left' }}>
          <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--ink)', marginTop: 0, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid var(--ink)', paddingBottom: '8px' }}>
            <span>🤝</span> ¿Cómo funciona nuestra entrega personal segura en el Oriente de CDMX/EdoMex?
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginTop: '16px' }}>
            <div>
              <h4 style={{ fontWeight: '900', margin: '0 0 6px 0', fontSize: '16px', color: 'var(--ink)' }}>1. Agendas por WhatsApp</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)', lineHeight: '1.5' }}>Indícanos cuál tratamiento de Minoxidil necesitas y tu zona (Chalco, Valle de Chalco, Los Reyes La Paz, Ixtapaluca, Neza o Iztapalapa).</p>
            </div>
            <div>
              <h4 style={{ fontWeight: '900', margin: '0 0 6px 0', fontSize: '16px', color: 'var(--ink)' }}>2. Acordamos Punto Seguro</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)', lineHeight: '1.5' }}>Fijamos una estación de metro o plaza comercial (Plaza Sendero Ixtapaluca, Plaza Sendero Chalco, Kiosco de Chalco, torniquetes de Metro La Paz o Metro Guelatao).</p>
            </div>
            <div>
              <h4 style={{ fontWeight: '900', margin: '0 0 6px 0', fontSize: '16px', color: 'var(--ink)' }}>3. Verificas Producto en Mano</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)', lineHeight: '1.5' }}>Te entregamos físicamente el producto. Tómate el tiempo de revisar el lote, hologramas de seguridad y fecha de caducidad antes de hacer el pago.</p>
            </div>
            <div>
              <h4 style={{ fontWeight: '900', margin: '0 0 6px 0', fontSize: '16px', color: 'var(--ink)' }}>4. Pagas al Recibir</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)', lineHeight: '1.5' }}>Pagas tu tratamiento al instante en efectivo o por transferencia rápida desde tu aplicación de banco. ¡Sin anticipos sospechosos y libre de robos!</p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOG ENFOCADO EN LOGÍSTICA DE BARRIO */}
      <section className="blog" id="blog">
        <div className="section-heading align-left">
          <p className="eyebrow">Guias de Seguridad Local</p>
          <h2>Como comprar seguro y evitar imitaciones en Neza</h2>
          <p>Consejos practicos para verificar tu product en mano y no arriesgar tu dinero en internet.</p>
        </div>
        <div className="blog-layout">
          <div className="blog-list">
            {SITE.posts.map((post, index) => (
              <button className={activePost === index ? 'active' : ''} key={post.title} onClick={() => setActivePost(index)}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{post.title}</strong>
                <small>{post.excerpt}</small>
              </button>
            ))}
          </div>
          <article className="post-reader">
            <p className="eyebrow">Consejo de compra segura</p>
            <h3>{selectedPost.title}</h3>
            <p>{selectedPost.body}</p>
            <a className="button primary" href={WHATSAPP_BASE + encodeURIComponent('Hola, lei el articulo "' + selectedPost.title + '" y tengo una duda.')}>
              Preguntar por WhatsApp
            </a>
          </article>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="preguntas">
        <div className="section-heading">
          <p className="eyebrow">Preguntas en Neza</p>
          <h2>Aclaraciones directas y sin rodeos</h2>
        </div>
        <div className="faq-grid">
          {SITE.faq.map(([question, answer]) => (
            <article key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CONTACTO */}
      <section className="contacto-section" id="contacto">
        <div className="contacto-container">
          <div className="contacto-info">
            <p className="eyebrow">Contacto Neza</p>
            <h2>Información de Contacto General</h2>
            <p>Estamos para servirte. Contáctanos por cualquiera de estos medios o envíanos un mensaje directo.</p>
            
            <div className="info-detalles">
              <div className="info-item">
                <strong>WhatsApp</strong>
                <span><a href={generalWaLink} style={{ color: 'var(--accent)', fontWeight: 800 }}>55-6938-0408</a></span>
              </div>
              <div className="info-item">
                <strong>Email</strong>
                <span>ventaminoxidilmexico@gmail.com</span>
              </div>
              <div className="info-item">
                <strong>Horario</strong>
                <span>Mar-Dom, 12PM - 5PM</span>
              </div>
            </div>
          </div>
          
          <div className="contacto-form-card">
            <h3>Envíanos un Mensaje</h3>
            <p className="form-sub">¿Tienes alguna pregunta? Nos encantaría ayudarte.</p>
            
            <form onSubmit={handleFormSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre Completo</label>
                  <input 
                    type="text" 
                    id="nombre" 
                    name="nombre" 
                    placeholder="Tu nombre" 
                    required 
                    value={formData.nombre} 
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Correo Electrónico</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="tu@email.com" 
                    required 
                    value={formData.email} 
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="asunto">Asunto</label>
                <select 
                  id="asunto" 
                  name="asunto" 
                  required 
                  value={formData.asunto} 
                  onChange={handleInputChange}
                >
                  <option value="">Selecciona un tema</option>
                  <option value="Consulta sobre Barba">Consulta sobre crecimiento de barba</option>
                  <option value="Consulta sobre Cabello">Consulta sobre crecimiento de cabello</option>
                  <option value="Duda sobre Envío">Duda sobre envío express o nacional</option>
                  <option value="Duda sobre Originalidad">Duda sobre originalidad y lotes</option>
                  <option value="Otro Asunto">Otro asunto</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="mensaje">Mensaje</label>
                <textarea 
                  id="mensaje" 
                  name="mensaje" 
                  rows={4} 
                  placeholder="Escribe tu mensaje aquí..." 
                  required 
                  value={formData.mensaje} 
                  onChange={handleInputChange}
                ></textarea>
              </div>
              
              <button type="submit" className="button primary block" disabled={formStatus === 'sending'}>
                {formStatus === 'idle' && 'Enviar Mensaje'}
                {formStatus === 'sending' && 'Enviando...'}
                {formStatus === 'success' && '¡Mensaje Enviado con Éxito! ✓'}
              </button>
              
              {formStatus === 'success' && (
                <div className="form-success-alert">
                  <p>¡Gracias por escribirnos, <strong>{formData.nombre}</strong>!</p>
                  <p>Te responderemos a <strong>{formData.email}</strong> o WhatsApp lo antes posible.</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div>
          <strong>{SITE.brand}</strong>
          <p>Entregas locales express y atencion en punto de venta fisico en Plaza Guelatao. Servicio confiable para la zona de Neza e Iztapalapa.</p>
        </div>
        <div>
          <a href="#entregas">Ubicaciones</a>
          <a href="#productos">Catalogo</a>
          <a href="#sucursal">Sucursales</a>
          <a href="#blog">Blog</a>
          <a href="#contacto">Contacto</a>
        </div>
      </footer>
      <a className="float-wa" href={generalWaLink}>WhatsApp</a>
    </main>
  );
}

export default App;
`;
}

// -------------------------------------------------------------
// ESTILOS CSS PERSONALIZADOS POR SITIO (BIFURCADOS)
// -------------------------------------------------------------

// 1. CSS Clásico para Todo México
function css() {
  return `:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #17231f;
  background: #f6f7f2;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  overflow-x: clip;
}

body {
  margin: 0;
  background: #f6f7f2;
  overflow-x: clip;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
}

.site {
  --accent: #137a45;
  --ink: #13241a;
  --muted: #5b6a66;
  --line: rgba(20, 34, 31, 0.14);
  --paper: #fffdf2;
  min-height: 100vh;
  overflow-x: clip;
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px clamp(18px, 4vw, 72px);
  background: rgba(255, 253, 242, 0.92);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(18px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 230px;
}

.brand span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--accent);
  font-weight: 900;
}

.brand strong {
  font-size: 18px;
  line-height: 1.1;
}

.header nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  color: var(--muted);
  font-weight: 750;
}

.header nav a:hover {
  color: var(--accent);
}

.mini-wa,
.button,
.product-buy a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 850;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.mini-wa,
.button.primary,
.product-buy a {
  color: #fff;
  background: var(--accent);
}

.mini-wa {
  min-height: 44px;
  padding: 0 18px;
}

.button {
  min-height: 48px;
  padding: 0 22px;
  border: 1px solid var(--accent);
}

.button.secondary {
  color: var(--accent);
  background: transparent;
}

.button:hover,
.mini-wa:hover,
.product-buy a:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(16, 36, 28, 0.14);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr);
  gap: clamp(24px, 5vw, 72px);
  align-items: center;
  padding: clamp(44px, 7vw, 86px) clamp(18px, 4vw, 72px) 54px;
  background:
    linear-gradient(120deg, rgba(255, 253, 242, 0.98), rgba(246, 247, 242, 0.78)),
    radial-gradient(circle at 82% 18%, rgba(19, 122, 69, 0.12), transparent 32%);
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  max-width: 800px;
  margin-bottom: 20px;
  color: var(--ink);
  font-size: clamp(40px, 5.2vw, 72px);
  line-height: 0.98;
  overflow-wrap: anywhere;
}

h2 {
  color: var(--ink);
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.03;
}

h3 {
  color: var(--ink);
}

.lead {
  max-width: 660px;
  color: #3e4d49;
  font-size: 20px;
  line-height: 1.65;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 28px;
}

.hero-media {
  position: relative;
  min-height: 0;
  aspect-ratio: 16 / 11;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 28px 72px rgba(28, 41, 36, 0.16);
}

.hero-media img {
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: cover;
}

.hero-note {
  position: absolute;
  right: 18px;
  bottom: 18px;
  left: 18px;
  display: grid;
  gap: 6px;
  padding: 18px;
  color: #fff;
  background: rgba(16, 32, 27, 0.86);
  border-radius: 6px;
}

.hero-note span {
  color: rgba(255, 255, 255, 0.82);
}

.proof-strip,
.products,
.editorial,
.blog,
.faq,
.contact,
.footer {
  padding-right: clamp(18px, 4vw, 72px);
  padding-left: clamp(18px, 4vw, 72px);
}

.proof-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  padding-top: 26px;
  padding-bottom: 34px;
  background: var(--ink);
}

.proof-strip article {
  padding: 26px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
}

.proof-strip span {
  display: block;
  width: 38px;
  height: 4px;
  margin-bottom: 24px;
  background: var(--accent);
}

.proof-strip h2 {
  margin-bottom: 12px;
  color: #fff;
  font-size: 22px;
}

.proof-strip p {
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  line-height: 1.7;
}

.products,
.editorial,
.blog,
.faq {
  padding-top: 76px;
  padding-bottom: 76px;
}

.section-heading {
  max-width: 760px;
  margin: 0 auto 34px;
  text-align: center;
}

.section-heading.align-left {
  margin-left: 0;
  text-align: left;
}

.section-heading p {
  color: var(--muted);
  line-height: 1.75;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.product-card {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  box-shadow: 0 16px 44px rgba(28, 41, 36, 0.08);
}

.product-image {
  position: relative;
  aspect-ratio: 1 / 0.88;
  display: grid;
  place-items: center;
  background: #fff;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 18px;
}

.product-image b {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 7px 10px;
  color: #fff;
  background: var(--accent);
  border-radius: 4px;
  font-size: 12px;
}

.product-body {
  display: flex;
  min-height: 280px;
  flex-direction: column;
  padding: 20px;
}

.product-body h3 {
  margin-bottom: 12px;
  font-size: 21px;
  line-height: 1.16;
}

.product-body p {
  color: var(--muted);
  line-height: 1.65;
}

.product-buy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: auto;
}

.product-buy strong {
  color: var(--accent);
  font-size: 28px;
}

.product-buy a {
  min-height: 46px;
  padding: 0 14px;
  text-align: center;
}

.editorial {
  color: #fff;
  background: var(--ink);
}

.editorial h2 {
  max-width: 780px;
  color: #fff;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 28px;
}

.guide-grid article {
  padding: 26px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
}

.guide-grid small {
  color: var(--accent);
  font-weight: 950;
}

.guide-grid h3 {
  margin: 12px 0;
  color: #fff;
}

.guide-grid p {
  color: rgba(255, 255, 255, 0.74);
  line-height: 1.7;
}

.blog-layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.88fr) minmax(0, 1.12fr);
  gap: 24px;
  align-items: start;
}

.blog-list {
  display: grid;
  gap: 10px;
  max-height: 720px;
  overflow: auto;
  padding-right: 8px;
}

.blog-list button {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 4px 14px;
  width: 100%;
  padding: 18px;
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.blog-list button.active {
  color: #fff;
  background: var(--ink);
}

.blog-list span {
  grid-row: span 2;
  color: var(--accent);
  font-weight: 950;
}

.blog-list small {
  color: var(--muted);
  line-height: 1.45;
}

.blog-list button.active small {
  color: rgba(255, 255, 255, 0.72);
}

.post-reader {
  position: sticky;
  top: 92px;
  padding: clamp(26px, 4vw, 46px);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  box-shadow: 0 18px 46px rgba(28, 41, 36, 0.08);
}

.post-reader h3 {
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.04;
}

.post-reader p {
  color: #40504b;
  font-size: 19px;
  line-height: 1.85;
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.faq-grid article {
  padding: 26px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.faq-grid p {
  color: var(--muted);
  line-height: 1.65;
}

.contact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding-top: 48px;
  padding-bottom: 48px;
  color: #fff;
  background: var(--accent);
}

.contact h2 {
  margin-bottom: 10px;
  color: #fff;
}

.contact p {
  max-width: 760px;
  margin-bottom: 0;
  color: rgba(255, 255, 255, 0.84);
  font-size: 18px;
}

.contact .button.primary {
  color: var(--accent);
  background: #fff;
  border-color: #fff;
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding-top: 36px;
  padding-bottom: 42px;
  color: rgba(255, 255, 255, 0.76);
  background: #0c1613;
}

.footer strong {
  display: block;
  margin-bottom: 8px;
  color: #fff;
}

.footer p {
  max-width: 620px;
  margin-bottom: 0;
  line-height: 1.65;
}

.footer div:last-child {
  display: flex;
  gap: 18px;
}

.float-wa {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 30;
  display: inline-flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  color: #fff;
  background: #178a55;
  border-radius: 6px;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18);
  font-weight: 950;
}

@media (max-width: 1100px) {
  .header nav {
    display: none;
  }

  .hero,
  .blog-layout {
    grid-template-columns: 1fr;
  }

  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .post-reader {
    position: static;
  }
}

@media (max-width: 760px) {
  .header {
    padding: 12px 16px;
  }

  .brand strong {
    max-width: 170px;
    font-size: 15px;
  }

  .mini-wa {
    display: none;
  }

  .hero {
    padding: 32px 20px 34px;
    gap: 28px;
  }

  .hero-copy,
  .hero-media {
    width: 100%;
    max-width: 100%;
  }

  h1 {
    font-size: 32px;
    line-height: 1.05;
  }

  .lead {
    font-size: 18px;
  }

  .hero-media {
    aspect-ratio: 4 / 3;
  }

  .float-wa {
    right: 12px;
    bottom: 12px;
    width: 56px;
    height: 56px;
    min-height: 56px;
    padding: 0;
    border-radius: 50%;
    font-size: 0;
  }

  .float-wa::after {
    content: "WA";
    font-size: 16px;
  }

  .proof-strip,
  .guide-grid,
  .product-grid,
  .faq-grid {
    grid-template-columns: 1fr;
  }

  .product-body {
    min-height: 0;
  }

  .contact,
  .footer {
    flex-direction: column;
    align-items: flex-start;
  }
}

.envio-calc-section {
  padding: 60px clamp(18px, 4vw, 72px);
  background: #fdfbf7;
  border-bottom: 1px solid var(--line);
}
.calc-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(6, 78, 59, 0.03);
  margin-top: 24px;
}
.calc-inputs {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.input-group label {
  font-weight: 750;
  color: var(--ink);
  font-size: 14px;
}
.input-group select {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: #fdfbf7;
  font-family: inherit;
  font-size: 15px;
  color: var(--ink);
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.input-group select:focus {
  border-color: var(--accent);
}
.months-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.months-grid button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px;
  border: 1px solid var(--line);
  background: #fdfbf7;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.months-grid button:hover {
  background: #fcf8ee;
  border-color: var(--accent);
}
.months-grid button.active {
  background: rgba(19, 122, 69, 0.08);
  border-color: var(--accent);
  color: var(--ink);
}
.months-grid button strong {
  font-size: 15px;
  font-weight: 800;
}
.months-grid button span {
  font-size: 11px;
  color: var(--muted);
  margin-top: 4px;
}
.calc-results {
  display: flex;
  flex-direction: column;
}
.results-card {
  background: #fdfbf7;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.results-card.empty {
  justify-content: center;
  align-items: center;
  color: var(--muted);
  text-align: center;
  border-style: dashed;
  min-height: 250px;
}
.results-card h3 {
  font-size: 16px;
  margin: 0 0 16px 0;
  color: var(--ink);
  font-weight: 800;
  border-bottom: 1px solid var(--line);
  padding-bottom: 10px;
}
.result-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
}
.result-row strong {
  color: var(--ink);
}
.result-row strong.free {
  color: var(--accent);
  font-weight: 850;
}
.result-row.discount {
  color: #c2410c;
  font-weight: 600;
}
.result-divider {
  border-top: 1px solid var(--line);
  margin: 12px 0;
}
.result-row.total {
  font-size: 17px;
  font-weight: 850;
  color: var(--ink);
}
.result-meta {
  background: rgba(19, 122, 69, 0.04);
  border-radius: 6px;
  padding: 10px;
  margin: 16px 0;
  font-size: 12px;
}
.result-meta p {
  margin: 0;
  line-height: 1.5;
}
.result-meta p:first-child {
  margin-bottom: 4px;
}
.promo-badge {
  color: var(--accent);
  font-weight: 750;
}
.button.block {
  width: 100%;
  display: flex;
}

@media (max-width: 760px) {
  .calc-container {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 16px;
  }
  .months-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Sucursales - Tema Botánico */
.sucursal-section {
  padding: 76px clamp(18px, 4vw, 72px);
  background: #fdfbf7;
  border-bottom: 1px solid var(--line);
}
.sucursales-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  margin-top: 32px;
}
@media (max-width: 1024px) {
  .sucursales-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.sucursal-card {
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 28px;
  box-shadow: 0 10px 30px rgba(19, 122, 69, 0.05);
}
.sucursal-card h3 {
  font-size: 22px;
  color: var(--ink);
  margin-top: 0;
  margin-bottom: 14px;
  font-weight: 800;
}
.sucursal-card .address {
  color: var(--muted);
  line-height: 1.6;
  font-size: 15px;
  margin-bottom: 20px;
}
.sucursal-card .detalles-tienda {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  color: var(--accent);
  font-weight: 600;
}
.map-container {
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--line);
  height: 250px;
}

/* Contacto - Tema Botánico */
.contacto-section {
  padding: 76px clamp(18px, 4vw, 72px);
  background: #ffffff;
  border-bottom: 1px solid var(--line);
}
.contacto-container {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;
}
.contacto-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.contacto-info h2 {
  font-size: clamp(30px, 4vw, 42px);
  color: var(--ink);
  margin-bottom: 18px;
}
.contacto-info p {
  color: var(--muted);
  font-size: 16px;
  line-height: 1.7;
  margin-bottom: 32px;
}
.info-detalles {
  display: grid;
  gap: 20px;
}
.info-item {
  border-left: 3px solid var(--accent);
  padding-left: 16px;
}
.info-item strong {
  display: block;
  font-size: 13px;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.info-item span {
  font-size: 16px;
  color: var(--ink);
  font-weight: 600;
}
.contacto-form-card {
  background: #fdfbf7;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 36px;
  box-shadow: 0 16px 44px rgba(19, 122, 69, 0.08);
}
.contacto-form-card h3 {
  font-size: 24px;
  color: var(--ink);
  margin-top: 0;
  margin-bottom: 8px;
  font-weight: 800;
}
.form-sub {
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 24px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.form-group label {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: #ffffff;
  font-family: inherit;
  font-size: 15px;
  color: var(--ink);
  outline: none;
  transition: border-color 0.2s;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--accent);
}
.form-success-alert {
  margin-top: 16px;
  padding: 16px;
  background: rgba(19, 122, 69, 0.08);
  border: 1px solid var(--accent);
  border-radius: 6px;
  color: var(--ink);
  font-size: 14px;
}
.form-success-alert p {
  margin: 0;
}
.form-success-alert p:first-child {
  margin-bottom: 4px;
}

@media (max-width: 760px) {
  .sucursales-grid,
  .contacto-container,
  .form-row {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .contacto-form-card {
    padding: 24px;
  }
}
`;
}

// 2. CSS Kirkland (Premium Dark Mode con Bento Grid y Relieve Técnico)
function cssKirkland() {
  return `:root {
  font-family: 'Outfit', Inter, sans-serif;
  color: #e5e7eb;
  background: #090a0f;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  overflow-x: clip;
}

body {
  margin: 0;
  background: #090a0f;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
  background: none;
  border: none;
}

.site {
  --accent: #dc2626;
  --accent-hover: #b91c1c;
  --ink: #0d0f14;
  --muted: #9ca3af;
  --line: rgba(255, 255, 255, 0.08);
  --paper: #12141c;
  min-height: 100vh;
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px clamp(18px, 4vw, 72px);
  background: rgba(9, 10, 15, 0.88);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(20px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.logo-k {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: linear-gradient(135deg, #dc2626, #991b1b);
  font-weight: 900;
  font-size: 20px;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);
}

.brand strong {
  font-size: 19px;
  color: #fff;
  letter-spacing: -0.5px;
}

.header nav {
  display: flex;
  gap: 24px;
  color: var(--muted);
  font-weight: 600;
}

.header nav a:hover {
  color: #fff;
}

.mini-wa,
.button,
.product-buy a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 700;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-wa,
.button.primary,
.product-buy a {
  color: #fff;
  background: var(--accent);
  box-shadow: 0 4px 18px rgba(220, 38, 38, 0.25);
}

.mini-wa {
  min-height: 42px;
  padding: 0 16px;
}

.button {
  min-height: 48px;
  padding: 0 24px;
  border: 1px solid var(--accent);
}

.button.secondary {
  color: #fff;
  border-color: var(--line);
  background: rgba(255, 255, 255, 0.03);
}

.button:hover,
.mini-wa:hover,
.product-buy a:hover {
  transform: translateY(-2px);
}

.button.primary:hover,
.mini-wa:hover,
.product-buy a:hover {
  background: var(--accent-hover);
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.45);
}

.button.secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

/* HERO */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(24px, 5vw, 72px);
  align-items: center;
  padding: clamp(48px, 8vw, 96px) clamp(18px, 4vw, 72px) 64px;
  background: radial-gradient(circle at 80% 20%, rgba(220, 38, 38, 0.08), transparent 45%);
}

.eyebrow {
  margin-bottom: 12px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

h1 {
  font-size: clamp(38px, 4.8vw, 64px);
  line-height: 1.05;
  color: #fff;
  font-weight: 900;
  margin-bottom: 24px;
  letter-spacing: -1px;
}

.lead {
  font-size: 19px;
  line-height: 1.6;
  color: var(--muted);
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
}

.hero-media {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--line);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
}

.hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-note {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  padding: 16px;
  background: rgba(18, 20, 28, 0.95);
  border: 1px solid var(--line);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.hero-note strong {
  display: block;
  color: #fff;
  font-size: 15px;
}

.hero-note span {
  color: var(--muted);
  font-size: 13px;
}

/* INTERACTIVE BENTO AUTENTICIDAD */
.autenticidad,
.products,
.blog,
.faq {
  padding: 86px clamp(18px, 4vw, 72px);
  border-bottom: 1px solid var(--line);
}

.section-heading {
  max-width: 680px;
  margin: 0 auto 48px;
  text-align: center;
}

.section-heading.align-left {
  text-align: left;
  margin-left: 0;
}

.section-heading h2 {
  font-size: clamp(28px, 4vw, 42px);
  color: #fff;
  font-weight: 850;
  margin-bottom: 16px;
}

.section-heading p {
  color: var(--muted);
  line-height: 1.6;
}

.verify-bento {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 28px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 28px;
}

.verify-nav {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.verify-nav button {
  display: grid;
  grid-template-columns: 40px 1fr;
  align-items: center;
  gap: 16px;
  padding: 18px;
  text-align: left;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 180ms ease;
  color: var(--muted);
}

.verify-nav button:hover {
  background: rgba(255, 255, 255, 0.03);
}

.verify-nav button.active {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.25);
  color: #fff;
}

.verify-nav button span {
  font-weight: 800;
  font-size: 18px;
  color: var(--accent);
}

.verify-nav button strong {
  font-size: 16px;
  color: inherit;
}

.verify-nav button small {
  grid-column: 2;
  font-size: 12px;
  color: var(--muted);
}

.verify-nav button.active small {
  color: rgba(255, 255, 255, 0.6);
}

.verify-details-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 36px;
  background: #12141c;
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.5);
}

.verify-details-card h3 {
  font-size: 26px;
  color: #fff;
  margin-bottom: 18px;
  font-weight: 800;
}

.verify-details-card p {
  color: var(--muted);
  line-height: 1.7;
  font-size: 16px;
  margin-bottom: 24px;
}

.details-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 800;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 6px 12px;
  border-radius: 30px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 24px;
}

/* PRODUCTOS CON FILTROS */
.catalog-tabs {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--line);
  padding: 6px;
  border-radius: 30px;
  margin-top: 16px;
}

.catalog-tabs button {
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  transition: all 160ms ease;
}

.catalog-tabs button.active {
  background: var(--accent);
  color: #fff;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.product-card {
  display: flex;
  flex-direction: column;
  background: #111218;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 200ms ease, border-color 200ms ease;
}

.product-card:hover {
  transform: translateY(-4px);
  border-color: rgba(220, 38, 38, 0.3);
}

.product-image {
  position: relative;
  aspect-ratio: 1/0.88;
  background: #fff;
  display: grid;
  place-items: center;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 16px;
}

.product-image b {
  position: absolute;
  top: 12px;
  left: 12px;
  background: #111218;
  color: #fff;
  border: 1px solid var(--line);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.product-body {
  padding: 22px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.product-body h3 {
  font-size: 19px;
  color: #fff;
  margin-bottom: 10px;
  font-weight: 700;
}

.product-body p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.product-buy {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-buy strong {
  font-size: 24px;
  color: #fff;
  font-weight: 800;
}

.product-buy a {
  padding: 10px 16px;
  font-size: 13px;
}

/* BLOG LAYOUT */
.blog-layout {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 28px;
}

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 540px;
  overflow-y: auto;
  padding-right: 8px;
}

.blog-list button {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 14px;
  padding: 16px;
  background: #111218;
  border: 1px solid var(--line);
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  color: var(--muted);
  transition: all 180ms ease;
}

.blog-list button.active {
  background: #1a1c26;
  border-color: rgba(220, 38, 38, 0.4);
  color: #fff;
}

.blog-list button span {
  font-weight: 800;
  color: var(--accent);
}

.blog-list button strong {
  font-size: 15px;
  margin-bottom: 4px;
}

.blog-list button small {
  grid-column: 2;
  font-size: 12px;
}

.post-reader {
  background: #12141c;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 32px;
  position: sticky;
  top: 96px;
}

.post-reader h3 {
  font-size: 28px;
  color: #fff;
  font-weight: 800;
  margin-bottom: 20px;
}

.post-reader p {
  color: var(--muted);
  line-height: 1.8;
  font-size: 16px;
  margin-bottom: 28px;
}

/* FAQ GRID */
.faq-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.faq-grid article {
  background: #111218;
  border: 1px solid var(--line);
  padding: 24px;
  border-radius: 10px;
}

.faq-grid h3 {
  font-size: 17px;
  color: #fff;
  margin-bottom: 12px;
}

.faq-grid p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

/* CONTACT */
.contact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #181922, #0d0f14);
  border: 1px solid var(--line);
  padding: 48px clamp(18px, 4vw, 72px);
  border-radius: 16px;
  margin: 40px clamp(18px, 4vw, 72px);
}

.contact h2 {
  font-size: 28px;
  color: #fff;
  margin-bottom: 8px;
}

.contact p {
  color: var(--muted);
  font-size: 16px;
  margin-bottom: 0;
}

/* FOOTER */
.footer {
  background: #06070a;
  padding: 48px clamp(18px, 4vw, 72px);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer strong {
  color: #fff;
}

.footer p {
  color: var(--muted);
  max-width: 400px;
  font-size: 13px;
  margin-top: 8px;
}

.footer div:last-child {
  display: flex;
  gap: 20px;
}

.float-wa {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 30;
  display: inline-flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  color: #fff;
  background: #10b981;
  border-radius: 30px;
  box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
  font-weight: 700;
}

@media (max-width: 1024px) {
  .header nav {
    display: none;
  }

  .hero,
  .verify-bento,
  .blog-layout {
    grid-template-columns: 1fr;
  }

  .product-grid,
  .faq-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .post-reader {
    position: static;
  }

  .contact {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
    margin: 20px 18px;
  }
}

@media (max-width: 640px) {
  .product-grid,
  .faq-grid {
    grid-template-columns: 1fr;
  }

  .verify-details-card {
    padding: 20px;
  }

  .footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
}

/* COBERTURA Y TESTIMONIOS */
.cobertura,
.testimonios {
  padding: 86px clamp(18px, 4vw, 72px);
  border-bottom: 1px solid var(--line);
}

.cobertura-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}

.cobertura-card {
  background: #111218;
  border: 1px solid var(--line);
  padding: 32px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  transition: border-color 200ms ease;
}

.cobertura-card:hover {
  border-color: rgba(220, 38, 38, 0.25);
}

.cobertura-card.cdmx {
  border-left: 4px solid var(--accent);
}

.cobertura-card.edomex {
  border-left: 4px solid #b91c1c;
}

.cobertura-card h3 {
  font-size: 22px;
  color: #fff;
  margin-bottom: 20px;
  font-weight: 800;
}

.cobertura-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 18px;
}

.cobertura-list li {
  color: var(--muted);
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cobertura-list li::before {
  content: "✓";
  color: var(--accent);
  font-weight: bold;
}

.cobertura-time {
  margin-top: auto;
  border-top: 1px solid var(--line);
  padding-top: 16px;
  font-size: 14px;
  color: #fff;
  font-weight: 600;
}

.testimonios-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.testimonial-card {
  background: #111218;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  transition: transform 200ms ease;
}

.testimonial-card:hover {
  transform: translateY(-4px);
}

.testimonial-card .stars {
  font-size: 16px;
  margin-bottom: 16px;
  letter-spacing: 2px;
}

.testimonial-card .quote {
  color: #d1d5db;
  font-style: italic;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 24px;
  flex-grow: 1;
}

.testimonial-card .user {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}

.testimonial-card .user strong {
  color: #fff;
  font-size: 15px;
}

.testimonial-card .user span {
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 1024px) {
  .cobertura-grid,
  .testimonios-grid {
    grid-template-columns: 1fr;
  }
}

/* Sucursales - Tema Premium Dark */
.sucursal-section {
  padding: 86px clamp(18px, 4vw, 72px);
  background: #0d0f14;
  border-bottom: 1px solid var(--line);
}
.sucursales-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  margin-top: 32px;
}
@media (max-width: 1024px) {
  .sucursales-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.sucursal-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  transition: border-color 200ms ease;
}
.sucursal-card:hover {
  border-color: rgba(220, 38, 38, 0.3);
}
.sucursal-card h3 {
  font-size: 22px;
  color: #fff;
  margin-top: 0;
  margin-bottom: 14px;
  font-weight: 800;
}
.sucursal-card .address {
  color: var(--muted);
  line-height: 1.6;
  font-size: 15px;
  margin-bottom: 20px;
}
.sucursal-card .detalles-tienda {
  display: block;
  margin-top: 8px;
  font-size: 14px;
  color: var(--accent);
  font-weight: 600;
}
.map-container {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--line);
  height: 250px;
  filter: invert(90%) hue-rotate(180deg);
}

/* Contacto - Tema Premium Dark */
.contacto-section {
  padding: 86px clamp(18px, 4vw, 72px);
  background: #090a0f;
  border-bottom: 1px solid var(--line);
}
.contacto-container {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;
}
.contacto-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.contacto-info h2 {
  font-size: clamp(30px, 4vw, 42px);
  color: #fff;
  margin-bottom: 18px;
  font-weight: 850;
}
.contacto-info p {
  color: var(--muted);
  font-size: 16px;
  line-height: 1.7;
  margin-bottom: 32px;
}
.info-detalles {
  display: grid;
  gap: 20px;
}
.info-item {
  border-left: 3px solid var(--accent);
  padding-left: 16px;
}
.info-item strong {
  display: block;
  font-size: 13px;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.info-item span {
  font-size: 16px;
  color: #fff;
  font-weight: 600;
}
.contacto-form-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 36px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
}
.contacto-form-card h3 {
  font-size: 24px;
  color: #fff;
  margin-top: 0;
  margin-bottom: 8px;
  font-weight: 800;
}
.form-sub {
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 24px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #e5e7eb;
}
.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: #181922;
  font-family: inherit;
  font-size: 15px;
  color: #fff;
  outline: none;
  transition: border-color 0.2s;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--accent);
}
.form-success-alert {
  margin-top: 16px;
  padding: 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
  border-radius: 8px;
  color: #e5e7eb;
  font-size: 14px;
}
.form-success-alert p {
  margin: 0;
}
.form-success-alert p:first-child {
  margin-bottom: 4px;
}

@media (max-width: 760px) {
  .sucursales-grid,
  .contacto-container,
  .form-row {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .contacto-form-card {
    padding: 24px;
  }
}
`;
}

// 3. CSS Neza (Tema Naranja Logístico Exprés, Ámbar y Gris Slate de alta energía - Brutalista Urbano)
function cssNeza() {
  return `:root {
  font-family: 'Outfit', Inter, sans-serif;
  color: #0f172a;
  background: #f1f5f9;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  overflow-x: clip;
}

body {
  margin: 0;
  background: #f1f5f9;
  background-image: radial-gradient(#cbd5e1 1.5px, transparent 1.5px);
  background-size: 24px 24px;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.site {
  --accent: #f97316; /* Naranja enérgico de última milla */
  --accent-hover: #ea580c;
  --ink: #0f172a; /* Slate oscuro */
  --muted: #475569;
  --border-color: #0f172a;
  --border-width: 3px;
  --paper: #ffffff;
  --brutal-shadow: 5px 5px 0px #0f172a;
  --brutal-shadow-hover: 2px 2px 0px #0f172a;
  --brutal-shadow-large: 8px 8px 0px #0f172a;
  min-height: 100vh;
}

.express-bar {
  background: #f59e0b; /* Amarillo de advertencia brutalista */
  color: #0f172a;
  text-align: center;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.5px;
  border-bottom: var(--border-width) solid var(--border-color);
  text-transform: uppercase;
}

.header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px clamp(18px, 4vw, 72px);
  background: #ffffff;
  border-bottom: var(--border-width) solid var(--border-color);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.logo-n {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: var(--border-width) solid var(--border-color);
  border-radius: 4px;
  color: #fff;
  background: var(--accent);
  font-weight: 900;
  font-size: 24px;
  box-shadow: var(--brutal-shadow);
}

.brand strong {
  font-size: 22px;
  color: var(--ink);
  letter-spacing: -0.5px;
  font-weight: 900;
}

.header nav {
  display: flex;
  gap: 24px;
  color: var(--ink);
  font-weight: 800;
}

.header nav a {
  position: relative;
  padding: 4px 0;
}

.header nav a::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 3px;
  background: var(--accent);
  transition: width 150ms ease;
}

.header nav a:hover::after {
  width: 100%;
}

.mini-wa,
.button,
.product-buy a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 800;
  border: var(--border-width) solid var(--border-color);
  box-shadow: var(--brutal-shadow);
  transform: translate(0, 0);
  transition: transform 100ms ease, box-shadow 100ms ease;
}

.mini-wa,
.button.primary,
.product-buy a {
  color: #fff;
  background: var(--accent);
}

.mini-wa {
  min-height: 42px;
  padding: 0 18px;
}

.button {
  min-height: 52px;
  padding: 0 28px;
}

.button.secondary {
  color: var(--ink);
  background: #ffffff;
}

.button:hover,
.mini-wa:hover,
.product-buy a:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-hover);
}

.button:active,
.mini-wa:active,
.product-buy a:active {
  transform: translate(5px, 5px);
  box-shadow: none;
}

.button.primary:hover,
.mini-wa:hover,
.product-buy a:hover {
  background: var(--accent-hover);
}

.button.secondary:hover {
  background: #f1f5f9;
}

/* HERO */
.hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: clamp(24px, 5vw, 72px);
  align-items: center;
  padding: clamp(48px, 8vw, 96px) clamp(18px, 4vw, 72px) 64px;
  border-bottom: var(--border-width) solid var(--border-color);
  background: #ffffff;
  position: relative;
}

.eyebrow {
  display: inline-block;
  margin-bottom: 12px;
  color: var(--ink);
  background: #f59e0b;
  border: 2px solid var(--border-color);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  border-radius: 4px;
  text-transform: uppercase;
}

h1 {
  font-size: clamp(34px, 4.4vw, 54px);
  line-height: 1.05;
  color: var(--ink);
  font-weight: 900;
  margin-bottom: 20px;
  letter-spacing: -1px;
}

.lead {
  font-size: 19px;
  line-height: 1.6;
  color: var(--muted);
  margin-bottom: 30px;
  font-weight: 500;
}

.hero-actions {
  display: flex;
  gap: 16px;
}

.hero-media {
  position: relative;
  aspect-ratio: 16/11;
  overflow: hidden;
  border-radius: 8px;
  border: var(--border-width) solid var(--border-color);
  box-shadow: var(--brutal-shadow-large);
}

.hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-note-express {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  padding: 16px;
  background: var(--ink);
  color: #fff;
  border-radius: 4px;
  border: var(--border-width) solid var(--border-color);
  box-shadow: 4px 4px 0px var(--accent);
}

.hero-note-express strong {
  display: block;
  font-size: 16px;
  color: #fff;
  font-weight: 900;
}

.hero-note-express span {
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 500;
}

/* SECCIONES RÍGIDAS BRUTALISTAS */
.entregas,
.products,
.blog,
.faq {
  padding: 80px clamp(18px, 4vw, 72px);
  border-bottom: var(--border-width) solid var(--border-color);
}

.entregas {
  background: #f1f5f9;
}

.products {
  background: #ffffff;
}

.blog {
  background: #f8fafc;
}

.faq {
  background: #ffffff;
}

.section-heading h2 {
  font-size: clamp(28px, 3.8vw, 42px);
  color: var(--ink);
  font-weight: 900;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.section-heading p {
  font-size: 16px;
  color: var(--muted);
  max-width: 700px;
  margin-bottom: 30px;
  font-weight: 500;
}

.puntos-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 28px;
  background: #ffffff;
  border: var(--border-width) solid var(--border-color);
  border-radius: 8px;
  padding: 28px;
  box-shadow: var(--brutal-shadow-large);
}

.puntos-nav {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.puntos-nav button {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  text-align: left;
  border-radius: 6px;
  border: var(--border-width) solid var(--border-color);
  background: #ffffff;
  box-shadow: var(--brutal-shadow);
  transform: translate(0, 0);
  transition: transform 100ms ease, box-shadow 100ms ease;
  color: var(--ink);
}

.puntos-nav button:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-hover);
  background: #f8fafc;
}

.puntos-nav button.active {
  background: #f59e0b; /* Amarillo vibrante */
  color: var(--ink);
}

.puntos-nav button strong {
  font-size: 16px;
  font-weight: 800;
}

.punto-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.punto-cost-badge {
  background: #22c55e;
  color: #0f172a;
  border: 2px solid var(--border-color);
  font-size: 12px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 4px;
}

.tag-horario {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 800;
  color: var(--ink);
  background: #e2e8f0;
  border: 1.5px solid var(--border-color);
  padding: 3px 8px;
  border-radius: 4px;
}

.punto-info-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 36px;
  background: #ffffff;
  border-radius: 6px;
  border: var(--border-width) solid var(--border-color);
  box-shadow: var(--brutal-shadow);
}

.punto-info-card h3 {
  font-size: 26px;
  color: var(--ink);
  margin-bottom: 16px;
  font-weight: 900;
}

.punto-desc {
  color: var(--muted);
  line-height: 1.6;
  font-size: 16px;
  margin-bottom: 24px;
  font-weight: 500;
}

.punto-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-box {
  border: var(--border-width) solid var(--border-color);
  padding: 16px;
  border-radius: 6px;
  background: #f1f5f9;
}

.stat-label {
  display: block;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 900;
  color: var(--ink);
}

.stat-value.highlight {
  color: #ea580c;
}

.punto-meta {
  margin-bottom: 24px;
  border-top: 2px solid var(--border-color);
  padding-top: 16px;
}

.punto-meta strong {
  display: block;
  font-size: 13px;
  color: var(--ink);
  font-weight: 800;
  text-transform: uppercase;
}

.punto-meta span {
  font-size: 16px;
  color: var(--muted);
  font-weight: 500;
}

.button.block {
  display: flex;
  width: 100%;
}

/* PRODUCTOS CON FILTROS */
.catalog-tabs {
  display: inline-flex;
  gap: 10px;
  background: transparent;
  padding: 0;
  margin-top: 16px;
  width: 100%;
}

.catalog-tabs button {
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
  background: #ffffff;
  border: var(--border-width) solid var(--border-color);
  box-shadow: var(--brutal-shadow);
  transform: translate(0, 0);
  transition: transform 100ms ease, box-shadow 100ms ease;
}

.catalog-tabs button:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-hover);
}

.catalog-tabs button.active {
  background: #f59e0b; /* Amarillo de advertencia */
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-hover);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin-top: 40px;
}

.product-card {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: var(--border-width) solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 100ms ease, box-shadow 100ms ease;
  box-shadow: var(--brutal-shadow);
}

.product-card:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-hover);
}

.product-image {
  position: relative;
  aspect-ratio: 1/0.88;
  background: #fff;
  display: grid;
  place-items: center;
  border-bottom: var(--border-width) solid var(--border-color);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 16px;
}

.product-image b.product-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: var(--ink);
  color: #fff;
  padding: 4px 10px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
}

.stock-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  border: 2px solid var(--border-color);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.stock-badge.immediate {
  background: #22c55e;
  color: #0f172a;
}

.stock-badge.standard {
  background: #e2e8f0;
  color: #0f172a;
}

.product-body {
  padding: 22px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.product-body h3 {
  font-size: 19px;
  color: var(--ink);
  margin-bottom: 10px;
  font-weight: 900;
  letter-spacing: -0.5px;
}

.product-body p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
  font-weight: 500;
}

.product-buy {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-buy strong {
  font-size: 26px;
  color: var(--ink);
  font-weight: 900;
}

.product-buy a {
  padding: 10px 18px;
  font-size: 14px;
}

/* BLOG LAYOUT */
.blog-layout {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 28px;
}

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 540px;
  overflow-y: auto;
  padding-right: 8px;
}

.blog-list button {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: var(--border-width) solid var(--border-color);
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  color: var(--ink);
  box-shadow: var(--brutal-shadow);
  transform: translate(0, 0);
  transition: transform 100ms ease, box-shadow 100ms ease;
}

.blog-list button:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-hover);
  background: #f8fafc;
}

.blog-list button.active {
  background: #f59e0b; /* Amarillo activo */
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-hover);
}

.blog-list button span {
  font-weight: 900;
  color: var(--ink);
  font-size: 18px;
}

.blog-list button strong {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 4px;
  color: var(--ink);
  display: block;
}

.blog-list button small {
  grid-column: 2;
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
}

.post-reader {
  background: #ffffff;
  border: var(--border-width) solid var(--border-color);
  border-radius: 8px;
  padding: 32px;
  position: sticky;
  top: 96px;
  box-shadow: var(--brutal-shadow-large);
}

.post-reader h3 {
  font-size: 28px;
  color: var(--ink);
  font-weight: 900;
  margin-bottom: 20px;
  letter-spacing: -0.5px;
}

.post-reader p {
  color: var(--muted);
  line-height: 1.7;
  font-size: 16px;
  margin-bottom: 28px;
  font-weight: 500;
}

/* FAQ GRID */
.faq-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.faq-grid article {
  background: #ffffff;
  border: var(--border-width) solid var(--border-color);
  padding: 24px;
  border-radius: 8px;
  box-shadow: var(--brutal-shadow);
}

.faq-grid h3 {
  font-size: 18px;
  color: var(--ink);
  margin-bottom: 12px;
  font-weight: 800;
}

.faq-grid p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  font-weight: 500;
}

/* CONTACT BRUTALISTA LLAMATIVO */
.contact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--accent); /* Naranja total */
  border: var(--border-width) solid var(--border-color);
  padding: 48px clamp(18px, 4vw, 72px);
  border-radius: 8px;
  margin: 60px clamp(18px, 4vw, 72px);
  box-shadow: var(--brutal-shadow-large);
  color: #ffffff;
}

.contact h2 {
  font-size: 32px;
  color: #ffffff;
  margin-bottom: 8px;
  font-weight: 900;
  letter-spacing: -0.5px;
  text-shadow: 2px 2px 0px #0f172a;
}

.contact p {
  color: #fff;
  font-size: 18px;
  margin-bottom: 0;
  font-weight: 700;
}

.contact .button {
  background: #ffffff;
  color: var(--ink);
  border: var(--border-width) solid var(--border-color);
  box-shadow: var(--brutal-shadow);
}

.contact .button:hover {
  background: #f1f5f9;
}

/* FOOTER */
.footer {
  background: #0f172a;
  padding: 48px clamp(18px, 4vw, 72px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #94a3b8;
  border-top: var(--border-width) solid var(--border-color);
}

.footer strong {
  color: #fff;
  font-size: 20px;
  font-weight: 900;
}

.footer p {
  color: #94a3b8;
  max-width: 400px;
  font-size: 13px;
  margin-top: 8px;
  font-weight: 500;
}

.footer div:last-child {
  display: flex;
  gap: 20px;
}

.footer div:last-child a:hover {
  color: #fff;
  text-decoration: underline;
  text-decoration-thickness: 2px;
}

.float-wa {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 30;
  display: inline-flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  color: #fff;
  background: #10b981;
  border: var(--border-width) solid var(--border-color);
  border-radius: 6px;
  box-shadow: var(--brutal-shadow);
  font-weight: 800;
  transform: translate(0, 0);
  transition: transform 100ms ease, box-shadow 100ms ease;
}

.float-wa:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-hover);
  background: #059669;
}

@media (max-width: 1024px) {
  .header nav {
    display: none;
  }

  .hero,
  .puntos-grid,
  .blog-layout {
    grid-template-columns: 1fr;
  }

  .product-grid,
  .faq-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .post-reader {
    position: static;
  }

  .contact {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
    margin: 20px 18px;
  }
}

@media (max-width: 640px) {
  .product-grid,
  .faq-grid {
    grid-template-columns: 1fr;
  }

  .punto-info-card {
    padding: 20px;
  }

  .footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
  
  .catalog-tabs {
    flex-direction: column;
    gap: 8px;
  }
}

/* Sucursales - Tema Brutalista */
.sucursal-section {
  padding: 80px clamp(18px, 4vw, 72px);
  background: #ffffff;
  border-bottom: var(--border-width) solid var(--border-color);
}
.sucursales-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  margin-top: 32px;
}
@media (max-width: 1024px) {
  .sucursales-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.sucursal-card {
  background: #ffffff;
  border: var(--border-width) solid var(--border-color);
  border-radius: 6px;
  padding: 28px;
  box-shadow: var(--brutal-shadow);
  transition: transform 100ms ease, box-shadow 100ms ease;
}
.sucursal-card:hover {
  transform: translate(2px, 2px);
  box-shadow: var(--brutal-shadow-hover);
}
.sucursal-card h3 {
  font-size: 22px;
  color: var(--ink);
  margin-top: 0;
  margin-bottom: 14px;
  font-weight: 900;
}
.sucursal-card .address {
  color: var(--muted);
  line-height: 1.6;
  font-size: 15px;
  margin-bottom: 20px;
}
.sucursal-card .detalles-tienda {
  display: inline-block;
  margin-top: 8px;
  font-size: 14px;
  color: var(--accent-hover);
  font-weight: 800;
  background: #ffe5d9;
  border: 1.5px solid var(--border-color);
  padding: 2px 6px;
  border-radius: 4px;
}
.map-container {
  border-radius: 4px;
  overflow: hidden;
  border: var(--border-width) solid var(--border-color);
  height: 250px;
}

/* Contacto - Tema Brutalista */
.contacto-section {
  padding: 80px clamp(18px, 4vw, 72px);
  background: #f8fafc;
  border-bottom: var(--border-width) solid var(--border-color);
}
.contacto-container {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 48px;
  max-width: 1200px;
  margin: 0 auto;
}
.contacto-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.contacto-info h2 {
  font-size: clamp(30px, 4vw, 42px);
  color: var(--ink);
  margin-bottom: 18px;
  font-weight: 900;
}
.contacto-info p {
  color: var(--muted);
  font-size: 16px;
  line-height: 1.7;
  margin-bottom: 32px;
}
.info-detalles {
  display: grid;
  gap: 20px;
}
.info-item {
  border-left: 4px solid var(--accent);
  padding-left: 16px;
}
.info-item strong {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 900;
  margin-bottom: 4px;
}
.info-item span {
  font-size: 18px;
  color: var(--ink);
  font-weight: 900;
}
.contacto-form-card {
  background: #ffffff;
  border: var(--border-width) solid var(--border-color);
  border-radius: 6px;
  padding: 36px;
  box-shadow: var(--brutal-shadow-large);
}
.contacto-form-card h3 {
  font-size: 24px;
  color: var(--ink);
  margin-top: 0;
  margin-bottom: 8px;
  font-weight: 900;
}
.form-sub {
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 24px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.form-group label {
  font-size: 13px;
  font-weight: 800;
  color: var(--ink);
}
.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px;
  border-radius: 4px;
  border: var(--border-width) solid var(--border-color);
  background: #ffffff;
  font-family: inherit;
  font-size: 15px;
  color: var(--ink);
  outline: none;
  transition: background-color 0.2s;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  background-color: #fdf6f0;
}
.form-success-alert {
  margin-top: 16px;
  padding: 16px;
  background: #22c55e;
  border: var(--border-width) solid var(--border-color);
  border-radius: 4px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  box-shadow: var(--brutal-shadow);
}
.form-success-alert p {
  margin: 0;
}
.form-success-alert p:first-child {
  margin-bottom: 4px;
}

@media (max-width: 760px) {
  .sucursales-grid,
  .contacto-container,
  .form-row {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .contacto-form-card {
    padding: 24px;
  }
}
`;
}

function viteConfig() {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
}

function tsconfig() {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: 'ESNext',
        moduleResolution: 'Node',
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
      },
      include: ['src'],
      references: [],
    },
    null,
    2,
  )}\n`;
}

function robots(site) {
  return `User-agent: *
Allow: /

Sitemap: ${site.domain}sitemap.xml
`;
}

function sitemap(site) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.domain}</loc>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

function mainTsx() {
  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;
}

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function writeSite(site) {
  const publicDir = path.join(site.dir, 'public');
  const imagesDir = path.join(publicDir, 'site-images');
  const srcDir = path.join(site.dir, 'src');

  await mkdir(imagesDir, { recursive: true });
  await mkdir(srcDir, { recursive: true });

  // Copiar imágenes del set estático
  for (const image of site.imageSet) {
    try {
      await copyFile(path.join(sourceImages, image), path.join(imagesDir, image));
    } catch (err) {
      console.warn(`Warning: Could not copy static image ${image}: ${err.message}`);
    }
  }

  // Copiar imágenes de los productos asignados a este sitio
  for (const product of site.products) {
    if (product.image && product.image !== 'placeholder.jpg') {
      try {
        await copyFile(path.join(sourceImages, product.image), path.join(imagesDir, product.image));
      } catch (err) {
        // Silencioso, puede ser una imagen que no está en dist/assets/images
      }
    }
  }

  // Bifurcar la generación de App.tsx e index.css según el sitio
  let appCode;
  let cssCode;

  if (site.key === 'kirkland') {
    appCode = appTsxKirkland(site);
    cssCode = cssKirkland();
  } else if (site.key === 'neza') {
    appCode = appTsxNeza(site);
    cssCode = cssNeza();
  } else {
    appCode = appTsx(site);
    cssCode = css();
  }

  await writeFile(path.join(site.dir, 'package.json'), packageJson(site), 'utf8');
  await writeFile(path.join(site.dir, '.gitignore'), 'node_modules/\ndist/\n.env\n.env.local\nnpm-debug.log*\n', 'utf8');
  await writeFile(path.join(site.dir, 'index.html'), indexHtml(site), 'utf8');
  await writeFile(path.join(site.dir, 'vite.config.ts'), viteConfig(), 'utf8');
  await writeFile(path.join(site.dir, 'tsconfig.json'), tsconfig(), 'utf8');
  await writeFile(path.join(srcDir, 'main.tsx'), mainTsx(), 'utf8');
  await writeFile(path.join(srcDir, 'App.tsx'), appCode, 'utf8');
  await writeFile(path.join(srcDir, 'index.css'), cssCode, 'utf8');
  await writeFile(path.join(publicDir, 'robots.txt'), robots(site), 'utf8');
  await writeFile(path.join(publicDir, 'sitemap.xml'), sitemap(site), 'utf8');

  // Redirecciones estáticas físicas para Kirkland para no perder SEO
  if (site.key === 'kirkland') {
    const redirects = [
      { file: 'sucursal.html', target: 'sucursal' },
      { file: 'blog.html', target: 'blog' },
      { file: 'tienda.html', target: 'productos' },
      { file: 'categoria-minoxidil.html', target: 'productos' },
      { file: 'categoria-barba.html', target: 'productos' },
      { file: 'categoria-cabello.html', target: 'productos' },
      { file: 'precio-minoxidil-cdmx.html', target: 'productos' },
      { file: 'donde-comprar-minoxidil-ciudad-mexico.html', target: 'sucursal' }
    ];

    for (const redir of redirects) {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redireccionando...</title>
  <meta http-equiv="refresh" content="0; url=/#${redir.target}">
  <script>window.location.replace("/#${redir.target}");</script>
</head>
<body>
  <p>Redireccionando a la nueva sección...</p>
</body>
</html>`;
      await writeFile(path.join(publicDir, redir.file), htmlContent, 'utf8');
    }
    console.log(`Generated 8 legacy physical HTML redirects for ${site.brand}`);
  }
  await writeFile(
    path.join(site.dir, 'README.md'),
    `# ${site.brand}

Micrositio estatico generado para competir con una intencion SEO distinta.

- Dominio: ${site.domain}
- WhatsApp: ${phone}
- Enfoque: ${site.promise}
- Blog: ${site.posts.length} entradas unicas
- Productos: Catalogo completo integrado (${site.products.length} productos)

## Comandos

\`\`\`bash
npm install
npm run dev
npm run build
npm run preview
\`\`\`
`,
    'utf8',
  );
}

// Bucle de generación principal
for (const site of sites) {
  try {
    await writeSite(site);
    console.log(`Successfully rebuilt ${site.brand}`);
  } catch (err) {
    console.error(`Error building site ${site.brand}: ${err.message}`);
  }
}
