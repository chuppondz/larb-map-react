// Edge Function: แปลงลิงก์สั้น Google Maps (maps.app.goo.gl/...) เป็น URL เต็มที่มีพิกัด
// เบราว์เซอร์ตามลิงก์สั้นเองไม่ได้ (ติด CORS) จึงให้ฟังก์ชันนี้ตาม redirect ให้
// ตามไปเฉพาะโดเมนของ Google เท่านั้น
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const googleHost = (h: string) => /(^|\.)goo\.gl$/.test(h) || /(^|\.)google\.[a-z.]+$/.test(h);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let url: URL;
  try {
    url = new URL((await req.json()).url);
  } catch {
    return json({ error: "bad url" }, 400);
  }
  if (url.protocol !== "https:" || !/(^|\.)goo\.gl$/.test(url.hostname)) return json({ error: "not a short link" }, 400);

  let cur = url;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(cur, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0" } });
    const loc = r.headers.get("location");
    if (!loc) break;
    let next = new URL(loc, cur);
    // หน้า consent ของ Google: URL จริงอยู่ในพารามิเตอร์ continue
    const cont = next.hostname.startsWith("consent.") && next.searchParams.get("continue");
    if (cont) next = new URL(cont);
    if (next.protocol !== "https:" || !googleHost(next.hostname)) return json({ error: "unexpected redirect" }, 400);
    cur = next;
    if (/\/maps/.test(cur.pathname) && /[@!]3d|@-?\d/.test(decodeURIComponent(cur.href))) break;
  }
  return json({ url: cur.href });
});
