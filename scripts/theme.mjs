// Diseño "mostrador": identidad visual de la tienda de Plaza Guelatao.
// Índigo del neón del local, amarillo de etiqueta de precio, verde solo para WhatsApp.

export const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap">`;

export const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Plaza+Guelatao+Calzada+Ignacio+Zaragoza+406+Iztapalapa";

export function mobileBar(waHref) {
  return `<nav class="m-bar" aria-label="Acciones rápidas">
    <a class="m-bar-wa" href="${waHref}">Pedir por WhatsApp</a>
    <a class="m-bar-map" href="${MAPS_URL}">Cómo llegar</a>
  </nav>`;
}

export function themedHome(data, h) {
  const { whatsappLink, escapeHtml, productImage, productPrice, mxn } = h;
  const rows = [
    { slug: "minoxidil-1-mes-kirkland-liquido-5-3", name: "1 mes", detail: "1 frasco de 60 ml", fb: 250 },
    { slug: "2-meses-tratamiento-minoxidil-kirkland-liquido-5-2", name: "2 meses", detail: "2 frascos", fb: 450 },
    { slug: "minoxidil-3-meses-kirkland-liquido-5-2", name: "3 meses", detail: "3 frascos", fb: 600 },
    { slug: "minoxidil-6-meses-kirkland-liquido-5-2", name: "6 meses", detail: "Caja sellada de fábrica, 6 frascos y gotero", fb: 1100, best: true },
    { slug: "minoxidil-12-meses-kirkland-liquido-5-2", name: "12 meses", detail: "2 cajas selladas", fb: 2000 },
    { slug: "minoxidil-kirkland-5-foam-espuma-tratamiento-100-importado", name: "Espuma, 1 mes", detail: "Kirkland 5% en espuma", fb: 480 }
  ].map((r) => ({ ...r, price: productPrice(data, r.slug, r.fb) }));

  const board = rows.map((r) => `
          <li class="pb-row${r.best ? " pb-best" : ""}">
            <a href="${whatsappLink(data, `Quiero Minoxidil Kirkland ${r.name} (${mxn(r.price)})`)}">
              <span class="pb-name">${r.name}<small>${r.detail}${r.best ? ", la más pedida" : ""}</small></span>
              <span class="pb-dots" aria-hidden="true"></span>
              <span class="pb-price">${mxn(r.price)}</span>
            </a>
          </li>`).join("");

  const kirklandSlugs = new Set(rows.map((r) => r.slug));
  const others = data.products.filter((p) => !kirklandSlugs.has(p.slug)).slice(0, 10);
  const shelf = others.map((p) => `
        <a class="shelf-item" href="${p.path}">
          <img src="${productImage(p, data)}" alt="${escapeHtml(p.name)}" loading="lazy" width="300" height="300">
          <span class="shelf-name">${escapeHtml(p.name.split("|")[0].trim())}</span>
          <span class="shelf-price">${escapeHtml(p.price || "")}</span>
        </a>`).join("");

  const faqs = [
    ["¿Puedo pasar hoy a la tienda?", "Sí. Abrimos de martes a domingo de 12:00 a 5:00 pm en Plaza Guelatao, local 76, pasillo 5. Mándanos un WhatsApp antes de salir para apartar tu producto."],
    ["¿Cómo sé que es original?", "En tienda revisas la caja sellada, el lote y la caducidad impresos en caja y frascos, y el gotero original antes de pagar."],
    ["¿Entregan en el Metro o en Neza?", "Sí. Acordamos entregas en estaciones del Metro y en Nezahualcóyotl. Escríbenos para quedar en hora y lugar."],
    ["¿Envían a otros estados?", "Sí, por paquetería a todo México. Te confirmamos costo y tiempo para tu código postal por WhatsApp."],
    ["¿Cómo pago?", "En tienda, efectivo o transferencia. Para envíos, transferencia o depósito en OXXO."],
    ["¿En cuánto tiempo se ven resultados?", "Los primeros vellos finos suelen notarse entre el mes 2 y 3 de uso diario. Los cambios más claros se evalúan entre los 6 y 12 meses. Cada persona responde distinto y no hay resultados garantizados."]
  ].map(([q, a]) => `
        <details class="qa"><summary>${q}</summary><p>${a}</p></details>`).join("");

  return `
  <section class="t-hero">
    <div class="wrap t-hero-grid">
      <div class="t-hero-copy">
        <h1>Minoxidil Kirkland original en CDMX</h1>
        <p class="t-lead">Tienda física en Plaza Guelatao, local 76, junto al Metro Guelatao (Línea A). Revisas lote, sello y caducidad antes de pagar.</p>
        <div class="t-actions">
          <a class="t-btn t-btn-wa" href="${whatsappLink(data, "Quiero comprar Minoxidil Kirkland en CDMX")}">Pedir por WhatsApp</a>
          <a class="t-btn t-btn-line" href="#precios">Ver precios</a>
        </div>
        <p class="t-hours">Martes a domingo, 12:00 a 5:00 pm. Entregas en Metro, Neza y envíos a todo México.</p>
      </div>
      <figure class="t-hero-photo">
        <img src="/assets/images/diseno-sin-titulo-2.jpg" alt="Mostrador de la tienda en Plaza Guelatao con cajas de Minoxidil Kirkland" width="800" height="800" fetchpriority="high">
        <figcaption>Nuestro mostrador en Plaza Guelatao</figcaption>
      </figure>
    </div>
  </section>

  <section class="t-prices" id="precios">
    <div class="wrap t-prices-grid">
      <div class="t-prices-head">
        <h2>Precios de hoy</h2>
        <p>Minoxidil Kirkland al 5%. Toca un precio y te llega el pedido armado por WhatsApp.</p>
        <p class="t-small">Precios en pesos. En tienda o con entrega en CDMX.</p>
      </div>
      <ol class="price-board">${board}
      </ol>
    </div>
  </section>

  <section class="t-sec">
    <div class="wrap t-split">
      <figure class="t-photo">
        <img src="/assets/images/diseno-sin-titulo-1.jpg" alt="Cajas de Minoxidil Kirkland selladas en el mostrador" loading="lazy" width="790" height="790">
      </figure>
      <div>
        <h2>Cómo saber si es original</h2>
        <p class="t-lead-sm">En CDMX circulan copias. Esto es lo que revisamos contigo en el mostrador:</p>
        <ul class="checks">
          <li><strong>Lote y caducidad iguales</strong> en la caja y en cada frasco, impresos, no en etiqueta pegada.</li>
          <li><strong>Gotero original</strong> con seguro para niños y marca de 1 ml.</li>
          <li><strong>Líquido transparente o ligeramente ámbar</strong>, con olor a alcohol. Nunca a perfume.</li>
          <li><strong>Caja sellada de fábrica</strong> que abres tú o frente a ti.</li>
        </ul>
        <a class="t-link" href="/guias/minoxidil-kirkland-original-vs-clon/">Guía completa: original vs clon</a>
      </div>
    </div>
  </section>

  <section class="t-sec t-sec-mist">
    <div class="wrap">
      <h2>Qué esperar y cuándo</h2>
      <figure class="t-wide">
        <img src="/assets/images/antes.jpg" alt="Antes y después de barba con uso de minoxidil" loading="lazy" width="1290" height="599">
        <figcaption>Resultado de un cliente. Cada persona responde distinto según genética y constancia.</figcaption>
      </figure>
      <ol class="months">
        <li><span>Meses 1 a 3</span>Aparecen vellos finos y claros. En cabello puede haber una caída temporal al inicio.</li>
        <li><span>Meses 4 a 6</span>El vello se oscurece y engrosa en quienes responden al tratamiento.</li>
        <li><span>Meses 6 a 12</span>Momento de evaluar el resultado. Si suspendes, parte de lo ganado puede perderse.</li>
      </ol>
    </div>
  </section>

  <section class="t-sec">
    <div class="wrap">
      <div class="t-row-head">
        <h2>También en tienda</h2>
        <a class="t-link" href="/shop/">Ver toda la tienda</a>
      </div>
      <div class="shelf">${shelf}
      </div>
    </div>
  </section>

  <section class="t-sec t-visit" id="sucursales">
    <div class="wrap t-split">
      <div>
        <h2>Cómo llegar</h2>
        <address>
          Plaza Guelatao, local 76, pasillo 5<br>
          Calz. Ignacio Zaragoza 406, Juan Escutia<br>
          Iztapalapa, 09100, CDMX
        </address>
        <p>A unos pasos del Metro Guelatao, Línea A.</p>
        <p><strong>Martes a domingo, 12:00 a 5:00 pm.</strong> Lunes cerrado.</p>
        <div class="t-actions">
          <a class="t-btn t-btn-dark" href="${MAPS_URL}">Abrir en Google Maps</a>
          <a class="t-btn t-btn-line" href="${whatsappLink(data, "Quiero pasar a la tienda de Plaza Guelatao")}">Apartar producto</a>
        </div>
      </div>
      <div class="t-map">
        <iframe title="Mapa de Plaza Guelatao" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=Calzada%20Ignacio%20Zaragoza%20406%20Juan%20Escutia%20Iztapalapa%2009100%20Ciudad%20de%20Mexico&amp;output=embed"></iframe>
      </div>
    </div>
  </section>

  <section class="t-sec t-sec-mist">
    <div class="wrap t-narrow">
      <h2>Preguntas frecuentes</h2>${faqs}
    </div>
  </section>

  <section class="t-sec">
    <div class="wrap t-narrow">
      <h2>Guías de uso</h2>
      <ul class="guide-links">
        <li><a href="/guias/como-aplicar-minoxidil/">Cómo aplicar minoxidil</a></li>
        <li><a href="/guias/minoxidil-para-barba/">Minoxidil para barba</a></li>
        <li><a href="/guias/efectos-secundarios-minoxidil/">Efectos secundarios y cuándo suspender</a></li>
        <li><a href="/guias/resultados-minoxidil-shedding/">Resultados y caída inicial (shedding)</a></li>
        <li><a href="/guias/minoxidil-liquido-vs-espuma/">Líquido o espuma</a></li>
        <li><a href="/guias/minoxidil-mujeres/">Minoxidil en mujeres</a></li>
      </ul>
    </div>
  </section>`;
}

