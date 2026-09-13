import { Link } from "react-router-dom";
import Backdrop from "../components/Backdrop.jsx";

export default function NotFound() {
  return (
    <>
      <Backdrop />
      <main className="pt-28 sm:pt-32">
        <div className="mx-auto max-w-shell px-3 sm:px-5">
          <div className="win mx-auto flex max-w-xl flex-col items-center gap-4 p-10 text-center">
            <p className="mono prompt text-xs text-muted">cd /nowhere</p>
            <h1 className="mono grad-text text-5xl font-bold">404</h1>
            <p className="mono text-sm text-ink">no such directory.</p>
            <p className="mono text-xs text-dim">
              the pane you were looking for was closed by the window manager.
            </p>
            <Link to="/" className="btn btn-primary mt-2">
              back to home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
