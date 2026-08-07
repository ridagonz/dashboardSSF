import type {
  BaseDatos,
  DatosRed,
  Publicacion,
  RangoFechas,
  RedConSerie,
  Resumen,
  SerieDia,
} from "./tipos";
import { REDES, REDES_CON_SERIE } from "./redes";

export function enRango(fecha: string, r: RangoFechas): boolean {
  return fecha >= r.desde && fecha <= r.hasta;
}

export function filtrarSerie(daily: SerieDia[], r: RangoFechas): SerieDia[] {
  return daily.filter((d) => enRango(d.fecha, r));
}

export function filtrarPosts(posts: Publicacion[], r: RangoFechas): Publicacion[] {
  return posts.filter((p) => enRango(p.fecha, r));
}

function suma(serie: SerieDia[], campo: keyof SerieDia): number {
  return serie.reduce((acc, d) => acc + (Number(d[campo]) || 0), 0);
}

/** Totales de una red dentro del rango. El conteo de publicaciones sale del
 *  listado de posts, que es la fuente fiable en todas las plataformas. */
export function resumirRed(
  red: DatosRed,
  r: RangoFechas,
  opciones: { publicacionesDesdeSerie?: boolean } = {}
): Resumen {
  const serie = filtrarSerie(red.daily, r);
  const posts = filtrarPosts(red.posts, r);
  const impresiones = suma(serie, "impresiones");
  const interacciones = suma(serie, "interacciones");
  return {
    impresiones,
    interacciones,
    meGusta: suma(serie, "meGusta"),
    comentarios: suma(serie, "comentarios"),
    compartidos: suma(serie, "compartidos"),
    seguidoresNuevos: suma(serie, "seguidoresNuevos"),
    publicaciones: opciones.publicacionesDesdeSerie
      ? suma(serie, "publicaciones")
      : posts.length,
    visitasPerfil: suma(serie, "visitasPerfil"),
    tasaInteraccion: impresiones > 0 ? (interacciones / impresiones) * 100 : 0,
  };
}

export function resumenVacio(): Resumen {
  return {
    impresiones: 0,
    interacciones: 0,
    meGusta: 0,
    comentarios: 0,
    compartidos: 0,
    seguidoresNuevos: 0,
    publicaciones: 0,
    visitasPerfil: 0,
    tasaInteraccion: 0,
  };
}

/** Totales consolidados de todas las redes con serie diaria. */
export function resumirConsolidado(bd: BaseDatos, r: RangoFechas): Resumen {
  const total = resumenVacio();
  for (const id of REDES_CON_SERIE) {
    const res = resumirRed(bd.redes[id], r);
    total.impresiones += res.impresiones;
    total.interacciones += res.interacciones;
    total.meGusta += res.meGusta;
    total.comentarios += res.comentarios;
    total.compartidos += res.compartidos;
    total.seguidoresNuevos += res.seguidoresNuevos;
    total.publicaciones += res.publicaciones;
    total.visitasPerfil += res.visitasPerfil;
  }
  total.tasaInteraccion =
    total.impresiones > 0 ? (total.interacciones / total.impresiones) * 100 : 0;
  return total;
}

export interface FilaComparativa extends Resumen {
  id: RedConSerie;
  nombre: string;
  color: string;
}

export function comparativoRedes(bd: BaseDatos, r: RangoFechas): FilaComparativa[] {
  return REDES_CON_SERIE.map((id) => ({
    id,
    nombre: REDES[id].nombre,
    color: REDES[id].color,
    ...resumirRed(bd.redes[id], r),
  })).sort((a, b) => b.impresiones - a.impresiones);
}

/** Serie mensual de un campo, por red, lista para un grafico apilado. */
export function serieMensualPorRed(
  bd: BaseDatos,
  r: RangoFechas,
  campo: keyof SerieDia
): Record<string, string | number>[] {
  const meses = new Map<string, Record<string, string | number>>();
  for (const id of REDES_CON_SERIE) {
    for (const d of filtrarSerie(bd.redes[id].daily, r)) {
      const mes = d.fecha.slice(0, 7);
      if (!meses.has(mes)) {
        const fila: Record<string, string | number> = { mes };
        for (const otra of REDES_CON_SERIE) fila[otra] = 0;
        meses.set(mes, fila);
      }
      const fila = meses.get(mes)!;
      fila[id] = (Number(fila[id]) || 0) + (Number(d[campo]) || 0);
    }
  }
  return [...meses.values()].sort((a, b) => String(a.mes).localeCompare(String(b.mes)));
}

