const LOCALE = "es-CO";

export function numero(v: number | undefined | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(v);
}

/** Formato compacto para tarjetas: 1.234.567 -> "1,23 M". */
export function compacto(v: number | undefined | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${trim(v / 1_000_000)} M`;
  if (abs >= 10_000) return `${trim(v / 1_000)} K`;
  return numero(v);
}

function trim(v: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: v >= 100 ? 0 : 2,
  }).format(v);
}

export function decimal(v: number | undefined | null, dec = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(v);
}

export function porcentaje(v: number | undefined | null, dec = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${decimal(v, dec)} %`;
}

export function duracion(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** "2026-08-06" -> "6 ago 2026". Se parsea a mano para evitar el corrimiento
 *  de zona horaria que introduce new Date("YYYY-MM-DD"). */
export function fechaCorta(iso: string, conAnio = false): string {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${d} ${MESES_CORTOS[m - 1]}${conAnio ? ` ${a}` : ""}`;
}

export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  const largos = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${d} de ${largos[m - 1]} de ${a}`;
}

export function mesEtiqueta(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  return `${MESES_CORTOS[m - 1]} ${String(a).slice(2)}`;
}

export function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recortar(texto: string, largo = 90): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > largo ? `${limpio.slice(0, largo)}…` : limpio;
}

/** Solo permite enlaces web externos. Los enlaces vienen de archivos cargados
 *  por el usuario y no deben poder ejecutar protocolos como javascript:. */
export function enlaceSeguro(enlace: string | undefined | null): string | null {
  const valor = enlace?.trim();
  if (!valor) return null;

  try {
    const url = new URL(/^www\./i.test(valor) ? `https://${valor}` : valor);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
