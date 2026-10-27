# Minoxidil en CDMX · sitio y catálogo local

Dominio principal: https://www.minoxidilencdmx.com/ · Repositorio `jonastantra/minoxidilencdmx`.
Producción: proyecto Vercel `minoxidilencdmx`, rama `main`. HTML estático generado; no es Shopify ni tiene checkout.

## Actualización 27-oct-2026

- Diseño móvil editorial en crema, tinta y dorado; fotos de producto existentes, sin fuentes ni bibliotecas de interfaz remotas.
- Catálogo de 42 productos. Se conservaron precios y URLs; confirmar vigencia y existencia antes de pagar.
- Diez guías con referencias médicas visibles y navegación por secciones; sin pruebas caseras de autenticidad, promesas de eficacia o autores médicos inventados.
- 293 rutas de posts heredados conservan la consolidación temática existente. No se cambian dominios o canónicas entre negocios sin evidencia de equivalencia.
- Datos de contacto consistentes: Plaza Guelatao, Local 76, Pasillo 5, CDMX; martes a sábado, entregas bajo cita. No se inventan horas exactas, coordenadas, stock, caducidad de precios ni envío gratis.

## Desarrollo

```bash
npm ci
npm run build
npm run audit:urls
npm run audit:static
npm run audit:seo
npm run audit:content
npm run dev
```

Servidor local por defecto http://127.0.0.1:4173/; `PORT` permite elegir otro puerto.
`node scripts/check-browser.cjs` ejecuta pruebas de móvil y escritorio con Playwright disponible en el entorno. `BASE_URL` permite verificar producción; `PLAYWRIGHT_MODULE` y `CHROMIUM_PATH` permiten indicar la instalación local. Evidencias en `artifacts/`, excluido de Git.

## Fuentes

- `content/site-data.json`: productos, contacto e importación histórica. Los posts heredados no se publican como artículos nuevos.
- `content/editorial-guides.mjs`: las diez guías activas y sus fuentes por tema.
- `scripts/build.mjs`: plantillas, datos estructurados, robots, mapas y redirecciones; no editar `dist/`.
- `scripts/design-system.mjs`: capa visual compartida.
- `public/assets/images/`: imágenes; Sharp genera derivados WebP al compilar.

Antes de publicar: auditorías sin URLs o imágenes faltantes, comparar precios con la versión anterior y revisar móvil. Tras push, confirmar Vercel READY para el commit exacto y la versión pública `cdmx-20261027-01`. Search Console se verifica por separado: enviar un sitemap no equivale a indexación ni mejora de posición.

Los informes privados de Search Console no se suben al repositorio. El sitio alternativo Minoxidil Todo México no se ha migrado ni eliminado en esta revisión.
