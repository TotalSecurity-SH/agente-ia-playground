import type { ReactNode } from "react";
import { LINKS } from "@/lib/site";

type Props = {
  slug: string;
  title: ReactNode;
  subtitle: ReactNode;
  chips: string[];
};

export function ToolHero({ slug, title, subtitle, chips }: Props) {
  return (
    <header className="hero-grid relative overflow-hidden text-[#eef2f7]">
      <div className="accent-bar absolute inset-x-0 top-0 h-1" />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <nav className="flex items-center gap-2 font-mono text-xs text-[#93a1b5]" aria-label="Ruta">
          <a href={LINKS.hub} className="hover:text-white">
            herramientas
          </a>
          <span>/</span>
          <span className="text-teal">{slug}</span>
        </nav>
        <h1 className="fade-up mt-8 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="fade-up mt-4 max-w-2xl text-[#93a1b5] sm:text-lg" style={{ animationDelay: ".1s" }}>
          {subtitle}
        </p>
        <div className="fade-up mt-6 flex flex-wrap gap-2 text-xs" style={{ animationDelay: ".2s" }}>
          {chips.map((chip) => (
            <span key={chip} className="rounded-full border border-teal/40 bg-teal/10 px-3 py-1 text-[#cfe9ef]">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
