import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow localtunnel URLs like https://<subdomain>.trycloudflare.com to reach Vite in dev.
    // Also allow Cloudflare quick tunnel URLs like https://<name>.trycloudflare.com.
    allowedHosts: [".trycloudflare.com"],
    // Helpful for tunnel-based testing tools that honor this hint.
    headers: {
      "bypass-tunnel-reminder": "true",
    },
  },
});
