# Minoxidil en CDMX - sitio estático

Migración ligera desde WordPress/WooCommerce a un sitio estático administrable por archivos.

## Comandos

```bash
npm run scrape
npm run build
npm run dev
```

- `npm run scrape` actualiza `content/site-data.json` y descarga imágenes reales del sitio actual.
- `npm run build` genera el sitio final en `dist/`.
- `npm run dev` sirve `dist/` en `http://localhost:4173`.

## Editar contenido

El contenido principal vive en `content/site-data.json`. Puedes cambiar textos, precios, productos, categorías y publicaciones ahí; después ejecuta `npm run build`.

No se usa base de datos ni WooCommerce. Los botones de compra abren WhatsApp con el producto precargado.
