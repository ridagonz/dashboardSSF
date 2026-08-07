import Papa from "papaparse";
import type { BaseDatos, Publicacion, RedConSerie, SerieDia, VistaId } from "./tipos";

/**
 * Reconoce los export nativos de cada plataforma y los normaliza al modelo
 * del tablero. Es el equivalente en navegador de etl/build_seed.py, para que
 * el equipo pueda actualizar cada mes sin tocar la terminal.
 */

export interface Resultado {
  archivo: string;
  reconocido: boolean;
  red?: VistaId;
  descripcion: string;
  filas: number;
  aplicar?: (bd: BaseDatos) => void;
}

// --------------------------------------------------------------------------
// Utilidades
// --------------------------------------------------------------------------
const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

export function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/[%\s\u00a0]/g, "");
  if (!s || s === "--" || s === "-" || s.toLowerCase() === "n/a") return 0;
  const directo = Number(s);
  if (Number.isFinite(directo)) return directo;

  const milesComa = /^[+-]?[1-9]\d{0,2}(,\d{3})+$/.test(s);
  const milesPunto = /^[+-]?[1-9]\d{0,2}(\.\d{3})+$/.test(s);
  if (milesComa) return Number(s.replace(/,/g, ""));
  if (milesPunto) return Number(s.replace(/\./g, ""));

  const ultimaComa = s.lastIndexOf(",");
  const ultimoPunto = s.lastIndexOf(".");
  const normalizado =
    ultimaComa > ultimoPunto
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

const ent = (v: unknown) => Math.round(num(v));

function iso(a: number, m: number, d: number): string {
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "6 de agosto" -> ISO. Sin año en el origen: se infiere contra la referencia. */
function fechaEs(txt: unknown, ref = new Date()): string | null {
  const m = /^\s*(\d{1,2})\s+de\s+([a-záéíóúA-ZÁÉÍÓÚ]+)/.exec(String(txt ?? ""));
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return null;
  const anio = mes <= ref.getMonth() + 1 ? ref.getFullYear() : ref.getFullYear() - 1;
  return iso(anio, mes, Number(m[1]));
}

/** "Thu, Aug 6, 2026" -> ISO. */
function fechaX(txt: unknown): string | null {
  const m = /^\w{3},\s*(\w{3})\s+(\d{1,2}),\s*(\d{4})$/.exec(String(txt ?? "").trim());
  if (!m) return null;
  const meses = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const mes = meses.indexOf(m[1].toLowerCase()) + 1;
  return mes ? iso(Number(m[3]), mes, Number(m[2])) : null;
}

/** "03/25/2026 08:08" o "08/03/2026" -> ISO (MM/DD/YYYY). */
function fechaUs(txt: unknown): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(txt ?? "").trim());
  return m ? iso(Number(m[3]), Number(m[1]), Number(m[2])) : null;
}

function tieneCols(cols: string[], requeridas: string[]): boolean {
  const set = new Set(cols.map((c) => c.trim().toLowerCase()));
  return requeridas.every((r) => set.has(r.toLowerCase()));
}

/** Inserta o reemplaza dias por fecha, conservando el resto de la serie. */
function fusionarSerie(destino: SerieDia[], nuevos: SerieDia[]): SerieDia[] {
  const mapa = new Map(destino.map((d) => [d.fecha, d]));
  for (const n of nuevos) mapa.set(n.fecha, { ...mapa.get(n.fecha), ...n });
  return [...mapa.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Fusiona por enlace (o fecha+texto si no hay enlace). */
function fusionarPosts(destino: Publicacion[], nuevos: Publicacion[]): Publicacion[] {
  const clave = (p: Publicacion) => p.enlace || `${p.fecha}|${p.texto.slice(0, 60)}`;
  const mapa = new Map(destino.map((p) => [clave(p), p]));
  for (const n of nuevos) mapa.set(clave(n), { ...mapa.get(clave(n)), ...n });
  return [...mapa.values()].sort(
    (a, b) => (b.impresiones ?? b.visualizaciones ?? 0) - (a.impresiones ?? a.visualizaciones ?? 0)
  );
}

function recalcularMix(bd: BaseDatos, red: RedConSerie) {
  const tipos = new Map<string, { publicaciones: number; impresiones: number; interacciones: number }>();
  for (const p of bd.redes[red].posts) {
    const t = p.tipo || "Otro";
    const acc = tipos.get(t) ?? { publicaciones: 0, impresiones: 0, interacciones: 0 };
    acc.publicaciones += 1;
    acc.impresiones += p.impresiones ?? 0;
    acc.interacciones += p.interacciones ?? 0;
    tipos.set(t, acc);
  }
  bd.redes[red].mixContenido = [...tipos.entries()]
    .map(([nombre, v]) => ({ nombre, ...v }))
    .sort((a, b) => b.impresiones - a.impresiones);
}

// --------------------------------------------------------------------------
// Lectura de archivos
// --------------------------------------------------------------------------
type Fila = Record<string, string>;

function leerCsv(texto: string): { cols: string[]; filas: Fila[] } {
  const r = Papa.parse<Fila>(texto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.replace(/^﻿/, "").trim(),
  });
  return { cols: r.meta.fields ?? [], filas: r.data ?? [] };
}

async function leerXls(file: File): Promise<Record<string, unknown[][]>> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const hojas: Record<string, unknown[][]> = {};
  for (const nombre of wb.SheetNames) {
    hojas[nombre] = XLSX.utils.sheet_to_json(wb.Sheets[nombre], {
      header: 1,
      defval: "",
      raw: true,
    }) as unknown[][];
  }
  return hojas;
}

