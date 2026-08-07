"use client";

import { useEffect, useRef, useState } from "react";
import { useAlmacen } from "@/lib/almacen";
import { presetsFecha } from "@/lib/datos";
import { fechaCorta } from "@/lib/formato";

export function SelectorFechas() {
  const { rango, disponible, setRango } = useAlmacen();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const presets = presetsFecha(disponible);
  const activo = presets.find(
    (p) => p.rango.desde === rango.desde && p.rango.hasta === rango.hasta
  );

  return (
    <div className="relative" ref={caja}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="boton-secundario"
        aria-expanded={abierto}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
        <span className="whitespace-nowrap">
          {activo?.etiqueta ?? `${fechaCorta(rango.desde, true)} – ${fechaCorta(rango.hasta, true)}`}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute right-0 z-30 mt-2 w-[320px] rounded-xl border border-arena-200 bg-white p-4 shadow-lg">
          <p className="tarjeta-titulo mb-2">Periodos rápidos</p>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((p) => {
              const sel = activo?.etiqueta === p.etiqueta;
              return (
                <button
                  key={p.etiqueta}
                  type="button"
                  onClick={() => {
                    setRango(p.rango);
                    setAbierto(false);
                  }}
                  className={`rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition ${
                    sel
                      ? "bg-vino-700 text-white"
                      : "bg-arena-50 text-tinta-600 hover:bg-arena-100"
                  }`}
                >
                  {p.etiqueta}
                </button>
              );
            })}
          </div>

          <p className="tarjeta-titulo mb-2 mt-4">Rango personalizado</p>
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-tinta-400">Desde</span>
              <input
                type="date"
                className="campo w-full"
                value={rango.desde}
                min={disponible.desde}
                max={rango.hasta}
                onChange={(e) =>
                  e.target.value && setRango({ ...rango, desde: e.target.value })
                }
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[11px] text-tinta-400">Hasta</span>
              <input
                type="date"
                className="campo w-full"
                value={rango.hasta}
                min={rango.desde}
                max={disponible.hasta}
                onChange={(e) =>
                  e.target.value && setRango({ ...rango, hasta: e.target.value })
                }
              />
            </label>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-tinta-400">
            Datos disponibles del {fechaCorta(disponible.desde, true)} al{" "}
            {fechaCorta(disponible.hasta, true)}.
          </p>
        </div>
      )}
    </div>
  );
}
