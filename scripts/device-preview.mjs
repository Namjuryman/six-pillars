import { build } from "vite";
import { readFile, stat, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, extname, sep } from "node:path";
import approvedProject from "../config/approved-data-project.json" with { type: "json" };

throwIfLivePreview();
function throwIfLivePreview() {
  if (approvedProject.projectRef === "rplgwjhnptappdbwqygj")
    throw new Error(
      "Project is now the approved personal data project; old DEV tunnel preview is disabled. Use the approved Pages release.",
    );
}

// Explicitly authorized temporary DEV preview; never part of CI or Pages builds.
const config = Object.fromEntries(
  (await readFile(".env.development.local", "utf8"))
    .split(/\r?\n/)
    .filter((x) => x.includes("="))
    .map((x) => {
      const i = x.indexOf("=");
      return [x.slice(0, i).trim(), x.slice(i + 1).trim()];
    }),
);
const origin = "https://rplgwjhnptappdbwqygj.supabase.co";
if (
  config.VITE_SUPABASE_URL?.replace(/\/$/, "") !== origin ||
  !/^sb_publishable_[A-Za-z0-9_-]+$/.test(
    config.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
  )
)
  throw new Error(
    "Only the approved DEV project and publishable key are permitted",
  );
const repo = resolve(".");
const output = resolve(
  process.env.M1_DEVICE_DIRECTORY ?? "../qa-m1/release/device-site",
);
if (output === repo || output.startsWith(repo + sep))
  throw new Error("Preview artifacts must stay outside the repository");
await mkdir(output, { recursive: true });
await build({
  envDir: false,
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(origin),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      config.VITE_SUPABASE_PUBLISHABLE_KEY,
    ),
  },
  build: { outDir: output, emptyOutDir: false },
});

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ${origin}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  );
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405).end();
    return;
  }
  try {
    const path = decodeURIComponent(
      new URL(request.url, "http://127.0.0.1:5180").pathname,
    );
    if (path === "/") {
      response.writeHead(302, { Location: "/six-pillars/" }).end();
      return;
    }
    if (
      !path.startsWith("/six-pillars/") ||
      path.includes("\\") ||
      path.split("/").some((x) => x.startsWith("."))
    ) {
      response.writeHead(404).end();
      return;
    }
    const file = resolve(
      output,
      path.slice("/six-pillars/".length) || "index.html",
    );
    const type = types[extname(file)];
    if (
      !file.startsWith(output + sep) ||
      !type ||
      !(await stat(file)).isFile()
    ) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "Content-Type": type });
    response.end(request.method === "HEAD" ? undefined : await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(5180, "127.0.0.1", () =>
  console.log(
    "Temporary DEV static preview ready on 127.0.0.1:5180/six-pillars/; no source files or local APIs are served.",
  ),
);
// Temporary acceptance window only. A closed origin cannot serve data via the tunnel.
setTimeout(
  () => server.close(() => process.exit(0)),
  2 * 60 * 60 * 1000,
).unref();
