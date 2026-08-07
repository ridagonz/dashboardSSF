"use client";

import { useAlmacen } from "@/lib/almacen";
import { compacto, decimal, duracion, fechaLarga, numero } from "@/lib/formato";
import { BarrasSimples, Dona } from "../graficos";
import { Aviso, Kpi, ListaBarras, Seccion } from "../ui";

export function VistaSeo() {
  const { bd } = useAlmacen();
  const seo = bd.seo;
  const t = seo.trafico;

  const canales = seo.canales.filter((c) => c.valor > 0);

  return (
    <div className="space-y-5">
      <Aviso>
        Informe de <strong>Semrush</strong> para {seo.dominio} · {seo.periodo.etiqueta}.
        Generado el {fechaLarga(seo.periodo.generado)}. Las cifras son mensuales, por lo que
        esta sección no responde al selector de fechas general.
      </Aviso>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi etiqueta="Visitas" valor={t.visitas} variacion={t.visitasVar} color="#0f766e" />
        <Kpi
          etiqueta="Visitantes únicos"
          valor={t.visitantesUnicos}
          variacion={t.visitantesUnicosVar}
          color="#0f766e"
        />
        <Kpi
          etiqueta="Páginas / visita"
          valor={decimal(t.paginasPorVisita)}
          variacion={t.paginasPorVisitaVar}
        />
        <Kpi
          etiqueta="Duración media"
          valor={duracion(t.duracionMediaSeg)}
          variacion={t.duracionMediaVar}
        />
        <Kpi
          etiqueta="Porcentaje de rebote"
          valor={`${decimal(t.porcentajeRebote)} %`}
          variacion={t.porcentajeReboteVar}
          detalle="menos es mejor"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Seccion
          titulo="Canales de tráfico"
          descripcion="Visitantes únicos según su origen."
          className="lg:col-span-2"
        >
          <BarrasSimples
            datos={canales.map((c) => ({ nombre: c.nombre, valor: c.valor }))}
            color="#0f766e"
            horizontal
            altura={Math.max(220, canales.length * 46)}
          />
        </Seccion>

        <Seccion titulo="Reparto por canal">
          <Dona
            datos={canales.map((c) => ({ nombre: c.nombre, valor: c.valor }))}
            altura={260}
            colores={["#0f766e", "#671c35", "#0a66c2", "#f9c315", "#b76f87", "#d6ccbc"]}
          />
        </Seccion>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Seccion
          titulo="Tráfico por país"
          descripcion="Distribución geográfica y reparto entre escritorio y móvil."
        >
          <div className="scroll-fino overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-arena-200 text-left">
                  {["País", "Visitas", "Cuota", "Escritorio", "Móvil"].map((h, i) => (
                    <th
                      key={h}
                      className={`pb-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-tinta-400 ${
                        i === 0 ? "" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seo.paises.map((p) => (
                  <tr key={p.nombre} className="border-b border-arena-100 last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-tinta-900">{p.nombre}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-tinta-900">
                      {compacto(p.visitas)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-tinta-600">
                      {decimal(p.porcentaje)} %
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-tinta-600">
                      {decimal(p.escritorio, 0)} %
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-tinta-600">
                      {p.movil ? `${decimal(p.movil, 0)} %` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>

        <Seccion titulo="Backlinks" descripcion="Enlaces externos que apuntan al dominio.">
          <div className="grid grid-cols-3 gap-3">
            <Dato etiqueta="Total" valor={compacto(seo.backlinks.total)} />
            <Dato etiqueta="Dominios" valor={numero(seo.backlinks.dominiosReferencia)} />
            <Dato etiqueta="IPs" valor={compacto(seo.backlinks.ipsReferencia)} />
          </div>
          <div className="mt-4">
            <p className="tarjeta-titulo mb-2">Tipo de enlace</p>
            <ListaBarras
              datos={seo.backlinks.tipos
                .filter((x) => x.valor > 0)
                .map((x) => ({ nombre: x.nombre, valor: x.valor }))}
              color="#0f766e"
            />
          </div>
          <div className="mt-4 rounded-lg bg-arena-50 px-3.5 py-3">
            <p className="text-[12px] leading-relaxed text-tinta-600">
              <strong className="text-tinta-900">Tráfico de marca:</strong>{" "}
              {decimal(seo.marca.conMarca)} % con marca ·{" "}
              {decimal(seo.marca.sinMarca)} % sin marca. La totalidad de las visitas
              orgánicas llega por búsquedas genéricas, no por el nombre de la entidad.
            </p>
          </div>
        </Seccion>
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
