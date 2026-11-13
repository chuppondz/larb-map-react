import { useState, useEffect, useMemo } from "react";
import "./styles.css";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import LikeBtn from "./Like.jsx";
import AddShop from "./AddShop.jsx";
import { ENABLED, useUserShops, loadUserShops, byLikes } from "./userShops.js";
import { matchCity } from "./utils.js";

const enc = encodeURIComponent;
const MEDAL = ["🥇", "🥈", "🥉"];
const norm = (t) => (t || "").toLowerCase().replace(/\s+/g, "");
const mapsUrl = (r) => (r.maps_url && /^https:\/\//.test(r.maps_url) ? r.maps_url
  : `https://www.google.com/maps/search/?api=1&query=${r.la},${r.lo}`);

function Item({ r, i, showCity }) { // i = อันดับจริง (ไม่เปลี่ยนตามคำค้น)
  return (
    <li className={"tr-item" + (i < 3 ? " top" : "")}>
      <div className="tr-no">{MEDAL[i] || i + 1}</div>
      <div className="tr-bd">
        <h3>{r.name}</h3>
        {showCity && <a className="tr-city" href={`#/toprank/${enc(r.city)}`}>📍 {r.city}</a>}
        {r.note && <p>💬 {r.note}</p>}
        <div className="tr-links">
          <a target="_blank" rel="noopener noreferrer"
             href={`https://www.google.com/maps/dir/?api=1&destination=${r.la},${r.lo}`}>🧭 นำทาง</a>
          <a target="_blank" rel="noopener noreferrer" href={mapsUrl(r)}>Google Maps</a>
          <a href={`#/map/${enc(r.city)}/${enc("u:" + r.id)}`}>🗺️ ดูบนแผนที่</a>
        </div>
      </div>
      <LikeBtn id={r.id} />
    </li>
  );
}

export default function TopRank({ city }) {
  const { shops, loaded, error } = useUserShops();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => { loadUserShops(); }, []);

  // จังหวัดที่มีร้านแนะนำ เรียงตามจำนวนร้าน
  const cities = useMemo(() => {
    const n = {};
    shops.forEach((s) => (n[s.city] = (n[s.city] || 0) + 1));
    return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "th"));
  }, [shops]);

  const sel = city || "";
  const ranked = useMemo(() => shops.filter((s) => !sel || s.city === sel).sort(byLikes), [shops, sel]);
  // ค้นหาจากชื่อร้าน จังหวัด หรือคำแนะนำ (เก็บอันดับเดิมไว้)
  const list = useMemo(() => {
    const n = norm(q);
    return ranked.map((r, i) => ({ r, i }))
      .filter(({ r }) => !n || norm(r.name).includes(n) || norm(r.note).includes(n) || (q.trim() && matchCity(r.city, q)));
  }, [ranked, q]);

  useEffect(() => {
    document.title = (sel ? `Toprank ร้านลาบ ${sel}` : "Toprank จากชาวลาบ") + " — ลาบแมป";
  }, [sel]);

  return (
    <>
      <Nav />
      <header className="wrap rank-hero">
        <h1>Toprank <em>จากชาวลาบ</em> 👍</h1>
        <p className="note" style={{ fontSize: 15 }}>
          ร้านลาบที่ชาวลาบแนะนำกันเอง เรียงตามยอดไลก์ · กด 🤍 ให้ร้านที่ชอบเพื่อดันขึ้นอันดับ
        </p>
        {ENABLED && <button className="btn u" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>➕ แนะนำร้าน</button>}
      </header>

      <section style={{ paddingTop: 18 }}>
        <div className="wrap">
          {!ENABLED ? (
            <p>ฟีเจอร์นี้ยังไม่เปิดใช้งาน</p>
          ) : !loaded ? (
            <p className="note">กำลังโหลด…</p>
          ) : error ? (
            <p>โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชอีกครั้ง</p>
          ) : (
            <>
              {shops.length > 0 && (
                <form className="search" role="search" style={{ marginTop: 0, marginBottom: 12 }} onSubmit={(e) => e.preventDefault()}>
                  <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
                         placeholder="🔍 ค้นหาชื่อร้าน จังหวัด หรือเมนู" aria-label="ค้นหาร้านแนะนำ" />
                </form>
              )}

              {cities.length > 0 && (
                <div className="tr-filter" role="tablist" aria-label="เลือกจังหวัด">
                  <a className={"chip" + (!sel ? " on" : "")} href="#/toprank" role="tab" aria-selected={!sel}>
                    ทุกจังหวัด ({shops.length})
                  </a>
                  {cities.map(([c, n]) => (
                    <a key={c} className={"chip" + (sel === c ? " on" : "")} href={`#/toprank/${enc(c)}`}
                       role="tab" aria-selected={sel === c}>{c} ({n})</a>
                  ))}
                  {sel && !cities.some(([c]) => c === sel) && <span className="chip on">{sel} (0)</span>}
                </div>
              )}

              <h2 style={{ marginTop: 18 }}>{sel ? `อันดับร้านลาบ จ.${sel}` : "อันดับรวมทุกจังหวัด"}</h2>
              {q.trim() && <p className="note">ผลค้นหา “{q.trim()}” · พบ {list.length} ร้าน</p>}

              {list.length ? (
                <ol className="tr-list">
                  {list.map(({ r, i }) => <Item key={r.id} r={r} i={i} showCity={!sel} />)}
                </ol>
              ) : q.trim() && ranked.length ? (
                <div className="tr-empty">
                  <p>ไม่พบร้านที่ตรงกับ “{q.trim()}”{sel && ` ใน จ.${sel}`}</p>
                  <button className="btn o" onClick={() => setQ("")}>ล้างคำค้นหา</button>
                  {sel && <a className="btn o" style={{ marginLeft: 8 }} href="#/toprank">ค้นทุกจังหวัด</a>}
                </div>
              ) : (
                <div className="tr-empty">
                  <p>{sel ? `ยังไม่มีร้านแนะนำใน จ.${sel}` : "ยังไม่มีร้านแนะนำ"} — เป็นคนแรกที่แนะนำเลย!</p>
                  <button className="btn u" onClick={() => setAdding(true)}>➕ แนะนำร้าน</button>
                </div>
              )}
              <p className="note" style={{ marginTop: 16 }}>
                ข้อมูลจากผู้ใช้ ยังไม่ได้ตรวจสอบ · อันดับร้านจาก Google Maps ดูได้ที่ <a href="#/ranking">🏆 Top 10 รายจังหวัด</a>
              </p>
            </>
          )}
        </div>
      </section>

      {adding && (
        <AddShop city={sel} onClose={() => setAdding(false)}
                 onAdded={(s) => { setAdding(false); location.hash = `#/toprank/${enc(s.city)}`; }} />
      )}
      <Footer />
    </>
  );
}
