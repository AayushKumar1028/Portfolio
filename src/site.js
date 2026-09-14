/* Public site facts. Single source of truth for the values JavaScript needs.
   The pages hardcode the same strings in their markup, so if you change
   something here, change it there too — see the README. */
export const SITE = {
  name: "Aayush Kumar",
  first: "Aayush",
  last: "Kumar",
  handle: "aayush",
  host: "cachyos",
  location: "Brampton, Canada",
  city: "Brampton",
  region: "Ontario, Canada",
  email: "kumarkids.aayush@gmail.com",
  githubUser: "Aayush01",
  githubUrl: "https://github.com/Aayush01",
  githubReposUrl: "https://github.com/Aayush01?tab=repositories",
};

/* Primary navigation, mirrored in the markup of every page. */
export const NAV = [
  { href: "/", num: 1, label: "home" },
  { href: "/projects", num: 2, label: "projects" },
  { href: "/about", num: 3, label: "about" },
];
