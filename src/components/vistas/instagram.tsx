"use client";

import { useAlmacen } from "@/lib/almacen";
import { fechaCorta, numero, porcentaje } from "@/lib/formato";
import { Dona } from "../graficos";
import { Aviso, EstadoVacio, Etiqueta, Kpi, ListaBarras, Seccion } from "../ui";

export function VistaInstagram({ onAbrirPanel }: { onAbrirPanel: () => void }) {
  const { bd } = useAlmacen();
  const ig = bd.redes.instagram;

  if (ig.sinDatos) {
    return (
      <EstadoVacio
        titulo="Instagram todavía no tiene datos cargados"
        mensaje={
          <p>
            Carga las cifras de Meta Business Suite desde <strong>Actualizar datos →
            Instagram (manual)</strong>.
          </p>
        }
        accion={
          <button type="button" className="boton-primario mt-1" onClick={onAbrirPanel}>
            Cargar datos de Instagram
          </button>
        }
      />
    );
  }

  const r = ig.resumen;
  const publicaciones = [...ig.publicaciones].sort(
    (a, b) => b.visualizaciones - a.visualizaciones
  );
  const periodo =
    ig.periodo.desde && ig.periodo.hasta
      ? `${fechaCorta(ig.periodo.desde, true)} – ${fechaCorta(ig.periodo.hasta, true)}`
      : "periodo sin definir";
  const promedioVistas = publicaciones.length
    ? r.visualizaciones / publicaciones.length
    : 0;

  return (
    <div className="space-y-5">
      <Aviso>
        Métricas de <strong>{publicaciones.length} publicaciones</strong> capturadas desde
        Meta Business Suite para <strong>{periodo}</strong>. El ranking está ordenado de
        mejor a peor por visualizaciones.
      </Aviso>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi etiqueta="Visualizaciones" valor={r.visualizaciones} color="#c13584" />
        <Kpi etiqueta="Interacciones" valor={r.interacciones} color="#f9c315" />
        <Kpi etiqueta="Publicaciones" valor={publicaciones.length} exacto color="#c13584" />
        <Kpi etiqueta="Vistas / publicación" valor={Math.round(promedioVistas)} />
        <Kpi
          etiqueta="Tasa de interacción"
          valor={porcentaje(r.visualizaciones ? (r.interacciones / r.visualizaciones) * 100 : 0)}
          detalle="sobre visualizaciones"
        />
        <Kpi
          etiqueta="Espectadores acumulados"
          valor={r.alcance}
          detalle="suma por publicación"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Seccion
          titulo="Publicaciones con más visualizaciones"
          descripcion="Top 8 del mes; la tabla inferior contiene el ranking completo."
          className="lg:col-span-2"
        >
          <ListaBarras
            datos={publicaciones.slice(0, 8).map((p, indice) => ({
              nombre: `${indice + 1}. ${p.titulo}`,
              valor: p.visualizaciones,
            }))}
            color="#c13584"
          />
        </Seccion>

        <Seccion
          titulo="Origen de las visualizaciones"
          descripcion="Estimación ponderada por las vistas de cada publicación."
        >
          <Dona
            datos={ig.origenAudiencia.map((o) => ({
              nombre: o.nombre,
              valor: o.porcentaje,
            }))}
            sufijo=" %"
            altura={250}
            colores={["#c13584", "#671c35"]}
          />
        </Seccion>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Seccion titulo="Desglose de interacciones" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Me gusta", r.meGusta],
              ["Comentarios", r.comentarios],
              ["Compartidos", r.compartidos],
              ["Guardados", r.guardados],
            ].map(([etiqueta, valor]) => (
              <div key={String(etiqueta)} className="rounded-lg bg-arena-50 px-3 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-tinta-400">
                  {etiqueta}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-tinta-900">
                  {numero(Number(valor))}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-tinta-400">
            El total de interacciones reportado por Meta puede incluir acciones adicionales;
            por eso no siempre coincide con la suma de estas cuatro categorías visibles.
          </p>
        </Seccion>

        <Seccion titulo="Visualizaciones por formato">
          <ListaBarras
            datos={ig.porFormato.map((f) => ({
              nombre: f.publicaciones
                ? `${f.nombre} · ${f.publicaciones} publicaciones`
                : f.nombre,
              valor: f.visualizaciones,
            }))}
            color="#82384f"
          />
        </Seccion>
      </div>

      <Seccion
        titulo="Ranking completo: de mejor a peor"
        descripcion="Orden descendente por visualizaciones. Las demás métricas permiten comparar la calidad de la respuesta obtenida."
      >
        <div className="scroll-fino -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[1280px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-arena-200 text-left">
                {[
                  "#",
                  "Publicación",
                  "Visualizaciones",
                  "Espectadores",
                  "Interacciones",
                  "Cuentas que interactuaron",
                  "Me gusta",
                  "Comentarios",
                  "Compartidos",
                  "Guardados",
                  "No seguidores",
                ].map((encabezado, indice) => (
                  <th
                    key={encabezado}
                    className={`pb-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-tinta-400 ${
                      indice > 1 ? "text-right" : ""
                    }`}
                  >
                    {encabezado}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {publicaciones.map((p, indice) => (
                <tr
                  key={`${p.fecha}-${p.hora}-${p.titulo}`}
                  className="border-b border-arena-100 align-top last:border-0"
                >
                  <td className="py-3 pr-3 font-semibold tabular-nums text-tinta-400">
                    {indice + 1}
                  </td>
                  <td className="max-w-[390px] py-3 pr-5">
                    <div className="flex items-start gap-2">
                      {indice < 3 && (
                        <Etiqueta color={indice === 0 ? "#a16207" : "#671c35"}>
                          Top {indice + 1}
                        </Etiqueta>
                      )}
                      <div>
                        <p className="font-medium leading-snug text-tinta-700">{p.titulo}</p>
                        <p className="mt-1 text-[12px] text-tinta-400">
                          {fechaCorta(p.fecha, true)} · {p.tipo}
                        </p>
                      </div>
                    </div>
                  </td>
                  {[
                    p.visualizaciones,
                    p.espectadores,
                    p.interacciones,
                    p.cuentasInteractuaron,
                    p.meGusta,
                    p.comentarios,
                    p.compartidos,
                    p.guardados,
                  ].map((valor, columna) => (
                    <td
                      key={columna}
                      className={`py-3 pr-3 text-right tabular-nums ${
                        columna === 0 ? "font-bold text-tinta-900" : "text-tinta-600"
                      }`}
                    >
                      {numero(Number(valor ?? 0))}
                    </td>
                  ))}
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">
                    {porcentaje(100 - Number(p.audienciaSeguidoresPct ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-tinta-400">
          “Espectadores” y “cuentas que interactuaron” son métricas por publicación. Sus
          sumas no representan personas únicas del mes, porque una misma cuenta puede aparecer
          en varias publicaciones.
        </p>
      </Seccion>
    </div>
  );
}
