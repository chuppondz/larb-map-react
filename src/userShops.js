// ร้านแนะนำจากผู้ใช้ + ยอดไลก์ เก็บใน Supabase (ดู supabase/setup.sql และ README)
// ตั้งค่าด้วย VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY (ไฟล์ .env หรือ env ของโฮสติ้ง)
// ถ้ายังไม่ได้ตั้งค่า ฟีเจอร์นี้จะถูกซ่อนไว้ทั้งหมด
import { useSyncExternalStore } from "react";

const BASE = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const ENABLED = !!(BASE && KEY);

const LIKED_KEY = "larb-liked";
const readLiked = () => {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")); } catch { return new Set(); }
};
const saveLiked = (s) => {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])); } catch { /* private mode */ }
};

let state = { shops: [], loaded: false, error: null, liked: readLiked() };
const subs = new Set();
const set = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
const subscribe = (f) => (subs.add(f), () => subs.delete(f));
export const useUserShops = () => useSyncExternalStore(subscribe, () => state);

// แปลงแถวจากฐานข้อมูลให้ใช้กับโค้ดแผนที่เดิมได้ (la/lo)
const norm = (r) => ({ ...r, la: r.lat, lo: r.lng, user: true });
export const byLikes = (a, b) => b.likes - a.likes || a.created_at.localeCompare(b.created_at);

async function api(path, opt = {}) {
  const r = await fetch(BASE + path, {
    ...opt,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...opt.headers },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

let loading = null;
export function loadUserShops() {
  if (!ENABLED || loading) return loading;
  loading = api("/rest/v1/user_shops?select=*&order=likes.desc,created_at.asc&limit=2000")
    .then((rows) => set({ shops: rows.map(norm), loaded: true, error: null }))
    .catch((e) => { set({ loaded: true, error: String(e) }); loading = null; });
  return loading;
}

export async function addUserShop(shop) {
  const [row] = await api("/rest/v1/user_shops", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(shop),
  });
  const n = norm(row);
  set({ shops: [...state.shops, n] });
  return n;
}

const setLikes = (id, f) => set({ shops: state.shops.map((s) => (s.id === id ? { ...s, likes: f(s.likes) } : s)) });

// กดไลก์/เลิกไลก์ (จำไว้ในเบราว์เซอร์ว่ากดร้านไหนไปแล้ว)
export async function toggleLike(id) {
  const on = !state.liked.has(id);
  const flip = (add) => {
    const l = new Set(state.liked);
    add ? l.add(id) : l.delete(id);
    set({ liked: l });
    saveLiked(l);
  };
  flip(on);
  setLikes(id, (n) => Math.max(0, n + (on ? 1 : -1)));
  try {
    const likes = await api("/rest/v1/rpc/like_shop", {
      method: "POST",
      body: JSON.stringify({ shop_id: id, delta: on ? 1 : -1 }),
    });
    if (typeof likes === "number") setLikes(id, () => likes);
  } catch {
    flip(!on);
    setLikes(id, (n) => Math.max(0, n + (on ? -1 : 1)));
    alert("กดไลก์ไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}

// ลิงก์สั้น maps.app.goo.gl ต้องให้เซิร์ฟเวอร์ตามไปหา URL เต็มให้ (Edge Function resolve-maps)
export async function resolveShortLink(url) {
  const j = await api("/functions/v1/resolve-maps", { method: "POST", body: JSON.stringify({ url }) });
  return j?.url || "";
}
