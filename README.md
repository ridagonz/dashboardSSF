# Tablero General de Canales Digitales

**Superintendencia del Subsidio Familiar** · Análisis de redes sociales y página web.

Tablero en Next.js para el seguimiento mensual de los canales digitales de la entidad:
vista general consolidada, detalle independiente por red, filtro de fechas y descarga
del reporte en PDF.

---

## Puesta en marcha

```bash
nvm use
npm install
npm run dev
```

Abre <http://localhost:3000>.

El proyecto usa Node.js 22 (consulta `.nvmrc`). Antes de publicar o abrir un pull
request, ejecuta la validación completa:

```bash
npm run check
```

Para publicar:

```bash
npm run build
npm start
```

Es una aplicación estática: no necesita base de datos ni servidor propio. Puede
desplegarse en Vercel, en un contenedor o en cualquier hosting que sirva Node.

### Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel, selecciona **Add New → Project** e importa el repositorio.
3. Conserva el framework detectado (**Next.js**) y los comandos predeterminados.
4. No agregues variables de entorno: esta versión no las necesita.

Vercel ejecutará `npm install` y `npm run build` usando la versión de Node definida
en `package.json`.

---

## Cómo actualizar los datos cada mes

Todo se hace desde el botón **Actualizar datos**, sin tocar código. Los datos quedan
guardados en el navegador de quien los carga (`localStorage`), así que conviene que la
actualización mensual la haga siempre la misma persona o equipo desde el mismo equipo.

### 1. Archivos que se cargan directamente

Arrastra los archivos a la zona de carga. El tablero reconoce solo cuál es cuál y
fusiona lo nuevo con el histórico: reemplaza las fechas y publicaciones que coinciden y
conserva todo lo anterior.

| Red | Dónde se exporta | Archivo |
|---|---|---|
| **X** | Analytics → Cuenta → Exportar | `account_overview_analytics.csv` |
| **X** | Analytics → Contenido → Exportar | `account_analytics_content_*.csv` |
| **Facebook** | Meta Business Suite → Insights → Contenido → Exportar | `*_Contenido_*.csv` |
| **LinkedIn** | Página → Analytics → Contenido → Exportar | `*_content_*.xls` |
| **LinkedIn** | Página → Analytics → Seguidores → Exportar | `*_followers_*.xls` |
| **TikTok** | Analytics → Overview → Descargar | `Overview.csv` |
| **TikTok** | Analytics → Content → Descargar | `Content.csv` |
| **TikTok** | Analytics → Followers → Descargar | `FollowerHistory.csv`, `FollowerActivity.csv`, `FollowerGender.csv`, `FollowerTopTerritories.csv` |

### 2. Datos que se capturan a mano

Dos canales no ofrecen exportación en CSV y se transcriben en las otras pestañas de la
misma ventana:

- **Instagram** → pestaña *Instagram (manual)*. Se toma de Meta Business Suite →
  Instagram → Insights, ajustando el periodo al mes que se reporta.
- **SEO** → pestaña *SEO (manual)*. Se toma del PDF mensual de Semrush, apartados
  *Traffic Analytics* y *Backlinks*.

### 3. Regenerar la carga inicial (opcional)

La carga que trae el tablero de fábrica se genera con un script de Python a partir de
los archivos en `etl/fuentes/`. Solo hace falta si se quiere cambiar el punto de
partida para todos los usuarios en vez de actualizar navegador por navegador:

```bash
pip3 install --target etl/pylibs xlrd
npm run seed
```

Esto reescribe `src/data/seed.json`.

---

## Qué contiene cada pestaña

- **Vista general** — KPI consolidados, impresiones e interacciones por red y mes,
  reparto del alcance, tabla comparativa entre canales, mejor contenido del periodo y
  resumen de la página web.
- **Facebook** — alcance, visualizaciones, espectadores, seguimientos netos,
  rendimiento por formato (Reel / Foto / Enlace) y publicaciones destacadas.
- **Instagram** — métricas del periodo capturadas a mano, desglose de interacciones,
  formatos, origen de las visualizaciones, publicaciones e historias.
- **X** — impresiones, interacciones, altas y bajas de seguidores, tipo de interacción
  y publicaciones destacadas.
- **LinkedIn** — impresiones, clics, demografía de la audiencia (ubicación, sector,
  función laboral, nivel de responsabilidad, tamaño de empresa) y publicaciones.
- **TikTok** — visualizaciones, visitas al perfil, base de seguidores, franjas horarias
  de mayor actividad, género y territorio de la audiencia, y videos destacados.
- **Página web / SEO** — tráfico, canales, países, marca vs. sin marca y backlinks.

---

## Descargar el reporte

El botón **Descargar PDF** ofrece dos opciones:

- **Vista actual** — solo la sección que se está viendo.
- **Reporte completo** — la vista general y las seis secciones en un único documento.

El PDF sale en A4 vertical, con el encabezado institucional, el periodo analizado y
paginación. Respeta el rango de fechas activo.

---

## Advertencias sobre los datos

Cada plataforma define sus métricas de forma distinta. El tablero lo señala en cada
sección, pero conviene tenerlo presente al comparar canales:

- **TikTok** reporta *reproducciones de video* donde las demás reportan *impresiones*.
- **LinkedIn** incluye los clics dentro de las interacciones, por eso su tasa es mucho
  más alta y no es comparable directamente con el resto.
- **X** mide distinto las impresiones de la cuenta (por día) y las de cada publicación
  (acumuladas durante toda su vida); los dos totales no cuadran entre sí.
- **Facebook** atribuye a la fecha de publicación las métricas acumuladas de cada post,
  que es como Meta entrega el archivo. Las historias no vienen en ese export.
- **TikTok** entrega solo los videos de mejor desempeño en el archivo de contenido, no
  la parrilla completa.
- Los comparativos contra el periodo anterior se ocultan cuando ese periodo queda fuera
  de los datos cargados, para no mostrar variaciones irreales.

---

## Estructura

```
etl/
  build_seed.py          Genera la carga inicial desde los export originales
  fuentes/               Archivos fuente de la carga inicial
src/
  app/                   Layout y página del tablero
  components/
    tablero.tsx          Encabezado, pestañas y exportación a PDF
    panel-actualizar.tsx Carga de archivos y formularios manuales
    selector-fechas.tsx  Filtro de fechas
    graficos.tsx         Gráficos (Recharts)
    ui.tsx               Tarjetas, KPI, tablas y avisos
    vistas/              Una vista por canal
  lib/
    almacen.tsx          Estado global y persistencia
    datos.ts             Filtros y agregaciones
    importar.ts          Reconocimiento y normalización de archivos
    pdf.ts               Exportador de PDF
    redes.ts             Metadatos y colores de cada canal
    formato.ts           Formato de números y fechas en es-CO
  data/seed.json         Carga inicial
```
