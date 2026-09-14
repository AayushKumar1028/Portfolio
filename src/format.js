const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2016-08-14T02:10:47Z" -> "Aug 14, 2016" */
export function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Short relative age used on repo cards, e.g. "9y ago", "3mo ago", "just now". */
export function timeAgo(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  const units = [
    ["y", 31536000],
    ["mo", 2592000],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ];

  for (const [suffix, size] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${suffix} ago`;
  }
  return "just now";
}

/** Clock shown in the waybar, e.g. "Sat 13 Sep 12:04". */
export function waybarClock(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${DAYS[date.getDay()]} ${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/* Stable per-language accent drawn from the site palette, so any language a
   repo reports still lands inside the theme instead of GitHub's colours. */
const LANG_ACCENTS = ["#2ad4c4", "#1793d1", "#a855f7", "#e879f9", "#22d3ee", "#4cb8f5"];

export function languageAccent(language) {
  if (!language) return "#5f7794";
  let hash = 0;
  for (let i = 0; i < language.length; i += 1) {
    hash = (hash * 31 + language.charCodeAt(i)) % 997;
  }
  return LANG_ACCENTS[hash % LANG_ACCENTS.length];
}
