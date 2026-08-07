"use client";

import {
  compacto,
  decimal,
  enlaceSeguro,
  fechaCorta,
  numero,
  recortar,
} from "@/lib/formato";
import type { Publicacion } from "@/lib/tipos";

export function Seccion({
  titulo,
  descripcion,
  acciones,
  children,
  className = "",
}: {
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`tarjeta p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-tinta-900">{titulo}</h3>
          {descripcion && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-tinta-500">{descripcion}</p>
          )}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}

export function Kpi({
  etiqueta,
  valor,
  detalle,
  variacion,
  color = "#671c35",
  exacto,
}: {
  etiqueta: string;
  valor: number | string;
  detalle?: string;
  variacion?: number | null;
  color?: string;
  exacto?: boolean;
}) {
  const texto =
    typeof valor === "number" ? (exacto ? numero(valor) : compacto(valor)) : valor;
  return (
    <div className="tarjeta p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="tarjeta-titulo">{etiqueta}</p>
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <p className="mt-2 text-[26px] font-bold leading-none tracking-tight text-tinta-900">
        {texto}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {variacion != null && Number.isFinite(variacion) && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              variacion >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {variacion >= 0 ? "▲" : "▼"} {decimal(Math.abs(variacion), 1)} %
          </span>
        )}
        {detalle && <span className="text-[12px] text-tinta-400">{detalle}</span>}
      </div>
    </div>
  );
}

export function Etiqueta({
  children,
  color = "#671c35",
  suave = true,
}: {
  children: React.ReactNode;
  color?: string;
  suave?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={
        suave
          ? { backgroundColor: `${color}14`, color }
          : { backgroundColor: color, color: "#fff" }
      }
    >
      {children}
    </span>
  );
}

export function EstadoVacio({
  titulo,
  mensaje,
  accion,
}: {
  titulo: string;
  mensaje: React.ReactNode;
  accion?: React.ReactNode;
}) {
  return (
    <div className="tarjeta flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-arena-100">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8a8079" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-tinta-900">{titulo}</h3>
      <div className="max-w-lg text-sm leading-relaxed text-tinta-500">{mensaje}</div>
      {accion}
    </div>
  );
}

/** Tabla de publicaciones con las columnas que aplican a cada red. */
export function TablaPublicaciones({
  posts,
  columnas,
  limite = 10,
  metricaPrincipal = "impresiones",
  etiquetaPrincipal = "Impresiones",
}: {
  posts: Publicacion[];
  columnas?: { clave: keyof Publicacion; titulo: string }[];
  limite?: number;
  metricaPrincipal?: keyof Publicacion;
  etiquetaPrincipal?: string;
}) {
  const cols = columnas ?? [
    { clave: "interacciones" as const, titulo: "Interacciones" },
    { clave: "meGusta" as const, titulo: "Me gusta" },
    { clave: "comentarios" as const, titulo: "Comentarios" },
    { clave: "compartidos" as const, titulo: "Compartidos" },
  ];

  if (!posts.length) {
    return (
      <p className="py-8 text-center text-sm text-tinta-400">
        No hay publicaciones en el rango de fechas seleccionado.
      </p>
    );
  }

  const top = [...posts]
    .sort((a, b) => Number(b[metricaPrincipal] ?? 0) - Number(a[metricaPrincipal] ?? 0))
    .slice(0, limite);

  return (
    <div className="scroll-fino -mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-arena-200 text-left">
            <th className="w-10 pb-2 pr-2 text-[11px] font-semibold uppercase tracking-wide text-tinta-400">
              #
            </th>
            <th className="pb-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-tinta-400">
              Publicación
            </th>
            <th className="pb-2 pr-3 text-right text-[11px] font-semibold uppercase tracking-wide text-tinta-400">
              {etiquetaPrincipal}
            </th>
            {cols.map((c) => (
              <th
                key={String(c.clave)}
                className="pb-2 pr-3 text-right text-[11px] font-semibold uppercase tracking-wide text-tinta-400"
              >
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {top.map((p, idx) => {
            const enlace = enlaceSeguro(p.enlace);
            return (
              <tr
                key={`${p.enlace}-${idx}`}
                className="border-b border-arena-100 align-top last:border-0"
              >
              <td className="py-3 pr-2 text-[13px] font-semibold text-tinta-400">{idx + 1}</td>
              <td className="py-3 pr-3">
                <p className="leading-snug text-tinta-700">{recortar(p.texto, 110)}</p>
                <p className="mt-1 flex items-center gap-2 text-[12px] text-tinta-400">
                  <span>{fechaCorta(p.fecha, true)}</span>
                  {p.tipo && <span className="text-arena-300">·</span>}
                  {p.tipo && <span>{p.tipo}</span>}
                  {enlace && (
                    <>
                      <span className="text-arena-300">·</span>
                      <a
                        href={enlace}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-vino-700 underline-offset-2 hover:underline"
                      >
                        Ver
                      </a>
                    </>
                  )}
                </p>
              </td>
              <td className="py-3 pr-3 text-right font-semibold tabular-nums text-tinta-900">
                {numero(Number(p[metricaPrincipal] ?? 0))}
              </td>
              {cols.map((c) => (
                <td
                  key={String(c.clave)}
                  className="py-3 pr-3 text-right tabular-nums text-tinta-600"
                >
                  {numero(Number(p[c.clave] ?? 0))}
                </td>
              ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Lista horizontal tipo ranking, para demografía y categorías. */
export function ListaBarras({
  datos,
  color = "#671c35",
  sufijo = "",
  formato = (v: number) => numero(v),
}: {
  datos: { nombre: string; valor: number }[];
  color?: string;
  sufijo?: string;
  formato?: (v: number) => string;
}) {
  if (!datos.length) {
    return <p className="py-6 text-center text-sm text-tinta-400">Sin datos disponibles.</p>;
  }
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <ul className="space-y-2.5">
      {datos.map((d) => (
        <li key={d.nombre}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-tinta-700">{d.nombre}</span>
            <span className="shrink-0 font-semibold tabular-nums text-tinta-900">
              {formato(d.valor)}
              {sufijo}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-arena-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.valor / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Aviso({
  tono = "info",
  children,
}: {
  tono?: "info" | "alerta";
  children: React.ReactNode;
}) {
  const estilos =
    tono === "alerta"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-arena-200 bg-arena-50 text-tinta-600";
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-[13px] leading-relaxed ${estilos}`}>
      {children}
    </div>
  );
}
