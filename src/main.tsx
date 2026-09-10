import React, { useEffect, useState, lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
const App = lazy(() => import("./App"));
import Landing from "./Landing";
import "./styles.css";
import "./landing.css";
function Router() {
  const [lab, setLab] = useState(location.hash.startsWith("#/lab"));
  useEffect(() => {
    const navigate = () => {
      const next = location.hash.startsWith("#/lab");
      setLab(next);
      if (next || location.hash === "#" || !location.hash)
        window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    document.title = lab
      ? "SHRDLU — 积木世界实验"
      : "SHRDLU — 历史、原理与积木世界实验";
    if (!lab) document.documentElement.lang = "zh-CN";
  }, [lab]);
  return lab ? (
    <Suspense
      fallback={
        <div className="route-loading" role="status">
          正在载入积木世界…
        </div>
      }
    >
      <App />
    </Suspense>
  ) : (
    <Landing />
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);
