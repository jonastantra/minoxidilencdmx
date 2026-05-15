import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceImages = path.join(root, 'dist', 'assets', 'images');
const otherRoot = path.join(root, '1.Otros Sitios Web');

const phone = '55-6938-0408';
const whatsapp = '525569380408';

const sharedProducts = [
  {
    name: '1 Mes Minoxidil Kirkland Liquido 5%',
    price: '$250',
    image: '1-mes-minoxidil-kirkland-low-1.jpg',
    tag: 'Inicio',
    copy: 'Una botella para empezar sin comprar de mas. Ideal si quieres probar constancia, sensacion en piel y rutina.',
  },
  {
    name: '2 Meses Tratamiento Kirkland 5%',
    price: '$450',
    image: '2-meses.jpg',
    tag: 'Pareja',
    copy: 'Dos botellas para no cortar el ritmo justo cuando apenas estas agarrando disciplina con la aplicacion.',
  },
  {
    name: '3 Meses Minoxidil Kirkland Liquido 5%',
    price: '$600',
    image: '3-meses-1.jpg',
    tag: 'Recomendado',
    copy: 'El paquete mas equilibrado para llevar calendario, fotos y seguimiento sin estar comprando cada mes.',
  },
  {
    name: '6 Meses Minoxidil Kirkland 5%',
    price: '$1,100',
    image: '6-meses.jpg',
    tag: 'Ahorro',
    copy: 'Para quien ya sabe que va en serio. Menos vueltas, mejor precio por botella y rutina completa.',
  },
  {
    name: '12 Meses Minoxidil Kirkland',
    price: '$2,000',
    image: '12-meses.jpg',
    tag: 'Completo',
    copy: 'Tratamiento largo para barba o cabello cuando quieres resolver el abasto del ano de una vez.',
  },
  {
    name: '6 Meses Minoxidil Espuma Kirkland',
    price: '$1,850',
    image: '6-meses-espuma.jpg',
    tag: 'Espuma',
    copy: 'Textura mas practica para quien prefiere secado rapido y una aplicacion menos liquida.',
  },
  {
    name: 'Biotina para cabello y barba',
    price: '$450',
    image: 'biotina-low.jpg',
    tag: 'Apoyo',
    copy: 'Complemento para cuidar la rutina desde adentro. No reemplaza constancia ni buena aplicacion.',
  },
  {
    name: 'Dermaroller 0.5 mm',
    price: '$240',
    image: 'dermaroller.jpg',
    tag: 'Rutina',
    copy: 'Herramienta para usuarios que ya entienden cuidados, higiene y descanso entre usos.',
  },
  {
    name: 'Balsamo para barba',
    price: '$480',
    image: 'balsamo12.jpg',
    tag: 'Barba',
    copy: 'Para peinar, dar forma y bajar resequedad cuando la barba ya empieza a verse mas presente.',
  },
];

