import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Shell } from "@/components/shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cofrinho · controle financeiro pessoal",
  description: "Importe o extrato do banco (OFX ou CSV), veja para onde foi o dinheiro e acompanhe metas. Tudo no seu navegador.",
  applicationName: "Cofrinho",
};

export const viewport: Viewport = { themeColor: "#0f1412", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`dark ${sans.variable} ${mono.variable} antialiased`}>
      <body className="min-h-screen">
        <TooltipProvider>
          <Shell>{children}</Shell>
        </TooltipProvider>
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
