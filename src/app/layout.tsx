import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tablero General de Canales Digitales · Supersubsidio",
  description:
    "Análisis de redes sociales y página web de la Superintendencia del Subsidio Familiar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
