# ลาบแมป (React + Vite + react-leaflet)

```bash
npm install
npm run dev      # เปิด http://localhost:5173
npm run build    # ไฟล์พร้อมอัปโหลดอยู่ใน dist/
```

- ข้อมูลร้านอยู่ที่ `src/data.js` (แก้/เพิ่มร้านได้ที่นี่)
- สีหมุดและตัวกรองอยู่ที่ `src/utils.js`
- แผนที่ใช้ CARTO (ข้อมูล OpenStreetMap) ไม่ต้องใช้ API key
- ข้อมูลร้านมาจาก Google Maps: ตรวจเงื่อนไขการแสดงผลบนเว็บสาธารณะก่อนเปิดใช้จริง

## ร้านแนะนำจากผู้ใช้ + ไลก์ (Supabase)

ผู้ใช้วางลิงก์ Google Maps เพื่อปักหมุดร้าน (หมุดสีม่วง 👍) และกดไลก์ได้ หน้า Top 10 จะมีส่วน
"ร้านแนะนำจากผู้ใช้" เรียงตามยอดไลก์ ถ้ายังไม่ตั้งค่า ฟีเจอร์นี้จะถูกซ่อนไว้

1. สมัคร https://supabase.com (ฟรี) → New project
2. SQL Editor → วางไฟล์ `supabase/setup.sql` → Run
3. Edge Functions → Deploy a new function → ตั้งชื่อ `resolve-maps` → วางโค้ด `supabase/functions/resolve-maps/index.ts`
   → ปิด "Verify JWT" → Deploy (ใช้แปลงลิงก์สั้น maps.app.goo.gl)
4. Project Settings → API → คัดลอก Project URL และ anon public key ใส่ไฟล์ `.env` (ดู `.env.example`)
   หรือใส่เป็น environment variable ของโฮสติ้ง แล้ว `npm run build` ใหม่

ลบร้านที่ไม่เหมาะสมได้ที่ Table Editor → `user_shops`
