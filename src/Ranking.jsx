import { useState, useEffect, useMemo } from "react";
import "./styles.css";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import { R } from "./data.js";
import { color, score, rankByCity, matchCity } from "./utils.js";
import { ENABLED, useUserShops, loadUserShops, byLikes } from "./userShops.js";
import LikeBtn from "./Like.jsx";
import AddShop from "./AddShop.jsx";

const RANKED = rankByCity(R);
const CITIES = Object.keys(RANKED).sort((a, b) => a.localeCompare(b, "th"));
const MEDAL = ["🥇", "🥈", "🥉"];
const enc = encodeURIComponent;

function Shop({ r, i, city }) {
  const tel = r.tel.replace(/\s/g, "");
  return (
    <li className={"rk" + (i < 3 ? " top" : "")}>
      <div className="no">{MEDAL[i] || i + 1}</div>
      <div className="bd">
        <h3>{r.name}</h3>
        <div className="r">
          <span className="score" style={{ background: color(r.rate) }}>{r.rate.toFixed(1)}</span>
          {"★".repeat(Math.round(r.rate))} <span>({r.n.toLocaleString()} รีวิว · คะแนนจัดอันดับ {score(r).toFixed(2)})</span>
        </div>
        <div className="r">📍 {r.area} <span>· 🕒 {r.hrs}</span></div>
        {r.tel && <div className="r">📞 <a href={`tel:${tel}`}>{r.tel}</a></div>}
        <div className="acts">
          <a className="p" target="_blank" rel="noopener noreferrer"
             href={`https://www.google.com/maps/dir/?api=1&destination=${r.la},${r.lo}&destination_place_id=${r.pid}`}>นำทาง</a>
          <a href={`#/map/${enc(city)}/${enc(r.pid || "id" + r.id)}`}>ดูบนแผนที่</a>
        </div>
      </div>
    </li>
  );
}

function UserShop({ r, i, city }) {
  const url = r.maps_url && /^https:\/\//.test(r.maps_url) ? r.maps_url
    : `https://www.google.com/maps/search/?api=1&query=${r.la},${r.lo}`;
  return (
    <li className="rk u">
      <div className="no">{i + 1}</div>
      <div className="bd">
        <h3>{r.name}</h3>
        <div className="r"><LikeBtn id={r.id} /> <span>👍 แนะนำโดยผู้ใช้</span></div>
        {r.note && <div className="r">💬 {r.note}</div>}
        <div className="acts">
          <a className="p" target="_blank" rel="noopener noreferrer" href={url}>Google Maps</a>
          <a href={`#/map/${enc(city)}/${enc("u:" + r.id)}`}>ดูบนแผนที่</a>
        </div>
      </div>
    </li>
  );
}

