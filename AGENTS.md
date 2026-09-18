# AGENTS.md

Instrucciones para agentes humanos o IA que trabajen en este repositorio.

## Proposito

Este repo genera el sitio estatico de `minoxidilencdmx.com`. Es una migracion desde WordPress/WooCommerce hacia HTML estatico para conservar SEO y facilitar mantenimiento con IA.

El sitio es un catalogo comercial. La conversion principal es WhatsApp, no checkout.

## Archivos Fuente

- `content/site-data.json`: fuente de productos, posts, paginas, categorias, datos de contacto e imagenes.
- `scripts/build.mjs`: templates HTML, CSS, JS, redirects, sitemap y schema.
- `public/assets/images/`: imagenes reales del sitio.

No editar `dist/` a mano.

## Estado del contenido (leer antes de tocar nada)

- Las 293 entradas antiguas del blog fueron retiradas por ser contenido de baja calidad generado con IA. Solo sobreviven como redirecciones 301. NO restaurarlas, NO regenerarlas, NO meterlas al sitemap.
- El contenido editorial vigente son las 10 guias de `content/editorial-guides.mjs`.
- Solo 7 categorias son indexables (`INDEXABLE_CATEGORY_SLUGS` en `scripts/build.mjs`).
- Marca unica del negocio: "Minoxidil en CDMX".
- Los precios viven en `content/site-data.json`. No escribir precios a mano en templates.
- Despliegue solo en Vercel. No reactivar GitHub Pages.

## Reglas Criticas

1. Mantener URLs existentes.
2. Si se elimina o cambia una ruta, agregar redirect 301.
3. Correr `npm run build` despues de cambios.
4. Correr `npm run audit:urls`; el resultado debe ser `Missing: 0`.
5. Mantener un solo header/menu/fuente/sistema visual en todo el sitio.
6. No tocar los micrositios de `1.Otros Sitios Web/` salvo que el usuario lo pida explicitamente.
7. No meter dependencias pesadas si HTML/CSS/JS simple resuelve el cambio.

## Tono Editorial

El contenido debe sonar como asesor practico de tienda:

- Claro.
- Directo.
- Local a CDMX/Mexico.
- Sin promesas milagro.
- Sin exageraciones medicas.
- Con recomendaciones responsables de uso.
- Sin afirmar resultados "comprobados", "permanentes" o "garantizados".

Evita texto generico tipo landing page de IA.

## Checklist Antes de Commit

```bash
npm run build
npm run audit:urls
```

Revisar al menos:

- `/`
- `/shop/`
- `/blog/`
- `/contact/`
- Una pagina de producto.
- Una categoria de producto.

Confirmar:

- Header y menu iguales.
- Sin texto blanco sobre fondo claro.
- Sin overflow horizontal en movil.
- Botones de WhatsApp funcionando.
- `Missing: 0`.
