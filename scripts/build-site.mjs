import { build } from "vite";
import { buildConfig } from "./build-policy.mjs";

const config = buildConfig(process.argv[2], process.env);
// Do not read .env, .env.production.local, or inherited VITE_ values.
// Inline definitions override all Vite automatic environment substitutions.
await build({
  envDir: false,
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(config.url),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(config.key),
  },
  build: { outDir: config.outDir },
});