/** Serie diaria de un solo campo, para los graficos de linea por red. */
export function serieDiaria(
  daily: SerieDia[],
  r: RangoFechas,
  campos: (keyof SerieDia)[]
): Record<string, string | number>[] {
  return filtrarSerie(daily, r).map((d) => {
    const fila: Record<string, string | number> = { fecha: d.fecha };
    for (const c of campos) fila[c as string] = Number(d[c]) || 0;
    return fila;
  });
}

/** Agrupa la serie por mes sumando los campos indicados. */
export function serieMensual(
  daily: SerieDia[],
  r: RangoFechas,
  campos: (keyof SerieDia)[]
): Record<string, string | number>[] {
  const meses = new Map<string, Record<string, string | number>>();
  for (const d of filtrarSerie(daily, r)) {
    const mes = d.fecha.slice(0, 7);
    if (!meses.has(mes)) {
      const fila: Record<string, string | number> = { mes };
      for (const c of campos) fila[c as string] = 0;
      meses.set(mes, fila);
    }
    const fila = meses.get(mes)!;
    for (const c of campos) {
      fila[c as string] = (Number(fila[c as string]) || 0) + (Number(d[c]) || 0);
    }
  }
  return [...meses.values()].sort((a, b) => String(a.mes).localeCompare(String(b.mes)));
}

/** Ultimo valor no nulo de un campo acumulativo (p. ej. seguidores totales). */
export function ultimoValor(
  daily: SerieDia[],
  r: RangoFechas,
  campo: keyof SerieDia
): number {
  const serie = filtrarSerie(daily, r);
  for (let i = serie.length - 1; i >= 0; i--) {
    const v = Number(serie[i][campo]) || 0;
    if (v > 0) return v;
  }
  return 0;
}

/** Rango completo cubierto por los datos cargados. */
export function rangoDisponible(bd: BaseDatos): RangoFechas {
  let min = "9999-12-31";
  let max = "0000-01-01";
  for (const id of REDES_CON_SERIE) {
    for (const d of bd.redes[id].daily) {
      if (d.fecha < min) min = d.fecha;
      if (d.fecha > max) max = d.fecha;
    }
  }
  if (min > max) {
    const hoy = new Date().toISOString().slice(0, 10);
    return { desde: hoy, hasta: hoy };
  }
  return { desde: min, hasta: max };
}

/** Rango equivalente inmediatamente anterior, para calcular variaciones. */
export function rangoAnterior(r: RangoFechas): RangoFechas {
  const d1 = new Date(`${r.desde}T00:00:00Z`).getTime();
  const d2 = new Date(`${r.hasta}T00:00:00Z`).getTime();
  const dias = Math.round((d2 - d1) / 86_400_000) + 1;
  const finPrev = new Date(d1 - 86_400_000);
  const iniPrev = new Date(d1 - dias * 86_400_000);
  return {
    desde: iniPrev.toISOString().slice(0, 10),
    hasta: finPrev.toISOString().slice(0, 10),
  };
}

/** El comparativo solo es honesto si el periodo anterior esta cubierto por
 *  los datos cargados; si no, se omite en vez de mostrar saltos irreales. */
export function hayComparativo(r: RangoFechas, disponible: RangoFechas): boolean {
  return rangoAnterior(r).desde >= disponible.desde;
}

export function variacion(actual: number, previo: number): number | null {
  if (!previo) return null;
  return ((actual - previo) / previo) * 100;
}

/** Presets del selector de fechas. */
export function presetsFecha(disponible: RangoFechas): {
  etiqueta: string;
  rango: RangoFechas;
}[] {
  const hasta = disponible.hasta;
  const fin = new Date(`${hasta}T00:00:00Z`);
  const menos = (dias: number) =>
    new Date(fin.getTime() - dias * 86_400_000).toISOString().slice(0, 10);
  const inicioMes = `${hasta.slice(0, 7)}-01`;
  const anio = hasta.slice(0, 4);
  return [
    { etiqueta: "Últimos 30 días", rango: { desde: menos(29), hasta } },
    { etiqueta: "Últimos 90 días", rango: { desde: menos(89), hasta } },
    { etiqueta: "Mes en curso", rango: { desde: inicioMes, hasta } },
    {
      etiqueta: `Año ${anio}`,
      rango: { desde: `${anio}-01-01`, hasta },
    },
    { etiqueta: "Todo el periodo", rango: disponible },
  ];
}
