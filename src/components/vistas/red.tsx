"use client";

import { useMemo } from "react";
import { useAlmacen } from "@/lib/almacen";
import {
  filtrarPosts,
  filtrarSerie,
  hayComparativo,
  rangoAnterior,
  resumirRed,
  serieDiaria,
  serieMensual,
  ultimoValor,
  variacion,
} from "@/lib/datos";
import { PALETA_CATEGORIAS, REDES } from "@/lib/redes";
import { compacto, decimal, numero, porcentaje } from "@/lib/formato";
import { AreaTemporal, BarrasSimples, Dona, LineaTemporal } from "../graficos";
import { Aviso, Kpi, ListaBarras, Seccion, TablaPublicaciones } from "../ui";
import type {
  AudienciaLinkedin,
  AudienciaTiktok,
  Publicacion,
  RedId,
} from "@/lib/tipos";

const DIAS_PARA_MENSUAL = 100;

/** Advertencias metodologicas: cada plataforma define sus metricas distinto y
 *  omitirlo lleva a comparaciones equivocadas entre canales. */
const NOTAS: Record<RedId, React.ReactNode> = {
  x: (
    <>
      X mide de forma distinta las <strong>impresiones de la cuenta</strong> (serie
      diaria: impresiones obtenidas cada día) y las de <strong>cada publicación</strong>
      (acumuladas durante toda su vida). Por eso los dos totales no cuadran entre sí; no
      es un error del tablero sino de cómo exporta la plataforma.
    </>
  ),
  facebook: (
    <>
      La serie diaria atribuye a la fecha de publicación las métricas acumuladas de cada
      post, que es como Meta entrega el archivo de contenido. Las{" "}
      <strong>historias no vienen incluidas</strong> en este export.
    </>
  ),
  linkedin: (
    <>
      LinkedIn cuenta los <strong>clics dentro de las interacciones</strong>, por eso su
      tasa es mucho más alta que la del resto y no es comparable directamente con las
      demás redes.
    </>
  ),
  tiktok: (
    <>
      El export de contenido de TikTok entrega solo los videos de mejor desempeño, no la
      parrilla completa. El conteo de publicaciones de esta sección refleja ese
      subconjunto; las métricas agregadas sí cubren toda la cuenta.
    </>
  ),
  instagram: null,
};

export function VistaRed({ red }: { red: RedId }) {
  const { bd, rango, disponible } = useAlmacen();
  const comparable = hayComparativo(rango, disponible);
  const meta = REDES[red];
  const datos = bd.redes[red] as {
    daily: import("@/lib/tipos").SerieDia[];
    posts: Publicacion[];
    mixContenido?: { nombre: string; publicaciones: number; impresiones: number; interacciones: number }[];
    audiencia?: AudienciaLinkedin | AudienciaTiktok;
    perfil?: Record<string, number | string>;
  };

  const res = useMemo(() => resumirRed(datos, rango), [datos, rango]);
  const prev = useMemo(() => resumirRed(datos, rangoAnterior(rango)), [datos, rango]);
  const serie = useMemo(() => filtrarSerie(datos.daily, rango), [datos, rango]);
  const posts = useMemo(() => filtrarPosts(datos.posts, rango), [datos, rango]);

  const porMes = serie.length > DIAS_PARA_MENSUAL;
  const tendencia = useMemo(
    () =>
      porMes
        ? serieMensual(datos.daily, rango, ["impresiones", "interacciones"])
        : serieDiaria(datos.daily, rango, ["impresiones", "interacciones"]),
    [datos, rango, porMes]
  );

  const seguidores = useMemo(
    () =>
      porMes
        ? serieMensual(datos.daily, rango, ["seguidoresNuevos"])
        : serieDiaria(datos.daily, rango, ["seguidoresNuevos"]),
    [datos, rango, porMes]
  );

  if (!serie.length && !posts.length) {
    return (
      <Aviso tono="alerta">
        No hay datos de {meta.nombre} en el rango seleccionado. Amplía el periodo o carga
        el export más reciente desde <strong>Actualizar datos</strong>.
      </Aviso>
    );
  }

  return (
    <div className="space-y-5">
      <Kpis red={red} res={res} prev={prev} serie={serie} datos={datos} comparable={comparable} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Seccion
          titulo={`${meta.etiquetaAlcance} e interacciones`}
          descripcion={`${porMes ? "Agregado por mes" : "Evolución diaria"}. Cada serie usa su propia escala.`}
          className="lg:col-span-2"
        >
          <AreaTemporal
            datos={tendencia}
            porMes={porMes}
            altura={290}
            ejeDoble
            series={[
              { clave: "impresiones", nombre: meta.etiquetaAlcance, color: meta.color },
              { clave: "interacciones", nombre: "Interacciones", color: "#f9c315" },
            ]}
          />
        </Seccion>

        <Seccion
          titulo="Seguidores"
          descripcion={
            red === "tiktok"
              ? "Altas netas por periodo."
              : "Altas menos bajas en cada periodo."
          }
        >
          <LineaTemporal
            datos={seguidores}
            porMes={porMes}
            altura={290}
            series={[{ clave: "seguidoresNuevos", nombre: "Seguidores netos", color: "#00a3a3" }]}
          />
        </Seccion>
      </div>

      {red === "tiktok" && <BloqueTiktok datos={datos} rango={rango} />}
      {red === "linkedin" && <BloqueLinkedin datos={datos} />}
      {red === "facebook" && <BloqueFacebook datos={datos} posts={posts} />}
      {red === "x" && <BloqueX serie={serie} porMes={porMes} datos={datos} rango={rango} />}

      <Seccion
        titulo="Publicaciones destacadas"
        descripcion={`Las 10 publicaciones con más ${meta.etiquetaAlcance.toLowerCase()} del periodo.`}
      >
        <TablaPublicaciones
          posts={posts}
          metricaPrincipal={red === "tiktok" ? "visualizaciones" : "impresiones"}
          etiquetaPrincipal={meta.etiquetaAlcance}
          columnas={
            red === "linkedin"
              ? [
                  { clave: "interacciones", titulo: "Interacciones" },
                  { clave: "clics", titulo: "Clics" },
                  { clave: "meGusta", titulo: "Reacciones" },
                  { clave: "compartidos", titulo: "Compartidos" },
                ]
              : undefined
          }
        />
      </Seccion>

      {NOTAS[red] && <Aviso>{NOTAS[red]}</Aviso>}
    </div>
  );
}

