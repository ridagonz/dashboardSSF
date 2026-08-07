import type { RedConSerie, VistaId } from "./tipos";

export interface MetaRed {
  id: VistaId;
  nombre: string;
  color: string;
  /** Etiqueta de la metrica de alcance, distinta en cada plataforma. */
  etiquetaAlcance: string;
  cuenta?: string;
}

export const REDES: Record<VistaId, MetaRed> = {
  general: {
    id: "general",
    nombre: "Vista general",
    color: "#671c35",
    etiquetaAlcance: "Impresiones",
  },
  facebook: {
    id: "facebook",
    nombre: "Facebook",
    color: "#1877f2",
    etiquetaAlcance: "Impresiones",
    cuenta: "/SuperSubsidio",
  },
  instagram: {
    id: "instagram",
    nombre: "Instagram",
    color: "#c13584",
    etiquetaAlcance: "Visualizaciones",
    cuenta: "@supersubsidio",
  },
  x: {
    id: "x",
    nombre: "X",
    color: "#1c1917",
    etiquetaAlcance: "Impresiones",
    cuenta: "@Supersubsidio",
  },
  linkedin: {
    id: "linkedin",
    nombre: "LinkedIn",
    color: "#0a66c2",
    etiquetaAlcance: "Impresiones",
    cuenta: "Superintendencia del Subsidio Familiar",
  },
  tiktok: {
    id: "tiktok",
    nombre: "TikTok",
    color: "#00a3a3",
    etiquetaAlcance: "Visualizaciones",
    cuenta: "@supersubsidio",
  },
  seo: {
    id: "seo",
    nombre: "Página web / SEO",
    color: "#0f766e",
    etiquetaAlcance: "Visitas",
    cuenta: "www.ssf.gov.co",
  },
};

/** Orden de las pestañas. */
export const VISTAS: VistaId[] = [
  "general",
  "facebook",
  "instagram",
  "x",
  "linkedin",
  "tiktok",
  "seo",
];

/** Redes con serie temporal diaria, las que alimentan la vista general. */
export const REDES_CON_SERIE: RedConSerie[] = ["facebook", "x", "linkedin", "tiktok"];

export const PALETA_CATEGORIAS = [
  "#671c35",
  "#0a66c2",
  "#00a3a3",
  "#c13584",
  "#f9c315",
  "#82384f",
  "#4a90d9",
  "#b76f87",
  "#0f766e",
  "#d6ccbc",
];
