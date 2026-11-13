// ร้านแนะนำจากผู้ใช้ + ยอดไลก์ เก็บใน Supabase (ดู supabase/setup.sql และ README)
// ตั้งค่าด้วย VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY (ไฟล์ .env หรือ env ของโฮสติ้ง)
// ถ้ายังไม่ได้ตั้งค่า ฟีเจอร์นี้จะถูกซ่อนไว้ทั้งหมด
import { useSyncExternalStore } from "react";
import { majority, officialKey } from "./utils.js";

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

let state = {
  shops: [], loaded: false, error: null, liked: readLiked(), voted: readSet(VOTED_KEY),
  ovotes: {}, ovotesReady: false, // โหวตประเภทของร้านจาก Google: { shopKey: { north, isan } }
};
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

let loadingVotes = null;
function loadOfficialVotes() {
  if (!ENABLED || loadingVotes) return;
  loadingVotes = api("/rest/v1/official_votes?select=shop_key,north_votes,isan_votes&limit=20000")
    .then((rows) => set({
      ovotesReady: true,
      ovotes: Object.fromEntries(rows.map((r) => [r.shop_key, { north: r.north_votes, isan: r.isan_votes }])),
    }))
    .catch(() => { loadingVotes = null; }); // ยังไม่ได้รัน SQL: ซ่อนปุ่มโหวตของร้านจาก Google
}

let loading = null;
export function loadUserShops() {
  loadOfficialVotes();
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

// ---------- ประเภทลาบจากโหวต ----------
// null = ยังโหวตไม่ได้ (ฐานข้อมูลยังไม่พร้อม)
export const votesOf = (r) => {
  if (r.user) return r.north_votes === undefined ? null : { north: r.north_votes || 0, isan: r.isan_votes || 0 };
  return state.ovotes[officialKey(r)] || (state.ovotesReady ? { north: 0, isan: 0 } : null);
};
// ลำดับ: กำหนดเองใน data.js > โหวตฝั่งที่มากกว่า
export const stylesOf = (r) => (r.styles?.length ? r.styles : majority(votesOf(r)));
export const hasStyle = (r, k) => !k || stylesOf(r).includes(k);
// ปุ่มโหวตแสดงทุกร้านเสมอ (ยกเว้นร้านที่เจ้าของเว็บยืนยันประเภทไว้ใน data.js)
export const canVote = (r) => ENABLED && !r.styles?.length;
const voteKey = (r) => (r.user ? r.id : "o:" + officialKey(r));
export const myVote = (r) => ["north", "isan"].find((k) => state.voted.has(`${voteKey(r)}:${k}`)) || null;

const setVotes = (r, f) => {
  if (r.user) {
    set({ shops: state.shops.map((s) => {
      if (s.id !== r.id) return s;
      const v = f({ north: s.north_votes || 0, isan: s.isan_votes || 0 });
      return { ...s, north_votes: v.north, isan_votes: v.isan };
    }) });
  } else {
    const k = officialKey(r);
    set({ ovotes: { ...state.ovotes, [k]: f(state.ovotes[k] || { north: 0, isan: 0 }) } });
  }
};
const bump = (add, remove, sign) => (v) => {
  const n = { ...v };
  if (add) n[add] = Math.max(0, n[add] + sign);
  if (remove) n[remove] = Math.max(0, n[remove] - sign);
  return n;
};

// กดโหวต: โหวตได้ฝั่งเดียวต่อร้าน · กดฝั่งเดิม = ยกเลิก · กดอีกฝั่ง = ย้ายโหวต (ทำในคำสั่งเดียว)
export async function toggleStyleVote(r, k) {
  if (votesOf(r) === null) {
    alert("ระบบโหวตประเภทลาบยังไม่พร้อม ลองใหม่อีกครั้งภายหลัง");
    return;
  }
  const key = voteKey(r);
  const cur = myVote(r);
  const add = cur === k ? null : k;
  const remove = cur;
  const setMine = (v) => {
    const s = new Set(state.voted);
    ["north", "isan"].forEach((x) => s.delete(`${key}:${x}`));
    if (v) s.add(`${key}:${v}`);
    set({ voted: s });
    saveSet(VOTED_KEY, s);
  };
  setMine(add);
  setVotes(r, bump(add, remove, 1));
  try {
    const rows = await api(r.user ? "/rest/v1/rpc/vote_style" : "/rest/v1/rpc/vote_official", {
      method: "POST",
      body: JSON.stringify({ ...(r.user ? { shop_id: r.id } : { shop_key: officialKey(r) }), add_style: add, remove_style: remove }),
    });
    const v = Array.isArray(rows) ? rows[0] : rows;
    if (v && typeof v.north_votes === "number") setVotes(r, () => ({ north: v.north_votes, isan: v.isan_votes }));
  } catch {
    setMine(cur);
    setVotes(r, bump(add, remove, -1));
    alert("โหวตไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}

// ลิงก์สั้น maps.app.goo.gl ต้องให้เซิร์ฟเวอร์ตามไปหา URL เต็มให้ (Edge Function resolve-maps)
export async function resolveShortLink(url) {
  const j = await api("/functions/v1/resolve-maps", { method: "POST", body: JSON.stringify({ url }) });
  return j?.url || "";
}
