"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compacto, fechaCorta, mesEtiqueta, numero } from "@/lib/formato";
import { PALETA_CATEGORIAS } from "@/lib/redes";

/** Las animaciones se desactivan en todo el tablero: html2canvas captura el
 *  DOM tal cual y una animación en curso produce gráficos vacíos en el PDF. */
const SIN_ANIM = { isAnimationActive: false as const };

const EJE = {
  tick: { fill: "#8a8079", fontSize: 11 },
  axisLine: { stroke: "#e8e2d8" },
  tickLine: false,
};

function CajaTooltip({
  active,
  payload,
  label,
  etiquetaX,
}: {
  active?: boolean;
  payload?: { name?: string; dataKey?: string | number; value?: number; color?: string }[];
  label?: string | number;
  etiquetaX?: (v: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-arena-200 bg-white px-3 py-2 shadow-tarjeta">
      <p className="mb-1 text-[12px] font-semibold text-tinta-900">
        {etiquetaX ? etiquetaX(String(label)) : String(label)}
      </p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-[12px] text-tinta-600">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span>{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums text-tinta-900">
            {numero(Number(p.value))}
          </span>
        </p>
      ))}
    </div>
  );
}

export function AreaTemporal({
  datos,
  series,
  altura = 260,
  porMes = false,
  ejeDoble = false,
}: {
  datos: Record<string, string | number>[];
  series: { clave: string; nombre: string; color: string }[];
  altura?: number;
  porMes?: boolean;
  /** Coloca la segunda serie en un eje propio a la derecha. Necesario cuando
   *  las magnitudes difieren en ordenes (millones de impresiones frente a
   *  miles de interacciones), porque si no la segunda linea queda plana. */
  ejeDoble?: boolean;
}) {
  const ejeX = porMes ? "mes" : "fecha";
  const etiqueta = porMes ? mesEtiqueta : (v: string) => fechaCorta(v, true);
  const doble = ejeDoble && series.length > 1;
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={datos} margin={{ top: 6, right: doble ? 0 : 8, bottom: 0, left: -12 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.clave} id={`grad-${s.clave}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="#f0ece5" vertical={false} />
        <XAxis
          dataKey={ejeX}
          {...EJE}
          minTickGap={28}
          tickFormatter={(v) => (porMes ? mesEtiqueta(String(v)) : fechaCorta(String(v)))}
        />
        <YAxis
          yAxisId="izq"
          {...EJE}
          width={56}
          tickFormatter={(v) => compacto(Number(v))}
        />
        {doble && (
          <YAxis
            yAxisId="der"
            orientation="right"
            {...EJE}
            width={52}
            tick={{ fill: series[1].color, fontSize: 11 }}
            tickFormatter={(v) => compacto(Number(v))}
          />
        )}
        <Tooltip content={<CajaTooltip etiquetaX={etiqueta} />} />
        {series.length > 1 && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#6b625c", paddingTop: 8 }}
          />
        )}
        {series.map((s, i) => (
          <Area
            key={s.clave}
            yAxisId={doble && i === 1 ? "der" : "izq"}
            type="monotone"
            dataKey={s.clave}
            name={s.nombre}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.clave})`}
            {...SIN_ANIM}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineaTemporal({
  datos,
  series,
  altura = 240,
  porMes = false,
}: {
  datos: Record<string, string | number>[];
  series: { clave: string; nombre: string; color: string }[];
  altura?: number;
  porMes?: boolean;
}) {
  const ejeX = porMes ? "mes" : "fecha";
  const etiqueta = porMes ? mesEtiqueta : (v: string) => fechaCorta(v, true);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <LineChart data={datos} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#f0ece5" vertical={false} />
        <XAxis
          dataKey={ejeX}
          {...EJE}
          minTickGap={28}
          tickFormatter={(v) => (porMes ? mesEtiqueta(String(v)) : fechaCorta(String(v)))}
        />
        <YAxis {...EJE} width={56} tickFormatter={(v) => compacto(Number(v))} />
        <Tooltip content={<CajaTooltip etiquetaX={etiqueta} />} />
        {series.length > 1 && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#6b625c", paddingTop: 8 }}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.clave}
            type="monotone"
            dataKey={s.clave}
            name={s.nombre}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            {...SIN_ANIM}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarrasApiladas({
  datos,
  series,
  altura = 280,
}: {
  datos: Record<string, string | number>[];
  series: { clave: string; nombre: string; color: string }[];
  altura?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={datos} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="#f0ece5" vertical={false} />
        <XAxis dataKey="mes" {...EJE} tickFormatter={(v) => mesEtiqueta(String(v))} />
        <YAxis {...EJE} width={56} tickFormatter={(v) => compacto(Number(v))} />
        <Tooltip content={<CajaTooltip etiquetaX={mesEtiqueta} />} cursor={{ fill: "#f4f1ec" }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#6b625c", paddingTop: 8 }}
        />
        {series.map((s) => (
          <Bar
            key={s.clave}
            dataKey={s.clave}
            name={s.nombre}
            stackId="a"
            fill={s.color}
            radius={[0, 0, 0, 0]}
            {...SIN_ANIM}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarrasSimples({
  datos,
  clave = "valor",
  color = "#671c35",
  altura = 240,
  horizontal = false,
  formatoValor = (v: number) => numero(v),
}: {
  datos: { nombre: string; valor: number }[];
  clave?: string;
  color?: string;
  altura?: number;
  horizontal?: boolean;
  formatoValor?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart
        data={datos}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 6, right: 12, bottom: 0, left: horizontal ? 8 : -12 }}
      >
        <CartesianGrid stroke="#f0ece5" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...EJE} tickFormatter={(v) => compacto(Number(v))} />
            <YAxis type="category" dataKey="nombre" {...EJE} width={130} />
          </>
        ) : (
          <>
            <XAxis dataKey="nombre" {...EJE} />
            <YAxis {...EJE} width={56} tickFormatter={(v) => compacto(Number(v))} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "#f4f1ec" }}
          formatter={(v: number) => [formatoValor(Number(v)), ""]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e8e2d8",
            fontSize: 12,
            boxShadow: "0 4px 16px -6px rgba(28,25,23,0.10)",
          }}
        />
        <Bar dataKey={clave} fill={color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} {...SIN_ANIM} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Dona({
  datos,
  altura = 240,
  sufijo = "",
  colores = PALETA_CATEGORIAS,
}: {
  datos: { nombre: string; valor: number }[];
  altura?: number;
  sufijo?: string;
  colores?: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <PieChart>
        <Pie
          data={datos}
          dataKey="valor"
          nameKey="nombre"
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="#ffffff"
          strokeWidth={2}
          {...SIN_ANIM}
        >
          {datos.map((_, i) => (
            <Cell key={i} fill={colores[i % colores.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, n: string) => [`${numero(Number(v))}${sufijo}`, n]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e8e2d8",
            fontSize: 12,
            boxShadow: "0 4px 16px -6px rgba(28,25,23,0.10)",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#6b625c" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
