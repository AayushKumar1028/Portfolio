import { useState } from "react";
import Backdrop from "../components/Backdrop.jsx";
import Reveal from "../components/Reveal.jsx";
import { CheckIcon, CopyIcon, GitHubIcon, MailIcon, PinIcon } from "../components/Icons.jsx";
import { useGithub } from "../hooks/useGithub.js";
import { sendContact } from "../lib/api.js";
import { SITE } from "../lib/site.js";
import { formatDate, timeAgo } from "../lib/format.js";

/* Classic Arch Linux ASCII, used as the neofetch logo. Kept as an array of
   strings so the backticks in the artwork need no escaping. */
const ARCH_ART = [
  "                   -`",
  "                  .o+`",
  "                 `ooo/",
  "                `+oooo:",
  "               `+oooooo:",
  "               -+oooooo+:",
  "             `/:-:++oooo+:",
  "            `/++++/+++++++:",
  "           `/++++++++++++++:",
  "          `/+++ooooooooooooo/`",
  "         ./ooosssso++osssssso+`",
  "        .oossssso-````/ossssss+`",
  "       -osssssso.      :ssssssso.",
  "      :osssssss/        osssso+++.",
  "     /ossssssss/        +ssssooo/-",
  "   `/ossssso+/:-        -:/+osssso+-",
  "  `+sso+:-`                 `.-/+oso:",
  " `++:.                           `-/",
  ".`                                 `/",
].join("\n");

function NeofetchRow({ label, children }) {
  return (
    <div className="mono flex gap-3 text-xs leading-relaxed sm:text-sm">
      <span className="nf-key w-[7.5rem] shrink-0">{label}</span>
      <span className="min-w-0 break-all text-ink">{children}</span>
    </div>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState({ status: "idle", message: "" });

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function onSubmit(event) {
    event.preventDefault();
    setState({ status: "sending", message: "" });

    try {
      const result = await sendContact(form);

      if (result.delivered) {
        setState({ status: "sent", message: "message delivered — thanks!" });
        setForm({ name: "", email: "", message: "" });
        return;
      }

      // No SMTP configured on the server: hand the draft to the local mail client.
      if (result.mailto) {
        window.location.href = result.mailto;
        setState({
          status: "sent",
          message: "opened your mail client with the message pre-filled.",
        });
        return;
      }

      setState({ status: "error", message: result.reason || "could not send that." });
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="label">your name</span>
          <input
            className="field"
            name="name"
            value={form.name}
            onChange={update("name")}
            placeholder="Ada Lovelace"
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">your email</span>
          <input
            className="field"
            type="email"
            name="email"
            value={form.email}
            onChange={update("email")}
            placeholder="you@example.com"
            required
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="label">message</span>
        <textarea
          className="field resize-y"
          name="message"
          rows={5}
          value={form.message}
          onChange={update("message")}
          placeholder="what's on your mind?"
          required
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={state.status === "sending"}
        >
          {state.status === "sending" ? "sending…" : "send message"}
        </button>
        <span className="mono text-xs text-dim">or email me directly</span>
      </div>

      {state.message && (
        <p
          aria-live="polite"
          className={`mono text-xs ${state.status === "error" ? "text-hypr-pink" : "text-cachy"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

export default function About({ initialData = null }) {
  const { status, data } = useGithub(initialData);
  const stats = data?.stats;
  const loading = status === "loading";
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Backdrop />

      <main className="pt-28 sm:pt-32">
        <div className="mx-auto max-w-shell px-3 sm:px-5">
          <header className="mb-8">
            <p className="mono prompt text-xs text-muted">cat about.txt</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              <span className="grad-text">About me &amp; contact</span>
            </h1>
          </header>

          {/* ------------------------------------------------------- neofetch */}
          <Reveal className="win win-static p-5 sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
              <pre className="neofetch-art shrink-0 overflow-hidden">{ARCH_ART}</pre>

              <div className="min-w-0 flex-1">
                <p className="mono text-sm font-bold">
                  <span className="text-cachy">{SITE.handle}</span>
                  <span className="text-dim">@</span>
                  <span className="grad-text">{SITE.city.toLowerCase()}</span>
                </p>
                <p className="mono mt-1 text-xs text-dim">
                  {"─".repeat(28)}
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  <NeofetchRow label="user">{SITE.name}</NeofetchRow>
                  <NeofetchRow label="location">{SITE.location}</NeofetchRow>
                  <NeofetchRow label="email">
                    <a href={`mailto:${SITE.email}`} className="transition hover:text-cachy">
                      {SITE.email}
                    </a>
                  </NeofetchRow>
                  <NeofetchRow label="github">
                    <a
                      href={SITE.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition hover:text-cachy"
                    >
                      github.com/{SITE.githubUser}
                    </a>
                  </NeofetchRow>
                  <NeofetchRow label="repos">
                    {loading ? "…" : `${stats?.repos ?? 0} public`}
                  </NeofetchRow>
                  <NeofetchRow label="last push">
                    {loading || !stats?.lastPush
                      ? "no public commits"
                      : `${formatDate(stats.lastPush)} (${timeAgo(stats.lastPush)})`}
                  </NeofetchRow>
                  <NeofetchRow label="site theme">cachyos · hyprland · arch</NeofetchRow>
                  <NeofetchRow label="mode">dark</NeofetchRow>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ------------------------------------------------------ bio tiles */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Reveal className="win p-5 lg:col-span-2 sm:p-6">
              <p className="label">// about</p>
              <div className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-muted sm:text-base">
                <p>
                  I&apos;m {SITE.name}, a developer based in {SITE.location}. I build things and
                  keep the code on GitHub — the Projects page reads that list live through a small
                  Flask service, so it never goes stale.
                </p>
                <p>
                  This site is deliberately sparse: no résumé padding, no third-party trackers,
                  just the work and a way to reach me. If you want to know more, the fastest route
                  is an email.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="pill">
                  <PinIcon width={12} height={12} /> {SITE.location}
                </span>
                <span className="pill">
                  <GitHubIcon width={12} height={12} /> {SITE.githubUser}
                </span>
                <span className="pill">react + flask</span>
                <span className="pill">tailwind css</span>
              </div>
            </Reveal>

            <Reveal className="win flex flex-col p-5 sm:p-6">
              <p className="label">// direct</p>

              <a
                href={`mailto:${SITE.email}`}
                className="mono mt-4 flex items-start gap-2 text-sm break-all text-cachy transition hover:text-cachy-light"
              >
                <MailIcon width={16} height={16} className="mt-0.5 shrink-0" />
                {SITE.email}
              </a>

              <button
                type="button"
                onClick={copyEmail}
                className="mono mt-3 inline-flex items-center gap-1.5 self-start text-xs text-dim transition hover:text-ink"
              >
                {copied ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />}
                {copied ? "copied" : "copy address"}
              </button>

              <div className="tile-divider mt-auto pt-5">
                <a
                  href={SITE.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono inline-flex items-center gap-2 text-xs text-muted transition hover:text-cachy"
                >
                  <GitHubIcon width={14} height={14} />
                  github.com/{SITE.githubUser}
                </a>
              </div>
            </Reveal>
          </div>

          {/* ----------------------------------------------------- contact form */}
          <Reveal className="win mt-4 p-5 sm:p-7" id="contact">
            <div className="mb-6">
              <p className="label">// contact</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Send a message</h2>
              <p className="mono mt-2 text-xs text-dim">
                goes straight to {SITE.email}
              </p>
            </div>
            <ContactForm />
          </Reveal>
        </div>
      </main>
    </>
  );
}
