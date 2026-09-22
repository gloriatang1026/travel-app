const THEMES = {
  dumbo: {
    name: "Dumbo",
    line: "Ears out. Let's go.",
    bg: "#f7f1e8",
    stage: "#e7dccb",
    card: "#fffaf3",
    ink: "#3d3428",
    muted: "#7a6d5e",
    accent: "#c4843c",
    soft: "#f3e2cc",
    pins: ["#c4843c", "#6f93b8", "#c46b6b", "#7e9a62", "#b08968", "#5e7c99"],
  },
  sadness: {
    name: "Sadness",
    line: "Slow is a fine speed.",
    bg: "#e7f1fa",
    stage: "#d5e4f2",
    card: "#f7fbff",
    ink: "#1e3a5f",
    muted: "#5d7594",
    accent: "#3d7ec4",
    soft: "#d7e8f8",
    pins: ["#3d7ec4", "#7aa2d4", "#5b6ea6", "#89b7c9", "#4f86a8", "#6d8cae"],
  },
  miguel: {
    name: "Miguel",
    line: "Follow the warm light.",
    bg: "#fff3e4",
    stage: "#f3ddc4",
    card: "#fff9f2",
    ink: "#3a2416",
    muted: "#8a6248",
    accent: "#e36b2c",
    soft: "#ffe0c2",
    pins: ["#e36b2c", "#e0a100", "#c4533a", "#d9893b", "#a85a3a", "#c47b4a"],
  },
  sulley: {
    name: "Sulley",
    line: "Big steps, soft landings.",
    bg: "#e7f6f3",
    stage: "#d3ebe6",
    card: "#f4fffc",
    ink: "#14332e",
    muted: "#4f7a72",
    accent: "#1f8a78",
    soft: "#d5f0ea",
    pins: ["#1f8a78", "#7d6bb5", "#3d9a78", "#5aa8a0", "#6e8f62", "#4f7ea8"],
  },
};

const PACKING = [
  "Passport or ID",
  "Charger and battery",
  "Layers for the wind",
  "Comfortable shoes",
  "Day bag",
  "Sunscreen",
  "Snacks",
  "Any tickets you already hold",
];

const state = {
  theme: "dumbo",
  screen: "today",
  sheet: null,
  placeId: null,
  query: "",
  trip: null,
  draft: null,
  days: 5,
  startDate: todayISO(),
  importing: false,
  error: "",
  banner: "",
  weather: null,
  hostOk: true,
  copied: false,
  aiReady: false,
  aiName: "",
  planning: false,
  planDraft: null,
  wish: "",
  flightDraft: null,
};

let mapHandle = null;

function todayISO() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("daytrip-v1") || "null");
    if (!saved) return;
    if (THEMES[saved.theme]) state.theme = saved.theme;
    if (saved.trip) {
      if (!Array.isArray(saved.trip.flights)) saved.trip.flights = [];
      if (Array.isArray(saved.trip.places)) saved.trip.places.forEach(applyGuide);
      state.trip = saved.trip;
    }
    if (saved.screen) state.screen = saved.screen;
  } catch {
    localStorage.removeItem("daytrip-v1");
  }
}

function save() {
  localStorage.setItem("daytrip-v1", JSON.stringify({
    theme: state.theme,
    screen: state.screen,
    trip: state.trip,
  }));
}

function theme() {
  return THEMES[state.theme];
}

function applyTheme() {
  const colors = theme();
  const root = document.documentElement;
  root.style.setProperty("--bg", colors.bg);
  root.style.setProperty("--stage", colors.stage);
  root.style.setProperty("--card", colors.card);
  root.style.setProperty("--ink", colors.ink);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-soft", colors.soft);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", colors.ink);
}

function dist2(a, b) {
  const x = (a.lng - b.lng) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const y = a.lat - b.lat;
  return x * x + y * y;
}

function suggestDays(count) {
  if (count <= 3) return 1;
  return Math.max(2, Math.min(10, Math.round(count / 4)));
}

