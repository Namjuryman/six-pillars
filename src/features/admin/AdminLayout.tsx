import { NavLink, Outlet } from "react-router-dom";
import { useOwner } from "../auth/Auth";
const adminLinks = [
  ["/admin", "概览"],
  ["/admin/goals", "目标与里程碑"],
  ["/admin/logs", "活动日志"],
  ["/admin/achievements", "我的成就"],
] as const;
export function AdminLayout() {
  const { email, signOut } = useOwner();
  return (
    <div className="private-shell">
      <div className="private-top">
        <div>
          <p className="private-kicker">PRIVATE · SIX PILLARS</p>
          <h1>成长管理后台</h1>
          <p>你的记录仅保存在已授权的私人空间。</p>
        </div>
        <div className="private-account">
          <small>{email}</small>
          <button type="button" onClick={() => void signOut()}>
            退出登录
          </button>
        </div>
      </div>
      <nav className="private-nav" aria-label="后台导航">
        {adminLinks.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/admin"}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="private-content">
        <Outlet />
      </div>
      <p className="private-footer">
        此后台默认私密。公开内容的编辑和发布属于 M2，当前不提供发布按钮。
      </p>
    </div>
  );
}
