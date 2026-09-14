/* The write-up behind a repo card's "explain" button, one entry per repository,
   keyed by its GitHub name.
 *
 * These are hand-written rather than generated, because the interesting part —
 * why a project exists — is not something a repository's files state outright.
 * Everything factual in here comes from the repo's own README, description or
 * file layout; the live numbers (language, size, dates, stars) are NOT repeated
 * here, since the modal reads those straight from the GitHub data it already
 * has and would otherwise contradict this file the moment they change.
 *
 * A repo with no entry still opens: explanationFor() falls back to its GitHub
 * description and says plainly that there is no write-up yet.
 */

export const EXPLANATIONS = {
  Portfolio: {
    what: "This site — a place for the things I build, with the projects grid read live from the GitHub API so a new repository shows up on its own.",
    how: "Four hand-written HTML pages, one Tailwind stylesheet compiled by its CLI, and a single vanilla ES module that calls the GitHub REST API from the browser. No framework, no router, no backend, and a bundled snapshot so the grid still renders when the API is rate-limited or offline.",
    why: "I wanted a portfolio that cannot quietly go stale and has nothing to keep alive: no server to pay for, no database to back up, and no build step except compiling the CSS.",
  },

  "Insta-chat": {
    what: "A direct-messages-only Instagram client for Windows, Android and Linux. It shows your chats — including voice and video calls — and nothing else: no Reels, no Explore, no main feed.",
    how: "Three native shells around the Instagram web app: WPF with WebView2 on Windows (C#), WebView plus Jetpack Compose on Android, and GTK4 with WebKitGTK on Linux. Calls go over WebRTC, navigation outside chat is blocked by both in-page and native guards, and sign-in happens on Instagram's own pages so no password ever reaches the app.",
    why: "It started with a specific problem: when parental controls block Instagram's Reels and feed, they also lock away the messages, which is the one part that matters. This keeps the chats and drops the distraction.",
  },

  "Business-Website": {
    what: "A redesign of my high school business course website: a home page, all eight units, assignments and due dates, and a resource library for a case-driven course called Business Principles.",
    how: "Plain HTML with hand-written CSS, one stylesheet, no JavaScript and no build step — open index.html and it runs. The effort went into layout, navigation and accessibility rather than tooling.",
    why: "The original course site was hard to navigate and hard to read, and students had to hunt for due dates and resources. It was a chance to point real UI and UX principles at something people actually had to use.",
  },

  AayushKumar1028: {
    what: "My GitHub profile page, which is the first thing anyone sees when they land on my account.",
    how: "A hand-written Markdown README with an icon strip, rendered by GitHub itself. No build step and no tooling: the file becomes the page.",
    why: "So a recruiter, a teammate or a stranger can see who I am and what I am working on in one screen, instead of inferring it from a list of repository names.",
  },

  "English-Semester-Final-Website": {
    what: "My English class portfolio for the semester: a four-page site covering the work I did in the course — home, growth, impact and skills.",
    how: "Static HTML and one hand-written stylesheet, with two custom fonts and screenshots as assets, deployed to Vercel. No framework and no build step.",
    why: "The final had to show rather than tell what I learned: how studying literary structural devices and analytical frameworks changed the way I communicate, and the public speaking and collaboration skills I built along the way.",
  },
};

/**
 * The three sections for a repository, plus whether they are hand-written.
 * Any section may be undefined, in which case the modal omits it.
 */
export function explanationFor(repo) {
  const curated = repo && EXPLANATIONS[repo.name];
  if (curated) return { ...curated, curated: true };

  return {
    what: repo?.description || "This repository has no description on GitHub yet.",
    curated: false,
  };
}