/** Convierte una matriz en objetos usando la fila indicada como encabezado. */
function tabla(filas: unknown[][], filaEncabezado: number): Fila[] {
  if (!filas || filas.length <= filaEncabezado) return [];
  const cols = (filas[filaEncabezado] ?? []).map((c) => String(c ?? "").trim());
  const out: Fila[] = [];
  for (const fila of filas.slice(filaEncabezado + 1)) {
    if (!fila || !fila.some((c) => String(c ?? "").trim())) continue;
    const obj: Fila = {};
    cols.forEach((c, idx) => { obj[c] = String(fila[idx] ?? ""); });
    out.push(obj);
  }
  return out;
}

/** LinkedIn entrega fechas como serial de Excel o como MM/DD/YYYY. */
function fechaExcel(v: unknown): string | null {
  const n = num(v);
  if (n > 20000 && n < 60000) {
    const ms = Math.round((n - 25569) * 86_400_000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  return fechaUs(v);
}

function categorias(filas: unknown[][], etiqueta: string) {
  return tabla(filas, 0)
    .map((r) => ({ nombre: String(r[etiqueta] ?? "").trim(), valor: ent(r["Total de seguidores"]) }))
    .filter((c) => c.nombre)
    .sort((a, b) => b.valor - a.valor);
}

// --------------------------------------------------------------------------
// Reconocedores
// --------------------------------------------------------------------------
function reconocerCsv(nombre: string, cols: string[], filas: Fila[]): Resultado {
  const base = { archivo: nombre, reconocido: true, filas: filas.length };

  // --- X: resumen diario de la cuenta ---
  if (tieneCols(cols, ["Date", "Impresiones", "Nuevos seguidores", "Dejar de seguir"])) {
    const serie: SerieDia[] = [];
    for (const r of filas) {
      const f = fechaX(r["Date"]);
      if (!f) continue;
      serie.push({
        fecha: f,
        impresiones: ent(r["Impresiones"]),
        interacciones: ent(r["Interacciones"]),
        meGusta: ent(r["Me gusta"]),
        comentarios: ent(r["Respuestas"]),
        compartidos: ent(r["Reposts"]),
        guardados: ent(r["Guardados"]),
        seguidoresAltas: ent(r["Nuevos seguidores"]),
        seguidoresBajas: ent(r["Dejar de seguir"]),
        seguidoresNuevos: ent(r["Nuevos seguidores"]) - ent(r["Dejar de seguir"]),
        visitasPerfil: ent(r["Visitas del perfil"]),
        publicaciones: ent(r["Crear post"]),
      });
    }
    return {
      ...base, red: "x", filas: serie.length,
      descripcion: "X · resumen diario de la cuenta",
      aplicar: (bd) => { bd.redes.x.daily = fusionarSerie(bd.redes.x.daily, serie); },
    };
  }

  // --- X: detalle por publicacion ---
  if (tieneCols(cols, ["ID del post", "Texto del post", "Impresiones"])) {
    const posts: Publicacion[] = [];
    for (const r of filas) {
      const f = fechaX(r["Fecha"]);
      if (!f) continue;
      posts.push({
        fecha: f,
        texto: (r["Texto del post"] ?? "").trim(),
        enlace: r["Postear enlace"] ?? "",
        impresiones: ent(r["Impresiones"]),
        interacciones: ent(r["Interacciones"]),
        meGusta: ent(r["Me gusta"]),
        comentarios: ent(r["Respuestas"]),
        compartidos: ent(r["Reposts"]),
        clicsEnlace: ent(r["Clics en URL"]),
      });
    }
    return {
      ...base, red: "x", filas: posts.length,
      descripcion: "X · publicaciones",
      aplicar: (bd) => { bd.redes.x.posts = fusionarPosts(bd.redes.x.posts, posts); },
    };
  }

  // --- Facebook: contenido de Meta Business Suite ---
  if (tieneCols(cols, ["Identificador de la publicación", "Nombre de la página", "Impresiones"])) {
    const posts: Publicacion[] = [];
    for (const r of filas) {
      const f = fechaUs(r["Hora de publicación"]);
      if (!f) continue;
      posts.push({
        fecha: f,
        texto: (r["Título"] ?? "").trim(),
        enlace: r["Enlace permanente"] ?? "",
        tipo: r["Tipo de publicación"] || "Otro",
        impresiones: ent(r["Impresiones"]),
        interacciones: ent(r["Interacciones"]),
        meGusta: ent(r["Reacciones"]),
        comentarios: ent(r["Comentarios"]),
        compartidos: ent(r["Veces que se compartió"]),
        guardados: ent(r["Veces que se guardó"]),
        visualizaciones: ent(r["Visualizaciones"]),
        alcance: ent(r["Espectadores"]),
        seguidoresNuevos: ent(r["Seguimientos netos"]),
      });
    }
    return {
      ...base, red: "facebook", filas: posts.length,
      descripcion: "Facebook · publicaciones",
      aplicar: (bd) => {
        bd.redes.facebook.posts = fusionarPosts(bd.redes.facebook.posts, posts);
        // La serie diaria de Facebook se deriva del detalle por publicacion.
        const agg = new Map<string, SerieDia>();
        for (const p of bd.redes.facebook.posts) {
          const d = agg.get(p.fecha) ?? { fecha: p.fecha };
          d.impresiones = (d.impresiones ?? 0) + (p.impresiones ?? 0);
          d.interacciones = (d.interacciones ?? 0) + (p.interacciones ?? 0);
          d.meGusta = (d.meGusta ?? 0) + (p.meGusta ?? 0);
          d.comentarios = (d.comentarios ?? 0) + (p.comentarios ?? 0);
          d.compartidos = (d.compartidos ?? 0) + (p.compartidos ?? 0);
          d.guardados = (d.guardados ?? 0) + (p.guardados ?? 0);
          d.visualizaciones = (d.visualizaciones ?? 0) + (p.visualizaciones ?? 0);
          d.alcance = (d.alcance ?? 0) + (p.alcance ?? 0);
          d.seguidoresNuevos =
            (d.seguidoresNuevos ?? 0) + (p.seguidoresNuevos ?? 0);
          d.publicaciones = (d.publicaciones ?? 0) + 1;
          agg.set(p.fecha, d);
        }
        bd.redes.facebook.daily = [...agg.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
        recalcularMix(bd, "facebook");
      },
    };
  }

  // --- TikTok: resumen diario ---
  if (tieneCols(cols, ["Date", "Video Views", "Profile Views", "Likes"])) {
    const serie: SerieDia[] = [];
    for (const r of filas) {
      const f = fechaEs(r["Date"]);
      if (!f) continue;
      const meGusta = ent(r["Likes"]);
      const comentarios = ent(r["Comments"]);
      const compartidos = ent(r["Shares"]);
      serie.push({
        fecha: f,
        visualizaciones: ent(r["Video Views"]),
        impresiones: ent(r["Video Views"]),
        visitasPerfil: ent(r["Profile Views"]),
        meGusta, comentarios, compartidos,
        interacciones: meGusta + comentarios + compartidos,
      });
    }
    return {
      ...base, red: "tiktok", filas: serie.length,
      descripcion: "TikTok · resumen diario",
      aplicar: (bd) => { bd.redes.tiktok.daily = fusionarSerie(bd.redes.tiktok.daily, serie); },
    };
  }

  // --- TikTok: videos ---
  if (tieneCols(cols, ["Video title", "Video link", "Total views"])) {
    const posts: Publicacion[] = [];
    for (const r of filas) {
      const f = fechaEs(r["Post time"]);
      if (!f) continue;
      const meGusta = ent(r["Total likes"]);
      const comentarios = ent(r["Total comments"]);
      const compartidos = ent(r["Total shares"]);
      posts.push({
        fecha: f,
        texto: (r["Video title"] ?? "").trim(),
        enlace: r["Video link"] ?? "",
        tipo: "Video",
        visualizaciones: ent(r["Total views"]),
        impresiones: ent(r["Total views"]),
        meGusta, comentarios, compartidos,
        interacciones: meGusta + comentarios + compartidos,
      });
    }
    return {
      ...base, red: "tiktok", filas: posts.length,
      descripcion: "TikTok · videos",
      aplicar: (bd) => { bd.redes.tiktok.posts = fusionarPosts(bd.redes.tiktok.posts, posts); },
    };
  }

  // --- TikTok: historico de seguidores ---
  if (tieneCols(cols, ["Date", "Followers"])) {
    const serie: SerieDia[] = [];
    for (const r of filas) {
      const f = fechaEs(r["Date"]);
      if (!f) continue;
      serie.push({
        fecha: f,
        seguidoresTotal: ent(r["Followers"]),
        seguidoresNuevos: ent(r["Difference in followers from previous day"]),
      });
    }
    return {
      ...base, red: "tiktok", filas: serie.length,
      descripcion: "TikTok · seguidores",
      aplicar: (bd) => { bd.redes.tiktok.daily = fusionarSerie(bd.redes.tiktok.daily, serie); },
    };
  }

  // --- TikTok: actividad de seguidores por hora ---
  if (tieneCols(cols, ["Date", "Hour", "Active followers"])) {
    const porHora = new Map<number, number[]>();
    for (const r of filas) {
      const v = ent(r["Active followers"]);
      if (v <= 0) continue;
      const h = ent(r["Hour"]);
      porHora.set(h, [...(porHora.get(h) ?? []), v]);
    }
    const actividad = [...porHora.entries()]
      .map(([hora, vs]) => ({ hora, valor: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) }))
      .sort((a, b) => a.hora - b.hora);
    return {
      ...base, red: "tiktok", filas: actividad.length,
      descripcion: "TikTok · actividad por hora",
      aplicar: (bd) => {
        const a = bd.redes.tiktok.audiencia as { actividadPorHora?: unknown } | undefined;
        if (a) a.actividadPorHora = actividad;
      },
    };
  }

  // --- TikTok: genero ---
  if (tieneCols(cols, ["Gender", "Distribution"])) {
    const etiquetas: Record<string, string> = { Male: "Hombres", Female: "Mujeres" };
    const genero = filas
      .map((r) => ({
        nombre: etiquetas[r["Gender"]] ?? "Otro",
        valor: Math.round(num(r["Distribution"]) * 1000) / 10,
      }))
      .filter((g) => g.valor > 0);
    return {
      ...base, red: "tiktok", filas: genero.length,
      descripcion: "TikTok · género de la audiencia",
      aplicar: (bd) => {
        const a = bd.redes.tiktok.audiencia as { genero?: unknown } | undefined;
        if (a) a.genero = genero;
      },
    };
  }

  // --- TikTok: territorios ---
  if (tieneCols(cols, ["Top territories", "Distribution"])) {
    const paises: Record<string, string> = {
      CO: "Colombia", US: "Estados Unidos", AR: "Argentina", EC: "Ecuador",
      ES: "España", CL: "Chile", BR: "Brasil", MX: "México", PE: "Perú",
      BD: "Bangladés", VE: "Venezuela", Others: "Otros",
    };
    const territorios = filas
      .map((r) => ({
        nombre: paises[r["Top territories"]] ?? r["Top territories"],
        valor: Math.round(num(r["Distribution"]) * 1000) / 10,
      }))
      .sort((a, b) => b.valor - a.valor);
    return {
      ...base, red: "tiktok", filas: territorios.length,
      descripcion: "TikTok · territorios de la audiencia",
      aplicar: (bd) => {
        const a = bd.redes.tiktok.audiencia as { territorios?: unknown } | undefined;
        if (a) a.territorios = territorios;
      },
    };
  }

  return {
    archivo: nombre, reconocido: false, filas: filas.length,
    descripcion: "Formato no reconocido. Revisa que sea el export original de la plataforma.",
  };
}

function reconocerXls(nombre: string, hojas: Record<string, unknown[][]>): Resultado {
  const nombres = Object.keys(hojas);

  // --- LinkedIn: contenido (indicadores diarios + publicaciones) ---
  if (nombres.includes("Indicadores") && nombres.includes("Todas las publicaciones")) {
    const serie: SerieDia[] = [];
    for (const r of tabla(hojas["Indicadores"], 1)) {
      const f = fechaExcel(r["Fecha"]);
      if (!f) continue;
      const meGusta = ent(r["Reacciones (total)"]);
      const comentarios = ent(r["Comentarios (totales)"]);
      const compartidos = ent(r["Veces compartido (total)"]);
      const clics = ent(r["Clics (totales)"]);
      serie.push({
        fecha: f,
        impresiones: ent(r["Impresiones (totales)"]),
        alcance: ent(r["Impresiones únicas (orgánicas)"]),
        clics, meGusta, comentarios, compartidos,
        interacciones: meGusta + comentarios + compartidos + clics,
        tasaInteraccion: Math.round(num(r["Tasa de interacción (total)"]) * 100_000) / 1000,
      });
    }

    const posts: Publicacion[] = [];
    for (const r of tabla(hojas["Todas las publicaciones"], 1)) {
      const f = fechaExcel(r["Fecha de creación"]);
      if (!f) continue;
      const meGusta = ent(r["Recomendaciones"]);
      const comentarios = ent(r["Comentarios"]);
      const compartidos = ent(r["Veces compartido"]);
      const clics = ent(r["Clics"]);
      posts.push({
        fecha: f,
        texto: (r["Título de la publicación"] ?? "").trim(),
        enlace: r["Enlace de la publicación"] ?? "",
        tipo: (r["Tipo de contenido"] ?? "").trim() || "Texto/Imagen",
        impresiones: ent(r["Impresiones"]),
        visualizaciones: ent(r["Visualizaciones"]),
        clics, meGusta, comentarios, compartidos,
        interacciones: meGusta + comentarios + compartidos + clics,
        tasaInteraccion: Math.round(num(r["Tasa de interacción"]) * 10_000) / 100,
      });
    }

    return {
      archivo: nombre, reconocido: true, red: "linkedin",
      filas: serie.length + posts.length,
      descripcion: `LinkedIn · ${serie.length} días y ${posts.length} publicaciones`,
      aplicar: (bd) => {
        bd.redes.linkedin.daily = fusionarSerie(bd.redes.linkedin.daily, serie);
        bd.redes.linkedin.posts = fusionarPosts(bd.redes.linkedin.posts, posts);
      },
    };
  }

  // --- LinkedIn: seguidores y demografia ---
  if (nombres.includes("Nuevos seguidores")) {
    const serie: SerieDia[] = [];
    for (const r of tabla(hojas["Nuevos seguidores"], 0)) {
      const f = fechaExcel(r["Fecha"]);
      if (!f) continue;
      serie.push({
        fecha: f,
        seguidoresNuevos: ent(r["Total de seguidores"]),
        seguidoresOrganicos: ent(r["Seguidores generales"]),
        seguidoresPatrocinados: ent(r["Seguidores patrocinados"]),
      });
    }
    const ubicacion = categorias(hojas["Ubicación"] ?? [], "Ubicación");
    const audiencia = {
      totalUbicaciones: ubicacion.reduce((a, b) => a + b.valor, 0),
      ubicacion: ubicacion.slice(0, 12),
      funcionLaboral: categorias(hojas["Función laboral"] ?? [], "Función laboral").slice(0, 10),
      nivel: categorias(hojas["Nivel de responsabilidad"] ?? [], "Nivel de responsabilidad"),
      sector: categorias(hojas["Sector"] ?? [], "Sector").slice(0, 10),
      tamanoEmpresa: categorias(hojas["Tamaño de la empresa"] ?? [], "Tamaño de la empresa"),
    };
    return {
      archivo: nombre, reconocido: true, red: "linkedin", filas: serie.length,
      descripcion: `LinkedIn · seguidores y demografía`,
      aplicar: (bd) => {
        bd.redes.linkedin.daily = fusionarSerie(bd.redes.linkedin.daily, serie);
        bd.redes.linkedin.audiencia = audiencia;
      },
    };
  }

  return {
    archivo: nombre, reconocido: false, filas: 0,
    descripcion: `Libro de Excel con hojas: ${nombres.join(", ") || "(vacío)"}. No coincide con el export de LinkedIn.`,
  };
}

// --------------------------------------------------------------------------
// API publica
// --------------------------------------------------------------------------
export async function analizarArchivo(file: File): Promise<Resultado> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  try {
    if (ext === "xls" || ext === "xlsx") {
      return reconocerXls(file.name, await leerXls(file));
    }
    if (ext === "csv" || ext === "txt") {
      const { cols, filas } = leerCsv(await file.text());
      return reconocerCsv(file.name, cols, filas);
    }
    return {
      archivo: file.name, reconocido: false, filas: 0,
      descripcion: `Extensión .${ext} no admitida. Usa los .csv o .xls que exporta cada plataforma.`,
    };
  } catch (e) {
    return {
      archivo: file.name, reconocido: false, filas: 0,
      descripcion: `No se pudo leer: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function analizarArchivos(files: File[]): Promise<Resultado[]> {
  return Promise.all(files.map(analizarArchivo));
}
