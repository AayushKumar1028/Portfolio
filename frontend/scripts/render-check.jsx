/* Render smoke check.
 *
 * Renders every page on the server with a real API payload (or the bundled
 * fallback when the API is down) and asserts the data-driven UI actually
 * contains what it should. Catches render crashes that a build cannot.
 *
 *   npm run check:render
 */

import { MemoryRouter } from "react-router-dom";
import { renderToString } from "react-dom/server";

import About from "../src/pages/About.jsx";
import Home from "../src/pages/Home.jsx";
import NotFound from "../src/pages/NotFound.jsx";
import Projects from "../src/pages/Projects.jsx";
import ProjectCard from "../src/components/ProjectCard.jsx";
import TopBar from "../src/components/TopBar.jsx";
import Footer from "../src/components/Footer.jsx";
import { FALLBACK_GITHUB } from "../src/lib/fallback.js";

const API = process.env.API_URL || "http://127.0.0.1:5000/api/github";

let pass = 0;
let fail = 0;

function check(name, condition, detail = "") {
  if (condition) {
    pass += 1;
    console.log(`PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${name}${detail ? `  -> ${detail}` : ""}`);
  }
}

function renderPage(path, Page, data) {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <TopBar />
      <Page initialData={data} />
      <Footer />
    </MemoryRouter>
  );
}

async function loadPayload() {
  try {
    const response = await fetch(API, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    console.log(`payload: live API (${payload.repos.length} repos, source=${payload.source})\n`);
    return payload;
  } catch (error) {
    console.log(`payload: bundled fallback (${error.message})\n`);
    return FALLBACK_GITHUB;
  }
}

const payload = await loadPayload();
const repo = payload.repos[0];
const repoName = repo?.name ?? "";

for (const [path, name, Page] of [
  ["/", "Home", Home],
  ["/projects", "Projects", Projects],
  ["/about", "About", About],
]) {
  let html = "";
  try {
    html = renderPage(path, Page, payload);
  } catch (error) {
    check(`${name} renders without throwing`, false, error.message);
    continue;
  }

  check(`${name} renders without throwing`, true);
  check(`${name} renders more than a shell`, html.length > 1500, `${html.length} chars`);
  check(`${name} shows the waybar brand`, html.includes("cachyos"));
  check(`${name} keeps nav workspaces`, ["home", "projects", "about"].every((l) => html.includes(l)));
}

// ---------------------------------------------------------------- Home content
try {
  const html = renderPage("/", Home, payload);
  check("Home features the live repo", !repoName || html.includes(repoName), repoName);
  check("Home shows the location", html.includes("Brampton"));
  check("Home shows the contact email", html.includes("kumarkids.aayush@gmail.com"));
  check("Home renders the language breakdown", html.includes("language breakdown"));
  check("Home renders the palette", html.includes("#2ad4c4") && html.includes("#e879f9"));
  check("Home marks the data source", html.includes("github"));
} catch (error) {
  check("Home content", false, error.message);
}

// ------------------------------------------------------------ Projects content
try {
  const html = renderPage("/projects", Projects, payload);
  check("Projects lists the repo", !repoName || html.includes(repoName), repoName);
  check("Projects shows repo count", html.includes("of") && html.includes("shown"));
  check("Projects renders the search field", html.includes("search repos"));
  check("Projects renders sort controls", html.includes("recently updated"));
} catch (error) {
  check("Projects content", false, error.message);
}

// --------------------------------------------------------------- About content
try {
  const html = renderPage("/about", About, payload);
  check("About shows the full name", html.includes("Aayush Kumar"));
  check("About renders the neofetch logo", html.includes("ooo") && html.includes("ossssso"));
  check("About states the site theme", html.includes("cachyos · hyprland · arch"));
  check("About shows the email", html.includes("kumarkids.aayush@gmail.com"));
  check("About renders the contact form", html.includes("send message"));
  check("About shows live repo count", html.includes("public"));
} catch (error) {
  check("About content", false, error.message);
}

// ------------------------------------------------------------ degraded inputs
try {
  const empty = { ...payload, repos: [], stats: { ...payload.stats, repos: 0, languages: [] } };
  const html = renderPage("/projects", Projects, empty);
  check("Projects handles zero repos", html.includes("no projects match that filter"), "");
} catch (error) {
  check("Projects handles zero repos", false, error.message);
}

try {
  const bare = { name: "bare-repo", url: "https://example.com", stars: 0, forks: 0 };
  const html = renderToString(<ProjectCard repo={bare} />);
  check("ProjectCard survives missing fields", html.includes("bare-repo") && html.includes("No description"));
} catch (error) {
  check("ProjectCard survives missing fields", false, error.message);
}

try {
  const html = renderPage("/nope", NotFound, payload);
  check("NotFound renders", html.includes("404"));
  check("Unknown route still renders chrome", html.includes("cachyos"));
} catch (error) {
  check("NotFound renders", false, error.message);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
