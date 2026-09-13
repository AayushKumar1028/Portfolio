const SWATCHES = [
  { name: "void", hex: "#060a10", light: true },
  { name: "surface", hex: "#0f1826", light: true },
  { name: "abyss", hex: "#0a1018", light: true },
  { name: "line", hex: "#1c2b3f", light: true },
  { name: "arch", hex: "#1793d1" },
  { name: "arch light", hex: "#4cb8f5" },
  { name: "cachy", hex: "#2ad4c4" },
  { name: "hypr violet", hex: "#a855f7" },
  { name: "hypr pink", hex: "#e879f9" },
  { name: "hypr cyan", hex: "#22d3ee" },
];

export default function Palette() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {SWATCHES.map((swatch) => (
        <div
          key={swatch.name}
          className="swatch flex-col justify-end"
          style={{ background: swatch.hex, color: swatch.light ? "rgba(232,242,255,0.85)" : undefined }}
        >
          <span>{swatch.name}</span>
          <span>{swatch.hex}</span>
        </div>
      ))}
    </div>
  );
}
