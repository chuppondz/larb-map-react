import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { R } from "./data.js";
import { km, parseMapsLink, inThailand, userPinIcon, STYLES, STYLE_KEYS } from "./utils.js";
import { useUserShops, addUserShop, resolveShortLink } from "./userShops.js";
import LikeBtn from "./Like.jsx";

const CITIES = [...new Set(R.map((r) => r.city))].sort((a, b) => a.localeCompare(b, "th"));

// เดาจังหวัดจากร้านในข้อมูลที่อยู่ใกล้ที่สุด
const nearestCity = (lat, lng) =>
  R.reduce((b, r) => { const d = km(lat, lng, r.la, r.lo); return d < b.d ? { d, c: r.city } : b; },
    { d: Infinity, c: "" }).c;

const parseCoords = (t) => {
  const m = t.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  return m ? [+m[1], +m[2]] : null;
};

export default function AddShop({ city: city0 = "", onClose, onAdded }) {
  const { shops } = useUserShops();
  const [link, setLink] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [name, setName] = useState("");
  const [style, setStyle] = useState(""); // "north" / "isan" / "" = ไม่แน่ใจ
  const [coords, setCoords] = useState("");
  const [city, setCity] = useState(city0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [manual, setManual] = useState(false); // แสดงช่องพิกัดเฉพาะตอนลิงก์ไม่มีพิกัด หรือผู้ใช้อยากแก้เอง

  const pos = parseCoords(coords);
  const okPos = pos && inThailand(pos[0], pos[1]);

  // ร้านซ้ำ: อยู่ห่างไม่เกิน 50 ม.
  const dupUser = useMemo(() => okPos && shops.find((s) => km(pos[0], pos[1], s.la, s.lo) < 0.05), [okPos, coords, shops]);
  const dupOfficial = useMemo(() => okPos && R.find((r) => km(pos[0], pos[1], r.la, r.lo) < 0.05), [okPos, coords]);

  const apply = (p) => {
    if (p.name && !name) {
      setName(p.name.slice(0, 80));
    }
    if (p.lat != null) {
      setCoords(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
      setCity(nearestCity(p.lat, p.lng)); // จังหวัดตามตำแหน่งจริงของร้าน แม้จะเปิดฟอร์มจากหน้าจังหวัดอื่น
    }
  };

  const readLink = async (text) => {
    setMsg("");
    const p = parseMapsLink(text);
    if (!p) return text.trim() && setMsg("ลิงก์นี้ไม่ใช่ลิงก์ Google Maps");
    if (p.url) setMapsUrl(p.url);
    if (p.short) {
      setBusy(true);
      try {
        const full = await resolveShortLink(p.url);
        const q = parseMapsLink(full);
        if (q) apply(q);
        if (!q || q.lat == null) { setManual(true); setMsg("อ่านพิกัดจากลิงก์ไม่ได้ กรุณาใส่พิกัดเอง (กดค้างที่หมุดใน Google Maps แล้วคัดลอกตัวเลข)"); }
      } catch {
        setManual(true);
        setMsg("เปิดลิงก์สั้นไม่สำเร็จ กรุณาใส่พิกัดเอง (กดค้างที่หมุดใน Google Maps แล้วคัดลอกตัวเลข)");
      } finally { setBusy(false); }
      return;
    }
    apply(p);
    if (p.lat == null) { setManual(true); setMsg("ลิงก์นี้ไม่มีพิกัด กรุณาใส่พิกัดเอง (กดค้างที่หมุดใน Google Maps แล้วคัดลอกตัวเลข)"); }
  };

  const submit = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) return setMsg("กรุณาใส่ชื่อร้าน");
    if (!okPos) {
      if (link.trim() && !coords && !manual) return readLink(link); // กดปักหมุดทันทีหลังวางลิงก์
      if (!link.trim() && !coords) return setMsg("กรุณาวางลิงก์ Google Maps ของร้าน");
      setManual(true);
      return setMsg("พิกัดไม่ถูกต้อง หรืออยู่นอกประเทศไทย");
    }
    if (!city) return setMsg("กรุณาเลือกจังหวัด");
    if (dupUser || dupOfficial) return setMsg("ร้านนี้มีอยู่บนแผนที่แล้ว");
    setBusy(true);
    setMsg("");
    try {
      const s = await addUserShop({
        name: n, city, lat: +pos[0].toFixed(6), lng: +pos[1].toFixed(6),
        maps_url: mapsUrl || null, note: note.trim() || null,
        // ประเภทที่ผู้ปักเลือก = โหวตแรกของร้าน
        ...(style ? { [style + "_votes"]: 1 } : {}),
      });
      onAdded?.(s);
    } catch {
      setMsg("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally { setBusy(false); }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="แนะนำร้านลาบ"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="mcard" onSubmit={submit}>
        <button type="button" className="x" onClick={onClose} aria-label="ปิด">×</button>
        <h3>➕ แนะนำร้านลาบ</h3>
        <p className="note">เปิดร้านใน Google Maps → กด “แชร์” → คัดลอกลิงก์ แล้ววางด้านล่าง</p>

        <label>ลิงก์ Google Maps
          <input value={link} placeholder="https://maps.app.goo.gl/..." autoFocus
                 onChange={(e) => setLink(e.target.value)}
                 onPaste={(e) => { const t = e.clipboardData.getData("text"); setTimeout(() => readLink(t)); }}
                 onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); readLink(link); } }}
                 onBlur={() => link && readLink(link)} />
        </label>
        {!manual && !okPos && (
          <p className="note">ไม่ต้องใส่พิกัด เว็บจะอ่านตำแหน่งจากลิงก์ให้ ·{" "}
            <button type="button" className="linkbtn" onClick={() => setManual(true)}>ไม่มีลิงก์? ใส่พิกัดเอง</button></p>
        )}

        <label>ชื่อร้าน *
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="เช่น ลาบเป็ดหน้าวัด" />
        </label>

        <div className={manual ? "row2" : ""}>
          {manual && (
            <label>พิกัด *
              <input value={coords} onChange={(e) => setCoords(e.target.value)} placeholder="13.756331, 100.501765" inputMode="decimal" />
            </label>
          )}
          <label>จังหวัด *
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">เลือก</option>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        {okPos && !manual && (
          <p className="note" style={{ marginTop: 10 }}>📍 ได้ตำแหน่งจากลิงก์แล้ว ·{" "}
            <button type="button" className="linkbtn" onClick={() => setManual(true)}>แก้พิกัด</button></p>
        )}
        {okPos && (
          <div className="mini">
            <MapContainer key={coords} center={pos} zoom={16} zoomControl={false} dragging={false}
                          scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} attributionControl={false}
                          style={{ height: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={pos} icon={userPinIcon(0, true)} />
            </MapContainer>
          </div>
        )}

        <div className="mlabel">ร้านนี้เป็นลาบแบบไหน? (ไม่แน่ใจข้ามได้)</div>
        <div className="schips">
          {STYLE_KEYS.map((k) => (
            <button key={k} type="button" className={"chip s " + k + (style === k ? " on" : "")}
                    aria-pressed={style === k} onClick={() => setStyle((v) => (v === k ? "" : k))}>
              {STYLES[k].emoji} {STYLES[k].label}
            </button>
          ))}
        </div>

        <label>เมนูเด็ด / คำแนะนำ (ไม่บังคับ)
          <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ลาบเป็ดหอมมาก ไปก่อนเที่ยง" />
        </label>

        {dupUser && (
          <div className="dup">มีคนแนะนำร้านนี้แล้ว: <b>{dupUser.name}</b> <LikeBtn id={dupUser.id} /></div>
        )}
        {dupOfficial && !dupUser && <div className="dup">ร้านนี้มีบนแผนที่แล้ว: <b>{dupOfficial.name}</b></div>}
        {msg && <div className="err" role="alert">{msg}</div>}

        <button className="btn" disabled={busy} style={{ width: "100%", marginTop: 12 }}>
          {busy ? "กำลังดำเนินการ…" : "ปักหมุดร้านนี้"}
        </button>
        <p className="note" style={{ marginTop: 8 }}>
          ร้านที่แนะนำจะแสดงให้ทุกคนเห็นทันที เป็นหมุดสีน้ำเงิน 👍 · ข้อมูลที่ส่งเปิดเผยต่อสาธารณะ
          กรุณาอย่าใส่ข้อมูลส่วนตัว เช่น ชื่อหรือเบอร์โทรของบุคคล ·{" "}
          <a href="#/privacy" target="_blank" rel="noopener noreferrer">นโยบายความเป็นส่วนตัว</a>
        </p>
      </form>
    </div>
  );
}
