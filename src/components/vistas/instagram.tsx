"use client";

import { useAlmacen } from "@/lib/almacen";
import { compacto, decimal, fechaCorta, numero, porcentaje } from "@/lib/formato";
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
          <div className="space-y-3 text-left">
            <p>
              Los screenshots recibidos hasta ahora no corresponden a Instagram: uno es el
              panel de <strong>TikTok Analytics</strong> y los otros cuatro son de{" "}
              <strong>Facebook</strong> en Meta Business Suite. Ambos ya están reflejados en
              sus respectivas pestañas.
            </p>
            <p>
              Para completar esta sección, abre{" "}
              <em>Meta Business Suite → Instagram → Insights</em>, ajusta el periodo y
              transcribe las cifras en{" "}
              <strong>Actualizar datos → Instagram (manual)</strong>. Instagram no ofrece
              exportación en CSV, por eso este canal se captura a mano.
            </p>
          </div>
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
  const periodo =
    ig.periodo.desde && ig.periodo.hasta
      ? `${fechaCorta(ig.periodo.desde, true)} – ${fechaCorta(ig.periodo.hasta, true)}`
      : "periodo sin definir";

  return (
    <div className="space-y-5">
      <Aviso>
        Datos capturados manualmente desde Meta Business Suite para el periodo{" "}
        <strong>{periodo}</strong>. Esta sección no responde al selector de fechas general
        porque Instagram no entrega serie diaria exportable.
      </Aviso>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi etiqueta="Visualizaciones" valor={r.visualizaciones} variacion={r.visualizacionesVar || null} color="#c13584" />
        <Kpi etiqueta="Alcance" valor={r.alcance} variacion={r.alcanceVar || null} color="#c13584" />
        <Kpi etiqueta="Interacciones" valor={r.interacciones} variacion={r.interaccionesVar || null} color="#f9c315" />
        <Kpi etiqueta="Visitas al perfil" valor={r.visitasPerfil} variacion={r.visitasPerfilVar || null} exacto />
        <Kpi etiqueta="Seguidores" valor={ig.perfil.seguidores} detalle="al cierre" exacto />
        <Kpi
          etiqueta="Tasa de interacción"
          valor={porcentaje(r.visualizaciones ? (r.interacciones / r.visualizaciones) * 100 : 0)}
        />
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
          {ig.porFormato.length > 0 && (
            <div className="mt-5">
              <p className="tarjeta-titulo mb-2">Visualizaciones por formato</p>
              <ListaBarras
                datos={ig.porFormato.map((f) => ({ nombre: f.nombre, valor: f.visualizaciones }))}
                color="#c13584"
              />
            </div>
          )}
        </Seccion>

        <Seccion titulo="Origen de las visualizaciones">
          {ig.origenAudiencia.length ? (
            <Dona
              datos={ig.origenAudiencia.map((o) => ({ nombre: o.nombre, valor: o.porcentaje }))}
              sufijo=" %"
              altura={250}
              colores={["#c13584", "#671c35"]}
            />
          ) : (
            <p className="py-8 text-center text-sm text-tinta-400">Sin datos capturados.</p>
          )}
        </Seccion>
      </div>

      {ig.publicaciones.length > 0 && (
        <Seccion titulo="Publicaciones destacadas" descripcion="Contenido con más visualizaciones del periodo.">
          <ol className="space-y-3">
            {[...ig.publicaciones]
              .sort((a, b) => b.visualizaciones - a.visualizaciones)
              .map((p, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 shrink-0 text-[13px] font-bold text-tinta-300">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-tinta-700">{p.titulo}</p>
                    <p className="mt-1 flex items-center gap-2 text-[12px] text-tinta-400">
                      <Etiqueta color="#c13584">{p.tipo}</Etiqueta>
                      <span>
                        {fechaCorta(p.fecha, true)} {p.hora}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-bold tabular-nums text-tinta-900">
                      {compacto(p.visualizaciones)}
                    </p>
                    <p className="text-[11px] text-tinta-400">visualizaciones</p>
                  </div>
                </li>
              ))}
          </ol>
        </Seccion>
      )}

      {ig.historias.length > 0 && (
        <Seccion titulo="Historias destacadas">
          <ListaBarras
            datos={ig.historias.map((h) => ({
              nombre: `${h.titulo} · ${fechaCorta(h.fecha)}`,
              valor: h.visualizaciones,
            }))}
            color="#82384f"
            formato={(v) => decimal(v, 0)}
          />
        </Seccion>
      )}
    </div>
  );
}