// --------------------------------------------------------------------------
function Kpis({
  red,
  res,
  prev,
  serie,
  datos,
  comparable,
}: {
  red: RedId;
  res: import("@/lib/tipos").Resumen;
  prev: import("@/lib/tipos").Resumen;
  serie: import("@/lib/tipos").SerieDia[];
  datos: { audiencia?: AudienciaLinkedin | AudienciaTiktok };
  comparable: boolean;
}) {
  const meta = REDES[red];
  const vs = (a: number, b: number) => (comparable ? variacion(a, b) : null);
  const comun = (
    <>
      <Kpi
        etiqueta={meta.etiquetaAlcance}
        valor={res.impresiones}
        variacion={vs(res.impresiones, prev.impresiones)}
        color={meta.color}
      />
      <Kpi
        etiqueta="Interacciones"
        valor={res.interacciones}
        variacion={vs(res.interacciones, prev.interacciones)}
        color="#f9c315"
      />
      <Kpi
        etiqueta="Tasa de interacción"
        valor={porcentaje(res.tasaInteraccion)}
        variacion={vs(res.tasaInteraccion, prev.tasaInteraccion)}
      />
    </>
  );

  if (red === "tiktok") {
    const aud = datos.audiencia as AudienciaTiktok | undefined;
    const total = serie.length ? serie[serie.length - 1].seguidoresTotal ?? 0 : 0;
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {comun}
        <Kpi etiqueta="Visitas al perfil" valor={res.visitasPerfil} color="#00a3a3" />
        <Kpi
          etiqueta="Seguidores netos"
          valor={res.seguidoresNuevos}
          variacion={vs(res.seguidoresNuevos, prev.seguidoresNuevos)}
          exacto
          color="#00a3a3"
        />
        <Kpi
          etiqueta="Seguidores totales"
          valor={total || aud?.seguidoresTotal || 0}
          detalle="al cierre del periodo"
          exacto
        />
      </div>
    );
  }

  if (red === "x") {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {comun}
        <Kpi etiqueta="Visitas al perfil" valor={res.visitasPerfil} exacto />
        <Kpi
          etiqueta="Seguidores netos"
          valor={res.seguidoresNuevos}
          variacion={vs(res.seguidoresNuevos, prev.seguidoresNuevos)}
          exacto
          color="#00a3a3"
        />
        <Kpi etiqueta="Publicaciones" valor={res.publicaciones} exacto color="#c13584" />
      </div>
    );
  }

  if (red === "linkedin") {
    const aud = datos.audiencia as AudienciaLinkedin | undefined;
    const clics = serie.reduce((a, d) => a + (d.clics ?? 0), 0);
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {comun}
        <Kpi etiqueta="Clics" valor={clics} exacto color="#0a66c2" />
        <Kpi
          etiqueta="Seguidores nuevos"
          valor={res.seguidoresNuevos}
          variacion={vs(res.seguidoresNuevos, prev.seguidoresNuevos)}
          exacto
          color="#00a3a3"
        />
        <Kpi
          etiqueta="Base de seguidores"
          valor={aud?.totalUbicaciones ?? 0}
          detalle="con ubicación declarada"
          exacto
        />
      </div>
    );
  }

  // Facebook
  const visualizaciones = serie.reduce((a, d) => a + (d.visualizaciones ?? 0), 0);
  const alcance = serie.reduce((a, d) => a + (d.alcance ?? 0), 0);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {comun}
      <Kpi etiqueta="Visualizaciones" valor={visualizaciones} color="#1877f2" />
      <Kpi etiqueta="Espectadores" valor={alcance} detalle="personas alcanzadas" />
      <Kpi
        etiqueta="Seguimientos netos"
        valor={res.seguidoresNuevos}
        variacion={vs(res.seguidoresNuevos, prev.seguidoresNuevos)}
        exacto
        color="#00a3a3"
      />
    </div>
  );
}

