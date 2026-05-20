# Revision de preservacion SEO

Generado: 2026-05-19

## Alcance

Solo se reviso el sitio principal: `https://minoxidilencdmx.com/`.

## Inventario conservado

- Entradas en export XML de WordPress: 293.
- Entradas en el sitio estatico: 293.
- Entradas publicadas encontradas en `wp_posts` del SQL: 155.
- Entradas del SQL faltantes en el sitio estatico: 0.
- Productos en el sitio estatico: 42.
- URLs unicas de producto: 42.
- Categorias de producto: 31.
- Paginas internas: 28.

Nota: el SQL disponible no trae productos publicados como `product` en `wp_posts`; por eso el catalogo se valido contra el scrape del sitio vivo y contra las URLs actuales del sitemap de WordPress.

## Auditoria de URLs vivas

- URLs vivas detectadas en sitemap de WordPress: 368.
- Cubiertas por pagina estatica: 359.
- Cubiertas por redireccion 301: 9.
- Pendientes sin ruta exacta ni redireccion: 0.

La URL viva `/producto/` quedo redirigida a `/shop/`, porque funciona como archivo general de WooCommerce y no conviene dejarla como 404 ni como pagina duplicada.

## Mejoras aplicadas

- Sitemap nuevo con `lastmod`, `changefreq` y `priority`.
- JSON-LD global con `Store`, `LocalBusiness` y `WebSite`.
- Schema `Product` reforzado con oferta, disponibilidad, marca, categoria, vendedor y rating cuando existe.
- Schema `Article` en entradas del blog con fechas, autor, publisher e idioma.
- Schema `ItemList` en tienda, categorias y blog.
- Breadcrumb schema en productos, categorias, tienda, blog y entradas.
- Imagen fallback para producto sin imagen directa, evitando tarjetas y metadatos pobres.

## Riesgo actual

No se detectan URLs vivas perdidas. El principal riesgo SEO pendiente ya no es tecnico de migracion, sino editorial: varias entradas de 2023 y 2024 tienen temas repetidos y conviene seguir puliendolas por intencion de busqueda para CDMX, Estado de Mexico y envios nacionales.
