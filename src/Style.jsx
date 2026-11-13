import { STYLES, STYLE_KEYS, stylesOf } from "./utils.js";
import { useUserShops, toggleStyleVote } from "./userShops.js";

// ป้ายประเภทลาบ เช่น 🏔️ ลาบเหนือ · 🌾 ลาบอีสาน
export function StyleTags({ r, hint }) {
  const { styles, guessed } = stylesOf(r);
  if (!styles.length) return null;
  return (
    <span className="stags">
      {styles.map((k) => <span key={k} className={"stag " + k}>{STYLES[k].emoji} {STYLES[k].label}</span>)}
      {hint && guessed && <span className="sguess">เดาจากชื่อร้าน</span>}
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

// ปุ่มโหวตประเภทให้ร้านจากผู้ใช้ (เหมือนปุ่มไลก์) — ซ่อนถ้าฐานข้อมูลยังไม่มีคอลัมน์โหวต
export function StyleVote({ id }) {
  const { shops, voted } = useUserShops();
  const s = shops.find((x) => x.id === id);
  if (!s || s.north_votes === undefined) return null;
  return (
    <div className="svote">
      <span>ร้านนี้เป็นลาบแบบไหน?</span>
      {STYLE_KEYS.map((k) => {
        const on = voted.has(`${id}:${k}`);
        return (
          <button key={k} type="button" className={"vbtn " + k + (on ? " on" : "")} aria-pressed={on}
                  onClick={() => toggleStyleVote(id, k)}>
            {STYLES[k].emoji} {STYLES[k].label.replace("ลาบ", "")} <b>{s[k + "_votes"] || 0}</b>
          </button>
        );
      })}
    </div>
  );
}
