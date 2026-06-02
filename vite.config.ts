import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Production-only CSP injected via transformIndexHtml so that:
// - dev mode has no CSP (Vite injects inline styles/scripts that would be blocked)
// - production build gets a strict policy with no ws:/wss: allowances
const PRODUCTION_CSP =
  "default-src 'self'; base-uri 'self'; form-action 'self';";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Inject the CSP <meta> tag only when building for production.
    // Note: frame-ancestors cannot be enforced via <meta> (browsers ignore it);
    // it requires a server-side header, which GitHub Pages does not support.
    {
      name: "inject-production-csp",
      transformIndexHtml(html) {
        if (command !== "build") return html;
        return html.replace(
          /<meta\s+name=["']referrer["']/,
          `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />\n    <meta name="referrer"`,
        );
      },
    },
  ],
  base: "/blue-score/",
  server: {
    // Allow localtunnel URLs like https://<subdomain>.trycloudflare.com to reach Vite in dev.
    // Also allow Cloudflare quick tunnel URLs like https://<name>.trycloudflare.com.
    allowedHosts: [".trycloudflare.com"],
    // Helpful for tunnel-based testing tools that honor this hint.
    headers: {
      "bypass-tunnel-reminder": "true",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/main.tsx", "src/sampleData.ts"],
    },
  },
}));
