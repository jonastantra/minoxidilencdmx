# Minoxidil en CDMX

Sitio estatico para `https://minoxidilencdmx.com/`, migrado desde WordPress/WooCommerce para conservar productos, entradas, paginas, imagenes y URLs importantes sin depender de PHP, base de datos ni carrito pesado.

El objetivo del sitio es funcionar como catalogo SEO para vender por WhatsApp, posicionando principalmente:

- Minoxidil en CDMX.
- Minoxidil Kirkland en Mexico.
- Productos para crecimiento de barba.
- Tratamientos para cabello, barba, biotina, dermaroller y cuidado capilar.
- Sucursal Plaza Guelatao, CDMX, con envios a todo Mexico.

## Estado Actual

- 42 productos.
- 293 entradas de blog conservadas.
- 31 categorias de producto.
- 28 paginas internas.
- 252 redirecciones legacy generadas desde URLs de WordPress/WooCommerce.
- Auditoria viva contra sitemap de WordPress: 0 URLs faltantes.

La compra no usa WooCommerce. Los botones llevan a WhatsApp con el producto o consulta precargada.

## Estructura

```text
content/
  site-data.json                 Datos principales del sitio.
  live-url-audit.md              Auditoria de URLs vivas contra WordPress.
  redirect-audit.md              Resumen de redirecciones legacy.
  seo-preservation-report.md     Reporte de preservacion SEO.

public/
  assets/images/                 Imagenes usadas por productos, blog y paginas.

scripts/
  build.mjs                      Genera todo el sitio estatico en dist/.
  serve.mjs                      Servidor local con soporte de redirects/404.
  audit-live-urls.mjs            Compara sitemap vivo contra dist/.
  scrape-wordpress.mjs           Scraper para reconstruir datos desde WordPress.
  editorialize-blog.mjs          Herramienta editorial para posts repetidos.

dist/                            Salida generada para publicar. No editar a mano.
```

## Comandos

```bash
npm run build
npm run dev
npm run audit:urls
```

- `npm run build`: genera `dist/`.
- `npm run dev`: sirve el sitio en `http://localhost:4173/`.
- `npm run audit:urls`: valida que las URLs vivas de WordPress sigan cubiertas por pagina estatica o redirect.

Tambien existen:

```bash
npm run scrape
npm run editorialize
```

Usalos solo si necesitas refrescar contenido desde el WordPress original o volver a procesar entradas.

## Despliegue

El repo incluye GitHub Actions en `.github/workflows/pages.yml`.

Al hacer push a `main`, GitHub Pages ejecuta:

```bash
npm run build
```

y publica la carpeta `dist/`.

## Como Editar

Para cambios normales:

1. Edita `content/site-data.json` si cambia contenido, productos, precios, categorias o posts.
2. Edita `scripts/build.mjs` si cambia estructura, templates, estilos, SEO o redirects.
3. Ejecuta `npm run build`.
4. Ejecuta `npm run audit:urls`.
5. Revisa visualmente en `http://localhost:4173/`.

No edites `dist/` directamente. Todo lo que esta en `dist/` se regenera.

## SEO y URLs

Este proyecto prioriza no perder posicionamiento al salir de WordPress.

Puntos importantes:

- Se conserva la estructura principal de URLs de productos, categorias, paginas y entradas.
- Las URLs viejas de WooCommerce, categorias antiguas y aliases comerciales se redirigen.
- `404.html` incluye busqueda inteligente para mandar al usuario a la pagina mas parecida.
- `sitemap.xml`, `robots.txt`, `_redirects`, `.htaccess` y `vercel.json` se generan automaticamente.
- El HTML incluye schema JSON-LD para `LocalBusiness`, `Store`, `WebSite`, `Product`, `Article`, `ItemList` y breadcrumbs.

Antes de publicar cambios grandes, `npm run audit:urls` debe terminar con:

```text
Missing: 0
```

## Guia Para Agentes IA

Si eres una IA editando este repo:

- Enfocate solo en `minoxidilencdmx.com`; ignora `1.Otros Sitios Web/`.
- No borres productos, posts, paginas, categorias ni imagenes sin justificarlo.
- No cambies slugs ni rutas existentes si no agregas redirect 301 equivalente.
- No edites `dist/` como fuente. Edita `scripts/build.mjs` o `content/site-data.json`.
- Mantener un solo sistema visual: mismo header, menu, fuente, colores y tarjetas en todo el sitio.
- Evitar texto generico de IA. El tono debe sonar practico, directo y local, como asesor de mostrador.
- Mantener WhatsApp como conversion principal.
- Despues de cambios, correr `npm run build` y `npm run audit:urls`.
- Si agregas contenido medico o de uso de minoxidil, evita promesas absolutas; usa expectativas responsables.

## Conversion Principal

WhatsApp:

```text
55 6938 0408
```

Email:

```text
ventasminoxidilmexico@gmail.com
```

Sucursal principal:

```text
Plaza Guelatao Local 76, Pasillo 5
Calz. Ignacio Zaragoza 406, Juan Escutia, Iztapalapa, CDMX
```

## Notas

Los archivos `.sql`, `.csv`, XML de WordPress, capturas y pruebas locales pueden existir en el workspace, pero estan ignorados por Git cuando son pesados o solo sirven como respaldo. El repositorio publicado debe mantenerse ligero y reproducible desde `content/`, `public/` y `scripts/`.
