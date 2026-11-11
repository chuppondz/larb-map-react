import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { R } from "./data.js";
import { color, FILTERS, groupByCity, centroid, km, pinIcon, cityIcon } from "./utils.js";

const PIN_ZOOM = 10;

function MapEvents({ onZoom, onBlank }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
    click: onBlank,
  });
  return null;
}

function Sheet({ r, dist, onClose }) {
  const tel = r.tel.replace(/\s/g, "");
  const q = `${r.la},${r.lo}`;
  return (
    <div className="sheet open">
      <button className="x" onClick={onClose} aria-label="ปิด">×</button>
      <h3>{r.name}</h3>
      <div className="r">
        <span className="score" style={{ background: color(r.rate) }}>{r.rate.toFixed(1)}</span>
        {"★".repeat(Math.round(r.rate))} <span>({r.n.toLocaleString()} รีวิว)</span>
      </div>
      <div className="r">
        📍 {r.area}{" "}
        <span>
          · {r.city}
          {dist != null && ` · ห่าง ${dist < 1 ? Math.round(dist * 1000) + " ม." : dist.toFixed(1) + " กม."}`}
        </span>
      </div>
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

export default function App() {
  const [map, setMap] = useState(null);
  const [zoom, setZoom] = useState(6);
  const [filter, setFilter] = useState(0);
  const [sel, setSel] = useState(null);
  const [dist, setDist] = useState(null);
  const [me, setMe] = useState(null);

  const list = useMemo(() => R.filter(FILTERS[filter][1]), [filter]);
  const groups = useMemo(() => groupByCity(list), [list]);
  const allGroups = useMemo(() => groupByCity(R), []);

  const scrollToMap = () => document.getElementById("map-section")?.scrollIntoView();

  const select = (r, d = null) => {
    setSel(r);
    setDist(d);
    const z = Math.max(map.getZoom(), 14);
    map.flyTo([r.la - 0.0012 * Math.pow(2, 14 - z), r.lo], z, { duration: 0.6 });
  };
  const close = () => { setSel(null); setDist(null); };

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
      <nav>
        <div className="wrap">
          <a className="logo" href="#top">ลาบ<span>แมป</span></a>
          <div className="links">
            <a className="h" href="#how">ทำงานยังไง</a>
            <a className="h" href="#provinces">จังหวัด</a>
            <a className="h" href="#faq">คำถามที่พบบ่อย</a>
            <a className="btn" href="#map-section">เปิดแผนที่</a>
          </div>
        </div>
      </nav>

      <header className="wrap hero" id="top">
        <div>
          <span className="pill">🌿 ใช้ฟรี · ไม่ต้องสมัคร · ไม่ต้องโหลดแอป</span>
          <h1>หิวตอนนี้ <em>หาร้านลาบ</em><br />ได้ใน 5 วินาที</h1>
          <p>แผนที่ร้านลาบทั่วไทย บอกได้ว่าร้านไหนคะแนนดี เปิดกี่โมง โทรได้ไหม และนำทางไปถึงหน้าร้านได้ทันที</p>
          <div className="cta">
            <a className="btn" href="#map-section">ดูแผนที่เลย</a>
            <button className="btn o" onClick={near}>📍 ร้านใกล้ฉัน</button>
          </div>
        </div>
        <div className="phone">
          <b>ใกล้คุณ</b>
          {[["var(--g)", "ลาบนัว", "⭐ 4.9 · เปิดถึง 23:00"], ["var(--y)", "ลาบก้อยซอยแซ่บ", "⭐ 4.1 · เปิด 24 ชม."], ["var(--o)", "โรงลาบ อุบล", "⭐ 3.9 · เปิด 24 ชม."]].map(([c, n, s]) => (
            <div className="row" key={n}>
              <span className="dot" style={{ background: c }} />
              <div><b>{n}</b><br /><small>{s}</small></div>
            </div>
          ))}
        </div>
      </header>

      <section id="how">
        <div className="wrap">
          <h2>วงจรง่ายๆ ที่ทำให้ไม่พลาดร้านอร่อย</h2>
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
          </div>
          <div className="mapbox">
            <MapContainer ref={setMap} className="map" center={[15.3, 101]} zoom={6} minZoom={5}
                          zoomControl={false} maxBounds={[[3, 93], [23, 108]]}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains="abcd" maxZoom={19} attribution="© OpenStreetMap © CARTO" />
              <MapEvents onZoom={setZoom} onBlank={close} />
              {me && <CircleMarker center={me} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2a7de1", fillOpacity: 1 }} />}
              {showPins
                ? list.map((r) => (
                    <Marker key={r.id} position={[r.la, r.lo]} icon={pinIcon(color(r.rate), sel?.id === r.id)}
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
            </div>
            <button className="btn fab" onClick={near}>📍 ร้านใกล้ฉัน</button>
            {sel && <Sheet r={sel} dist={dist} onClose={close} />}
          </div>
        </div>
      </section>

      <section id="provinces" style={{ paddingTop: 10 }}>
        <div className="wrap">
          <h2>ร้านลาบแยกตามพื้นที่</h2>
          <p style={{ color: "var(--mut)", margin: 0 }}>แตะเพื่อซูมไปดูร้านในพื้นที่นั้น</p>
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

      <footer>
        <div className="wrap">© ลาบแมป · แผนที่ © OpenStreetMap © CARTO · ข้อมูลร้านจาก Google Maps</div>
      </footer>
    </>
  );
}