function arrange(rawPlaces, dayCount) {
  const places = rawPlaces.map((place) => ({
    id: uid(),
    name: place.name,
    address: place.address || "",
    lat: place.lat,
    lng: place.lng,
    note: place.note || "",
    mapsUrl: place.mapsUrl || "",
    day: 0,
    order: 0,
  }));
  const located = places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
  const loose = places.filter((place) => !located.includes(place));
  const days = Math.max(1, Math.min(dayCount, Math.max(located.length, 1)));
  if (!located.length) {
    places.forEach((place, index) => {
      place.day = index % days;
      place.order = Math.floor(index / days);
    });
    return places;
  }

  const centroids = [{ lat: located[0].lat, lng: located[0].lng }];
  while (centroids.length < days) {
    let best = located[0];
    let bestDistance = -1;
    located.forEach((place) => {
      const nearest = Math.min(...centroids.map((center) => dist2(place, center)));
      if (nearest > bestDistance) {
        bestDistance = nearest;
        best = place;
      }
    });
    centroids.push({ lat: best.lat, lng: best.lng });
  }

  let buckets = [];
  for (let pass = 0; pass < 14; pass += 1) {
    buckets = centroids.map(() => []);
    located.forEach((place) => {
      let best = 0;
      let bestDistance = Infinity;
      centroids.forEach((center, index) => {
        const distance = dist2(place, center);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      buckets[best].push(place);
    });
    centroids.forEach((center, index) => {
      const bucket = buckets[index];
      if (!bucket.length) return;
      center.lat = bucket.reduce((sum, place) => sum + place.lat, 0) / bucket.length;
      center.lng = bucket.reduce((sum, place) => sum + place.lng, 0) / bucket.length;
    });
  }

  buckets.forEach((bucket, index) => {
    if (bucket.length) return;
    let donor = -1;
    let placeIndex = -1;
    let farthest = -1;
    buckets.forEach((other, otherIndex) => {
      if (other.length < 2) return;
      other.forEach((place, candidate) => {
        const distance = dist2(place, centroids[otherIndex]);
        if (distance > farthest) {
          farthest = distance;
          donor = otherIndex;
          placeIndex = candidate;
        }
      });
    });
    if (donor >= 0) buckets[index].push(buckets[donor].splice(placeIndex, 1)[0]);
  });

  const order = centroids.map((center, index) => ({ index, lat: center.lat }))
    .sort((a, b) => b.lat - a.lat);
  const dayOf = new Map(order.map((entry, position) => [entry.index, position]));
  let previous = null;
  order.forEach((entry) => {
    const bucket = buckets[entry.index].slice();
    if (!bucket.length) return;
    const routed = [];
    let current = previous;
    if (!current) {
      current = bucket.slice().sort((a, b) => b.lat - a.lat)[0];
      const start = bucket.findIndex((place) => place === current);
      bucket.splice(start, 1);
      routed.push(current);
    }
    while (bucket.length) {
      let bestIndex = 0;
      let bestDistance = Infinity;
      bucket.forEach((place, index) => {
        const distance = dist2(place, current);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      current = bucket.splice(bestIndex, 1)[0];
      routed.push(current);
    }
    routed.forEach((place, index) => {
      place.day = dayOf.get(entry.index);
      place.order = index;
    });
    previous = routed[routed.length - 1];
  });
  loose.forEach((place, index) => {
    place.day = index % days;
    place.order = 100 + index;
  });
  return places;
}

function dayCount(trip) {
  if (!trip) return 1;
  const fromPlaces = trip.places && trip.places.length
    ? Math.max(...trip.places.map((place) => place.day)) + 1
    : 1;
  return Math.max(fromPlaces, trip.daySpan || 1);
}

function tripEnd(trip) {
  if (trip.endDate) return trip.endDate;
  return isoDate(addDays(trip.startDate, dayCount(trip) - 1));
}

function stopsOn(day) {
  return state.trip.places
    .filter((place) => place.day === day)
    .sort((a, b) => a.order - b.order);
}

function addDays(iso, count) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + count);
  return date;
}

function prettyDate(date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function minutesFor(index, count) {
  const start = 9 * 60;
  const end = 18 * 60;
  return count <= 1 ? start : start + Math.round(((end - start) * index) / (count - 1));
}

function formatMinutes(minute) {
  const hour = Math.floor(minute / 60);
  const rest = String(minute % 60).padStart(2, "0");
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${rest} ${suffix}`;
}

function formatClock(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  return formatMinutes((Number(match[1]) * 60) + Number(match[2]));
}

function clock(index, count) {
  return formatMinutes(minutesFor(index, count));
}

function sortMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 24 * 60;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayForDate(value) {
  if (!value || !state.trip) return -1;
  const start = new Date(`${state.trip.startDate}T12:00:00`);
  const target = new Date(`${value}T12:00:00`);
  if (Number.isNaN(target.getTime())) return -1;
  return Math.round((target - start) / 86400000);
}

function clampedDay(value) {
  const index = dayForDate(value);
  const last = dayCount(state.trip) - 1;
  if (index < 0) return 0;
  if (index > last) return last;
  return index;
}

function kindOf(name) {
  const text = name.toLowerCase();
  if (/coffee|cafe|café|bakery|restaurant|kitchen|burger|crepe|bagel|salmon|eatery/.test(text)) return "Eat";
  if (/shop|market|mall|store|bakery/.test(text)) return "Shop";
  if (/hotel|hostel|lodge/.test(text)) return "Stay";
  if (/airport|station|ferry|hwy|highway/.test(text)) return "Go";
  if (/trek|horse|playground|skyline|boat/.test(text)) return "Do";
  return "See";
}

function focusDay() {
  const total = dayCount(state.trip);
  const start = new Date(`${state.trip.startDate}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const diff = Math.round((now - start) / 86400000);
  if (diff < 0) return { index: 0, label: "First day" };
  if (diff >= total) return { index: total - 1, label: "Last day" };
  return { index: diff, label: "Today" };
}

function dayTitle(places) {
  const counts = new Map();
  places.forEach((place) => {
    place.name.split(/\s+/).forEach((word) => {
      const clean = word.replace(/[^\p{L}]/gu, "");
      if (clean.length < 4) return;
      if (/lookout|lake|peak|coffee|cafe|sound|park|road|state|scenic|queenstown/i.test(clean)) return;
      counts.set(clean, (counts.get(clean) || 0) + 1);
    });
  });
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 2) return best[0];
  return places[0] ? places[0].name.split(/\s+/).slice(0, 2).join(" ") : "Open day";
}

function weatherText(code) {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code >= 95) return "Storms";
  return "Mixed";
}

const CHARACTER_PHOTOS = {
  dumbo: [
    "dumbo/01_dumbo_walking.png",
    "dumbo/02_dumbo_flying_balloon.png",
    "dumbo/03_dumbo_sitting.png",
    "dumbo/04_dumbo_sitting_blue_hat.png",
    "dumbo/05_dumbo_with_mother.png",
  ],
  sadness: [
    "sadness/01_sadness_standing.png",
    "sadness/02_sadness_crying.png",
    "sadness/03_sadness_memory_orb.png",
    "sadness/04_sadness_closeup.png",
    "sadness/05_sadness_lying_down.png",
  ],
};

function mascot(id, pose = 0) {
  const photos = CHARACTER_PHOTOS[id];
  if (photos) {
    const src = photos[Math.abs(pose) % photos.length];
    return `<img class="mascot photo" src="/${src}" alt="" draggable="false">`;
  }
  if (id === "sadness") {
    return `<svg class="mascot" viewBox="0 0 160 160" aria-hidden="true">
      <ellipse cx="80" cy="142" rx="36" ry="8" fill="#000" opacity=".08"/>
      <path d="M80 22c0 0 40 48 40 78a40 40 0 1 1-80 0c0-30 40-78 40-78z" fill="#8eb7e8"/>
      <path d="M80 40c0 0 22 32 22 54a22 22 0 1 1-44 0c0-22 22-54 22-54z" fill="#c5ddf6" opacity=".55"/>
      <circle cx="66" cy="96" r="4" fill="#1e3a5f"/>
      <circle cx="94" cy="98" r="4" fill="#1e3a5f"/>
      <path d="M70 112q10 6 20-2" fill="none" stroke="#1e3a5f" stroke-width="3" stroke-linecap="round"/>
      <path d="M46 48c8-10 16-8 18 0" fill="none" stroke="#d7e8f8" stroke-width="4" stroke-linecap="round"/>
    </svg>`;
  }
  if (id === "miguel") {
    return `<svg class="mascot" viewBox="0 0 160 160" aria-hidden="true">
      <ellipse cx="80" cy="142" rx="36" ry="8" fill="#000" opacity=".08"/>
      <g fill="#f2c14e">
        <ellipse cx="80" cy="70" rx="16" ry="28" transform="rotate(0 80 78)"/>
        <ellipse cx="80" cy="70" rx="16" ry="28" transform="rotate(60 80 78)"/>
        <ellipse cx="80" cy="70" rx="16" ry="28" transform="rotate(120 80 78)"/>
      </g>
      <circle cx="80" cy="84" r="28" fill="#ffd7a8"/>
      <circle cx="70" cy="82" r="3.5" fill="#3a2416"/>
      <circle cx="90" cy="82" r="3.5" fill="#3a2416"/>
      <path d="M74 94q6 6 12 0" fill="none" stroke="#c4533a" stroke-width="3" stroke-linecap="round"/>
      <rect x="108" y="96" width="8" height="28" rx="3" fill="#8a4b2a"/>
      <path d="M116 100c16 2 18 22 0 26" fill="none" stroke="#3a2416" stroke-width="3"/>
    </svg>`;
  }
  if (id === "sulley") {
    return `<svg class="mascot" viewBox="0 0 160 160" aria-hidden="true">
      <ellipse cx="80" cy="144" rx="40" ry="8" fill="#000" opacity=".08"/>
      <path d="M48 58c-2-18 10-28 16-18" fill="none" stroke="#7d6bb5" stroke-width="8" stroke-linecap="round"/>
      <path d="M112 58c2-18-10-28-16-18" fill="none" stroke="#7d6bb5" stroke-width="8" stroke-linecap="round"/>
      <rect x="40" y="62" width="80" height="72" rx="36" fill="#1f8a78"/>
      <ellipse cx="80" cy="108" rx="24" ry="18" fill="#f4fffc"/>
      <circle cx="66" cy="92" r="5" fill="#14332e"/>
      <circle cx="96" cy="92" r="5" fill="#14332e"/>
      <path d="M70 108q10 10 22 0" fill="none" stroke="#14332e" stroke-width="3" stroke-linecap="round"/>
      <circle cx="52" cy="84" r="5" fill="#b7e2d4"/>
      <circle cx="112" cy="100" r="4" fill="#b7e2d4"/>
    </svg>`;
  }
  return `<svg class="mascot" viewBox="0 0 160 160" aria-hidden="true">
    <ellipse cx="80" cy="142" rx="38" ry="8" fill="#000" opacity=".08"/>
    <ellipse cx="36" cy="78" rx="24" ry="32" fill="#b9d4ee"/>
    <ellipse cx="124" cy="78" rx="24" ry="32" fill="#b9d4ee"/>
    <circle cx="80" cy="84" r="38" fill="#f6e7c8"/>
    <circle cx="66" cy="80" r="4" fill="#3d3428"/>
    <circle cx="94" cy="80" r="4" fill="#3d3428"/>
    <ellipse cx="56" cy="92" rx="6" ry="3" fill="#f0b7a8"/>
    <ellipse cx="104" cy="92" rx="6" ry="3" fill="#f0b7a8"/>
    <path d="M80 90c0 14-12 20-16 18" fill="none" stroke="#e2c99a" stroke-width="6" stroke-linecap="round"/>
    <path d="M58 112c16 8 30 8 46 0" fill="none" stroke="#e7b15a" stroke-width="6" stroke-linecap="round"/>
  </svg>`;
}

function icon(name) {
  const paths = {
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    days: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    places: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/>',
    map: '<path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/>',
    palette: '<path d="M12 3.5l1.7 4.3 4.6.4-3.5 3 1.1 4.5L12 13.4 8.1 15.7l1.1-4.5-3.5-3 4.6-.4L12 3.5z"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function findPlace(id) {
  return state.trip && state.trip.places.find((place) => place.id === id);
}

function render() {
  destroyMap();
  applyTheme();
  const root = document.getElementById("app");
  const active = document.activeElement;
  const keep = active && active.dataset && active.dataset.field
    ? { field: active.dataset.field, id: active.dataset.id || "", start: active.selectionStart }
    : null;
  root.innerHTML = `${topHTML()}${viewHTML()}<nav class="nav">${navHTML()}</nav>${sheetHTML()}`;
  if (state.screen === "map" && state.trip) requestAnimationFrame(drawMap);
  if (!keep) return;
  const next = root.querySelector(`[data-field="${keep.field}"]${keep.id ? `[data-id="${keep.id}"]` : ""}`);
  if (!next) return;
  next.focus();
  if (typeof keep.start === "number") {
    try { next.setSelectionRange(keep.start, keep.start); } catch { /* date inputs */ }
  }
}

function topHTML() {
  if (!state.trip) {
    return `<header class="top"><div><p class="eyebrow">Daytrip</p><h1>Your list, in days.</h1></div>
      <button class="icon-btn" data-action="themes" aria-label="Choose a companion">${icon("palette")}</button></header>`;
  }
  const count = dayCount(state.trip);
  return `<header class="top"><div style="flex:1;min-width:0"><p class="eyebrow">${count} day${count === 1 ? "" : "s"} · ${state.trip.places.length} places</p>
      <input class="title-input" data-field="trip-name" aria-label="Trip name" value="${esc(state.trip.name)}"></div>
      <button class="icon-btn" data-action="themes" aria-label="Choose a companion">${icon("palette")}</button></header>`;
}

function viewHTML() {
  if (!state.trip) return `<main class="view">${emptyHTML()}</main>`;
  if (state.screen === "days") return `<main class="view">${daysHTML()}</main>`;
  if (state.screen === "places") return `<main class="view">${placesHTML()}</main>`;
  if (state.screen === "map") return `<main class="view">${mapHTML()}</main>`;
  return `<main class="view">${todayHTML()}</main>`;
}

function emptyHTML() {
  return `<section class="empty">${mascot(state.theme)}
    <p class="kicker">${esc(theme().name)}</p>
    <h2>Paste a saved list.</h2>
    <p class="lede">${esc(theme().line)} Public Google Maps lists become a day-by-day plan.</p>
    ${state.banner ? `<p class="banner">${esc(state.banner)}</p>` : ""}
    <button class="primary" data-action="import" style="margin-top:16px">Add a Google list</button>
    <p class="fine">On iPhone, use Share, then Add to Home Screen. Same idea as the gym tracker.</p>
  </section>`;
}

function todayHTML() {
  const focus = focusDay();
  const stops = stopsOn(focus.index);
  const when = prettyDate(addDays(state.trip.startDate, focus.index));
  const weather = state.weather
    ? `<div class="weather"><span>${esc(state.weather.summary)}</span><span>${esc(state.weather.temp)}</span></div>`
    : `<div class="weather"><span>${esc(state.weatherNote || "Checking the sky…")}</span></div>`;
  const timeline = dayTimeline(focus.index, false);
  const packing = state.trip.packing.map((item) => `<label class="pack-row ${item.done ? "done" : ""}">
      <input type="checkbox" data-action="pack" data-id="${esc(item.id)}" ${item.done ? "checked" : ""}>
      <span>${esc(item.label)}</span></label>`).join("");
  return `<section class="hero"><div>
      <p class="kicker">${esc(focus.label)} · ${esc(when)}</p>
      <h2>${esc(dayTitle(stops.length ? stops : state.trip.places))}</h2>
      <p class="lede">${esc(theme().line)}</p>${weather}</div>${mascot(state.theme, focus.index)}</section>
    <div class="section-label"><h2>${stops.length} stop${stops.length === 1 ? "" : "s"}</h2><span>Day ${focus.index + 1}</span></div>
    ${timeline}
    <div class="section-label"><h2>Bag</h2><span>${state.trip.packing.filter((item) => item.done).length}/${state.trip.packing.length}</span></div>
    ${packing}`;
}

function stopHTML(place, when, withMove) {
  const thumb = place.photo ? `<img class="thumb" src="${esc(place.photo)}" alt="">` : "";
  const handle = withMove
    ? `<button type="button" class="drag" data-drag="place" data-id="${esc(place.id)}" aria-label="Drag to move">⋮⋮</button>`
    : `<span class="chev" aria-hidden="true">›</span>`;
  return `<div class="stop" data-id="${esc(place.id)}">
      <span class="when">${esc(when)}</span>
      <button type="button" class="stop-hit" data-action="open-place" data-id="${esc(place.id)}">
        ${thumb}
        <span><strong>${esc(place.name)}</strong>
        <span class="stop-kind">${esc(kindOf(place.name))}${place.hours ? " · hours" : ""}${place.note ? " · note" : ""}</span>
        ${place.why ? `<span class="why">${esc(place.why)}</span>` : ""}</span>
      </button>
      ${handle}</div>`;
}

function daysHTML() {
  const total = dayCount(state.trip);
  const cards = [];
  for (let day = 0; day < total; day += 1) {
    const stops = stopsOn(day);
    const body = dayTimeline(day, true);
    cards.push(`<article class="day-card" data-day="${day}"><div class="day-head">
        <button type="button" class="drag" data-drag="day" data-day="${day}" aria-label="Drag day">⋮⋮</button>
        <div>
        <p class="kicker">Day ${day + 1}</p><h3>${esc(dayTitle(stops))}</h3>
        <p>${esc(prettyDate(addDays(state.trip.startDate, day)))} · ${stops.length} stops</p>
        ${total > 1 ? `<button type="button" class="text-link" data-action="remove-day" data-day="${day}">Remove this day</button>` : ""}
      </div>${mascot(state.theme, day)}</div><div class="day-body">${body}</div></article>`);
  }
  return `<div class="tools">
      <button class="ghost" data-action="grok-plan">Grok plan</button>
      <button class="ghost" data-action="range-nov">14–28 Nov</button>
      <button class="ghost" data-action="add-day">Add a day</button>
      <button class="ghost" data-action="add-flight">Add flight</button>
      <button class="ghost" data-action="ai">API planner</button>
      <button class="ghost" data-action="copy">${state.copied ? "Copied" : "Copy plan"}</button>
      <button class="ghost" data-action="arrange">Regroup by map</button>
    </div>
    <div class="pair">
      <div class="field"><label for="start">First day</label>
        <input id="start" type="date" data-field="start" value="${esc(state.trip.startDate)}"></div>
      <div class="field"><label for="end">Last day</label>
        <input id="end" type="date" data-field="end" value="${esc(tripEnd(state.trip))}"></div>
    </div>
    <p class="fine">Drag a day by the dots to move that whole day. Drag a stop by its dots to move it up, down, or into another day.</p>
    ${cards.join("")}`;
}

function placesHTML() {
  const query = state.query.trim().toLowerCase();
  const places = state.trip.places
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((place) => !query || `${place.name} ${place.note}`.toLowerCase().includes(query));
  const rows = places.map((place) => `<button class="place-row" data-action="open-place" data-id="${esc(place.id)}">
      <span class="when">D${place.day + 1}</span>
      <span><strong>${esc(place.name)}</strong><span class="stop-kind">${esc(kindOf(place.name))}</span></span>
      <span class="chev">›</span></button>`).join("") || `<p class="hint">No places match.</p>`;
  return `<div class="field"><label for="find">Search</label>
      <input id="find" data-field="search" placeholder="Cafe, lake, lookout" value="${esc(state.query)}"></div>
    <div class="tools"><button class="ghost" data-action="import">Import another list</button></div>
    <div id="place-list">${rows}</div>`;
}

function mapHTML() {
  if (typeof L === "undefined") {
    return `<p class="banner">The map needs a connection the first time. Your days are still saved on this phone.</p>`;
  }
  const chips = [];
  for (let day = 0; day < dayCount(state.trip); day += 1) {
    const color = theme().pins[day % theme().pins.length];
    chips.push(`<span class="chip"><i style="background:${color}"></i>Day ${day + 1}</span>`);
  }
  return `<p class="eyebrow">路線圖 · the line follows the day order</p><div id="map" class="map-wrap"></div><div class="legend">${chips.join("")}</div>`;
}

function navHTML() {
  return [
    ["today", "Today"],
    ["days", "Days"],
    ["places", "Places"],
    ["map", "Map"],
  ].map(([id, label]) => `<button data-action="go" data-screen="${id}" class="${state.screen === id ? "on" : ""}">${icon(id)}<span>${label}</span></button>`).join("");
}

function flightEvents(day) {
  const events = [];
  (state.trip.flights || []).forEach((flight) => {
    const leave = flight.departDate ? clampedDay(flight.departDate) : -1;
    const land = flight.arriveDate ? clampedDay(flight.arriveDate) : leave;
    if (leave === day) events.push({ flight, kind: "Leave", time: flight.departTime || "00:00" });
    if (land === day && land !== leave) events.push({ flight, kind: "Land", time: flight.arriveTime || "23:00" });
  });
  return events;
}

function flightHTML(event) {
  const flight = event.flight;
  const route = `${flight.fromCode || "—"} → ${flight.toCode || "—"}`;
  const label = [flight.airline, flight.number].filter(Boolean).join(" ") || "Flight";
  const extra = [flight.seat && `Seat ${flight.seat}`, flight.confirmation && flight.confirmation].filter(Boolean).join(" · ");
  return `<button type="button" class="flight" data-action="open-flight" data-id="${esc(flight.id)}">
      <span class="when">${esc(formatClock(event.time) || event.kind)}</span>
      <span><strong>${esc(label)}</strong>
        <span class="stop-kind">${esc(event.kind)} · ${esc(route)}${extra ? ` · ${esc(extra)}` : ""}</span>
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </button>`;
}

function dayTimeline(day, withMove) {
  const stops = stopsOn(day);
  const rows = flightEvents(day).map((event) => ({
    sort: sortMinutes(event.time),
    html: flightHTML(event),
  }));
  stops.forEach((place, index) => {
    rows.push({
      sort: place.time ? sortMinutes(place.time) : minutesFor(index, stops.length),
      html: stopHTML(place, place.time ? formatClock(place.time) : clock(index, stops.length), withMove),
    });
  });
  if (!rows.length) return `<p class="hint" style="padding:8px 6px 12px">Nothing on this day yet.</p>`;
  rows.sort((a, b) => a.sort - b.sort);
  return rows.map((row) => row.html).join("");
}

function sheetHTML() {
  if (state.sheet === "themes") return themeSheet();
  if (state.sheet === "import") return importSheet();
  if (state.sheet === "place") return placeSheet();
  if (state.sheet === "flight") return flightSheet();
  if (state.sheet === "ai") return aiSheet();
  if (state.sheet === "ai-key") return aiKeySheet();
  if (state.sheet === "grok") return grokSheet();
  return "";
}

function themeSheet() {
  const cards = Object.entries(THEMES).map(([id, item]) => `<button class="theme-card ${id === state.theme ? "on" : ""}" data-action="pick-theme" data-theme="${id}">
      ${mascot(id)}<strong>${esc(item.name)}</strong><span>${esc(item.line)}</span></button>`).join("");
  return `<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-keep>
      <div class="handle"></div>
      <p class="eyebrow">Companion</p>
      <h2>Who comes along?</h2>
      <div class="themes">${cards}</div>
      <p class="fine">Dumbo and Sadness use the photos from your folders. Miguel and Sulley stay as simple drawings.</p>
    </div></div>`;
}

function importSheet() {
  const preview = state.draft ? `<p class="owner">${esc(state.draft.owner ? `${state.draft.owner} · ` : "")}${state.draft.places.length} places</p>
      <div class="field"><label for="trip-start">First day</label>
        <input id="trip-start" type="date" data-field="draft-start" value="${esc(state.startDate)}"></div>
      <div class="field"><label>How many days</label><div class="stepper">
        <button class="mini" data-action="days-dec" aria-label="Fewer days">−</button>
        <strong>${state.days}</strong>
        <button class="mini" data-action="days-inc" aria-label="More days">+</button>
      </div></div>
      ${state.trip ? `<p class="fine">This replaces the current places. Notes you already typed will be cleared.</p>` : ""}
      <button class="primary full" data-action="build">Build the days</button>` : `<div class="field"><label for="list-url">Google Maps list link</label>
      <input id="list-url" data-field="url" placeholder="https://maps.app.goo.gl/…" value="${esc(state.url || "")}"></div>
      ${state.error ? `<p class="error">${esc(state.error)}</p>` : ""}
      ${state.hostOk ? "" : `<p class="error">Open this page from the trip server, not as a loose file. Run python serve.py in the trip folder.</p>`}
      <button class="primary full" data-action="read-list" ${state.importing ? "disabled" : ""}>${state.importing ? "Reading the list…" : "Read list"}</button>
      <p class="fine">Public shared lists only. A private saved list never leaves your Google account.</p>`;
  return `<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-keep>
      <div class="handle"></div>
      <p class="eyebrow">Import</p>
      <h2>${state.draft ? esc(state.draft.name) : "Paste your list."}</h2>
      ${preview}
    </div></div>`;
}

function placeSheet() {
  const place = findPlace(state.placeId);
  if (!place) return "";
  const options = [];
  for (let day = 0; day < dayCount(state.trip); day += 1) {
    options.push(`<option value="${day}" ${place.day === day ? "selected" : ""}>Day ${day + 1} · ${esc(prettyDate(addDays(state.trip.startDate, day)))}</option>`);
  }
  const maps = place.lat != null
    ? (/iPhone|iPad|iPod/.test(navigator.userAgent)
      ? `https://maps.apple.com/?ll=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`
      : place.mapsUrl)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
  return `<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-keep>
      <div class="handle"></div>
      <p class="eyebrow">${esc(kindOf(place.name))}</p>
      <h2>${esc(place.name)}</h2>
      ${place.photo ? `<img class="place-photo" src="${esc(place.photo)}" alt="">` : ""}
      ${place.address ? `<p class="owner">${esc(place.address)}</p>` : `<p class="owner">Day ${place.day + 1}</p>`}
      <div class="field"><label for="hours">Opening time</label>
        <textarea id="hours" rows="2" data-field="hours" data-id="${esc(place.id)}">${esc(place.hours || "")}</textarea></div>
      <div class="field"><label for="about">About this place</label>
        <textarea id="about" rows="4" data-field="description" data-id="${esc(place.id)}">${esc(place.description || "")}</textarea></div>
      <div class="pair">
        <div class="field"><label for="ptime">Time</label>
          <input id="ptime" type="time" data-field="place-time" data-id="${esc(place.id)}" value="${esc(place.time || "")}"></div>
        <div class="field"><label for="daypick">Day</label>
          <select id="daypick" data-field="day" data-id="${esc(place.id)}">${options.join("")}</select></div>
      </div>
      <div class="field"><label for="note">Note</label>
        <textarea id="note" rows="3" data-field="note" data-id="${esc(place.id)}" placeholder="Why this stop, or what to order">${esc(place.note)}</textarea></div>
      <div class="detail-actions">
        <a class="linkish" href="${esc(maps)}" target="_blank" rel="noopener">Open in Maps</a>
        <button class="text-btn danger" data-action="remove-place" data-id="${esc(place.id)}">Remove from trip</button>
      </div>
    </div></div>`;
}

function blankFlight() {
  return {
    id: uid(),
    airline: "",
    number: "",
    fromCode: "",
    toCode: "",
    departDate: state.trip ? state.trip.startDate : todayISO(),
    departTime: "",
    arriveDate: state.trip ? state.trip.startDate : todayISO(),
    arriveTime: "",
    terminal: "",
    gate: "",
    seat: "",
    confirmation: "",
    note: "",
    fresh: true,
  };
}

function flightField(name, label, value, type = "text", placeholder = "") {
  return `<div class="field"><label for="f-${name}">${label}</label>
    <input id="f-${name}" data-field="flight-${name}" type="${type}" value="${esc(value || "")}" placeholder="${esc(placeholder)}"></div>`;
}

function flightSheet() {
  const flight = state.flightDraft;
  if (!flight) return "";
  return `<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-keep>
      <div class="handle"></div>
      <p class="eyebrow">Flight</p>
      <h2>${flight.fresh ? "Add a flight." : "Flight details."}</h2>
      ${state.error ? `<p class="error">${esc(state.error)}</p>` : ""}
      <div class="pair">
        ${flightField("airline", "Airline", flight.airline, "text", "Air New Zealand")}
        ${flightField("number", "Flight number", flight.number, "text", "NZ 80")}
      </div>
      <div class="pair">
        ${flightField("fromCode", "From", flight.fromCode, "text", "HKG")}
        ${flightField("toCode", "To", flight.toCode, "text", "CHC")}
      </div>
      <div class="pair">
        ${flightField("departDate", "Departs", flight.departDate, "date")}
        ${flightField("departTime", "Depart time", flight.departTime, "time")}
      </div>
      <div class="pair">
        ${flightField("arriveDate", "Arrives", flight.arriveDate, "date")}
        ${flightField("arriveTime", "Arrive time", flight.arriveTime, "time")}
      </div>
      <div class="pair">
        ${flightField("terminal", "Terminal", flight.terminal, "text", "1")}
        ${flightField("gate", "Gate", flight.gate, "text", "A12")}
      </div>
      <div class="pair">
        ${flightField("seat", "Seat", flight.seat, "text", "24A")}
        ${flightField("confirmation", "Booking code", flight.confirmation, "text", "ABC123")}
      </div>
      <div class="field"><label for="f-note">Note</label>
        <textarea id="f-note" rows="2" data-field="flight-note" placeholder="Baggage, layover, where to meet">${esc(flight.note || "")}</textarea></div>
      <div class="detail-actions sheet-actions">
        <button type="button" class="primary full" data-action="save-flight">Save flight</button>
        ${flight.fresh ? "" : `<button type="button" class="text-btn danger" data-action="remove-flight" data-id="${esc(flight.id)}">Remove flight</button>`}
      </div>
    </div></div>`;
}

function aiKeySheet() {
  return `<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-keep>
      <div class="handle"></div>
      <p class="eyebrow">Free planner</p>
      <h2>Paste a Gemini key.</h2>
      <p class="owner">Google AI Studio gives one with no card. The key stays in a file on this computer. It is not saved in the phone.</p>
      ${state.error ? `<p class="error">${esc(state.error)}</p>` : ""}
      <div class="field"><label for="ai-key">Gemini API key</label>
        <input id="ai-key" data-field="ai-key" type="password" autocomplete="off" placeholder="AIza…" value=""></div>
      <button type="button" class="primary full" data-action="save-key">Save key</button>
      <p class="fine">Get it at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. Free-tier prompts can be used by Google to improve its models, so don't put passport numbers in the wish box. A paid xAI key also works if XAI_API_KEY is set on this computer.</p>
    </div></div>`;
}

function aiSheet() {
  const preview = state.planDraft ? `<p class="owner">${esc(state.planDraft.summary || "A new order for these days.")}</p>
      ${state.planDraft.days.map((day) => `<p class="hint"><strong>Day ${day.day + 1}${day.title ? ` · ${esc(day.title)}` : ""}</strong> · ${day.places.length} stops</p>`).join("")}
      <button type="button" class="primary full" data-action="use-plan">Use this plan</button>
      <p class="fine">Your notes stay. Times and the day order change.</p>` : "";
  return `<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-keep>
      <div class="handle"></div>
      <p class="eyebrow">${esc(state.aiName || "Gemini")} · free</p>
      <h2>Plan these days.</h2>
      <p class="owner">Flights are included, so a landing day does not start at 9.</p>
      ${state.error ? `<p class="error">${esc(state.error)}</p>` : ""}
      <div class="field"><label for="wish">Anything it should know</label>
        <textarea id="wish" rows="3" data-field="wish" placeholder="We land tired. No hikes on flight days. Coffee before lookouts.">${esc(state.wish || "")}</textarea></div>
      <button type="button" class="primary full" data-action="ask-plan" ${state.planning ? "disabled" : ""}>${state.planning ? "Planning…" : "Ask the planner"}</button>
      ${preview}
    </div></div>`;
}

function readFlightForm() {
  if (!state.flightDraft) return;
  document.querySelectorAll("[data-field^='flight-']").forEach((input) => {
    state.flightDraft[input.dataset.field.slice("flight-".length)] = input.value;
  });
}

function saveFlight() {
  readFlightForm();
  const flight = state.flightDraft;
  if (!flight) return;
  flight.fromCode = flight.fromCode.trim().toUpperCase();
  flight.toCode = flight.toCode.trim().toUpperCase();
  flight.number = flight.number.trim();
  flight.airline = flight.airline.trim();
  if (!flight.fromCode || !flight.toCode || !flight.departDate) {
    state.error = "Add the airports and the departure date.";
    render();
    return;
  }
  if (!flight.arriveDate) flight.arriveDate = flight.departDate;
  const existing = state.trip.flights.findIndex((item) => item.id === flight.id);
  const stored = { ...flight };
  delete stored.fresh;
  if (existing >= 0) state.trip.flights[existing] = stored;
  else state.trip.flights.push(stored);
  state.flightDraft = null;
  state.sheet = null;
  state.error = "";
  save();
  render();
}

async function askPlan() {
  const wishBox = document.querySelector('[data-field="wish"]');
  if (wishBox) state.wish = wishBox.value;
  state.planning = true;
  state.error = "";
  state.planDraft = null;
  render();
  try {
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.trip.name,
        startDate: state.trip.startDate,
        days: dayCount(state.trip),
        wish: state.wish,
        flights: (state.trip.flights || []).map((flight) => ({
          airline: flight.airline,
          number: flight.number,
          from: flight.fromCode,
          to: flight.toCode,
          depart: `${flight.departDate} ${flight.departTime}`.trim(),
          arrive: `${flight.arriveDate} ${flight.arriveTime}`.trim(),
        })),
        places: state.trip.places.map((place) => ({
          id: place.id,
          name: place.name,
          kind: kindOf(place.name),
          lat: place.lat,
          lng: place.lng,
          note: place.note,
        })),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The planner did not answer.");
    state.planDraft = payload;
  } catch (error) {
    state.error = error.message === "Failed to fetch"
      ? "The trip server is not running, so the planner cannot be reached."
      : error.message;
  } finally {
    state.planning = false;
    render();
  }
}

function usePlan() {
  if (!state.planDraft) return;
  const placed = new Map();
  state.planDraft.days.forEach((day) => {
    day.places.forEach((item, index) => {
      placed.set(item.id, { day: day.day, order: index, time: item.time || "", why: item.why || "" });
    });
  });
  state.trip.places.forEach((place) => {
    const next = placed.get(place.id);
    if (!next) return;
    place.day = next.day;
    place.order = next.order;
    place.time = next.time;
    place.why = next.why;
  });
  state.planDraft = null;
  state.sheet = null;
  state.screen = "days";
  save();
  render();
  loadWeather();
}

async function saveKey() {
  const input = document.querySelector('[data-field="ai-key"]');
  const key = input ? input.value.trim() : "";
  state.error = "";
  state.planning = true;
  render();
  try {
    const response = await fetch("/api/ai-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not save that key.");
    state.aiReady = !!payload.ai;
    state.aiName = payload.provider || "Gemini";
    state.sheet = "ai";
    state.planDraft = null;
  } catch (error) {
    state.error = error.message === "Failed to fetch"
      ? "The trip server is not running, so the key cannot be saved."
      : error.message;
  } finally {
    state.planning = false;
    render();
  }
}

const GROK_DAYS = [
  [["Christchurch"], ["10:00"]],
  [["Lake Tekapo", "Lake Tekapo Scenic", "The Church of the Good Shepherd", "Astro Cafe"], ["09:30", "11:00", "13:00", "16:00"]],
  [["State Hwy 80", "Tasman Glacier", "Mt Cook Alpine Salmon Shop"], ["09:00", "11:30", "14:30"]],
  [["Lake Pukaki"], ["10:30"]],
  [["Lake Wānaka", "Wānaka", "Wānaka Willow Tree", "Wānaka Sequoia", "Playground at the lake"], ["09:30", "11:00", "13:00", "14:30", "16:00"]],
  [["Roys Peak"], ["08:00"]],
  [["Lighthorse Adventures Horse Treks"], ["10:00"]],
  [["Glenorchy"], ["10:00"]],
  [["皇后鎮", "Skyline Queenstown", "Fergburger", "Deer Park Heights Queenstown"], ["09:30", "11:00", "13:30", "16:00"]],
  [["Black Lab Coffee Roasters Queenstown", "Wolf Coffee Roasters", "The Boat Shed Cafe"], ["09:00", "11:00", "14:00"]],
  [["Arrowtown Bakery", "Saigon Kingdom Vietnamese Restaurant Remarkables Park", "Coffee Jo Good"], ["09:00", "12:30", "15:30"]],
  [["Charlie Brown Crepes", "Curbside Coffee & Bagels"], ["10:00", "12:30"]],
  [["Lake Müller Lookout", "Milford Sound / Piopiotahi"], ["08:30", "12:30"]],
  [[], []],
  [[], []],
];

function setTripRange(start, end) {
  if (!state.trip || !start) return;
  if (!end || end < start) end = start;
  let span = Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1;
  if (span > 31) {
    span = 31;
    end = isoDate(addDays(start, 30));
  }
  if (span < 1) span = 1;
  state.trip.startDate = start;
  state.trip.endDate = end;
  state.trip.daySpan = span;
  state.trip.places.forEach((place) => {
    if (place.day >= span) place.day = span - 1;
  });
  save();
  render();
  loadWeather();
}

function applyGrokPlan() {
  if (!state.trip || !state.trip.places.length) {
    state.error = "Import your Google list first. The plan only uses places already on the list.";
    render();
    return;
  }
  setTripRange("2026-11-14", "2026-11-28");
  const used = new Set();
  state.trip.places.forEach((place) => {
    place.day = 14;
    place.order = 50;
    place.time = "";
  });
  GROK_DAYS.forEach(([names, times], day) => {
    names.forEach((name, index) => {
      const place = state.trip.places.find((item) => !used.has(item.id) && normName(item.name) === normName(name));
      if (!place) return;
      used.add(place.id);
      place.day = day;
      place.order = index;
      place.time = times[index] || "";
      applyGuide(place);
    });
  });
  const leftover = state.trip.places.filter((place) => !used.has(place.id));
  leftover.forEach((place, index) => {
    place.day = Math.min(12, index % 13);
    place.order = 40 + index;
    applyGuide(place);
  });
  state.trip.places.forEach(applyGuide);
  state.sheet = null;
  state.screen = "days";
  state.error = "";
  save();
  render();
  loadWeather();
}

function grokSheet() {
  return `<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-keep>
      <div class="handle"></div>
      <p class="eyebrow">Grok plan</p>
      <h2>14 to 28 November.</h2>
      <p class="owner">This uses only the places already on your list. It does not add new stops. Christchurch first, then Tekapo, Aoraki, Wānaka, Queenstown, and Milford Sound, with 27 and 28 left open.</p>
      ${state.error ? `<p class="error">${esc(state.error)}</p>` : ""}
      <button type="button" class="primary full" data-action="apply-grok">Use this plan</button>
      <p class="fine">The API planner is still there if you want a model to try a different order. Grok's plan is this one, written from the saved list.</p>
    </div></div>`;
}

function addDay() {
  const span = dayCount(state.trip) + 1;
  state.trip.daySpan = span;
  state.trip.endDate = isoDate(addDays(state.trip.startDate, span - 1));
  save();
  render();
}

function removeDay(day) {
  const span = dayCount(state.trip);
  if (span <= 1) return;
  state.trip.places.forEach((place) => {
    if (place.day === day) place.day = Math.max(0, day - 1);
    else if (place.day > day) place.day -= 1;
  });
  state.trip.daySpan = span - 1;
  state.trip.endDate = isoDate(addDays(state.trip.startDate, state.trip.daySpan - 1));
  save();
  render();
}

function moveDay(from, to) {
  if (from === to || from < 0 || to < 0) return;
  const total = dayCount(state.trip);
  const order = [...Array(total).keys()];
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  const remap = new Map(order.map((oldIndex, newIndex) => [oldIndex, newIndex]));
  state.trip.places.forEach((place) => {
    place.day = remap.get(place.day);
  });
  save();
  render();
}

function moveStopTo(id, day, index) {
  const place = findPlace(id);
  if (!place || day < 0) return;
  const source = stopsOn(place.day).filter((item) => item.id !== id);
  const target = place.day === day ? source : stopsOn(day).slice();
  const at = Math.max(0, Math.min(index, target.length));
  target.splice(at, 0, place);
  source.forEach((item, position) => {
    item.order = position;
  });
  const times = target.map((item) => item.time).filter(Boolean).sort();
  const keepTimes = times.length === target.length && times.length > 0;
  target.forEach((item, position) => {
    item.day = day;
    item.order = position;
    item.time = keepTimes ? times[position] : "";
  });
  save();
  render();
}

async function loadWiki(place) {
  if (!place || place.photo || place.wikiTried || !place.wiki) return;
  place.wikiTried = true;
  try {
    const response = await fetch(`/api/wiki?title=${encodeURIComponent(place.wiki)}`);
    const payload = await response.json();
    if (!response.ok) return;
    if (payload.photo) place.photo = payload.photo;
    if (!place.description && payload.extract) place.description = payload.extract;
    save();
    if (state.sheet === "place" && state.placeId === place.id) render();
  } catch {
    place.wikiTried = false;
  }
}

function destroyMap() {
  if (mapHandle) {
    mapHandle.remove();
    mapHandle = null;
  }
}

function drawMap() {
  const node = document.getElementById("map");
  if (!node || typeof L === "undefined") return;
  const located = state.trip.places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
  if (!located.length) {
    node.innerHTML = `<p class="hint" style="padding:16px">These places came in without coordinates, so the map has nothing to pin.</p>`;
    return;
  }
  mapHandle = L.map(node, { zoomControl: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 19,
  }).addTo(mapHandle);
  const bounds = [];
  for (let day = 0; day < dayCount(state.trip); day += 1) {
    const line = stopsOn(day)
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
      .map((place) => [place.lat, place.lng]);
    if (line.length < 2) continue;
    const color = theme().pins[day % theme().pins.length];
    L.polyline(line, { color, weight: 4, opacity: 0.9 }).addTo(mapHandle);
  }
  const whole = [];
  for (let day = 0; day < dayCount(state.trip); day += 1) {
    stopsOn(day).forEach((place) => {
      if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) whole.push([place.lat, place.lng]);
    });
  }
  if (whole.length > 1) {
    L.polyline(whole, { color: "#2a241c", weight: 2, opacity: 0.35, dashArray: "6 8" }).addTo(mapHandle);
  }
  located.forEach((place) => {
    const color = theme().pins[place.day % theme().pins.length];
    const marker = L.marker([place.lat, place.lng], {
      icon: L.divIcon({
        className: "pin",
        html: `<span style="background:${color}"><b>${place.day + 1}</b></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 26],
      }),
    });
    marker.bindPopup(`<strong>${esc(place.name)}</strong><br>Day ${place.day + 1}`);
    marker.addTo(mapHandle);
    bounds.push([place.lat, place.lng]);
  });
  mapHandle.fitBounds(bounds, { padding: [28, 28] });
}

async function readList() {
  const input = document.querySelector('[data-field="url"]');
  const url = (input ? input.value : state.url || "").trim();
  state.url = url;
  state.error = "";
  if (!url) {
    state.error = "Paste a Google Maps list link first.";
    render();
    return;
  }
  state.importing = true;
  render();
  try {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not read that list.");
    state.draft = payload;
    state.days = suggestDays(payload.places.length);
    state.startDate = state.trip ? state.trip.startDate : todayISO();
  } catch (error) {
    state.error = error.message === "Failed to fetch"
      ? "The trip server is not running. Start it with python serve.py, then open the address it prints."
      : error.message;
  } finally {
    state.importing = false;
    render();
  }
}

function buildTrip() {
  if (!state.draft) return;
  const packing = state.trip && state.trip.packing
    ? state.trip.packing
    : PACKING.map((label) => ({ id: uid(), label, done: false }));
  state.trip = {
    name: state.draft.name,
    owner: state.draft.owner || "",
    sourceUrl: state.url || "",
    startDate: state.startDate,
    endDate: isoDate(addDays(state.startDate, state.days - 1)),
    daySpan: state.days,
    places: arrange(state.draft.places, state.days).map(applyGuide),
    packing,
    flights: state.trip && Array.isArray(state.trip.flights) ? state.trip.flights : [],
  };
  state.draft = null;
  state.sheet = null;
  state.screen = "today";
  state.banner = "";
  save();
  render();
  loadWeather();
}

function movePlace(id, direction) {
  const place = findPlace(id);
  if (!place) return;
  const siblings = stopsOn(place.day);
  const index = siblings.findIndex((item) => item.id === id);
  const swap = siblings[index + direction];
  if (!swap) return;
  if (place.time && swap.time) {
    const time = place.time;
    place.time = swap.time;
    swap.time = time;
  } else {
    const order = place.order;
    place.order = swap.order;
    swap.order = order;
    place.time = "";
    swap.time = "";
  }
  save();
  render();
}

function planText() {
  const lines = [state.trip.name, ""];
  for (let day = 0; day < dayCount(state.trip); day += 1) {
    const stops = stopsOn(day);
    lines.push(`${prettyDate(addDays(state.trip.startDate, day))} · ${dayTitle(stops)}`);
    flightEvents(day).forEach((event) => {
      const flight = event.flight;
      lines.push(`${formatClock(event.time) || event.kind}  ${event.kind} ${flight.airline} ${flight.number} ${flight.fromCode} → ${flight.toCode}`.replace(/\s+/g, " ").trim());
    });
    stops.forEach((place, index) => {
      const when = place.time ? formatClock(place.time) : clock(index, stops.length);
      lines.push(`${when}  ${place.name}${place.note ? ` — ${place.note}` : ""}`);
    });
    lines.push("");
  }
  return lines.join("\n").trim();
}

async function loadWeather() {
  state.weather = null;
  state.weatherNote = "";
  if (!state.trip) return;
  const focus = focusDay();
  const stops = stopsOn(focus.index).filter((place) => Number.isFinite(place.lat));
  const pool = stops.length ? stops : state.trip.places.filter((place) => Number.isFinite(place.lat));
  if (!pool.length) {
    state.weatherNote = "No forecast without a pin.";
    if (state.screen === "today") render();
    return;
  }
  const lat = pool.reduce((sum, place) => sum + place.lat, 0) / pool.length;
  const lng = pool.reduce((sum, place) => sum + place.lng, 0) / pool.length;
  const dayISO = isoDate(addDays(state.trip.startDate, focus.index));
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=16&timezone=auto`);
    const data = await response.json();
    const index = (data.daily.time || []).indexOf(dayISO);
    if (index < 0) {
      state.weatherNote = "Forecast is not out for this date yet.";
    } else {
      const low = Math.round(data.daily.temperature_2m_min[index]);
      const high = Math.round(data.daily.temperature_2m_max[index]);
      state.weather = {
        summary: weatherText(data.daily.weather_code[index]),
        temp: `${low}°–${high}°`,
      };
    }
  } catch {
    state.weatherNote = "Weather is offline right now.";
  }
  if (state.screen === "today" && !state.sheet) render();
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return ok ? Promise.resolve() : Promise.reject(new Error("copy"));
}

function onClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "close-sheet" && event.target !== button) return;
  const { action } = button.dataset;
  if (action === "go") {
    state.screen = button.dataset.screen;
    state.sheet = null;
    save();
    render();
    return;
  }
  if (action === "themes") {
    state.sheet = "themes";
    render();
    return;
  }
  if (action === "import") {
    state.sheet = "import";
    state.draft = null;
    state.error = "";
    render();
    return;
  }
  if (action === "close-sheet") {
    state.sheet = null;
    state.draft = null;
    state.error = "";
    render();
    return;
  }
  if (action === "pick-theme") {
    state.theme = button.dataset.theme;
    save();
    render();
    return;
  }
  if (action === "read-list") {
    readList();
    return;
  }
  if (action === "days-dec" || action === "days-inc") {
    state.days = Math.max(1, Math.min(14, state.days + (action === "days-inc" ? 1 : -1)));
    render();
    return;
  }
  if (action === "build") {
    buildTrip();
    return;
  }
  if (action === "open-place") {
    state.placeId = button.dataset.id;
    const place = findPlace(state.placeId);
    if (place) applyGuide(place);
    state.sheet = "place";
    render();
    if (place) loadWiki(place);
    return;
  }
  if (action === "grok-plan") {
    state.error = "";
    state.sheet = "grok";
    render();
    return;
  }
  if (action === "apply-grok") {
    applyGrokPlan();
    return;
  }
  if (action === "range-nov") {
    setTripRange("2026-11-14", "2026-11-28");
    return;
  }
  if (action === "add-day") {
    addDay();
    return;
  }
  if (action === "remove-day") {
    removeDay(Number(button.dataset.day));
    return;
  }
  if (action === "up" || action === "down") {
    event.stopPropagation();
    movePlace(button.dataset.id, action === "up" ? -1 : 1);
    return;
  }
  if (action === "pack") {
    const item = state.trip.packing.find((entry) => entry.id === button.dataset.id);
    if (item) item.done = button.checked;
    save();
    const row = button.closest(".pack-row");
    if (row) row.classList.toggle("done", button.checked);
    return;
  }
  if (action === "add-flight") {
    state.flightDraft = blankFlight();
    state.sheet = "flight";
    state.error = "";
    render();
    return;
  }
  if (action === "open-flight") {
    const flight = (state.trip.flights || []).find((item) => item.id === button.dataset.id);
    if (!flight) return;
    state.flightDraft = { ...flight, fresh: false };
    state.sheet = "flight";
    state.error = "";
    render();
    return;
  }
  if (action === "save-flight") {
    saveFlight();
    return;
  }
  if (action === "remove-flight") {
    state.trip.flights = state.trip.flights.filter((item) => item.id !== button.dataset.id);
    state.flightDraft = null;
    state.sheet = null;
    save();
    render();
    return;
  }
  if (action === "ai") {
    state.error = "";
    state.planDraft = null;
    state.sheet = state.aiReady ? "ai" : "ai-key";
    render();
    return;
  }
  if (action === "ask-plan") {
    askPlan();
    return;
  }
  if (action === "use-plan") {
    usePlan();
    return;
  }
  if (action === "save-key") {
    saveKey();
    return;
  }
  if (action === "arrange") {
    state.trip.places = arrange(state.trip.places.map((place) => ({ ...place })), dayCount(state.trip));
    save();
    render();
    loadWeather();
    return;
  }
  if (action === "copy") {
    copyText(planText()).then(() => {
      state.copied = true;
      render();
      setTimeout(() => {
        state.copied = false;
        if (state.screen === "days") render();
      }, 1200);
    }).catch(() => {
      state.banner = "Copy was blocked by the browser.";
      render();
    });
    return;
  }
  if (action === "remove-place") {
    state.trip.places = state.trip.places.filter((place) => place.id !== button.dataset.id);
    state.sheet = null;
    if (!state.trip.places.length) state.trip = null;
    save();
    render();
  }
}

function onInput(event) {
  const field = event.target.dataset.field;
  if (field === "search") {
    state.query = event.target.value;
    const list = document.getElementById("place-list");
    if (!list || !state.trip) return;
    const query = state.query.trim().toLowerCase();
    const places = state.trip.places
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((place) => !query || `${place.name} ${place.note}`.toLowerCase().includes(query));
    list.innerHTML = places.map((place) => `<button class="place-row" data-action="open-place" data-id="${esc(place.id)}">
        <span class="when">D${place.day + 1}</span>
        <span><strong>${esc(place.name)}</strong><span class="stop-kind">${esc(kindOf(place.name))}</span></span>
        <span class="chev">›</span></button>`).join("") || `<p class="hint">No places match.</p>`;
    return;
  }
  if (field === "note" || field === "hours" || field === "description") {
    const place = findPlace(event.target.dataset.id);
    if (place) {
      place[field] = event.target.value;
      save();
    }
    return;
  }
  if (field === "place-time") {
    const place = findPlace(event.target.dataset.id);
    if (place) {
      place.time = event.target.value;
      save();
    }
    return;
  }
  if (field === "trip-name" && state.trip) {
    state.trip.name = event.target.value;
    save();
    return;
  }
  if (field === "url") state.url = event.target.value;
  if (field === "draft-start") state.startDate = event.target.value;
  if (field === "wish") state.wish = event.target.value;
  if (field && field.startsWith("flight-") && state.flightDraft) {
    state.flightDraft[field.slice("flight-".length)] = event.target.value;
  }
}

function onChange(event) {
  const field = event.target.dataset.field;
  if ((field === "start" || field === "end") && state.trip) {
    const start = field === "start" ? (event.target.value || state.trip.startDate) : state.trip.startDate;
    const end = field === "end" ? (event.target.value || tripEnd(state.trip)) : tripEnd(state.trip);
    setTripRange(start, end);
    return;
  }
  if (field === "place-time") {
    const place = findPlace(event.target.dataset.id);
    if (place) {
      place.time = event.target.value;
      save();
    }
  }
  if (field === "day") {
    const place = findPlace(event.target.dataset.id);
    if (!place) return;
    place.day = Number(event.target.value);
    place.order = stopsOn(place.day).length;
    save();
  }
  if (field === "draft-start") state.startDate = event.target.value;
}

document.getElementById("app").addEventListener("click", onClick);
document.getElementById("app").addEventListener("input", onInput);
document.getElementById("app").addEventListener("change", onChange);

load();
render();
fetch("/api/health").then(async (response) => {
  state.hostOk = response.ok;
  if (!response.ok) throw new Error("offline");
  const payload = await response.json();
  state.aiReady = !!payload.ai;
  state.aiName = payload.provider || "";
}).catch(() => {
  state.hostOk = false;
  if (!state.trip) {
    state.banner = "To import a list, run python serve.py from the Travel App folder and open the address it prints.";
    render();
  }
});
if (state.trip) loadWeather();

let drag = null;
let suppressClick = false;

document.getElementById("app").addEventListener("pointerdown", (event) => {
  const handle = event.target.closest(".drag");
  if (!handle) return;
  const row = handle.closest(handle.dataset.drag === "day" ? ".day-card" : ".stop");
  if (!row) return;
  event.preventDefault();
  drag = {
    kind: handle.dataset.drag,
    id: handle.dataset.id || "",
    day: Number(handle.dataset.day),
    row,
  };
  row.classList.add("dragging");
  suppressClick = true;
});

document.getElementById("app").addEventListener("pointerup", (event) => {
  if (!drag) return;
  const current = drag;
  drag = null;
  current.row.classList.remove("dragging");
  const y = event.clientY;
  if (current.kind === "day") {
    const cards = [...document.querySelectorAll(".day-card")];
    let to = cards.findIndex((card) => y < card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2);
    if (to < 0) to = cards.length - 1;
    moveDay(current.day, to);
    return;
  }
  const cards = [...document.querySelectorAll(".day-card")];
  const card = cards.find((item) => {
    const rect = item.getBoundingClientRect();
    return y >= rect.top && y <= rect.bottom;
  }) || cards[cards.length - 1];
  if (!card) return;
  const stops = [...card.querySelectorAll(".stop")].filter((item) => item.dataset.id !== current.id);
  let index = stops.length;
  stops.some((item, itemIndex) => {
    const rect = item.getBoundingClientRect();
    if (y < rect.top + rect.height / 2) {
      index = itemIndex;
      return true;
    }
    return false;
  });
  moveStopTo(current.id, Number(card.dataset.day), index);
});

document.getElementById("app").addEventListener("pointercancel", () => {
  if (drag) drag.row.classList.remove("dragging");
  drag = null;
});

document.getElementById("app").addEventListener("click", (event) => {
  if (!suppressClick) return;
  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}, true);
