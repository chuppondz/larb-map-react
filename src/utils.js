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

// คะแนนจัดอันดับ (Bayesian average) = (v/(v+m))*R + (m/(v+m))*C — สูตรเดียวกับใน data.js
export const score = (r, m = 30, C = 4.54) => (r.n / (r.n + m)) * r.rate + (m / (r.n + m)) * C;

// { จังหวัด: [ร้านเรียงตามคะแนนจัดอันดับ สูงสุด 10 ร้าน] }
export const rankByCity = (list) => {
  const g = groupByCity(list);
  for (const c in g) g[c] = [...g[c]].sort((a, b) => score(b) - score(a)).slice(0, 10);
  return g;
};

const ALIAS = { "กรุงเทพฯ": ["กรุงเทพมหานคร", "กทม", "bangkok", "bkk"] };
const norm = (s) =>
  s.trim().toLowerCase().replace(/^(จ\.|จังหวัด)\s*/, "").replace(/[\s.ฯ]/g, "");

// ค้นหาจังหวัดแบบพิมพ์บางส่วนได้ เช่น "อยุธยา", "จ.เชียงใหม่", "กทม"
export const matchCity = (c, q) => {
  const n = norm(q);
  return !n || [c, ...(ALIAS[c] || [])].some((a) => norm(a).includes(n));
};

// ลิงก์ไปหน้าอันดับ: ถ้าเจอจังหวัดเดียว (หรือพิมพ์ตรงชื่อ) ไปหน้าจังหวัดนั้นเลย ไม่งั้นไปหน้าผลค้นหา
export const rankHref = (q, cities) => {
  const m = cities.filter((c) => matchCity(c, q));
  const exact = m.find((c) => norm(c) === norm(q));
  if (exact || m.length === 1) return `#/ranking/${encodeURIComponent(exact || m[0])}`;
  return q.trim() ? `#/ranking?q=${encodeURIComponent(q.trim())}` : "#/ranking";
};

// หมุดร้านแนะนำจากผู้ใช้: วงกลมสีม่วง 👍 + ยอดไลก์ (คนละแบบกับหมุดพริกของร้านจาก Google)
export const userPinIcon = (likes, on) =>
  L.divIcon({
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `<div class="upin${on ? " on" : ""}">👍${likes > 0 ? `<b>${likes > 999 ? "999+" : likes}</b>` : ""}</div>`,
  });

export const inThailand = (lat, lng) => lat > 5 && lat < 21 && lng > 97 && lng < 106;

const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

// อ่านชื่อร้านและพิกัดจากลิงก์ Google Maps หรือข้อความพิกัด "13.75, 100.5"
// คืน { short: true } ถ้าเป็นลิงก์สั้น (maps.app.goo.gl) ที่ต้องให้เซิร์ฟเวอร์แปลงก่อน
export function parseMapsLink(text) {
  const s = (text || "").trim();
  let m = s.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{2,3}\.\d+)$/);
  if (m) return { lat: +m[1], lng: +m[2] };
  const url = s.match(/https?:\/\/\S+/)?.[0]; // รองรับข้อความแชร์ที่มีชื่อร้านนำหน้าลิงก์
  let u;
  try { u = new URL(url); } catch { return null; }
  if (/(^|\.)goo\.gl$/.test(u.hostname)) return { short: true, url: u.href };
  if (!/(^|\.)google\.[a-z.]+$/.test(u.hostname) || !u.pathname.startsWith("/maps")) return null;
  const full = safeDecode(u.href);
  const out = { url: u.href, name: "" };
  const place = u.pathname.match(/\/place\/([^/]+)/)?.[1];
  if (place) out.name = safeDecode(place).replace(/\+/g, " ");
  // !3d!4d = ตำแหน่งหมุดของร้าน (แม่นสุด, ใช้ตัวสุดท้าย) > @lat,lng = จุดกลางจอ > q=lat,lng
  const pins = [...full.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  m = pins[pins.length - 1] || full.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    || full.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (m) Object.assign(out, { lat: +m[1], lng: +m[2] });
  if (!out.name) {
    const q = u.searchParams.get("q") || u.searchParams.get("query");
    if (q && !/^-?\d+\.\d+,/.test(q)) out.name = q;
  }
  return out;
}
