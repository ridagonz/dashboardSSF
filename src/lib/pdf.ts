import type jsPDFType from "jspdf";

/**
 * Exportador de PDF. Rasteriza el DOM del reporte y lo pagina en A4 vertical,
 * cortando el lienzo por alto para no partir el contenido entre paginas.
 *
 * Se captura vista por vista (capturarElemento) y despues se arma el documento
 * (exportarLienzos), porque en el reporte completo el DOM solo tiene una vista
 * montada a la vez.
 */

const A4_ANCHO = 210;
const A4_ALTO = 297;
const MARGEN = 10;
const CAB = 17; // banda superior con el titulo
const PIE = 10; // banda inferior con la paginacion
const UTIL_ANCHO = A4_ANCHO - MARGEN * 2;
const UTIL_ALTO = A4_ALTO - CAB - PIE;

export interface OpcionesPdf {
  titulo: string;
  subtitulo: string;
  periodo: string;
  nombreArchivo: string;
}

export interface Lienzo {
  titulo: string;
  canvas: HTMLCanvasElement;
}

export async function capturarElemento(el: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas-pro");
  return html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
  });
}

function bandas(pdf: jsPDFType, o: OpcionesPdf, pagina: number, seccion: string) {
  pdf.setFillColor(103, 28, 53);
  pdf.rect(0, 0, A4_ANCHO, 7, "F");

  pdf.setTextColor(103, 28, 53);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  pdf.text(o.titulo, MARGEN, 13.5);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(130, 120, 115);
  pdf.text(seccion, A4_ANCHO - MARGEN, 13.5, { align: "right" });

  pdf.setDrawColor(232, 226, 216);
  pdf.setLineWidth(0.25);
  pdf.line(MARGEN, CAB - 2.5, A4_ANCHO - MARGEN, CAB - 2.5);

  pdf.setFontSize(7.5);
  pdf.setTextColor(150, 142, 136);
  pdf.text(`${o.subtitulo}  ·  ${o.periodo}`, MARGEN, A4_ALTO - 5);
  pdf.text(`Página ${pagina}`, A4_ANCHO - MARGEN, A4_ALTO - 5, { align: "right" });
}

/** Corta el lienzo en franjas del alto de una pagina y las agrega al PDF. */
function paginar(
  pdf: jsPDFType,
  canvas: HTMLCanvasElement,
  o: OpcionesPdf,
  seccion: string,
  paginaInicial: number,
  primeraDelDoc: boolean
): number {
  const escala = UTIL_ANCHO / canvas.width; // mm por pixel
  const altoPagPx = Math.floor(UTIL_ALTO / escala);
  const paginas = Math.max(1, Math.ceil(canvas.height / altoPagPx));
  let pagina = paginaInicial;

  for (let p = 0; p < paginas; p++) {
    if (!primeraDelDoc || p > 0) pdf.addPage();

    const yPx = p * altoPagPx;
    const hPx = Math.min(altoPagPx, canvas.height - yPx);

    const franja = document.createElement("canvas");
    franja.width = canvas.width;
    franja.height = hPx;
    const ctx = franja.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, franja.width, franja.height);
      ctx.drawImage(canvas, 0, yPx, canvas.width, hPx, 0, 0, canvas.width, hPx);
    }

    bandas(pdf, o, pagina, seccion);
    pdf.addImage(
      franja.toDataURL("image/jpeg", 0.92),
      "JPEG",
      MARGEN,
      CAB,
      UTIL_ANCHO,
      hPx * escala,
      undefined,
      "FAST"
    );
    pagina++;
  }
  return pagina;
}

export async function exportarLienzos(lienzos: Lienzo[], o: OpcionesPdf): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  let pagina = 1;
  let primera = true;
  for (const l of lienzos) {
    pagina = paginar(pdf, l.canvas, o, l.titulo, pagina, primera);
    primera = false;
  }

  pdf.save(o.nombreArchivo);
}

/** Espera a que el navegador pinte antes de capturar. */
export const esperarPintado = (ms = 400) =>
  new Promise<void>((r) =>
    requestAnimationFrame(() => setTimeout(() => requestAnimationFrame(() => r()), ms))
  );
