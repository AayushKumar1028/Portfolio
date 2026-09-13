import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { NAV, SITE } from "../lib/site.js";
import { waybarClock } from "../lib/format.js";

function BrandMark() {
  return (
    <svg className="brand-mark shrink-0" width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="navg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e879f9" />
          <stop offset=".45" stopColor="#a855f7" />
          <stop offset=".75" stopColor="#1793d1" />
          <stop offset="1" stopColor="#2ad4c4" />
        </linearGradient>
      </defs>
      <path d="M16 3 28 27h-6.2L16 14.6 10.2 27H4z" fill="url(#navg)" />
      <circle cx="16" cy="23.4" r="2.8" fill="#060a10" />
    </svg>
  );
}

/** The top bar is modelled on a waybar: brand on the left, workspaces, then modules. */
export default function TopBar() {
  const [clock, setClock] = useState(() => waybarClock());

  useEffect(() => {
    const tick = () => setClock(waybarClock());
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-shell px-3 pt-3 sm:px-5">
        <nav className="topbar flex items-center gap-2 rounded-2xl px-3 py-2" aria-label="Primary">
          <Link to="/" className="flex min-w-0 items-center gap-2" aria-label={`${SITE.name} — home`}>
            <BrandMark />
            <span className="mono truncate text-xs font-bold text-ink sm:text-sm">
              {SITE.handle}
              <span className="text-cachy">@</span>
              <span className="grad-text">{SITE.host}</span>
            </span>
            <span className="mono hidden text-xs text-dim md:inline">:~$</span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `ws ${isActive ? "is-active" : ""}`}
              >
                <span className="ws-num">{item.num}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="ml-3 hidden items-center gap-2 border-l border-line pl-3 lg:flex">
            <span className="mono text-xs text-muted">{clock}</span>
            <span className="pill">CA</span>
          </div>
        </nav>
      </div>
    </header>
  );
}
