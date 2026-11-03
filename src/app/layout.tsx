import type { Metadata, Viewport } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://herramientas.totalsecuritysh.com"),
  title: "Agente IA Playground · Total Security SH",
  description: "Diseña y prueba un agente de atención con IA para tu negocio en un chat estilo WhatsApp.",
};

export const viewport: Viewport = { themeColor: "#0b1424" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
