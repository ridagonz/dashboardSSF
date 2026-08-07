"use client";

import { useCallback, useRef, useState } from "react";
import { useAlmacen } from "@/lib/almacen";
import { analizarArchivos, type Resultado } from "@/lib/importar";
import { REDES } from "@/lib/redes";
import type { DatosInstagram, DatosSeo } from "@/lib/tipos";
import { Aviso, Etiqueta } from "./ui";

type Pestana = "archivos" | "instagram" | "seo";

export function PanelActualizar({ onCerrar }: { onCerrar: () => void }) {
  const {
    bd,
    aplicar,
    actualizarBd,
    restablecer,
    personalizado,
    persistenciaFallida,
  } = useAlmacen();
  const [pestana, setPestana] = useState<Pestana>("archivos");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tinta-900/40 p-4 py-8 sin-imprimir">
      <div className="w-full max-w-3xl rounded-2xl border border-arena-200 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-arena-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-tinta-900">Actualizar datos</h2>
            <p className="mt-0.5 text-[13px] text-tinta-500">
              Carga los archivos que exporta cada plataforma. Los datos quedan guardados en
              este navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-tinta-400 transition hover:bg-arena-100 hover:text-tinta-700"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <nav className="flex gap-1 border-b border-arena-200 px-6 pt-3">
          {(
            [
              ["archivos", "Archivos CSV / XLS"],
              ["instagram", "Instagram (manual)"],
              ["seo", "SEO (manual)"],
            ] as [Pestana, string][]
          ).map(([id, texto]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestana(id)}
              className={`rounded-t-lg border-b-2 px-3 py-2 text-[13px] font-semibold transition ${
                pestana === id
                  ? "border-vino-700 text-vino-700"
                  : "border-transparent text-tinta-400 hover:text-tinta-700"
              }`}
            >
              {texto}
            </button>
          ))}
        </nav>

        <div className="px-6 py-5">
          {persistenciaFallida && (
            <Aviso tono="alerta">
              Los cambios están visibles, pero el navegador no pudo guardarlos. Libera espacio
              de almacenamiento o habilita los datos del sitio antes de cerrar la página.
            </Aviso>
          )}
          <div className={persistenciaFallida ? "mt-4" : ""}>
          {pestana === "archivos" && <ZonaArchivos onAplicar={aplicar} />}
          {pestana === "instagram" && (
            <FormularioInstagram
              datos={bd.redes.instagram}
              onGuardar={(ig) => actualizarBd((c) => { c.redes.instagram = ig; })}
            />
          )}
          {pestana === "seo" && (
            <FormularioSeo
              datos={bd.seo}
              onGuardar={(seo) => actualizarBd((c) => { c.seo = seo; })}
            />
          )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-arena-200 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              if (confirm("Se descartarán los datos cargados en este navegador y se volverá a la carga inicial. ¿Continuar?")) {
                restablecer();
                onCerrar();
              }
            }}
            disabled={!personalizado}
            className="boton text-[13px] text-tinta-400 hover:text-rose-700 disabled:opacity-40"
          >
            Restablecer a los datos originales
          </button>
          <button type="button" onClick={onCerrar} className="boton-primario">
            Listo
          </button>
        </footer>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Carga de archivos
