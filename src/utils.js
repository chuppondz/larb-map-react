import L from "leaflet";

export const color = (r) => (r >= 4.5 ? "#2e9e5b" : r >= 4.0 ? "#e8b020" : "#e8662a");

export const FILTERS = [
  ["ทั้งหมด", () => true],
  ["🟢 4.5 ขึ้นไป", (r) => r.rate >= 4.5],
  ["🟡 4.0–4.4", (r) => r.rate >= 4 && r.rate < 4.5],
  ["🟠 ต่ำกว่า 4.0", (r) => r.rate < 4],
  ["รีวิว 500+", (r) => r.n >= 500],
];

export const groupByCity = (list) =>
  list.reduce((g, r) => ((g[r.city] = g[r.city] || []).push(r), g), {});

export const centroid = (a) => [
  a.reduce((s, r) => s + r.la, 0) / a.length,
  a.reduce((s, r) => s + r.lo, 0) / a.length,
];

export const km = (a, b, c, d) => {
  const t = (x) => (x * Math.PI) / 180;
  const u = t(c - a), v = t(d - b);
  const h = Math.sin(u / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(v / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

export const pinIcon = (c, on) =>
  L.divIcon({
    className: "",
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    html: `<svg class="pin" width="34" height="42" viewBox="0 0 34 42" style="${
      on ? "transform:scale(1.25);transform-origin:50% 100%" : ""
    }"><path d="M17 41C8 29 3 23 3 15a14 14 0 0 1 28 0c0 8-5 14-14 26z" fill="${c}" stroke="#fff" stroke-width="2.5"/><text x="17" y="21" text-anchor="middle" font-size="14">🌶️</text></svg>`,
  });

export const cityIcon = (n, label) =>
  L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div class="city">${n}</div>` + (label ? `<div class="cl">${label}</div>` : ""),
  });
