// ร้านแนะนำจากผู้ใช้ + ยอดไลก์ เก็บใน Supabase (ดู supabase/setup.sql และ README)
// ตั้งค่าด้วย VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY (ไฟล์ .env หรือ env ของโฮสติ้ง)
// ถ้ายังไม่ได้ตั้งค่า ฟีเจอร์นี้จะถูกซ่อนไว้ทั้งหมด
import { useSyncExternalStore } from "react";

const BASE = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const ENABLED = !!(BASE && KEY);
// คีย์แบบเก่า (anon JWT "eyJ...") ส่งใน Authorization ได้; คีย์ใหม่ sb_publishable_ ส่งแค่ apikey
const AUTH = KEY.startsWith("eyJ") ? { apikey: KEY, Authorization: `Bearer ${KEY}` } : { apikey: KEY };

const LIKED_KEY = "larb-liked";
const VOTED_KEY = "larb-style-voted"; // "<shopId>:north" / "<shopId>:isan"
const readSet = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
};
const saveSet = (key, s) => {
  try { localStorage.setItem(key, JSON.stringify([...s])); } catch { /* private mode */ }
};
const readLiked = () => readSet(LIKED_KEY);
const saveLiked = (s) => saveSet(LIKED_KEY, s);

let state = { shops: [], loaded: false, error: null, liked: readLiked(), voted: readSet(VOTED_KEY) };
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
    headers: { ...AUTH, "Content-Type": "application/json", ...opt.headers },
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
  const post = (body) => api("/rest/v1/user_shops", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  let row;
  try {
    [row] = await post(shop);
  } catch (e) {
    // ฐานข้อมูลยังไม่มีคอลัมน์โหวตประเภท (ยังไม่ได้รัน SQL ใหม่): บันทึกร้านโดยไม่มีโหวต
    if (!/north_votes|isan_votes/.test(String(e))) throw e;
    const { north_votes, isan_votes, ...rest } = shop;
    [row] = await post(rest);
  }
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

// โหวตประเภทลาบ (เหนือ/อีสาน) ให้ร้านจากผู้ใช้ กดซ้ำเพื่อยกเลิก — จำไว้ในเบราว์เซอร์เหมือนไลก์
export async function toggleStyleVote(id, k) {
  const key = `${id}:${k}`;
  const col = k + "_votes";
  const on = !state.voted.has(key);
  const flip = (add) => {
    const v = new Set(state.voted);
    add ? v.add(key) : v.delete(key);
    set({ voted: v });
    saveSet(VOTED_KEY, v);
  };
  const bump = (d) => set({ shops: state.shops.map((s) => (s.id === id ? { ...s, [col]: Math.max(0, (s[col] || 0) + d) } : s)) });
  flip(on);
  bump(on ? 1 : -1);
  try {
    const rows = await api("/rest/v1/rpc/vote_style", {
      method: "POST",
      body: JSON.stringify({ shop_id: id, style: k, delta: on ? 1 : -1 }),
    });
    const r = Array.isArray(rows) ? rows[0] : rows;
    if (r && typeof r.north_votes === "number") {
      set({ shops: state.shops.map((s) => (s.id === id ? { ...s, north_votes: r.north_votes, isan_votes: r.isan_votes } : s)) });
    }
  } catch {
    flip(!on);
    bump(on ? -1 : 1);
    alert("โหวตไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}

// ลิงก์สั้น maps.app.goo.gl ต้องให้เซิร์ฟเวอร์ตามไปหา URL เต็มให้ (Edge Function resolve-maps)
export async function resolveShortLink(url) {
  const j = await api("/functions/v1/resolve-maps", { method: "POST", body: JSON.stringify({ url }) });
  return j?.url || "";
}
