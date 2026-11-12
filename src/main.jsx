import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Ranking from "./Ranking.jsx";
import Privacy from "./Privacy.jsx";

// Hash routing: "#/ranking", "#/ranking/<จังหวัด>", "#/ranking?q=..", "#/map/<จังหวัด>/<placeId>"
// hash ธรรมดา (#how, #faq, ...) = หน้าแรก แล้วเลื่อนไปที่ส่วนนั้น
function parse() {
  const h = location.hash.slice(1);
  if (!h.startsWith("/")) return { page: "home", anchor: h };
  const [path, qs = ""] = h.slice(1).split("?");
  const [page, a, b] = path.split("/").map((s) => decodeURIComponent(s || ""));
  return { page: page || "home", a, b, q: new URLSearchParams(qs).get("q") || "" };
}

function Root() {
  const [route, setRoute] = useState(parse);

  useEffect(() => {
    const f = () => setRoute(parse());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);

  useEffect(() => {
    if (route.page === "home" && route.anchor) document.getElementById(route.anchor)?.scrollIntoView();
    else if (route.page === "ranking" || route.page === "privacy") window.scrollTo({ top: 0, behavior: "instant" });
  }, [route]);

  if (route.page === "privacy") return <Privacy />;
  if (route.page === "ranking") return <Ranking city={route.a} q={route.q} />;
  if (route.page === "map") return <App focus={{ city: route.a, pid: route.b }} />;
  return <App />;
}

createRoot(document.getElementById("root")).render(<Root />);
