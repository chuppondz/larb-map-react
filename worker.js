// Cloudflare Worker หน้าบ้านของ larbmap.com
// - www.larbmap.com และ http:// -> https://larbmap.com (301) ให้มีที่อยู่เดียว ดีต่อ SEO และการ์ดแชร์ลิงก์
// - นอกนั้นส่งไฟล์เว็บจากโฟลเดอร์ dist ตามปกติ
const CANON = "larbmap.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www." + CANON || (url.hostname === CANON && url.protocol === "http:")) {
      url.protocol = "https:";
      url.hostname = CANON;
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
