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
