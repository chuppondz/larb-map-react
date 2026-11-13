import { ENABLED } from "./userShops.js";

export default function Nav() {
  return (
    <nav>
      <div className="wrap">
        <a className="logo" href="#top">ลาบ<span>แมป</span></a>
        <div className="links">
          <a className="h" href="#how">ทำงานยังไง</a>
          <a className="h" href="#provinces">จังหวัด</a>
          <a className="h" href="#faq">คำถามที่พบบ่อย</a>
          <a className="nl" href="#/ranking">🏆 Top 10</a>
          {ENABLED && <a className="nl" href="#/toprank">🔥 Top Vote</a>}
          <a className="btn" href="#map-section">เปิดแผนที่</a>
        </div>
      </div>
    </nav>
  );
}