const sites = [
  {
    key: 'neza',
    dir: path.join(otherRoot, 'nuevaminoxidil', 'nuevaminoxidil'),
    brand: 'Minoxidil CDMX Neza',
    shortBrand: 'CDMX Neza',
    domain: 'https://www.minoxidilcdmxneza.com/',
    title: 'Minoxidil en CDMX y Neza | Entrega local y sucursal',
    description:
      'Minoxidil Kirkland en CDMX, Plaza Guelatao y zona Neza. Compra por WhatsApp, recoge o pide entrega local con asesoria directa.',
    theme: 'neza',
    accent: '#0f7a5a',
    heroImage: 'diseno-sin-titulo-2.jpg',
    location: 'Plaza Guelatao Local 76 Pasillo 5 y entregas hacia Neza',
    promise: 'Compra local sin vueltas, con fotos reales de producto y atencion directa por WhatsApp.',
    h1: 'Minoxidil en CDMX y Neza, sin perder tiempo buscando',
    subtitle:
      'Si estas por Iztapalapa, Guelatao, Zaragoza o Neza, te atendemos directo: producto visible, precio claro y entrega coordinada.',
    primaryCta: 'Mandar WhatsApp',
    secondaryCta: 'Ver ubicacion',
    sections: [
      ['Entrega local', 'Coordinamos punto, horario y paquete antes de que salgas. Sin prometer magia, solo orden.'],
      ['Sucursal Guelatao', 'Para quien prefiere ver el producto y recoger. Te decimos como llegar sin hacerte dar mil vueltas.'],
      ['Rutina realista', 'Te orientamos con uso responsable, tiempos y cuidados para que no abandones al primer mes.'],
    ],
    products: sharedProducts.slice(0, 8),
    imageSet: ['diseno-sin-titulo-2.jpg', '2-6.jpg', '1-mes-minoxidil-kirkland-low-1.jpg', '3-meses-1.jpg', '6-meses.jpg', '12-meses.jpg', '6-meses-espuma.jpg', 'biotina-low.jpg', 'dermaroller.jpg', 'balsamo12.jpg'],
    posts: [
      post('Donde comprar minoxidil en Neza sin vueltas', 'Neza tiene de todo, pero tambien mucha vuelta innecesaria. Si vas a comprar minoxidil, revisa que el producto sea visible, que te den precio antes de moverte y que puedas resolver dudas por WhatsApp. Yo lo haria asi: pregunta presentacion, meses de tratamiento y forma de entrega. Si te contestan raro o no quieren mandar foto, ahi no es.'),
      post('Plaza Guelatao: como recoger tu tratamiento', 'Cuando vienes a Plaza Guelatao conviene llegar con el pedido ya hablado. Asi no pierdes tiempo buscando local por local. Te confirmamos paquete, horario y precio. Si vienes por primera vez, pregunta por el Local 76 Pasillo 5 y guarda el telefono por si necesitas ubicacion exacta.'),
      post('Minoxidil en Iztapalapa: lo que si revisaria antes de comprar', 'En Iztapalapa hay muchas opciones, pero no todas cuidan el producto. Revisa sellos, caja, lote y que la botella corresponda a lo que estas pagando. Tambien revisa tu rutina: si compras 1 mes y se te olvida diario, no es problema del producto, es problema de orden.'),
      post('Entrega hacia Neza: cuando conviene pedir y cuando recoger', 'Si estas cerca de Zaragoza o Guelatao, recoger puede salir mas rapido. Si estas en Neza y traes el dia lleno, mejor coordinar entrega. Lo importante es no dejarlo para el ultimo minuto, porque el minoxidil funciona con constancia, no con urgencias de domingo en la noche.'),
      post('Liquido o espuma en clima de CDMX', 'El liquido suele rendir bien y es el clasico para barba o cabello. La espuma se siente mas ligera y seca rapido. En dias de calor o si odias sentir la cara humeda, la espuma puede acomodarte mejor. Si no sabes, empieza sencillo: producto correcto, horario fijo y paciencia.'),
      post('Como evitar producto pirata en zona oriente', 'No compres solo porque esta barato. Pide fotos reales, pregunta si es Kirkland 5%, revisa presentacion y no te quedes con respuestas copiadas. El producto pirata casi siempre se nota por prisas, precio raro o vendedor que no sabe explicar nada.'),
      post('Rutina sencilla si trabajas todo el dia', 'No necesitas una rutina de laboratorio. Lava la zona, aplica en horario fijo y toma fotos cada mes con la misma luz. Si un dia fallas, no tires todo; retoma. Lo que mata muchos tratamientos no es el minoxidil, es la desesperacion.'),
      post('Barba dispareja: que esperar los primeros meses', 'Muchos empiezan porque ven huecos en mejillas o bigote. Al principio puede parecer que nada pasa. Luego notas vello delgado, zonas que despiertan y otras que van lentas. No te compares con videos editados: tu cara tiene su ritmo.'),
      post('Cabello en CDMX: polvo, gorra y constancia', 'La ciudad ensucia rapido y uno se toca el cabello sin darse cuenta. Si usas minoxidil en cuero cabelludo, cuida higiene, no lo mezcles con mil productos y deja secar. Gorra si, pero no encima del producto recien aplicado.'),
      post('Comprar 1 mes o 3 meses: mi recomendacion honesta', 'Un mes sirve para probar. Tres meses sirve para evaluar mejor. Si eres de los que abandona rapido, compra uno y demuestra constancia. Si ya vienes decidido, tres meses evita quedarte sin producto justo cuando ya agarraste ritmo.'),
      post('Fotos de avance: como tomarlas bien', 'Misma luz, mismo angulo, misma distancia. No sirve tomarte una foto en bano oscuro y otra junto a ventana porque te vas a enganar solo. Hazlo cada 30 dias. Asi ves progreso real y no dependes del humor del espejo.'),
      post('Errores comunes al usar minoxidil en barba', 'Aplicar de mas, no dejar secar, cambiar de marca cada semana y desesperarse al mes. Con barba menos drama y mas calendario. Si te irrita, revisa cantidad, frecuencia y piel. Si hay reaccion fuerte, consulta a un profesional.'),
      post('Por que no prometemos milagros', 'Porque seria irresponsable. El minoxidil puede ayudar en muchos casos, pero cada persona responde diferente. Lo correcto es vender producto real, explicar rutina y hablar claro de tiempos. Prefiero que compres sabiendo a que vas.'),
      post('Paquetes para estudiantes y gente que se mueve en metro', 'Si te mueves entre metro, escuela y trabajo, el paquete de 3 meses suele ser practico. No ocupa mucho, no te deja sin producto pronto y puedes recoger en zona accesible. Lo importante es que tu rutina quepa en tu dia real.'),
      post('Cuando escribir por WhatsApp antes de venir', 'Siempre. Te ahorra vuelta, te confirma disponibilidad y deja el precio claro. Manda mensaje con el paquete que quieres, si es barba o cabello y la zona donde estas. Asi te damos una respuesta util, no un texto automatico.'),
    ],
    faq: [
      ['¿Tienen sucursal fisica?', 'Si, atendemos por Plaza Guelatao y coordinamos entregas hacia CDMX y Neza.'],
      ['¿Puedo comprar por WhatsApp?', 'Si. Te confirmamos precio, presentacion y forma de entrega antes de cerrar.'],
      ['¿El minoxidil garantiza resultados?', 'No prometemos resultados iguales para todos. Te orientamos con uso responsable y expectativas reales.'],
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
      'Compra minoxidil Kirkland para barba y cabello con envio a Mexico. Paquetes de 1, 3, 6 y 12 meses, atencion por WhatsApp.',
    theme: 'mexico',
    accent: '#137a45',
    heroImage: 'diseno-sin-titulo-1.jpg',
    location: 'Envios a todo Mexico desde CDMX',
    promise: 'Paquetes claros, envio rastreable y asesoria practica antes de comprar.',
    h1: 'Minoxidil para todo Mexico, con pedido claro desde WhatsApp',
    subtitle:
      'Arma tu tratamiento por meses, confirma disponibilidad y recibe indicaciones simples para no comprar a ciegas.',
    primaryCta: 'Cotizar envio',
    secondaryCta: 'Ver paquetes',
    sections: [
      ['Envio nacional', 'Coordinamos paqueteria y datos completos para que sepas que va en camino y que compraste.'],
      ['Paquetes por etapa', '1 mes para probar, 3 para medir, 6 para avanzar con calma y 12 para quien ya trae plan.'],
      ['Compra guiada', 'Te ayudamos a elegir liquido, espuma o complemento sin venderte cosas que no necesitas.'],
    ],
    products: sharedProducts,
    imageSet: ['marcas-de-minoxidil.png', 'diseno-sin-titulo-1.jpg', '1-mes-minoxidil-kirkland-low-1.jpg', '2-meses.jpg', '3-meses-1.jpg', '6-meses.jpg', '12-meses.jpg', '6-meses-espuma.jpg', 'biotina-low.jpg', 'dermaroller.jpg', 'balsamo12.jpg'],
    posts: [
      post('Minoxidil con envio a todo Mexico: como comprar sin enredarte', 'La compra debe ser simple: eliges paquete, mandas datos, confirmas total y recibes guia. Si una tienda te da mil rodeos o no te enseña producto, mejor pausa. En tratamientos largos, la confianza vale mas que ahorrar unos pesos.'),
      post('Que paquete conviene si vives fuera de CDMX', 'Si estas lejos, 3 o 6 meses suele ser mas practico que pedir de uno en uno. Pagas menos envios y no cortas la rutina. Un mes solo lo recomiendo si de verdad quieres probar sensacion y disciplina antes de invertir mas.'),
      post('Minoxidil liquido vs espuma para envios nacionales', 'El liquido es el mas pedido por precio y rendimiento. La espuma se acomoda a quien quiere secado rapido. Para envio, ambos se pueden mandar; la decision depende mas de tu piel, rutina y presupuesto que de la ciudad donde vivas.'),
      post('Como revisar tu pedido cuando llega', 'Abre el paquete con calma, revisa caja, botellas, cantidad y presentacion. Guarda foto por si necesitas aclaracion. No tires etiquetas ni empaque el primer dia. Comprar bien tambien es revisar bien cuando recibes.'),
      post('Envios a estados: lo que debes tener listo', 'Ten nombre completo, calle, colonia, CP, municipio, estado y referencias. Suena basico, pero muchos retrasos salen de datos incompletos. Si quieres que llegue rapido, empieza por mandar direccion completa desde el primer mensaje.'),
      post('Barba o cabello: como elegir producto inicial', 'Para barba casi todos empiezan con liquido 5%. Para cabello depende de zona, sensibilidad y rutina. No necesitas comprar todos los complementos el primer dia. Primero entiende aplicacion, horarios y constancia.'),
      post('Por que no copiamos descripciones eternas de tienda', 'Porque nadie compra mejor por leer veinte parrafos repetidos. Prefiero explicar lo que importa: presentacion, meses, precio, uso responsable y expectativa. La descripcion debe ayudar, no marearte.'),
      post('Mayoreo de minoxidil: cuando si tiene sentido', 'Mayoreo tiene sentido si ya tienes clientes, barberia o venta constante. Si apenas vas a probar, no compres cajas por emocion. Empieza ordenado, mide demanda y luego sube volumen. Asi no se te queda producto parado.'),
      post('Comprar minoxidil barato: donde suele estar la trampa', 'A veces el precio bajo es oportunidad. A veces es producto raro, caducidad cercana o vendedor que desaparece. Compara precio, presentacion y trato. Si todo se siente demasiado apresurado, no cierres compra.'),
      post('Rutina de 90 dias para no abandonar', 'Dia 1: foto y horario fijo. Dia 30: revisa piel y disciplina, no milagros. Dia 60: ajusta detalles. Dia 90: compara fotos reales. Tres meses no hacen magia, pero si te muestran si vas en serio.'),
      post('Biotina, dermaroller y balsamo: que papel tienen', 'Son complementos, no sustitutos. Biotina apoya rutina general, dermaroller requiere higiene y descanso, balsamo ayuda a peinar y cuidar barba. Compra lo que entiendas, no lo que suena mas llamativo.'),
      post('Como pedir por WhatsApp para que te atiendan rapido', 'Manda ciudad, paquete deseado y si lo quieres para barba o cabello. Con eso se cotiza mejor. Si solo escribes "info", tambien se puede, pero vamos a tardar mas en llegar a lo que realmente necesitas.'),
      post('Fotos reales de producto antes de pagar', 'Pedir foto no es exagerar. Es parte de comprar bien. Una tienda seria puede mostrar producto, presentacion y disponibilidad. No necesitas desconfiar de todo, pero tampoco compres a ciegas.'),
      post('Errores al recibir tratamiento de varios meses', 'Guardar en calor, perder la caja, prestar botellas, cambiar horarios cada dia. Si compras 6 o 12 meses, tratalo como tratamiento: lugar fijo, calendario y orden. Lo aburrido funciona mas que la emocion.'),
      post('La constancia pesa mas que la ciudad donde vives', 'Da igual si estas en Monterrey, Puebla, Merida o Tijuana: si no eres constante, no avanzas. El envio resuelve tener producto. La rutina la resuelves tu, con horarios realistas y menos desesperacion.'),
    ],
    faq: [
      ['¿Envían a todo México?', 'Si, cotizamos envio nacional por WhatsApp segun ciudad y paquete.'],
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
    title: 'Kirkland Minoxidil Mexico | Producto original para barba y cabello',
    description:
      'Minoxidil Kirkland 5% en Mexico. Paquetes liquido y espuma, guia para revisar producto, compra por WhatsApp.',
    theme: 'kirkland',
    accent: '#c62828',
    heroImage: '1-mes-minoxidil-kirkland-low-1.jpg',
    location: 'Kirkland 5% para Mexico',
    promise: 'Sitio enfocado en Kirkland: presentaciones, diferencias, paquetes y compra responsable.',
    h1: 'Minoxidil Kirkland 5% sin imagenes raras ni promesas infladas',
    subtitle:
      'Aqui el foco es el producto: liquido, espuma, paquetes por meses y detalles para comprar con mas criterio.',
    primaryCta: 'Pedir Kirkland',
    secondaryCta: 'Comparar paquetes',
    sections: [
      ['Kirkland 5%', 'Presentaciones conocidas, fotos claras y explicacion simple de cada paquete.'],
      ['Originalidad', 'Te decimos que revisar: caja, botella, lote, empaque y coherencia del vendedor.'],
      ['Sin humo', 'El producto ayuda segun cada caso. La constancia y las expectativas reales importan mucho.'],
    ],
    products: sharedProducts.filter((product) => product.name.includes('Kirkland') || product.name.includes('Espuma')),
    imageSet: ['1-mes-minoxidil-kirkland-low-1.jpg', '2-meses.jpg', '3-meses-1.jpg', '6-meses.jpg', '12-meses.jpg', '6-meses-espuma.jpg', 'diseno-sin-titulo-1.jpg', 'minoxidil5.jpg', 'minoxidil10-md.jpg'],
    posts: [
      post('Minoxidil Kirkland original: que revisar primero', 'Empieza por lo visible: caja, botella, etiqueta, lote y coherencia de la presentacion. No necesitas ser experto, pero si poner atencion. Si el vendedor no puede explicar que vende, ahi ya tienes una respuesta.'),
      post('Kirkland liquido 5%: para quien conviene', 'El liquido es el clasico porque rinde bien y suele tener mejor precio. Conviene a quien no se complica con aplicacion y puede dejar secar. Si odias sensacion liquida, tal vez la espuma te acomode mejor.'),
      post('Kirkland espuma: cuando vale pagar mas', 'La espuma suele gustar por secado y textura. No es magia ni necesariamente "mas fuerte". Vale la pena si tu rutina necesita algo mas comodo o si el liquido te molesta demasiado en la piel.'),
      post('1, 3, 6 o 12 meses: como pensar el paquete', 'Un mes prueba disciplina. Tres meses ya permiten revisar avance con mas sentido. Seis meses bajan vueltas. Doce meses son para quien ya sabe que no va a abandonar. Elige por constancia, no por impulso.'),
      post('Por que Kirkland se busca tanto en Mexico', 'Porque es una marca conocida, facil de identificar y con presentaciones populares. Justo por eso tambien se presta a copias y vendedores improvisados. Comprar Kirkland exige revisar mas, no menos.'),
      post('Barba con Kirkland: expectativas aterrizadas', 'En barba hay zonas que responden rapido y otras que tardan. Mejillas, bigote y conectores no siempre avanzan igual. Si llevas dos semanas y ya quieres dictamen final, te estas adelantando demasiado.'),
      post('Cabello con Kirkland: no mezcles todo al mismo tiempo', 'Cuando empiezas con cuero cabelludo, evita meter shampoos, aceites, suplementos y cambios diarios al mismo tiempo. Si algo irrita, no sabras que fue. Ve simple, observa y ajusta con calma.'),
      post('Como guardar botellas de Kirkland', 'Lugar fresco, seco y fuera de sol directo. Parece detalle menor, pero si compras paquete grande no quieres tenerlo rodando en la mochila o junto a calor. Orden tambien es parte del tratamiento.'),
      post('Diferencias entre caja de 6 meses y botellas sueltas', 'La caja ayuda a mantener presentacion y control. Botellas sueltas pueden estar bien si el vendedor es claro, pero revisa que todo coincida. Si compras varias, pide que te expliquen exactamente que recibes.'),
      post('Kirkland para bigote: paciencia con esa zona', 'El bigote puede desesperar porque se nota mucho cuando esta disparejo. Aplica con cuidado, no satures labios y toma fotos. No confundas ardor o resequedad con progreso: la piel tambien cuenta.'),
      post('Producto barato vs producto confiable', 'No todo lo barato es malo, pero lo demasiado barato debe hacerte revisar. En Kirkland hay mucha demanda y eso abre puerta a copias. Compra donde te contesten, te muestren y no te presionen.'),
      post('Senales de que debes pausar y revisar', 'Irritacion fuerte, descamacion intensa o molestia fuera de lo normal. No fuerces por orgullo. Baja la velocidad, revisa cantidad y consulta si hace falta. Ningun tratamiento vale descuidar la piel.'),
      post('Kirkland y dermaroller: no lo hagas a lo loco', 'Dermaroller no es juguete. Requiere limpieza, medida correcta y descanso. Si apenas empiezas con minoxidil, primero domina aplicacion. Meter todo junto suele traer irritacion y cero claridad.'),
      post('Como comprar Kirkland por WhatsApp', 'Escribe paquete, presentacion y ciudad. Pregunta precio, disponibilidad y entrega. Una compra seria no necesita presionarte. Si tienes dudas, mejor resolverlas antes de pagar que despues de recibir.'),
      post('La rutina simple que mas recomiendo', 'Horario fijo, cantidad moderada, dejar secar y fotos mensuales. Nada espectacular. Pero muchas veces eso gana sobre rutinas enormes que duran cuatro dias. Kirkland no reemplaza disciplina; la necesita.'),
    ],
    faq: [
      ['¿Solo venden Kirkland?', 'Este sitio esta enfocado en Kirkland 5%, liquido y espuma, aunque podemos orientar sobre complementos.'],
      ['¿Como reviso si es original?', 'Pide fotos claras, revisa caja, botella, lote y coherencia de presentacion antes de comprar.'],
      ['¿Liquido o espuma?', 'Liquido por precio y rendimiento; espuma por comodidad y secado. Depende de tu rutina.'],
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

  return `<!doctype html>
<html lang="es-MX">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(site.title)}</title>
    <meta name="description" content="${escapeHtml(site.description)}" />
    <link rel="canonical" href="${site.domain}" />
    <meta property="og:title" content="${escapeHtml(site.title)}" />
    <meta property="og:description" content="${escapeHtml(site.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${site.domain}" />
    <meta property="og:image" content="${site.domain}site-images/${site.heroImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

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
  const selected = SITE.posts[activePost];
  const productGroups = useMemo(() => SITE.products.slice(0, 6), []);

  return (
    <main className={\`site theme-\${SITE.theme}\`}>
      <Header />
      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">{SITE.location}</p>
          <h1>{SITE.h1}</h1>
          <p className="lead">{SITE.subtitle}</p>
          <div className="hero-actions">
            <a className="button primary" href={WHATSAPP}>{SITE.primaryCta}</a>
            <a className="button secondary" href="#productos">{SITE.secondaryCta}</a>
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

      <section className="proof-strip" aria-label="Ventajas">
        {SITE.sections.map(([title, copy]) => (
          <article key={title}>
            <span />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="products" id="productos">
        <div className="section-heading">
          <p className="eyebrow">Productos</p>
          <h2>Paquetes que se entienden en diez segundos</h2>
          <p>No meti descripciones eternas: precio, meses, foto real y para que tipo de compra sirve.</p>
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

      <section className="blog" id="blog">
        <div className="section-heading align-left">
          <p className="eyebrow">Blog</p>
          <h2>15 entradas propias para posicionar sin sonar a texto automatico</h2>
          <p>Cada sitio habla desde una intencion distinta: local, nacional o Kirkland. La idea es que no sean copias peleando por la misma frase.</p>
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

      <section className="contact" id="contacto">
        <div>
          <p className="eyebrow">Contacto</p>
          <h2>Escribenos y armamos tu pedido</h2>
          <p>Telefono y WhatsApp: ${phone}. Manda ciudad, paquete deseado y si lo quieres para barba o cabello.</p>
        </div>
        <a className="button primary" href={WHATSAPP}>Abrir WhatsApp</a>
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
        <a href="#productos">Productos</a>
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
        <a href="#blog">Blog</a>
        <a href="#contacto">Contacto</a>
      </div>
    </footer>
  );
}

export default App;
`;
}

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
  --accent: #0f7a5a;
  --ink: #14221f;
  --muted: #5b6a66;
  --line: rgba(20, 34, 31, 0.14);
  --paper: #fffdf7;
  min-height: 100vh;
  overflow-x: clip;
}

.theme-mexico {
  --accent: #137a45;
  --ink: #13241a;
  --paper: #fffdf2;
}

.theme-kirkland {
  --accent: #c62828;
  --ink: #171717;
  --paper: #fffdfa;
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
  background: rgba(255, 253, 247, 0.92);
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
    linear-gradient(120deg, rgba(255, 253, 247, 0.98), rgba(246, 247, 242, 0.78)),
    radial-gradient(circle at 82% 18%, rgba(15, 122, 90, 0.12), transparent 32%);
}

.theme-kirkland .hero {
  background:
    linear-gradient(120deg, rgba(255, 253, 247, 0.98), rgba(248, 246, 242, 0.82)),
    radial-gradient(circle at 78% 12%, rgba(198, 40, 40, 0.1), transparent 34%);
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

.theme-mexico .hero-media img,
.theme-kirkland .hero-media img {
  object-fit: cover;
  padding: 0;
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
  min-height: 300px;
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
  .header {
    align-items: flex-start;
  }

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

  .brand {
    min-width: 0;
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
    max-width: 350px;
  }

  h1 {
    max-width: 350px;
    font-size: 25px;
    line-height: 1.02;
    text-wrap: balance;
  }

  .lead {
    max-width: 350px;
    font-size: 16px;
    line-height: 1.58;
  }

  .hero-media,
  .hero-media img {
    min-height: 0;
    aspect-ratio: 4 / 3;
  }

  .hero-note {
    right: 10px;
    bottom: 10px;
    left: 10px;
    padding: 14px;
  }

  .float-wa {
    right: 12px;
    bottom: 12px;
    width: 54px;
    height: 54px;
    min-height: 54px;
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

  .footer div:last-child {
    flex-wrap: wrap;
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

  for (const image of site.imageSet) {
    await copyFile(path.join(sourceImages, image), path.join(imagesDir, image));
  }

  await writeFile(path.join(site.dir, 'package.json'), packageJson(site), 'utf8');
  await writeFile(path.join(site.dir, '.gitignore'), 'node_modules/\ndist/\n.env\n.env.local\nnpm-debug.log*\n', 'utf8');
  await writeFile(path.join(site.dir, 'index.html'), indexHtml(site), 'utf8');
  await writeFile(path.join(site.dir, 'vite.config.ts'), viteConfig(), 'utf8');
  await writeFile(path.join(site.dir, 'tsconfig.json'), tsconfig(), 'utf8');
  await writeFile(path.join(srcDir, 'main.tsx'), mainTsx(), 'utf8');
  await writeFile(path.join(srcDir, 'App.tsx'), appTsx(site), 'utf8');
  await writeFile(path.join(srcDir, 'index.css'), css(), 'utf8');
  await writeFile(path.join(publicDir, 'robots.txt'), robots(site), 'utf8');
  await writeFile(path.join(publicDir, 'sitemap.xml'), sitemap(site), 'utf8');
  await writeFile(
    path.join(site.dir, 'README.md'),
    `# ${site.brand}

Micrositio estatico generado para competir con una intencion SEO distinta.

- Dominio: ${site.domain}
- WhatsApp: ${phone}
- Enfoque: ${site.promise}
- Blog: ${site.posts.length} entradas unicas

## Comandos

\`\`\`bash
npm install
npm run build
npm run preview
\`\`\`
`,
    'utf8',
  );
}

for (const site of sites) {
  await writeSite(site);
  console.log(`Rebuilt ${site.brand}`);
}