export const themeCss = `
/* ===== Tema mostrador ===== */
:root {
  --ink: #1E1838;
  --ink-2: #2B2350;
  --paper: #FFFFFF;
  --mist: #F2F0F7;
  --line: #DEDAEA;
  --muted: #5E5877;
  --price: #FFD33D;
  --wa: #1A9E4B;
  --wa-dark: #147F3C;
  --font: "Archivo", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --brand: var(--ink);
  --brand-hover: var(--ink-2);
  --text-main: var(--ink);
  --text-secondary: #3D3659;
  --text-muted: var(--muted);
  --bg-page: var(--paper);
  --bg-subtle: var(--mist);
  --border: var(--line);
  --font-sans: var(--font);
}
body { font-family: var(--font); font-size: 17px; color: var(--ink); background: var(--paper); }
h1, h2, h3, .detail-title, .article-title { font-family: var(--font); font-stretch: 72%; font-weight: 800; letter-spacing: -0.01em; line-height: 1.02; }
.wrap { width: min(1160px, calc(100% - 2.5rem)); margin: 0 auto; }
:focus-visible { outline: 3px solid var(--price); outline-offset: 2px; }

/* Encabezado */
.top-announcement, .wa-float { display: none !important; }
.site-header { background: var(--paper); border-bottom: 1px solid var(--line); box-shadow: none; top: 0; }
.brand-logo-img { height: 40px; width: auto; }
.nav-menu a { font-weight: 600; font-stretch: 90%; }
.nav-btn { background: var(--wa) !important; color: #fff !important; border-radius: 6px; font-stretch: 90%; }
.nav-btn:hover { background: var(--wa-dark) !important; }

/* Botones */
.t-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin: 1.5rem 0 1rem; }
.t-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 1.4rem; border-radius: 6px; font-weight: 700; font-stretch: 90%; font-size: 1.05rem; border: 2px solid transparent; }
.t-btn-wa { background: var(--wa); color: #fff; }
.t-btn-wa:hover { background: var(--wa-dark); }
.t-btn-dark { background: var(--ink); color: #fff; }
.t-btn-line { border-color: var(--ink); color: var(--ink); background: transparent; }
.t-btn-line:hover { background: var(--mist); }
.t-link { font-weight: 700; color: var(--ink); text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }

/* Hero */
.t-hero { padding: 3rem 0 3.5rem; }
.t-hero-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 3rem; align-items: center; }
.t-hero h1 { font-size: clamp(2.6rem, 6.4vw, 5.2rem); font-stretch: 66%; font-weight: 900; margin: 0 0 1.2rem; max-width: 11ch; }
.t-lead { font-size: 1.2rem; line-height: 1.5; color: var(--text-secondary); max-width: 34ch; margin: 0; }
.t-hours { font-size: .95rem; color: var(--muted); margin: 0; max-width: 40ch; }
.t-hero-photo { margin: 0; }
.t-hero-photo img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 8px; }
.t-hero-photo figcaption, .t-wide figcaption { font-size: .9rem; color: var(--muted); margin-top: .6rem; }

/* Pizarra de precios */
.t-prices { background: var(--ink); color: #fff; padding: 4rem 0; }
.t-prices-grid { display: grid; grid-template-columns: .8fr 1.2fr; gap: 3rem; align-items: start; }
.t-prices h2 { color: #fff; font-size: clamp(2.4rem, 5vw, 3.6rem); font-stretch: 66%; font-weight: 900; margin: 0 0 1rem; }
.t-prices-head p { color: #D9D4EC; margin: 0 0 .8rem; max-width: 32ch; }
.t-small { font-size: .9rem; }
.price-board { list-style: none; margin: 0; padding: 0; }
.pb-row a { display: flex; align-items: baseline; gap: .75rem; padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,.14); color: #fff; }
.pb-row:first-child a { border-top: 1px solid rgba(255,255,255,.14); }
.pb-row a:hover .pb-name, .pb-row a:focus-visible .pb-name { text-decoration: underline; text-underline-offset: 4px; }
.pb-name { font-size: 1.5rem; font-weight: 800; font-stretch: 75%; line-height: 1.1; }
.pb-name small { display: block; font-size: .9rem; font-weight: 400; font-stretch: 100%; color: #C9C3E0; margin-top: .25rem; }
.pb-dots { flex: 1; border-bottom: 2px dotted rgba(255,255,255,.35); transform: translateY(-.35rem); min-width: 1rem; }
.pb-price { font-size: 2rem; font-weight: 900; font-stretch: 70%; color: var(--price); font-variant-numeric: tabular-nums; }
.pb-best .pb-name small { color: var(--price); }

/* Secciones */
.t-sec { padding: 4.5rem 0; }
.t-sec-mist { background: var(--mist); }
.t-sec h2 { font-size: clamp(2rem, 4.2vw, 3rem); margin: 0 0 1rem; }
.t-split { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; align-items: center; }
.t-photo { margin: 0; }
.t-photo img { width: 100%; border-radius: 8px; aspect-ratio: 1 / 1; object-fit: cover; }
.t-lead-sm { color: var(--text-secondary); margin: 0 0 1.2rem; max-width: 46ch; }
.checks { list-style: none; padding: 0; margin: 0 0 1.5rem; }
.checks li { padding: .9rem 0 .9rem 2rem; border-top: 1px solid var(--line); position: relative; max-width: 52ch; }
.checks li::before { content: ""; position: absolute; left: 0; top: 1.15rem; width: 1rem; height: .55rem; border-left: 3px solid var(--wa); border-bottom: 3px solid var(--wa); transform: rotate(-45deg); }
.t-wide { margin: 1.5rem 0 2rem; }
.t-wide img { width: 100%; border-radius: 8px; }
.months { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
.months li { border-top: 3px solid var(--ink); padding-top: .9rem; color: var(--text-secondary); }
.months span { display: block; font-weight: 800; font-stretch: 75%; font-size: 1.35rem; color: var(--ink); margin-bottom: .3rem; }
.t-row-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap; }
.shelf { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(170px, 210px); gap: 1.25rem; overflow-x: auto; padding: .5rem 0 1rem; scroll-snap-type: x mandatory; }
.shelf-item { scroll-snap-align: start; display: flex; flex-direction: column; gap: .35rem; }
.shelf-item img { width: 100%; aspect-ratio: 1 / 1; object-fit: contain; background: var(--mist); border-radius: 8px; padding: .75rem; }
.shelf-name { font-weight: 600; line-height: 1.25; font-size: .95rem; }
.shelf-price { font-weight: 800; font-stretch: 75%; font-size: 1.2rem; }
.t-visit address { font-style: normal; font-size: 1.15rem; line-height: 1.55; margin-bottom: 1rem; }
.t-map iframe { width: 100%; aspect-ratio: 4 / 3; border: 0; border-radius: 8px; background: var(--mist); }
.t-narrow { max-width: 760px; }
.qa { border-bottom: 1px solid var(--line); }
.qa summary { cursor: pointer; padding: 1.1rem 2rem 1.1rem 0; font-weight: 700; font-size: 1.1rem; list-style: none; position: relative; }
.qa summary::-webkit-details-marker { display: none; }
.qa summary::after { content: "+"; position: absolute; right: .25rem; top: .9rem; font-size: 1.5rem; font-weight: 400; }
.qa[open] summary::after { content: "–"; }
.qa p { margin: 0 0 1.2rem; color: var(--text-secondary); max-width: 60ch; }
.guide-links { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 2rem; }
.guide-links li { padding: .55rem 0; break-inside: avoid; }
.guide-links a { font-weight: 600; text-decoration: underline; text-decoration-color: var(--line); text-underline-offset: 4px; }
.guide-links a:hover { text-decoration-color: var(--ink); }

/* Elementos compartidos con el resto del sitio */
.btn { border-radius: 6px; font-stretch: 90%; }
.btn-primary, .btn-wa-sm { background: var(--wa); }
.btn-dark { background: var(--ink); }
.section-tag, .eyebrow-tag, .hero-eyebrow { letter-spacing: .02em; }
.price-val, .detail-price { font-stretch: 75%; font-weight: 900; }
.site-footer { background: var(--ink); }
:root { --dark-slate: var(--ink); }
.page-title-banner, .article-header { background: var(--ink); }
.page-title-banner h1, .article-header h1, .article-title { color: #fff; }
.article-header a { color: #D9D4EC; text-decoration: underline; text-underline-offset: 3px; }
.shop-layout > *, .shop-sidebar, .sidebar-box { min-width: 0; }
.footer-logo-img { filter: none !important; background: #fff; padding: 6px 10px; border-radius: 6px; height: auto; }

/* Barra fija en celular */
.m-bar { display: none; }
@media (max-width: 860px) {
  .t-hero { padding: 1.25rem 0 2.5rem; }
  .t-hero-grid, .t-prices-grid, .t-split { grid-template-columns: 1fr; gap: 1.75rem; }
  .t-hero-photo { order: -1; }
  .t-hero-photo img { aspect-ratio: 4 / 3; }
  .t-hero h1 { font-size: clamp(2.5rem, 12vw, 3.6rem); }
  .t-lead { font-size: 1.08rem; }
  .t-actions .t-btn { flex: 1 1 100%; }
  .t-hero .t-btn-wa { display: none; }
  .t-hero h1 { max-width: none; }
  .t-prices { padding: 3rem 0; }
  .pb-name { font-size: 1.3rem; }
  .pb-price { font-size: 1.7rem; }
  .t-sec { padding: 3.25rem 0; }
  .months { grid-template-columns: 1fr; gap: 1.25rem; }
  .guide-links { columns: 1; }
  .m-bar { display: grid; grid-template-columns: 1.3fr 1fr; gap: .5rem; position: fixed; left: 0; right: 0; bottom: 0; z-index: 200; padding: .6rem .75rem calc(.6rem + env(safe-area-inset-bottom)); background: var(--paper); border-top: 1px solid var(--line); }
  .m-bar a { display: flex; align-items: center; justify-content: center; min-height: 48px; border-radius: 6px; font-weight: 700; font-stretch: 90%; }
  .m-bar-wa { background: var(--wa); color: #fff; }
  .m-bar-map { border: 2px solid var(--ink); color: var(--ink); }
  body { padding-bottom: 76px; }
}
@media (max-width: 900px) {
  .shop-sidebar .sidebar-box { padding: 1rem; }
  .cat-pill-list { flex-direction: row; flex-wrap: nowrap; overflow-x: auto; gap: .5rem; padding-bottom: .4rem; }
  .cat-pill { white-space: nowrap; flex: 0 0 auto; }
  .sidebar-help { display: none; }
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
`;