// --------------------------------------------------------------------------
function BloqueTiktok({
  datos,
  rango,
}: {
  datos: { daily: import("@/lib/tipos").SerieDia[]; audiencia?: AudienciaLinkedin | AudienciaTiktok };
  rango: import("@/lib/tipos").RangoFechas;
}) {
  const aud = datos.audiencia as AudienciaTiktok | undefined;
  const totalCierre = ultimoValor(datos.daily, rango, "seguidoresTotal");
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-3">
        <Seccion
          titulo="Cuándo está conectada la audiencia"
          descripcion="Promedio de seguidores activos por hora del día (hora local)."
          className="lg:col-span-2"
        >
          <BarrasSimples
            datos={(aud?.actividadPorHora ?? []).map((a) => ({
              nombre: `${String(a.hora).padStart(2, "0")}h`,
              valor: a.valor,
            }))}
            color="#00a3a3"
            altura={250}
          />
        </Seccion>

        <Seccion titulo="Género de la audiencia">
          <Dona
            datos={aud?.genero ?? []}
            sufijo=" %"
            altura={250}
            colores={["#00a3a3", "#c13584", "#d6ccbc"]}
          />
        </Seccion>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Seccion
          titulo="Dónde está la audiencia"
          descripcion="Distribución de seguidores por territorio."
        >
          <ListaBarras
            datos={aud?.territorios ?? []}
            color="#00a3a3"
            sufijo=" %"
            formato={(v) => decimal(v, 1)}
          />
        </Seccion>

        <Seccion titulo="Base de seguidores" descripcion="Total acumulado al cierre del periodo.">
          <div className="flex h-full flex-col justify-center gap-4 py-4">
            <div>
              <p className="text-[40px] font-bold leading-none tracking-tight text-tinta-900">
                {numero(totalCierre || aud?.seguidoresTotal || 0)}
              </p>
              <p className="mt-1 text-[13px] text-tinta-500">seguidores en TikTok</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-arena-50 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-tinta-400">
                  Me gusta acumulados
                </p>
                <p className="mt-0.5 text-lg font-bold text-tinta-900">
                  {compacto(Number(datos_perfil(datos, "meGustaAcumulados")))}
                </p>
              </div>
              <div className="rounded-lg bg-arena-50 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-tinta-400">
                  Siguiendo
                </p>
                <p className="mt-0.5 text-lg font-bold text-tinta-900">
                  {numero(Number(datos_perfil(datos, "siguiendo")))}
                </p>
              </div>
            </div>
          </div>
        </Seccion>
      </div>
    </>
  );
}

function datos_perfil(datos: unknown, clave: string): number {
  const p = (datos as { perfil?: Record<string, number | string> }).perfil;
  return Number(p?.[clave] ?? 0);
}

// --------------------------------------------------------------------------
function BloqueLinkedin({ datos }: { datos: { audiencia?: AudienciaLinkedin | AudienciaTiktok } }) {
  const aud = datos.audiencia as AudienciaLinkedin | undefined;
  if (!aud) return null;
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        <Seccion
          titulo="Dónde trabajan los seguidores"
          descripcion="Principales ubicaciones declaradas."
        >
          <ListaBarras datos={aud.ubicacion} color="#0a66c2" />
        </Seccion>
        <Seccion titulo="Sector de la empresa" descripcion="Principales industrias representadas.">
          <ListaBarras datos={aud.sector} color="#0a66c2" />
        </Seccion>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Seccion titulo="Función laboral">
          <ListaBarras datos={aud.funcionLaboral} color="#671c35" />
        </Seccion>
        <Seccion titulo="Nivel de responsabilidad">
          <Dona datos={aud.nivel} altura={250} />
        </Seccion>
        <Seccion titulo="Tamaño de la empresa">
          <ListaBarras datos={aud.tamanoEmpresa} color="#82384f" />
        </Seccion>
      </div>
    </>
  );
}