export default function Ranking({ city, q: q0 = "" }) {
  const { shops, loaded, error } = useUserShops();
  const [adding, setAdding] = useState(false);
  useEffect(() => { loadUserShops(); }, []);
  const userCount = useMemo(() => shops.reduce((m, s) => ((m[s.city] = (m[s.city] || 0) + 1), m), {}), [shops]);
  const [q, setQ] = useState(q0);
  useEffect(() => setQ(q0), [q0, city]);

  const valid = city && RANKED[city] ? city : null;
  const userTop = useMemo(() => shops.filter((s) => s.city === valid).sort(byLikes), [shops, valid]);
  const matches = useMemo(() => CITIES.filter((c) => matchCity(c, q)), [q]);
  const showGrid = !valid || q.trim();

  useEffect(() => {
    document.title = valid ? `Top 10 ร้านลาบ ${valid} — ลาบแมป` : "อันดับร้านลาบรายจังหวัด — ลาบแมป";
  }, [valid]);

  const submit = (e) => {
    e.preventDefault();
    if (matches.length) location.hash = `#/ranking/${enc(matches[0])}`;
  };

  return (
    <>
      <Nav />
      <header className="wrap rank-hero">
        <h1>อันดับร้าน<em>ลาบ</em> Top 10<br />รายจังหวัด</h1>
        <form className="search" onSubmit={submit} role="search">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder="🔍 พิมพ์ชื่อจังหวัด เช่น เชียงใหม่"
                 aria-label="ค้นหาจังหวัด" autoFocus={!valid} />
          <button className="btn">ค้นหา</button>
        </form>
      </header>

      <section style={{ paddingTop: 20 }}>
        <div className="wrap">
          {showGrid ? (
            <>
              {city && !valid && <p className="note">ยังไม่มีข้อมูลจังหวัด “{city}”</p>}
              <p className="note">
                {q.trim() ? `พบ ${matches.length} จังหวัด` : `ทั้งหมด ${CITIES.length} จังหวัด`} · แตะเพื่อดูอันดับ
              </p>
              {matches.length ? (
                <div className="pgrid">
                  {matches.map((c) => {
                    const t = RANKED[c][0];
                    return (
                      <a className="pcard" key={c} href={`#/ranking/${enc(c)}`}>
                        <span className="n">{RANKED[c].length} ร้าน{userCount[c] ? ` · 👍 ${userCount[c]}` : ""}</span>
                        <b>{c}</b>
                        <small>🥇 {t.name} · ⭐ {t.rate.toFixed(1)}</small>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p>ไม่พบจังหวัดที่ค้นหา ลองพิมพ์ใหม่อีกครั้ง</p>
              )}
            </>
          ) : (
            <>
              <a className="back" href="#/ranking">← ดูทุกจังหวัด</a>
              <h2 style={{ marginTop: 6 }}>Top {RANKED[valid].length} ร้านลาบ จ.{valid}</h2>
              <div className="legend">
                <span><i style={{ background: "var(--g)" }} />4.5 ขึ้นไป</span>
                <span><i style={{ background: "var(--y)" }} />4.0–4.4</span>
                <span><i style={{ background: "var(--o)" }} />ต่ำกว่า 4.0</span>
              </div>
              <ol className="rklist">
                {RANKED[valid].map((r, i) => <Shop key={r.id} r={r} i={i} city={valid} />)}
              </ol>
              <p className="note" style={{ marginTop: 18 }}>
                จัดอันดับจากดาวและจำนวนรีวิวบน Google Maps รวมกัน (Bayesian average) ร้านที่ได้ 5 ดาวแต่มีรีวิวน้อย
                จะไม่ถูกดันขึ้นอันดับต้นเกินจริง · ข้อมูล ณ วันที่รวบรวม เวลาเปิด-ปิดอาจเปลี่ยนแปลง
              </p>

              {ENABLED && (
                <div className="usec">
                  <div className="uhead">
                    <h2>👍 ร้านแนะนำจากผู้ใช้</h2>
                    <button className="btn" onClick={() => setAdding(true)}>➕ แนะนำร้าน</button>
                  </div>
                  <p className="note">เรียงตามยอดไลก์ · กด 🤍 ให้ร้านที่ชอบเพื่อดันขึ้นอันดับ ·{" "}
                    <a href="#/toprank" style={{ color: "var(--u)", fontWeight: 600 }}>ดู 🔥 Top Rank จากชาวลาบทุกจังหวัด →</a></p>
                  {!loaded ? <p className="note">กำลังโหลด…</p>
                    : error ? <p className="note">โหลดร้านแนะนำไม่สำเร็จ ลองรีเฟรชอีกครั้ง</p>
                    : userTop.length ? (
                      <ol className="rklist">
                        {userTop.map((r, i) => <UserShop key={r.id} r={r} i={i} city={valid} />)}
                      </ol>
                    ) : <p>ยังไม่มีร้านแนะนำใน จ.{valid} — เป็นคนแรกที่แนะนำเลย!</p>}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {adding && (
        <AddShop city={valid || ""} onClose={() => setAdding(false)}
                 onAdded={(s) => { setAdding(false); location.hash = `#/ranking/${enc(s.city)}`; }} />
      )}

      <Footer />
    </>
  );
}
