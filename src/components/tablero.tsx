"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAlmacen } from "@/lib/almacen";
import { REDES, VISTAS } from "@/lib/redes";
import { fechaCorta, fechaLarga } from "@/lib/formato";
import { capturarElemento, esperarPintado, exportarLienzos, type Lienzo } from "@/lib/pdf";
import { SelectorFechas } from "./selector-fechas";
import { PanelActualizar } from "./panel-actualizar";
import { VistaGeneral } from "./vistas/general";
import { VistaRed } from "./vistas/red";
import { VistaInstagram } from "./vistas/instagram";
import { VistaSeo } from "./vistas/seo";
import type { RedId } from "@/lib/tipos";

export function Tablero() {
  const { vista, setVista, rango, bd, personalizado } = useAlmacen();
  const [panel, setPanel] = useState(false);
  const [menuPdf, setMenuPdf] = useState(false);
  const [exportando, setExportando] = useState<null | string>(null);
  const reporte = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuPdf) return;
    const fuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuPdf(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [menuPdf]);

  const periodoTexto = `${fechaCorta(rango.desde, true)} – ${fechaCorta(rango.hasta, true)}`;

  async function exportar(modo: "actual" | "completo") {
    const vistaOriginal = vista;
    setMenuPdf(false);
    document.body.classList.add("exportando");
    const opciones = {
      titulo: "Tablero General de Canales Digitales",
      subtitulo: "Superintendencia del Subsidio Familiar",
      periodo: periodoTexto,
      nombreArchivo:
        modo === "completo"
          ? `Reporte-canales-digitales-SSF_${rango.desde}_a_${rango.hasta}.pdf`
          : `${REDES[vista].nombre.replace(/[^\w]/g, "-")}_SSF_${rango.desde}_a_${rango.hasta}.pdf`,
    };

    try {
      const lienzos: Lienzo[] = [];
      if (modo === "actual") {
        setExportando("Preparando la vista…");
        await esperarPintado(200);
        if (reporte.current) {
          lienzos.push({ titulo: REDES[vista].nombre, canvas: await capturarElemento(reporte.current) });
        }
      } else {
        for (const v of VISTAS) {
          setExportando(`Capturando ${REDES[v].nombre}…`);
          setVista(v);
          await esperarPintado(650);
          if (reporte.current) {
            lienzos.push({ titulo: REDES[v].nombre, canvas: await capturarElemento(reporte.current) });
          }
        }
      }

      if (!lienzos.length) throw new Error("No se encontró contenido para exportar.");
      setExportando("Generando el PDF…");
      await exportarLienzos(lienzos, opciones);
    } catch (e) {
      console.error(e);
      alert(
        "No se pudo generar el PDF. Como alternativa puedes usar la impresión del navegador (Cmd/Ctrl + P) y guardar como PDF."
      );
    } finally {
      if (modo === "completo") {
        setVista(vistaOriginal);
        await esperarPintado(120);
      }
      document.body.classList.remove("exportando");
      setExportando(null);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-arena-200 bg-white/95 backdrop-blur sin-imprimir">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3.5">
            <Image
              src="/logo-supersubsidio.png"
              alt="Superintendencia del Subsidio Familiar"
              width={618}
              height={322}
              priority
              className="h-11 w-auto"
            />
            <div className="hidden h-9 w-px bg-arena-200 sm:block" />
            <div className="hidden sm:block">
              <h1 className="text-[15px] font-bold leading-tight text-tinta-900">
                Tablero General de Canales Digitales
              </h1>
              <p className="text-[12.5px] leading-tight text-tinta-500">
                Análisis de redes sociales y página web
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SelectorFechas />

            <button type="button" className="boton-secundario" onClick={() => setPanel(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Actualizar datos</span>
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="boton-primario"
                onClick={() => setMenuPdf((v) => !v)}
                disabled={!!exportando}
              >
                {exportando ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    <span className="hidden sm:inline">{exportando}</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 4v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" strokeLinecap="round" />
                    </svg>
                    <span className="hidden sm:inline">Descargar PDF</span>
                  </>
                )}
              </button>

              {menuPdf && !exportando && (
                <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-arena-200 bg-white p-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={() => void exportar("actual")}
                    className="w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-arena-50"
                  >
                    <p className="text-[13px] font-semibold text-tinta-900">Vista actual</p>
                    <p className="text-[12px] text-tinta-500">Solo {REDES[vista].nombre}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportar("completo")}
                    className="w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-arena-50"
                  >
                    <p className="text-[13px] font-semibold text-tinta-900">Reporte completo</p>
                    <p className="text-[12px] text-tinta-500">
                      Vista general y las 6 secciones
                    </p>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 scroll-fino">
          {VISTAS.map((v) => {
            const activo = vista === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={`relative whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition ${
                  activo
                    ? "border-current"
                    : "border-transparent text-tinta-400 hover:text-tinta-700"
                }`}
                style={activo ? { color: REDES[v].color } : undefined}
              >
                {REDES[v].nombre}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">
        <div ref={reporte} className="space-y-5 bg-arena-50 pb-1">
          <PortadaSeccion periodoTexto={periodoTexto} />
          {vista === "general" && <VistaGeneral />}
          {vista === "seo" && <VistaSeo />}
          {vista === "instagram" && <VistaInstagram onAbrirPanel={() => setPanel(true)} />}
          {(["facebook", "x", "linkedin", "tiktok"] as RedId[]).includes(vista as RedId) && (
            <VistaRed red={vista as RedId} />
          )}
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-arena-200 pt-4 text-[12px] text-tinta-400">
          <p>
            Superintendencia del Subsidio Familiar · Oficina de Comunicaciones ·{" "}
            {personalizado ? "datos actualizados en este navegador" : "carga inicial"} el{" "}
            {bd.generado}
          </p>
          <p>Fuentes: X Analytics, Meta Business Suite, LinkedIn Page Analytics, TikTok Analytics y Semrush.</p>
        </footer>
      </main>

      {panel && <PanelActualizar onCerrar={() => setPanel(false)} />}
    </div>
  );
}

/** Cabecera del bloque exportable: identifica la entidad, la sección y el periodo. */
function PortadaSeccion({ periodoTexto }: { periodoTexto: string }) {
  const { vista, rango } = useAlmacen();
  const meta = REDES[vista];
  return (
    <div className="tarjeta flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-4">
        <span
          className="h-10 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-tinta-400">
            {vista === "general" ? "Consolidado de la entidad" : "Detalle del canal"}
          </p>
          <h2 className="text-xl font-bold leading-tight text-tinta-900">{meta.nombre}</h2>
          {meta.cuenta && <p className="text-[12.5px] text-tinta-500">{meta.cuenta}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-tinta-400">
          Periodo analizado
        </p>
        <p className="text-[15px] font-semibold text-tinta-900">{periodoTexto}</p>
        <p className="text-[12px] text-tinta-500">
          {fechaLarga(rango.desde)} al {fechaLarga(rango.hasta)}
        </p>
      </div>
    </div>
  );
}
