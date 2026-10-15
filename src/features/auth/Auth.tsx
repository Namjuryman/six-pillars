import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  configured,
  logout,
  ownerAllowed,
  restore,
  sendSignInLink,
  watchAuth,
} from "../../lib/privateApi";

type Status = "checking" | "guest" | "owner" | "denied";
interface AuthValue {
  status: Status;
  email: string;
  error: string;
  signOut(): Promise<void>;
  retry(): void;
}
const AuthContext = createContext<AuthValue | null>(null);
export function useOwner() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const revision = useRef(0);
  const signingOut = useRef(false);
  const active = useRef(false);
  const reconcile = useCallback(async () => {
    if (signingOut.current) return;
    const ticket = ++revision.current;
    try {
      const user = await restore();
      const allowed = user ? await ownerAllowed(user.id) : false;
      if (!active.current || ticket !== revision.current) return;
      setEmail(allowed ? (user?.email ?? "") : "");
      setStatus(user ? (allowed ? "owner" : "denied") : "guest");
      setError("");
    } catch {
      if (!active.current || ticket !== revision.current) return;
      setStatus("guest");
      setEmail("");
      setError("无法验证登录状态，请检查网络后重试，或退出后重新登录。");
    }
  }, []);
  useEffect(() => {
    active.current = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const stop = watchAuth((event) => {
      if (event === "SIGNED_OUT") {
        ++revision.current;
        setEmail("");
        setStatus("guest");
      } else {
        // Never await auth operations inside the SDK callback: it holds the auth lock.
        const timer = setTimeout(() => {
          timers.delete(timer);
          void reconcile();
        }, 0);
        timers.add(timer);
      }
    });
    void reconcile();
    return () => {
      active.current = false;
      ++revision.current;
      stop();
      timers.forEach(clearTimeout);
    };
  }, [reconcile]);
  const value = useMemo<AuthValue>(
    () => ({
      status,
      email,
      error,
      async signOut() {
        signingOut.current = true;
        ++revision.current;
        setStatus("guest");
        setEmail("");
        setError("");
        try {
          await logout();
        } catch {
          setError("本地会话已退出，服务端注销暂不可用。");
        } finally {
          signingOut.current = false;
        }
      },
      retry() {
        void reconcile();
      },
    }),
    [status, email, error, reconcile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function ProtectedRoute() {
  const { status } = useOwner();
  const loc = useLocation();
  if (status === "checking")
    return (
      <div className="private-state">
        <h1>正在验证账户…</h1>
      </div>
    );
  if (status !== "owner")
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <Outlet />;
}
export function privateReturnPath(value: unknown): string {
  return typeof value === "string" &&
    ["/admin", "/admin/goals", "/admin/logs", "/admin/achievements"].includes(
      value,
    )
    ? value
    : "/admin";
}
export function Login({
  callbackFailed = false,
}: {
  callbackFailed?: boolean;
}) {
  const { status, error, retry, signOut } = useOwner();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    callbackFailed ? "登录链接无效或已过期，请重新获取。" : "",
  );
  if (status === "owner")
    return (
      <Navigate
        to={privateReturnPath(
          (location.state as { from?: unknown } | null)?.from,
        )}
        replace
      />
    );
  async function onSend(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const address = email.trim();
    try {
      await sendSignInLink(address);
      setMessage(
        "如果该邮箱已登记，登录链接将发送到邮箱。请在邮件中点击 Sign in。",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发送失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="private-shell private-login">
      <p className="private-kicker">PRIVATE WORKSPACE</p>
      <h1>管理后台登录</h1>
      <p>这里只有本人可以登录。公开页面无需账号。</p>
      {!configured ? (
        <div className="private-message" role="status">
          私人工作台尚未启用。
        </div>
      ) : (
        <>
          {status === "denied" && (
            <p role="alert" className="private-error">
              此账户没有后台权限。
              <button type="button" onClick={() => void signOut()}>
                退出此账户
              </button>
            </p>
          )}
          {error && (
            <p role="alert" className="private-error">
              {error}
              <button type="button" onClick={retry}>
                重试验证
              </button>
              <button type="button" onClick={() => void signOut()}>
                退出会话
              </button>
            </p>
          )}
          <form onSubmit={onSend} className="private-form">
            <label>
              登录邮箱
              <input
                disabled={busy}
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </label>
            <button disabled={busy} className="private-primary" type="submit">
              发送登录链接
            </button>
          </form>
          {message && (
            <p role="status" className="private-message">
              {message}
            </p>
          )}
        </>
      )}
      <Link className="text-link" to="/">
        ← 返回公开主页
      </Link>
    </div>
  );
}
