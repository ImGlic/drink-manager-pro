import React, { useId } from "react";
import { cn } from "@/lib/utils";

/** Marca "Meu Bar": copo de whisky com gelo. */
export const LogoMarca: React.FC<{ className?: string }> = ({ className }) => {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={cn("h-9 w-9 shrink-0", className)} role="img" aria-label="Meu Bar">
      <defs>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D97706" />
          <stop offset="1" stopColor="#7C2D12" />
        </linearGradient>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCD34D" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#f${id})`} />
      <path d="M16 16h32l-3.4 29.6A4.5 4.5 0 0 1 40.1 49.6H23.9a4.5 4.5 0 0 1-4.5-4Z" fill="#FFF8EC" />
      <path d="M19.2 31h25.6l-2.1 14.1a2.4 2.4 0 0 1-2.4 2.1H23.7a2.4 2.4 0 0 1-2.4-2.1Z" fill={`url(#l${id})`} />
      <rect x="23.5" y="25" width="9.5" height="9.5" rx="2.2" transform="rotate(-14 28.25 29.75)" fill="#fff" fillOpacity=".92" />
      <rect x="33" y="27.2" width="8.5" height="8.5" rx="2" transform="rotate(12 37.25 31.45)" fill="#fff" fillOpacity=".78" />
      <path d="M20.6 20.5l2.3 21.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".75" />
    </svg>
  );
};

/** Marca + nome. */
const Logo: React.FC<{ className?: string; tamanho?: "sm" | "md" | "lg"; claro?: boolean }> = ({
  className,
  tamanho = "md",
  claro,
}) => {
  const marca = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-14 w-14" }[tamanho];
  const texto = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[tamanho];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMarca className={marca} />
      <span className={cn("font-display font-semibold tracking-tight leading-none", texto, claro ? "text-amber-50" : "text-foreground")}>
        Meu <span className={claro ? "text-amber-400" : "text-primary"}>Bar</span>
      </span>
    </div>
  );
};

export default Logo;
