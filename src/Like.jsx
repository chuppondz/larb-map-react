import { useUserShops, toggleLike } from "./userShops.js";

// ปุ่มไลก์ อ่านยอดล่าสุดจาก store เสมอ (ไม่ใช้ค่าที่ค้างอยู่ตอนเปิดรายละเอียดร้าน)
export default function LikeBtn({ id }) {
  const { shops, liked } = useUserShops();
  const s = shops.find((x) => x.id === id);
  if (!s) return null;
  const on = liked.has(id);
  return (
    <button className={"like" + (on ? " on" : "")} onClick={() => toggleLike(id)}
            aria-pressed={on} aria-label={on ? "เลิกถูกใจ" : "ถูกใจ"}>
      {on ? "❤️" : "🤍"} <b>{s.likes.toLocaleString()}</b>
    </button>
  );
}
