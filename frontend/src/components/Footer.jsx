import { SITE } from "../lib/site.js";

export default function Footer() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-shell flex-col items-start justify-between gap-3 px-3 py-8 sm:flex-row sm:items-center sm:px-5">
        <p className="mono text-xs text-dim">
          {SITE.name.toLowerCase()} <span className="text-hypr-violet">·</span>{" "}
          {SITE.location.toLowerCase()}
        </p>
        <p className="mono text-xs text-dim">
          © {new Date().getFullYear()} <span className="text-hypr-pink">·</span> built with react +
          flask + tailwind
        </p>
      </div>
    </footer>
  );
}
