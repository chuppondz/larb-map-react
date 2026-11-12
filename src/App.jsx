import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { R } from "./data.js";
import { color, FILTERS, groupByCity, centroid, km, pinIcon, cityIcon, rankHref, userPinIcon } from "./utils.js";
import { ENABLED, useUserShops, loadUserShops } from "./userShops.js";
import LikeBtn from "./Like.jsx";
import AddShop from "./AddShop.jsx";
import Nav from "./Nav.jsx";

const PIN_ZOOM = 10;
const USER_FILTER = FILTERS.length; // ชิป "💜 จากผู้ใช้"
const safeUrl = (u) => (u && /^https:\/\//.test(u) ? u : null);
const distTxt = (d) => (d == null ? "" : ` · ห่าง ${d < 1 ? Math.round(d * 1000) + " ม." : d.toFixed(1) + " กม."}`);

function UserSheet({ r, dist, onClose }) {
  const q = `${r.la},${r.lo}`;
  return (
    <div className="sheet open">
      <button className="x" onClick={onClose} aria-label="ปิด">×</button>
      <span className="ubadge">👍 แนะนำโดยผู้ใช้</span>
      <h3>{r.name}</h3>
      <div className="r"><LikeBtn id={r.id} /> <span>{r.city}{distTxt(dist)}</span></div>
      {r.note && <div className="r">💬 {r.note}</div>}
      <div className="acts">
        <a className="p" target="_blank" rel="noopener noreferrer"
           href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}>นำทาง</a>
        <a target="_blank" rel="noopener noreferrer"
           href={safeUrl(r.maps_url) || `https://www.google.com/maps/search/?api=1&query=${q}`}>Google Maps</a>
      </div>
      <div className="src">ข้อมูลจากผู้ใช้ ยังไม่ได้ตรวจสอบ · กดไลก์เพื่อดันร้านขึ้นอันดับ</div>
    </div>
  );
}

function MapEvents({ onZoom, onBlank }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
    click: onBlank,
  });
  return null;
}

function Sheet({ r, dist, onClose }) {
  const tel = r.tel.replace(/\s/g, "");
  // ร้านที่ยังไม่มี placeId: ให้ Google Maps ค้นด้วยชื่อร้านแทนพิกัดเปล่าๆ
  const q = r.pid ? `${r.la},${r.lo}` : encodeURIComponent(`${r.name} ${r.city}`);
  return (
    <div className="sheet open">
      <button className="x" onClick={onClose} aria-label="ปิด">×</button>
      <h3>{r.name}</h3>
      <div className="r">
        <span className="score" style={{ background: color(r.rate) }}>{r.rate.toFixed(1)}</span>
        {"★".repeat(Math.round(r.rate))} <span>({r.n.toLocaleString()} รีวิว)</span>
      </div>
      <div className="r">📍 {r.area} <span>· {r.city}{distTxt(dist)}</span></div>
      <div className="r">🕒 {r.hrs}</div>
      {r.tel && <div className="r">📞 <a href={`tel:${tel}`}>{r.tel}</a></div>}
      <div className="acts">
        {r.tel && <a href={`tel:${tel}`}>โทร</a>}
        <a className="p" target="_blank" rel="noopener noreferrer"
           href={`https://www.google.com/maps/dir/?api=1&destination=${q}&destination_place_id=${r.pid}`}>นำทาง</a>
        <a target="_blank" rel="noopener noreferrer"
           href={`https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${r.pid}`}>Google Maps</a>
      </div>
      <div className="src">ข้อมูลจาก Google Maps · เวลาเปิด-ปิดอาจเปลี่ยนแปลง</div>
    </div>
  );
}

