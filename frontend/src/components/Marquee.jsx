import { Fragment } from "react";

/* Colours are inline styles rather than dynamic Tailwind classes, because
   dynamically built class names never make it into the compiled stylesheet. */
export const MARQUEE_ITEMS = [
  { text: "Aayush Kumar", color: "#e879f9" },
  { text: "Brampton, Canada", color: "#a855f7" },
  { text: "github.com/Aayush01", color: "#1793d1" },
  { text: "CachyOS", color: "#2ad4c4" },
  { text: "Hyprland", color: "#e879f9" },
  { text: "Arch Linux", color: "#4cb8f5" },
  { text: "react + flask", color: "#a855f7" },
  { text: "tailwind css", color: "#22d3ee" },
];

function Row({ items, ariaHidden }) {
  return (
    <div
      aria-hidden={ariaHidden || undefined}
      className="mono flex items-center gap-8 pr-8 text-[11px] tracking-[0.22em] text-muted uppercase"
    >
      {items.map((item, index) => (
        <Fragment key={`${item.text}-${index}`}>
          <span className="whitespace-nowrap">{item.text}</span>
          <span style={{ color: item.color }}>◆</span>
        </Fragment>
      ))}
    </div>
  );
}

export default function Marquee({ items = MARQUEE_ITEMS }) {
  return (
    <div className="marquee" role="presentation">
      <div className="marquee-track">
        <Row items={items} />
        <Row items={items} ariaHidden />
      </div>
    </div>
  );
}
