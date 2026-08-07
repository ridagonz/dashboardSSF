export type RedId = "x" | "facebook" | "instagram" | "linkedin" | "tiktok";
/** Redes cuyo export incluye serie diaria; alimentan la vista general. */
export type RedConSerie = Exclude<RedId, "instagram">;
export type VistaId = RedId | "general" | "seo";

/** Un dia de la serie temporal de una red. Los campos son opcionales porque
 *  cada plataforma expone un subconjunto distinto de metricas. */
export interface SerieDia {
  fecha: string;
  impresiones?: number;
  alcance?: number;
  visualizaciones?: number;
  interacciones?: number;
  meGusta?: number;
  comentarios?: number;
  compartidos?: number;
  guardados?: number;
  clics?: number;
  visitasPerfil?: number;
  publicaciones?: number;
  seguidoresNuevos?: number;
  seguidoresAltas?: number;
  seguidoresBajas?: number;
  seguidoresTotal?: number;
  seguidoresOrganicos?: number;
  seguidoresPatrocinados?: number;
  tasaInteraccion?: number;
}

export interface Publicacion {
  fecha: string;
  texto: string;
  enlace: string;
  tipo?: string;
  impresiones?: number;
  visualizaciones?: number;
  interacciones?: number;
  meGusta?: number;
  comentarios?: number;
  compartidos?: number;
  guardados?: number;
  clics?: number;
  clicsEnlace?: number;
  alcance?: number;
  tasaInteraccion?: number;
  seguidoresNuevos?: number;
}

export interface Categoria {
  nombre: string;
  valor: number;
}

export interface MixContenido {
  nombre: string;
  publicaciones: number;
  impresiones: number;
  interacciones: number;
}

export interface AudienciaLinkedin {
  totalUbicaciones: number;
  ubicacion: Categoria[];
  funcionLaboral: Categoria[];
  nivel: Categoria[];
  sector: Categoria[];
  tamanoEmpresa: Categoria[];
}

export interface AudienciaTiktok {
  seguidoresTotal: number;
  actividadPorHora: { hora: number; valor: number }[];
  genero: Categoria[];
  territorios: Categoria[];
}

export interface DatosRed {
  daily: SerieDia[];
  posts: Publicacion[];
  mixContenido?: MixContenido[];
  perfil?: Record<string, number | string>;
  audiencia?: AudienciaLinkedin | AudienciaTiktok;
}

/** Instagram se alimenta a mano desde los screenshots del panel de Meta. */
export interface DatosInstagram {
  modo: "manual";
  sinDatos: boolean;
  periodo: { desde: string | null; hasta: string | null };
  perfil: {
    usuario: string;
    seguidores: number;
    meGustaAcumulados: number;
    siguiendo: number;
  };
  resumen: {
    visualizaciones: number;
    visualizacionesVar: number;
    alcance: number;
    alcanceVar: number;
    interacciones: number;
    interaccionesVar: number;
    visitasPerfil: number;
    visitasPerfilVar: number;
    meGusta: number;
    comentarios: number;
    compartidos: number;
    guardados: number;
    seguidoresNuevos: number;
  };
  porFormato: { nombre: string; porcentaje: number; visualizaciones: number }[];
  origenAudiencia: { nombre: string; porcentaje: number }[];
  publicaciones: {
    fecha: string;
    hora: string;
    titulo: string;
    tipo: string;
    visualizaciones: number;
  }[];
  historias: { fecha: string; hora: string; titulo: string; visualizaciones: number }[];
}

export interface DatosSeo {
  modo: "manual";
  dominio: string;
  periodo: { etiqueta: string; generado: string };
  trafico: {
    visitas: number;
    visitasVar: number;
    visitantesUnicos: number;
    visitantesUnicosVar: number;
    paginasPorVisita: number;
    paginasPorVisitaVar: number;
    duracionMediaSeg: number;
    duracionMediaVar: number;
    porcentajeRebote: number;
    porcentajeReboteVar: number;
  };
  canales: { nombre: string; valor: number; porcentaje: number }[];
  paises: {
    nombre: string;
    porcentaje: number;
    visitas: number;
    escritorio: number;
    movil: number;
  }[];
  marca: { conMarca: number; sinMarca: number };
  backlinks: {
    total: number;
    dominiosReferencia: number;
    ipsReferencia: number;
    tipos: { nombre: string; valor: number; porcentaje: number }[];
  };
}

export interface BaseDatos {
  generado: string;
  entidad: string;
  redes: {
    x: DatosRed;
    facebook: DatosRed;
    instagram: DatosInstagram;
    linkedin: DatosRed;
    tiktok: DatosRed;
  };
  seo: DatosSeo;
}

export interface RangoFechas {
  desde: string;
  hasta: string;
}

/** Totales agregados de una red dentro del rango activo. */
export interface Resumen {
  impresiones: number;
  interacciones: number;
  meGusta: number;
  comentarios: number;
  compartidos: number;
  seguidoresNuevos: number;
  publicaciones: number;
  visitasPerfil: number;
  tasaInteraccion: number;
}
