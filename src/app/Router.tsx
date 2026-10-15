import { useEffect } from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./Layout";
import { Home } from "../features/public/Home";
import { Pillars, PillarDetail } from "../features/public/Pillars";
import { Roadmap } from "../features/public/Roadmap";
import { Entries, EntryDetail } from "../features/public/Entries";
import { About, NotFound } from "../features/public/UtilityPages";
import { Achievements } from "../features/achievements/Achievements";

function Titles() {
  const { pathname } = useLocation();
  useEffect(() => {
    const names: Record<string, string> = {
      "/": "首页",
      "/pillars": "六大能力",
      "/roadmap": "三年路线",
      "/projects": "作品",
      "/writing": "文章",
      "/achievements": "成就",
      "/about": "关于",
    };
    document.title = `${names[pathname] ?? (pathname.startsWith("/pillars/") ? "能力详情" : pathname.startsWith("/writing/") ? "文章详情" : pathname.startsWith("/projects/") ? "作品详情" : "页面未找到")} · Six Pillars`;
  }, [pathname]);
  return null;
}
export function Router() {
  return (
    <HashRouter>
      <Titles />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pillars" element={<Pillars />} />
          <Route path="pillars/:key" element={<PillarDetail />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="projects" element={<Entries kind="project" />} />
          <Route
            path="projects/:slug"
            element={<EntryDetail kind="project" />}
          />
          <Route path="writing" element={<Entries kind="article" />} />
          <Route
            path="writing/:slug"
            element={<EntryDetail kind="article" />}
          />
          <Route path="achievements" element={<Achievements />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