// --------------------------------------------------------------------------
function ZonaArchivos({ onAplicar }: { onAplicar: (r: Resultado[]) => void }) {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [aplicado, setAplicado] = useState(false);
  const [sobre, setSobre] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const procesar = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setCargando(true);
    setAplicado(false);
    const res = await analizarArchivos([...files]);
    setResultados(res);
    setCargando(false);
  }, []);

  const reconocidos = resultados.filter((r) => r.reconocido);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => { e.preventDefault(); setSobre(false); void procesar(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
          sobre ? "border-vino-700 bg-vino-50" : "border-arena-300 bg-arena-50 hover:border-vino-300"
        }`}
      >
        <input
          ref={input}
          type="file"
          multiple
          accept=".csv,.xls,.xlsx,.txt"
          className="hidden"
          onChange={(e) => void procesar(e.target.files)}
        />
        <svg className="mx-auto mb-3" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#82384f" strokeWidth="1.8">
          <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-semibold text-tinta-900">
          {cargando ? "Leyendo archivos…" : "Arrastra aquí los archivos o haz clic para elegirlos"}
        </p>
        <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-tinta-500">
          Puedes soltar varios a la vez. El tablero reconoce automáticamente a qué red
          pertenece cada archivo.
        </p>
      </div>

      {resultados.length > 0 && (
        <ul className="space-y-2">
          {resultados.map((r, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 ${
                r.reconocido ? "border-arena-200 bg-white" : "border-amber-200 bg-amber-50"
              }`}
            >
              <span className={`mt-0.5 text-[15px] ${r.reconocido ? "text-emerald-600" : "text-amber-600"}`}>
                {r.reconocido ? "✓" : "!"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-tinta-900">{r.archivo}</p>
                <p className="text-[12px] leading-relaxed text-tinta-500">{r.descripcion}</p>
              </div>
              {r.reconocido && r.red && (
                <div className="flex shrink-0 items-center gap-2">
                  <Etiqueta color={REDES[r.red].color}>{REDES[r.red].nombre}</Etiqueta>
                  <span className="text-[12px] tabular-nums text-tinta-400">{r.filas} filas</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {reconocidos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-tinta-500">
            Los datos nuevos se fusionan por fecha y por publicación: se reemplaza lo que
            coincide y se conserva el histórico anterior.
          </p>
          <button
            type="button"
            className="boton-primario"
            onClick={() => {
              onAplicar(reconocidos);
              setAplicado(true);
            }}
            disabled={aplicado}
          >
            {aplicado ? "✓ Datos aplicados" : `Aplicar ${reconocidos.length} archivo(s)`}
          </button>
        </div>
      )}

      <Aviso>
        <strong className="font-semibold">De dónde sale cada archivo.</strong>
        <ul className="mt-1.5 space-y-1 pl-4">
          <li className="list-disc"><strong>X:</strong> Analytics → Cuenta y Contenido → Exportar CSV.</li>
          <li className="list-disc"><strong>Facebook:</strong> Meta Business Suite → Insights → Contenido → Exportar CSV.</li>
          <li className="list-disc"><strong>LinkedIn:</strong> Página → Analytics → Contenido y Seguidores → Exportar XLS.</li>
          <li className="list-disc"><strong>TikTok:</strong> Business Suite → Analytics → Overview, Content y Followers → Exportar CSV.</li>
          <li className="list-disc"><strong>Instagram y SEO:</strong> se capturan a mano en las otras pestañas de esta ventana.</li>
        </ul>
      </Aviso>
    </div>
  );
}

