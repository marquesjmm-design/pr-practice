// Ilustrações originais e genéricas (não reproduzem o design de nenhum fabricante).
// Servem de reserva até serem colocadas as imagens oficiais dos equipamentos.

type Variant = "lh" | "hh" | "compact" | "lpg" | "legacy";

export function variantFor(modelId: string): Variant {
  if (modelId.includes("hh")) return "hh";
  if (modelId.includes("lpg")) return "lpg";
  if (modelId.includes("1000")) return "compact";
  if (modelId.includes("euro")) return "legacy";
  return "lh";
}

export function DispenserIllustration({ modelId, title }: { modelId: string; title?: string }) {
  const v = variantFor(modelId);
  const body = "var(--surface)";
  const line = "var(--ink-2)";
  const accent = "var(--accent)";
  const wide = v === "compact" ? 70 : v === "legacy" ? 96 : 84;
  const x0 = 100 - wide / 2;
  const top = v === "hh" ? 62 : v === "compact" ? 70 : 44;
  return (
    <svg viewBox="0 0 200 150" role="img" aria-label={title ?? "Ilustração genérica de dispensador"} style={{ width: "100%", height: "100%" }}>
      <rect x="0" y="0" width="200" height="150" fill="var(--surface-2)" />
      <rect x="20" y="136" width="160" height="6" rx="3" fill="var(--axis)" />
      {v === "hh" && (
        <>
          <rect x="40" y="16" width="120" height="10" rx="3" fill={body} stroke={line} strokeWidth="2" />
          <path d="M60 26 C 52 60, 44 80, 46 110" fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" />
          <path d="M140 26 C 148 60, 156 80, 154 110" fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      <rect x={x0} y={top} width={wide} height={136 - top} rx={v === "legacy" ? 4 : 10} fill={body} stroke={line} strokeWidth="2" />
      <rect x={x0 + 10} y={top + 10} width={wide - 20} height={v === "compact" ? 20 : 26} rx="4" fill="var(--seq-700)" opacity="0.9" />
      <text x="100" y={top + (v === "compact" ? 25 : 28)} textAnchor="middle" fontSize="11" fontFamily="system-ui" fontWeight="700" fill="var(--surface)">{v === "lpg" ? "GPL" : "1,999"}</text>
      {v !== "compact" && <rect x={x0 + 14} y={top + 46} width={wide - 28} height="14" rx="3" fill="none" stroke={line} strokeWidth="1.5" />}
      {v === "lh" && <rect x={x0 + 26} y={top + 66} width={wide - 52} height="18" rx="3" fill={accent} opacity="0.25" stroke={accent} strokeWidth="1.5" />}
      {v !== "hh" && (
        <>
          <rect x={x0 - 8} y={top + 40} width="8" height="26" rx="2" fill={line} />
          <rect x={x0 + wide} y={top + 40} width="8" height="26" rx="2" fill={line} />
          <path d={`M${x0 - 4} ${top + 66} C ${x0 - 22} ${top + 86}, ${x0 - 18} 128, ${x0 + 6} 128`} fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" />
          <path d={`M${x0 + wide + 4} ${top + 66} C ${x0 + wide + 22} ${top + 86}, ${x0 + wide + 18} 128, ${x0 + wide - 6} 128`} fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      <rect x={x0 + 6} y="122" width={wide - 12} height="6" rx="2" fill={accent} />
    </svg>
  );
}

export function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 160 140" aria-hidden="true">
      <rect x="10" y="20" width="140" height="10" rx="4" fill="currentColor" opacity="0.35" />
      <rect x="24" y="30" width="6" height="104" fill="currentColor" opacity="0.25" />
      <rect x="130" y="30" width="6" height="104" fill="currentColor" opacity="0.25" />
      <rect x="56" y="52" width="48" height="82" rx="8" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.9" />
      <rect x="64" y="60" width="32" height="16" rx="3" fill="currentColor" opacity="0.6" />
      <path d="M104 84 c 16 6, 16 30, 4 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <rect x="62" y="122" width="36" height="5" rx="2" fill="currentColor" opacity="0.8" />
    </svg>
  );
}
