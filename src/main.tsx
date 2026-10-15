import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "./app/Router";
import { completeAuthCallback } from "./lib/authCallback";
import { hasAuthFragment } from "./lib/authURL";
import "./styles.css";
import "./styles.private.css";
// An email link pasted into an already open SPA can be a same-document hash
// navigation. Reload so the same scrub-and-SDK callback path handles it safely.
window.addEventListener("hashchange", () => {
  if (hasAuthFragment(window.location.hash)) window.location.reload();
});
async function start() {
  const root = document.getElementById("root")!;
  if (hasAuthFragment(window.location.hash))
    root.textContent = "正在验证登录链接…";
  const callbackFailed = await completeAuthCallback();
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Router callbackFailed={callbackFailed} />
    </React.StrictMode>,
  );
}
void start();
