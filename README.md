# Padel Americano Scoring

Single-page, browser-only React + TypeScript app for running a padel Americano scoring session.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

The app stores the full session in `localStorage` under `padel-americano-session-v1`.

Rota generation is intentionally not implemented. `StaticRotaProvider` imports precomputed rota JSON, while `PlaceholderGeneratedRotaProvider` defines the future provider boundary.

## Mobile Testing From Local Dev

Use this section to test quickly on a real iPhone without CI/CD.

### Option A: Same Wi-Fi (fastest)

1. Start Vite:

```bash
npm run dev
```

2. Find your machine LAN IP:

```bash
hostname -I
```

3. Open on iPhone Safari (same network):

```text
http://<LAN_IP>:5173
```

### Option B: Cloudflare quick tunnel (works across networks)

1. Start Vite:

```bash
npm run dev
```

2. Start tunnel:

```bash
npx cloudflared tunnel --url http://localhost:5173
```

3. Open the provided URL (example):

```text
https://random-name.trycloudflare.com
```

### Cloudflare tunnel notes

- Vite is configured to allow `*.trycloudflare.com` hosts in dev (`server.allowedHosts`).
- The quick tunnel URL changes each run; if needed, restart `cloudflared` to get a fresh URL.
- Keep both `npm run dev` and `cloudflared tunnel` running during testing.

