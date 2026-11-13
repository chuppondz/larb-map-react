import { STYLES, STYLE_KEYS } from "./utils.js";
import { useUserShops, stylesOf, votesOf, canVote, myVote, toggleStyleVote } from "./userShops.js";

// ป้ายประเภทลาบ (ขึ้นเฉพาะฝั่งที่โหวตชนะ)
export function StyleTags({ r }) {
  useUserShops(); // อัปเดตเมื่อโหวตเปลี่ยน
  const styles = stylesOf(r);
  if (!styles.length) return null;
  return (
    <span className="stags">
      {styles.map((k) => <span key={k} className={"stag " + k}>{STYLES[k].emoji} {STYLES[k].label}</span>)}
    </span>
  );
}

// ชิปกรองประเภท: ทุกแบบ / ลาบเหนือ / ลาบอีสาน
export function StyleChips({ value, onChange, counts, className = "" }) {
  return (
    <div className={"schips " + className}>
      {[["", "ทุกแบบ"], ...STYLE_KEYS.map((k) => [k, `${STYLES[k].emoji} ${STYLES[k].label}`])].map(([k, t]) => (
        <button key={k || "all"} type="button" className={"chip s" + (k ? " " + k : "") + (value === k ? " on" : "")}
                onClick={() => onChange(k)}>{t}{counts && ` (${counts[k || "all"] ?? 0})`}</button>
      ))}
    </div>
  );
}

// ปุ่มโหวตประเภท (ใช้ได้ทั้งร้านจาก Google และร้านที่ผู้ใช้ปัก)
export function StyleVote({ r }) {
  useUserShops();
  if (!canVote(r)) return null;
  const v = votesOf(r) || { north: 0, isan: 0 };
  const mine = myVote(r);
  return (
    <div className="svote">
      <span>ร้านนี้เป็นลาบแบบไหน?</span>
      {STYLE_KEYS.map((k) => (
        <button key={k} type="button" className={"vbtn " + k + (mine === k ? " on" : "")} aria-pressed={mine === k}
                onClick={() => toggleStyleVote(r, k)}>
          {STYLES[k].emoji} {STYLES[k].label.replace("ลาบ", "")} <b>{v[k]}</b>
        </button>
      ))}
    </div>
  );
}
