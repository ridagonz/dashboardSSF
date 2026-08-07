"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import semilla from "@/data/seed.json";
import type { BaseDatos, RangoFechas, VistaId } from "./tipos";
import { rangoDisponible } from "./datos";
import type { Resultado } from "./importar";

const CLAVE = "tablero-ssf-datos-v2";
const BASE = semilla as unknown as BaseDatos;

interface Almacen {
  bd: BaseDatos;
  rango: RangoFechas;
  disponible: RangoFechas;
  vista: VistaId;
  personalizado: boolean;
  persistenciaFallida: boolean;
  setRango: (r: RangoFechas) => void;
  setVista: (v: VistaId) => void;
  aplicar: (resultados: Resultado[]) => void;
  actualizarBd: (fn: (bd: BaseDatos) => void) => void;
  restablecer: () => void;
}

const Ctx = createContext<Almacen | null>(null);

function esBaseDatos(valor: unknown): valor is BaseDatos {
  const datos = valor as BaseDatos | null;
  return Boolean(
    datos &&
      typeof datos === "object" &&
      Array.isArray(datos.redes?.x?.daily) &&
      Array.isArray(datos.redes?.facebook?.daily) &&
      datos.redes?.instagram?.modo === "manual" &&
      Array.isArray(datos.redes?.linkedin?.daily) &&
      Array.isArray(datos.redes?.tiktok?.daily) &&
      datos.seo?.modo === "manual"
  );
}

const clonar = (bd: BaseDatos): BaseDatos =>
  typeof structuredClone === "function"
    ? structuredClone(bd)
    : (JSON.parse(JSON.stringify(bd)) as BaseDatos);

export function ProveedorAlmacen({ children }: { children: React.ReactNode }) {
  const [bd, setBd] = useState<BaseDatos>(BASE);
  const [personalizado, setPersonalizado] = useState(false);
  const [persistenciaFallida, setPersistenciaFallida] = useState(false);
  const [vista, setVista] = useState<VistaId>("general");
  const [rangoSeleccionado, setRangoSeleccionado] = useState<RangoFechas>(() =>
    rangoDisponible(BASE)
  );
  const [rangoTocado, setRangoTocado] = useState(false);

  // Rehidrata los datos guardados por el equipo en este navegador.
  /* eslint-disable react-hooks/set-state-in-effect -- La fuente externa solo existe al montar en el cliente. */
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (!guardado) return;
      const datos: unknown = JSON.parse(guardado);
      if (esBaseDatos(datos)) {
        setBd(datos);
        setPersonalizado(true);
      }
    } catch {
      /* Datos locales corruptos: se ignoran y se usa la semilla. */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const disponible = useMemo(() => rangoDisponible(bd), [bd]);
  const rango = rangoTocado ? rangoSeleccionado : disponible;

  const persistir = useCallback((datos: BaseDatos) => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      return true;
    } catch {
      return false;
    }
  }, []);

  const actualizarBd = useCallback(
    (fn: (bd: BaseDatos) => void) => {
      const copia = clonar(bd);
      fn(copia);
      copia.generado = new Date().toISOString().slice(0, 16).replace("T", " ");
      const guardado = persistir(copia);
      setBd(copia);
      setPersonalizado(true);
      setPersistenciaFallida(!guardado);
    },
    [bd, persistir]
  );

  const aplicar = useCallback(
    (resultados: Resultado[]) => {
      const utiles = resultados.filter((r) => r.reconocido && r.aplicar);
      if (!utiles.length) return;
      actualizarBd((copia) => {
        for (const r of utiles) r.aplicar!(copia);
      });
    },
    [actualizarBd]
  );

  const restablecer = useCallback(() => {
    try {
      localStorage.removeItem(CLAVE);
      setPersistenciaFallida(false);
    } catch {
      setPersistenciaFallida(true);
    }
    setBd(BASE);
    setPersonalizado(false);
    setRangoTocado(false);
  }, []);

  const valor = useMemo<Almacen>(
    () => ({
      bd,
      rango,
      disponible,
      vista,
      personalizado,
      persistenciaFallida,
      setRango: (r) => {
        setRangoTocado(true);
        setRangoSeleccionado(r);
      },
      setVista,
      aplicar,
      actualizarBd,
      restablecer,
    }),
    [
      bd,
      rango,
      disponible,
      vista,
      personalizado,
      persistenciaFallida,
      aplicar,
      actualizarBd,
      restablecer,
    ]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAlmacen(): Almacen {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAlmacen debe usarse dentro de ProveedorAlmacen");
  return ctx;
}