// --------------------------------------------------------------------------
function BloqueFacebook({
  datos,
  posts,
}: {
  datos: { mixContenido?: { nombre: string; publicaciones: number; impresiones: number; interacciones: number }[] };
  posts: Publicacion[];
}) {
  // El mix se recalcula sobre el rango activo para que responda al filtro.
  const mix = useMemo(() => {
    const m = new Map<string, { publicaciones: number; impresiones: number; interacciones: number }>();
    for (const p of posts) {
      const t = p.tipo || "Otro";
      const acc = m.get(t) ?? { publicaciones: 0, impresiones: 0, interacciones: 0 };
      acc.publicaciones += 1;
      acc.impresiones += p.impresiones ?? 0;
      acc.interacciones += p.interacciones ?? 0;
      m.set(t, acc);
    }
    return [...m.entries()]
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.impresiones - a.impresiones);
  }, [posts]);

  const fuente = mix.length ? mix : datos.mixContenido ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Seccion titulo="Formato de contenido" descripcion="Reparto de impresiones por tipo.">
        <Dona
          datos={fuente.map((m) => ({ nombre: m.nombre, valor: m.impresiones }))}
          altura={250}
          colores={PALETA_CATEGORIAS}
        />
      </Seccion>

      <Seccion
        titulo="Rendimiento por formato"
        descripcion="Impresiones promedio por publicación."
        className="lg:col-span-2"
      >
        <div className="scroll-fino overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-arena-200 text-left">
                {["Formato", "Publicaciones", "Impresiones", "Promedio", "Interacciones", "Tasa"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`pb-2 pr-3 text-[11px] font-semibold uppercase tracking-wide text-tinta-400 ${
                        i === 0 ? "" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {fuente.map((m) => (
                <tr key={m.nombre} className="border-b border-arena-100 last:border-0">
                  <td className="py-3 pr-3 font-semibold text-tinta-900">{m.nombre}</td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">
                    {numero(m.publicaciones)}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-900">
                    {numero(m.impresiones)}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">
                    {numero(Math.round(m.impresiones / Math.max(m.publicaciones, 1)))}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">
                    {numero(m.interacciones)}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-tinta-600">
                    {decimal((m.interacciones / Math.max(m.impresiones, 1)) * 100, 2)} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>
    </div>
  );
}

// --------------------------------------------------------------------------
function BloqueX({
  serie,
  porMes,
  datos,
  rango,
}: {
  serie: import("@/lib/tipos").SerieDia[];
  porMes: boolean;
  datos: { daily: import("@/lib/tipos").SerieDia[] };
  rango: import("@/lib/tipos").RangoFechas;
}) {
  const altasBajas = useMemo(
    () =>
      porMes
        ? serieMensual(datos.daily, rango, ["seguidoresAltas", "seguidoresBajas"])
        : serieDiaria(datos.daily, rango, ["seguidoresAltas", "seguidoresBajas"]),
    [datos, rango, porMes]
  );

  const desglose = [
    { nombre: "Me gusta", valor: serie.reduce((a, d) => a + (d.meGusta ?? 0), 0) },
    { nombre: "Respuestas", valor: serie.reduce((a, d) => a + (d.comentarios ?? 0), 0) },
    { nombre: "Reposts", valor: serie.reduce((a, d) => a + (d.compartidos ?? 0), 0) },
    { nombre: "Guardados", valor: serie.reduce((a, d) => a + (d.guardados ?? 0), 0) },
  ].filter((d) => d.valor > 0);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Seccion
        titulo="Altas y bajas de seguidores"
        descripcion="Comparación entre quienes siguen y dejan de seguir la cuenta."
        className="lg:col-span-2"
      >
        <LineaTemporal
          datos={altasBajas}
          porMes={porMes}
          altura={250}
          series={[
            { clave: "seguidoresAltas", nombre: "Nuevos seguidores", color: "#00a3a3" },
            { clave: "seguidoresBajas", nombre: "Dejaron de seguir", color: "#e4002b" },
          ]}
        />
      </Seccion>

      <Seccion titulo="Tipo de interacción" descripcion="Cómo responde la audiencia.">
        <Dona datos={desglose} altura={250} colores={["#1c1917", "#671c35", "#82384f", "#b76f87"]} />
      </Seccion>
    </div>
  );
}