// --------------------------------------------------------------------------
// Formularios manuales
// --------------------------------------------------------------------------
function CampoNum({
  etiqueta,
  valor,
  onChange,
  paso = "1",
}: {
  etiqueta: string;
  valor: number;
  onChange: (v: number) => void;
  paso?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-tinta-500">{etiqueta}</span>
      <input
        type="number"
        step={paso}
        className="campo w-full"
        value={Number.isFinite(valor) ? valor : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function FormularioInstagram({
  datos,
  onGuardar,
}: {
  datos: DatosInstagram;
  onGuardar: (d: DatosInstagram) => void;
}) {
  const [f, setF] = useState<DatosInstagram>(() => JSON.parse(JSON.stringify(datos)));
  const [ok, setOk] = useState(false);

  const set = (fn: (d: DatosInstagram) => void) => {
    setF((prev) => {
      const c = JSON.parse(JSON.stringify(prev)) as DatosInstagram;
      fn(c);
      return c;
    });
    setOk(false);
  };

  return (
    <div className="space-y-5">
      <Aviso tono="alerta">
        Instagram no ofrece exportación en CSV: estas cifras se transcriben del panel de
        Meta Business Suite. Ajusta el periodo para que coincida con el que aparece en el
        screenshot.
      </Aviso>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-tinta-500">Periodo desde</span>
          <input
            type="date"
            className="campo w-full"
            value={f.periodo.desde ?? ""}
            onChange={(e) => set((d) => { d.periodo.desde = e.target.value || null; })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-tinta-500">Periodo hasta</span>
          <input
            type="date"
            className="campo w-full"
            value={f.periodo.hasta ?? ""}
            onChange={(e) => set((d) => { d.periodo.hasta = e.target.value || null; })}
          />
        </label>
        <CampoNum etiqueta="Seguidores" valor={f.perfil.seguidores} onChange={(v) => set((d) => { d.perfil.seguidores = v; })} />
        <CampoNum etiqueta="Me gusta acumulados" valor={f.perfil.meGustaAcumulados} onChange={(v) => set((d) => { d.perfil.meGustaAcumulados = v; })} />
      </div>

      <div>
        <p className="tarjeta-titulo mb-2">Métricas del periodo</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CampoNum etiqueta="Visualizaciones" valor={f.resumen.visualizaciones} onChange={(v) => set((d) => { d.resumen.visualizaciones = v; })} />
          <CampoNum etiqueta="Alcance" valor={f.resumen.alcance} onChange={(v) => set((d) => { d.resumen.alcance = v; })} />
          <CampoNum etiqueta="Interacciones" valor={f.resumen.interacciones} onChange={(v) => set((d) => { d.resumen.interacciones = v; })} />
          <CampoNum etiqueta="Visitas al perfil" valor={f.resumen.visitasPerfil} onChange={(v) => set((d) => { d.resumen.visitasPerfil = v; })} />
          <CampoNum etiqueta="Me gusta" valor={f.resumen.meGusta} onChange={(v) => set((d) => { d.resumen.meGusta = v; })} />
          <CampoNum etiqueta="Comentarios" valor={f.resumen.comentarios} onChange={(v) => set((d) => { d.resumen.comentarios = v; })} />
          <CampoNum etiqueta="Compartidos" valor={f.resumen.compartidos} onChange={(v) => set((d) => { d.resumen.compartidos = v; })} />
          <CampoNum etiqueta="Guardados" valor={f.resumen.guardados} onChange={(v) => set((d) => { d.resumen.guardados = v; })} />
          <CampoNum etiqueta="Seguidores nuevos" valor={f.resumen.seguidoresNuevos} onChange={(v) => set((d) => { d.resumen.seguidoresNuevos = v; })} />
          <CampoNum etiqueta="Var. visualizaciones %" paso="0.1" valor={f.resumen.visualizacionesVar} onChange={(v) => set((d) => { d.resumen.visualizacionesVar = v; })} />
          <CampoNum etiqueta="Var. alcance %" paso="0.1" valor={f.resumen.alcanceVar} onChange={(v) => set((d) => { d.resumen.alcanceVar = v; })} />
          <CampoNum etiqueta="Var. interacciones %" paso="0.1" valor={f.resumen.interaccionesVar} onChange={(v) => set((d) => { d.resumen.interaccionesVar = v; })} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="tarjeta-titulo">Publicaciones destacadas</p>
          <button
            type="button"
            className="text-[12px] font-semibold text-vino-700 hover:underline"
            onClick={() =>
              set((d) => {
                d.publicaciones.push({ fecha: "", hora: "", titulo: "", tipo: "Reel", visualizaciones: 0 });
              })
            }
          >
            + Agregar publicación
          </button>
        </div>
        <div className="space-y-2">
          {f.publicaciones.map((p, idx) => (
            <div key={idx} className="grid grid-cols-12 items-center gap-2">
              <input
                type="date"
                className="campo col-span-3"
                value={p.fecha}
                onChange={(e) => set((d) => { d.publicaciones[idx].fecha = e.target.value; })}
              />
              <input
                className="campo col-span-4"
                placeholder="Título"
                value={p.titulo}
                onChange={(e) => set((d) => { d.publicaciones[idx].titulo = e.target.value; })}
              />
              <select
                className="campo col-span-2"
                value={p.tipo}
                onChange={(e) => set((d) => { d.publicaciones[idx].tipo = e.target.value; })}
              >
                {["Reel", "Foto", "Varias fotos", "Video", "Historia"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <input
                type="number"
                className="campo col-span-2"
                placeholder="Vistas"
                value={p.visualizaciones}
                onChange={(e) => set((d) => { d.publicaciones[idx].visualizaciones = Number(e.target.value); })}
              />
              <button
                type="button"
                className="col-span-1 rounded-lg py-2 text-tinta-400 transition hover:bg-rose-50 hover:text-rose-600"
                onClick={() => set((d) => { d.publicaciones.splice(idx, 1); })}
                aria-label="Eliminar"
              >
                ×
              </button>
            </div>
          ))}
          {!f.publicaciones.length && (
            <p className="py-3 text-center text-[13px] text-tinta-400">
              Aún no has agregado publicaciones.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="boton-primario"
          onClick={() => {
            const limpio: DatosInstagram = {
              ...f,
              sinDatos: f.resumen.visualizaciones === 0 && f.resumen.interacciones === 0,
              publicaciones: f.publicaciones.filter((p) => p.fecha && p.titulo),
            };
            onGuardar(limpio);
            setOk(true);
          }}
        >
          Guardar datos de Instagram
        </button>
        {ok && <span className="text-[13px] font-medium text-emerald-700">✓ Guardado</span>}
      </div>
    </div>
  );
}

function FormularioSeo({
  datos,
  onGuardar,
}: {
  datos: DatosSeo;
  onGuardar: (d: DatosSeo) => void;
}) {
  const [f, setF] = useState<DatosSeo>(() => JSON.parse(JSON.stringify(datos)));
  const [ok, setOk] = useState(false);

  const set = (fn: (d: DatosSeo) => void) => {
    setF((prev) => {
      const c = JSON.parse(JSON.stringify(prev)) as DatosSeo;
      fn(c);
      return c;
    });
    setOk(false);
  };

  return (
    <div className="space-y-5">
      <Aviso tono="alerta">
        El informe mensual de Semrush llega en PDF. Estas cifras se transcriben del
        apartado <em>Traffic Analytics</em> y <em>Backlinks</em>.
      </Aviso>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-tinta-500">Periodo</span>
          <input
            className="campo w-full"
            value={f.periodo.etiqueta}
            onChange={(e) => set((d) => { d.periodo.etiqueta = e.target.value; })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-tinta-500">Generado el</span>
          <input
            type="date"
            className="campo w-full"
            value={f.periodo.generado}
            onChange={(e) => set((d) => { d.periodo.generado = e.target.value; })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-tinta-500">Dominio</span>
          <input
            className="campo w-full"
            value={f.dominio}
            onChange={(e) => set((d) => { d.dominio = e.target.value; })}
          />
        </label>
      </div>

      <div>
        <p className="tarjeta-titulo mb-2">Tráfico</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <CampoNum etiqueta="Visitas" valor={f.trafico.visitas} onChange={(v) => set((d) => { d.trafico.visitas = v; })} />
          <CampoNum etiqueta="Visitantes únicos" valor={f.trafico.visitantesUnicos} onChange={(v) => set((d) => { d.trafico.visitantesUnicos = v; })} />
          <CampoNum etiqueta="Páginas / visita" paso="0.01" valor={f.trafico.paginasPorVisita} onChange={(v) => set((d) => { d.trafico.paginasPorVisita = v; })} />
          <CampoNum etiqueta="Duración media (seg)" valor={f.trafico.duracionMediaSeg} onChange={(v) => set((d) => { d.trafico.duracionMediaSeg = v; })} />
          <CampoNum etiqueta="Rebote %" paso="0.01" valor={f.trafico.porcentajeRebote} onChange={(v) => set((d) => { d.trafico.porcentajeRebote = v; })} />
          <CampoNum etiqueta="Var. visitas %" paso="0.01" valor={f.trafico.visitasVar} onChange={(v) => set((d) => { d.trafico.visitasVar = v; })} />
        </div>
      </div>

      <div>
        <p className="tarjeta-titulo mb-2">Canales de tráfico (visitantes únicos)</p>
        <div className="space-y-2">
          {f.canales.map((c, idx) => (
            <div key={idx} className="grid grid-cols-12 items-center gap-2">
              <input
                className="campo col-span-6"
                value={c.nombre}
                onChange={(e) => set((d) => { d.canales[idx].nombre = e.target.value; })}
              />
              <input
                type="number"
                className="campo col-span-3"
                value={c.valor}
                onChange={(e) => set((d) => { d.canales[idx].valor = Number(e.target.value); })}
              />
              <input
                type="number"
                step="0.1"
                className="campo col-span-3"
                value={c.porcentaje}
                onChange={(e) => set((d) => { d.canales[idx].porcentaje = Number(e.target.value); })}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="tarjeta-titulo mb-2">Backlinks</p>
        <div className="grid grid-cols-3 gap-3">
          <CampoNum etiqueta="Total" valor={f.backlinks.total} onChange={(v) => set((d) => { d.backlinks.total = v; })} />
          <CampoNum etiqueta="Dominios de referencia" valor={f.backlinks.dominiosReferencia} onChange={(v) => set((d) => { d.backlinks.dominiosReferencia = v; })} />
          <CampoNum etiqueta="IPs de referencia" valor={f.backlinks.ipsReferencia} onChange={(v) => set((d) => { d.backlinks.ipsReferencia = v; })} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="boton-primario" onClick={() => { onGuardar(f); setOk(true); }}>
          Guardar datos de SEO
        </button>
        {ok && <span className="text-[13px] font-medium text-emerald-700">✓ Guardado</span>}
      </div>
    </div>
  );
}
