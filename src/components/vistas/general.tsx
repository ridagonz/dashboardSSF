"use client";

import { useMemo } from "react";
import { useAlmacen } from "@/lib/almacen";
import {
  comparativoRedes,
  filtrarPosts,
  hayComparativo,
  rangoAnterior,
  resumirConsolidado,
  serieMensualPorRed,
  variacion,
} from "@/lib/datos";
import { REDES, REDES_CON_SERIE } from "@/lib/redes";
import {
  compacto,
  decimal,
  enlaceSeguro,
  fechaCorta,
  numero,
  porcentaje,
  recortar,
} from "@/lib/formato";
import { BarrasApiladas, Dona } from "../graficos";
import { Aviso, Etiqueta, Kpi, ListaBarras, Seccion } from "../ui";
import type { Publicacion, RedConSerie } from "@/lib/tipos";

export function VistaGeneral() {
  const { bd, rango, disponible, setVista } = useAlmacen();
  const comparable = hayComparativo(rango, disponible);
  const vs = (a: number, b: number) => (comparable ? variacion(a, b) : null);
  const pie = comparable ? "vs. periodo anterior" : "sin periodo anterior comparable";

  const actual = useMemo(() => resumirConsolidado(bd, rango), [bd, rango]);
  const previo = useMemo(
    () => resumirConsolidado(bd, rangoAnterior(rango)),
    [bd, rango]
  );
  const filas = useMemo(() => comparativoRedes(bd, rango), [bd, rango]);
  const mensual = useMemo(() => serieMensualPorRed(bd, rango, "impresiones"), [bd, rango]);
  const mensualInter = useMemo(
    () => serieMensualPorRed(bd, rango, "interacciones"),
    [bd, rango]
  );

  const series = REDES_CON_SERIE.map((id) => ({
    clave: id,
    nombre: REDES[id].nombre,
    color: REDES[id].color,
  }));

  // Mejor contenido del periodo, mezclando todas las redes.
  const destacados = useMemo(() => {
    const todos: (Publicacion & { red: RedConSerie })[] = [];
    for (const id of REDES_CON_SERIE) {
      for (const p of filtrarPosts(bd.redes[id].posts, rango)) {
        todos.push({ ...p, red: id });
      }
    }
    return todos
      .sort((a, b) => (b.impresiones ?? 0) - (a.impresiones ?? 0))
      .slice(0, 8);
  }, [bd, rango]);

  const reparto = filas
    .filter((f) => f.impresiones > 0)
    .map((f) => ({ nombre: f.nombre, valor: f.impresiones }));

  const seo = bd.seo;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          etiqueta="Impresiones"
          valor={actual.impresiones}
          variacion={vs(actual.impresiones, previo.impresiones)}
          detalle={pie}
        />
        <Kpi
          etiqueta="Interacciones"
          valor={actual.interacciones}
          variacion={vs(actual.interacciones, previo.interacciones)}
          detalle={pie}
          color="#0a66c2"
        />
        <Kpi
          etiqueta="Nuevos seguidores"
          valor={actual.seguidoresNuevos}
          variacion={vs(actual.seguidoresNuevos, previo.seguidoresNuevos)}
          detalle="neto en el periodo"
          color="#00a3a3"
          exacto
        />
        <Kpi
          etiqueta="Publicaciones"
          valor={actual.publicaciones}
          variacion={vs(actual.publicaciones, previo.publicaciones)}
          detalle="en todas las redes"
          color="#c13584"
          exacto
        />
        <Kpi
          etiqueta="Tasa de interacción"
          valor={porcentaje(actual.tasaInteraccion)}
          variacion={vs(actual.tasaInteraccion, previo.tasaInteraccion)}
          detalle="interacciones / impresiones"
          color="#f9c315"
        />
      </div>

      <Aviso>
        Las cifras consolidan <strong>Facebook, X, LinkedIn y TikTok</strong>, que son las
        redes con serie diaria exportable. En TikTok la métrica de alcance corresponde a
        <strong> reproducciones de video</strong>; en el resto, a impresiones.{" "}
        <button
          type="button"
          onClick={() => setVista("instagram")}
          className="font-semibold text-vino-700 underline underline-offset-2"
        >
          Instagram
        </button>{" "}
        y{" "}
        <button
          type="button"
          onClick={() => setVista("seo")}
          className="font-semibold text-vino-700 underline underline-offset-2"
        >
          la página web
        </button>{" "}
        se reportan aparte porque sus fuentes no entregan datos diarios.
      </Aviso>

      <div className="grid gap-5 lg:grid-cols-3">
        <Seccion
          titulo="Impresiones por red y mes"
          descripcion="Volumen de alcance aportado por cada canal."
          className="lg:col-span-2"
        >
          <BarrasApiladas datos={mensual} series={series} altura={300} />
        </Seccion>

        <Seccion titulo="Reparto del alcance" descripcion="Participación de cada red en el periodo.">
          <Dona
            datos={reparto}
            altura={300}
            colores={filas.filter((f) => f.impresiones > 0).map((f) => f.color)}
          />
        </Seccion>
      </div>

      <Seccion
        titulo="Interacciones por red y mes"
        descripcion="Reacciones, comentarios, compartidos y clics agregados."
      >
        <BarrasApiladas datos={mensualInter} series={series} altura={280} />
      </Seccion>

      <Seccion
        titulo="Comparativo por red"
        descripcion="Totales del periodo seleccionado. Haz clic en una fila para abrir el detalle de esa red."
      >
        <div className="scroll-fino -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-arena-200 text-left">
                {["Red", "Impresiones", "Interacciones", "Tasa", "Me gusta", "Comentarios", "Compartidos", "Seguidores", "Posts"].map(
                  (h, idx) => (
                    <th
                      key={h}
                      className={`pb-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-tinta-400 ${
                        idx === 0 ? "" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => setVista(f.id)}
                  className="cursor-pointer border-b border-arena-100 transition last:border-0 hover:bg-arena-50"
                >
                  <td className="py-3 pr-3">
                    <span className="inline-flex items-center gap-2 font-semibold text-tinta-900">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                      {f.nombre}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold tabular-nums text-tinta-900">
                    {numero(f.impresiones)}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">
                    {numero(f.interacciones)}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">
                    {decimal(f.tasaInteraccion, 2)} %
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">{numero(f.meGusta)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">{numero(f.comentarios)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">{numero(f.compartidos)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">
                    {f.seguidoresNuevos >= 0 ? "+" : ""}
                    {numero(f.seguidoresNuevos)}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">{numero(f.publicaciones)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <div className="grid gap-5 lg:grid-cols-3">
        <Seccion
          titulo="Contenido con mayor alcance"
          descripcion="Las publicaciones más vistas del periodo, en cualquier red."
          className="lg:col-span-2"
        >
          <ol className="space-y-3">
            {destacados.map((p, idx) => {
              const enlace = enlaceSeguro(p.enlace);
              return (
                <li key={`${p.red}-${idx}`} className="flex gap-3">
                <span className="mt-0.5 w-5 shrink-0 text-[13px] font-bold text-tinta-300">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-tinta-700">{recortar(p.texto, 120)}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-tinta-400">
                    <Etiqueta color={REDES[p.red].color}>{REDES[p.red].nombre}</Etiqueta>
                    <span>{fechaCorta(p.fecha, true)}</span>
                    {enlace && (
                      <a
                        href={enlace}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-vino-700 underline-offset-2 hover:underline"
                      >
                        Ver
                      </a>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[15px] font-bold tabular-nums text-tinta-900">
                    {compacto(p.impresiones ?? 0)}
                  </p>
                  <p className="text-[11px] text-tinta-400">impresiones</p>
                </div>
                </li>
              );
            })}
          </ol>
        </Seccion>

        <div className="space-y-5">
          <Seccion
            titulo="Página web"
            descripcion={`Semrush · ${seo.periodo.etiqueta}`}
            acciones={
              <button
                type="button"
                onClick={() => setVista("seo")}
                className="text-[12px] font-semibold text-vino-700 hover:underline"
              >
                Ver detalle
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Dato etiqueta="Visitas" valor={compacto(seo.trafico.visitas)} />
              <Dato etiqueta="Visitantes únicos" valor={compacto(seo.trafico.visitantesUnicos)} />
              <Dato etiqueta="Páginas / visita" valor={decimal(seo.trafico.paginasPorVisita)} />
              <Dato etiqueta="Rebote" valor={`${decimal(seo.trafico.porcentajeRebote)} %`} />
            </div>
            <div className="mt-4">
              <p className="tarjeta-titulo mb-2">Canales</p>
              <ListaBarras
                datos={seo.canales.filter((c) => c.valor > 0).map((c) => ({ nombre: c.nombre, valor: c.valor }))}
                color="#0f766e"
              />
            </div>
          </Seccion>

          <Seccion titulo="Ritmo de publicación" descripcion="Publicaciones por red en el periodo.">
            <ListaBarras
              datos={filas.map((f) => ({ nombre: f.nombre, valor: f.publicaciones }))}
              color="#82384f"
            />
          </Seccion>
        </div>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg bg-arena-50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-tinta-400">{etiqueta}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-tinta-900">{valor}</p>
    </div>
  );
}
