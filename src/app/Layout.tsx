import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Brand } from "../components/Visuals";

const navigation = [
  { to: "/", name: "首页" },
  { to: "/pillars", name: "六大能力" },
  { to: "/roadmap", name: "三年路线" },
  { to: "/projects", name: "作品" },
  { to: "/writing", name: "文章" },
  { to: "/achievements", name: "成就" },
  { to: "/about", name: "关于" },
];
export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    if (previousPath.current !== location.pathname)
      main.current?.focus({ preventScroll: true });
    previousPath.current = location.pathname;
  }, [location.pathname]);
  return (
    <div className="site-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        跳至正文
      </a>
      <header className="site-header">
        <Link to="/" aria-label="Six Pillars 首页">
          <Brand />
        </Link>
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? "关闭菜单" : "导航菜单"}
          <span aria-hidden="true">{open ? "×" : "☰"}</span>
        </button>
        <nav
          id="main-nav"
          className={open ? "navigation is-open" : "navigation"}
          aria-label="主导航"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              menuButton.current?.focus();
            }
          }}
        >
          {navigation.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              onClick={() => {
                setOpen(false);
                if (location.pathname === n.to) main.current?.focus();
              }}
            >
              {n.name}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <Link to="/login" className="private-entry-link">
          管理登录
        </Link>
        <Link to="/">
          <Brand />
        </Link>
        <div>
          <span>SIX PILLARS · 2026 — 2029</span>
          <p>在更长的时间里，成为更好的自己。</p>
        </div>
      </footer>
    </div>
  );
}