export default function App({ focus }) {
  const [map, setMap] = useState(null);
  const [zoom, setZoom] = useState(6);
  const [filter, setFilter] = useState(0);
  const [sel, setSel] = useState(null);
  const [dist, setDist] = useState(null);
  const [me, setMe] = useState(null);

  const [adding, setAdding] = useState(false);
  const { shops } = useUserShops();
  useEffect(() => { loadUserShops(); }, []);

  const userMode = filter === USER_FILTER;
  const official = useMemo(() => (userMode ? [] : R.filter(FILTERS[filter][1])), [filter]);
  const userList = ENABLED && (filter === 0 || userMode) ? shops : [];
  const list = useMemo(() => [...official, ...userList], [official, userList]);
  const groups = useMemo(() => groupByCity(list), [list]);
  const allGroups = useMemo(() => groupByCity(R), []);
  const cities = useMemo(() => Object.keys(allGroups).sort((a, b) => a.localeCompare(b, "th")), [allGroups]);
  const [q, setQ] = useState("");

  useEffect(() => { document.title = "ลาบแมป — หาร้านลาบทั่วไทย"; }, []);

  const scrollToMap = () => document.getElementById("map-section")?.scrollIntoView();

  const select = (r, d = null) => {
    setSel(r);
    setDist(d);
    const z = Math.max(map.getZoom(), 14);
    map.flyTo([r.la - 0.0012 * Math.pow(2, 14 - z), r.lo], z, { duration: 0.6 });
  };
  const close = () => { setSel(null); setDist(null); };

  // มาจากหน้าอันดับ (#/map/<จังหวัด>/<placeId>): ซูมไปที่ร้าน/จังหวัดนั้น
  useEffect(() => {
    if (!map || !focus) return;
    scrollToMap();
    const pid = focus.pid || "";
    const r = pid.startsWith("u:")
      ? shops.find((x) => "u:" + x.id === pid)
      : pid && R.find((x) => x.pid === pid || "id" + x.id === pid);
    if (pid.startsWith("u:") && !r && !shops.length) return; // รอโหลดร้านจากผู้ใช้ก่อน
    if (r) { if (r.user) setFilter(0); select(r); }
    else if (allGroups[focus.city]) map.flyTo(centroid(allGroups[focus.city]), 12);
  }, [map, focus?.city, focus?.pid, shops.length > 0]);

  const near = () => {
    if (!navigator.geolocation) return alert("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง");
    scrollToMap();
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: a, longitude: b } }) => {
        setMe([a, b]);
        const n = list.map((r) => ({ r, d: km(a, b, r.la, r.lo) })).sort((x, y) => x.d - y.d)[0];
        if (n) select(n.r, n.d);
      },
      () => alert("ไม่สามารถระบุตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const showPins = zoom >= PIN_ZOOM;

  return (
    <>
      <Nav />

      <header className="wrap hero" id="top">
        <div>
          <span className="pill">🌶️ ใช้ฟรี · ไม่ต้องสมัคร · ไม่ต้องโหลดแอป</span>
          <h1>หิว<em>ลาบ!!!</em> หาร้าน<em>ลาบ</em><br />ได้ใน 5 วินาที</h1>
          <p>แผนที่ร้านลาบทั่วไทย บอกได้ว่าร้านไหนคะแนนดี เปิดกี่โมง โทรได้ไหม และนำทางไปถึงหน้าร้านได้ทันที</p>
          <div className="cta">
            <a className="btn" href="#map-section">ดูแผนที่เลย</a>
            <button className="btn o" onClick={near}>📍 ร้านใกล้ฉัน</button>
          </div>
          <form className="search" role="search"
                onSubmit={(e) => { e.preventDefault(); location.hash = rankHref(q, cities); }}>
            <input type="search" list="city-list" value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="🏆 ค้นหาจังหวัด ดู Top 10 ร้านลาบ" aria-label="ค้นหาจังหวัด" />
            <datalist id="city-list">{cities.map((c) => <option key={c} value={c} />)}</datalist>
            <button className="btn">ดูอันดับ</button>
          </form>
        </div>
        {/* <div className="phone">
          <b>ใกล้คุณ</b>
          {[["var(--g)", "ลาบนัว", "⭐ 4.9 · เปิดถึง 23:00"], ["var(--y)", "ลาบก้อยซอยแซ่บ", "⭐ 4.1 · เปิด 24 ชม."], ["var(--o)", "โรงลาบ อุบล", "⭐ 3.9 · เปิด 24 ชม."]].map(([c, n, s]) => (
            <div className="row" key={n}>
              <span className="dot" style={{ background: c }} />
              <div><b>{n}</b><br /><small>{s}</small></div>
            </div>
          ))}
        </div> */}
      </header>

      <section id="how">
        <div className="wrap">
          <h2>วิธีใช้ง่ายๆ ที่ทำให้ไม่พลาดร้านอร่อย</h2>
          <div className="steps">
            {[["01", "หา", "เปิดแผนที่ เห็นร้านลาบรอบตัวทันที"], ["02", "ดูสี", "เขียว = คะแนนสูง เหลือง = พอใช้ ส้ม = ต่ำกว่า 4.0"], ["03", "กดดูรายละเอียด", "คะแนน จำนวนรีวิว เวลาเปิด-ปิด เบอร์โทร"], ["04", "นำทาง", "กดเดียวไป Google Maps ถึงหน้าร้าน"]].map(([n, t, d]) => (
              <div className="step" key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="map-section" style={{ paddingTop: 10 }}>
        <div className="wrap">
          <h2>แผนที่ร้านลาบ</h2>
          <div className="legend">
            <span><i style={{ background: "var(--g)" }} />4.5 ขึ้นไป · แนะนำ</span>
            <span><i style={{ background: "var(--y)" }} />4.0–4.4 · พอใช้</span>
            <span><i style={{ background: "var(--o)" }} />ต่ำกว่า 4.0 · ทำใจ</span>
            {ENABLED && <span><i style={{ background: "var(--u)" }} />👍 แนะนำโดยผู้ใช้</span>}
          </div>
          <div className="mapbox">
            <MapContainer ref={setMap} className="map" center={[15.3, 101]} zoom={6} minZoom={5}
                          zoomControl={false} maxBounds={[[3, 93], [23, 108]]}>
               <TileLayer
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
              <MapEvents onZoom={setZoom} onBlank={close} />
              {me && <CircleMarker center={me} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2a7de1", fillOpacity: 1 }} />}
              {showPins
                ? list.map((r) => (
                    <Marker key={(r.user ? "u" : "o") + r.id} position={[r.la, r.lo]}
                            icon={r.user ? userPinIcon(r.likes, sel?.id === r.id) : pinIcon(color(r.rate), sel?.id === r.id)}
                            zIndexOffset={r.user ? 500 : 0}
                            eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation?.(); select(r); } }} />
                  ))
                : Object.entries(groups).map(([c, a]) => {
                    const p = centroid(a);
                    return (
                      <Marker key={c} position={p} icon={cityIcon(a.length, zoom >= 7 ? c : null)}
                              eventHandlers={{ click: () => map.flyTo(p, 12) }} />
                    );
                  })}
            </MapContainer>
            <div className="tools">
              {FILTERS.map(([t], i) => (
                <button key={t} className={"chip" + (i === filter ? " on" : "")}
                        onClick={() => { setFilter(i); close(); }}>{t}</button>
              ))}
              {ENABLED && (
                <button className={"chip u" + (userMode ? " on" : "")}
                        onClick={() => { setFilter(USER_FILTER); close(); }}>👍 จากผู้ใช้ ({shops.length})</button>
              )}
            </div>
            <button className="btn fab" onClick={near}>📍 ร้านใกล้ฉัน</button>
            {ENABLED && !sel && <button className="btn fab add" onClick={() => setAdding(true)}>➕ แนะนำร้าน</button>}
            {sel && (sel.user ? <UserSheet r={sel} dist={dist} onClose={close} /> : <Sheet r={sel} dist={dist} onClose={close} />)}
          </div>
        </div>
      </section>

      <section id="provinces" style={{ paddingTop: 10 }}>
        <div className="wrap">
          <h2>ร้านลาบแยกตามพื้นที่</h2>
          <p style={{ color: "var(--mut)", margin: 0 }}>
            แตะเพื่อซูมไปดูร้านในพื้นที่นั้น · <a href="#/ranking" style={{ color: "var(--acc)", fontWeight: 600 }}>ดูอันดับ Top 10 รายจังหวัด →</a>
          </p>
          <div className="prov">
            {Object.entries(allGroups).sort((a, b) => b[1].length - a[1].length).map(([c, a]) => (
              <button key={c} onClick={() => { scrollToMap(); map?.flyTo(centroid(a), 12); }}>
                {c}<b>{a.length}</b>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" style={{ paddingTop: 10 }}>
        <div className="wrap">
          <h2>คำถามที่พบบ่อย</h2>
          {[["ข้อมูลร้านมาจากไหน", "ตำแหน่ง คะแนน จำนวนรีวิว เวลาเปิด-ปิด และเบอร์โทร มาจาก Google Maps ณ วันที่รวบรวมข้อมูล"],
            ["สีของหมุดมาจากอะไร", "มาจากคะแนนรีวิวบน Google Maps: เขียว 4.5 ขึ้นไป, เหลือง 4.0–4.4, ส้มต่ำกว่า 4.0"],
            ["เวลาเปิด-ปิดตรงเสมอไหม", "อาจเปลี่ยนได้ เช่น วันหยุดพิเศษ แนะนำให้โทรยืนยันก่อนไปถ้าเดินทางไกล"],
            ["ไม่มีร้านในจังหวัดของฉัน", "ตอนนี้มีข้อมูลเมืองหลักๆ ที่รวบรวมไว้ ยังไม่ครบทุกจังหวัด จะเพิ่มต่อเรื่อยๆ"]].map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      {adding && (
        <AddShop onClose={() => setAdding(false)}
                 onAdded={(s) => { setAdding(false); setFilter(0); scrollToMap(); select(s); }} />
      )}

      <footer>
        <div className="wrap">© ลาบแมป · แผนที่ © OpenStreetMap © CARTO · ข้อมูลร้านจาก Google Maps</div>
      </footer>
    </>
  );
}
