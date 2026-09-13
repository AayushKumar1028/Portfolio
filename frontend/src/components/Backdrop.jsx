/** Fixed Hyprland-style wallpaper: blurred accent glows over a faint tile grid. */
export default function Backdrop() {
  return (
    <>
      <div className="backdrop-grid" aria-hidden="true" />
      <div className="backdrop-glow" aria-hidden="true" />
    </>
  );
}
