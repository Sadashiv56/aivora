# Deployment Guide — Aivora (WhatsApp-style chat)

This app is split into two deployable pieces:

- **Frontend** (React + Vite + Socket.IO client) → **Vercel** (static hosting).
- **Backend** (Node + Express + Socket.IO + MongoDB) → a **persistent** host such as
  **Render** or **Railway** (they keep a long-lived process and support WebSockets
  and a writable disk for uploaded files).

> Vercel serverless functions do **not** support the long-lived Socket.IO
> connections or the on-disk uploads this app relies on, so the backend is hosted
> separately.

---

## 1. Set up a production database (MongoDB Atlas)

1. Create a free cluster at <https://www.mongodb.com/cloud/atlas>.
2. Create a database user and allow network access (`0.0.0.0/0` for simplicity).
3. Copy the connection string, e.g.:
   `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/aivora`
   Replace `<dbname>` with e.g. `aivora`.

---

## 2. Deploy the BACKEND (Render / Railway)

Create a **Web Service** (not a static site) and point it at the `server/` directory
of the repo. It uses `npm start` (`node src/server.js`) and listens on `PORT`.

### Environment variables (set in the host dashboard)
| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `5000` (Render/Railway inject this automatically) |
| `CLIENT_URL` | `https://<your-app>.vercel.app` (comma-separate multiple if needed) |
| `MONGODB_URI` | your Atlas connection string |
| `JWT_ACCESS_SECRET` | long random string |
| `JWT_REFRESH_SECRET` | long random string (different from access) |
| `ACCESS_TOKEN_EXPIRES_IN` | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` |
| `REFRESH_TOKEN_COOKIE_NAME` | `chat_refresh_token` |
| `UPLOAD_DIR` | `./uploads` |
| `MAX_FILE_SIZE` | `15mb` |
| `REDIS_URL` | *(optional)* only if you run **multiple** backend instances |

**Chosen settings:**
- **Build:** `npm install --omit=dev`
- **Start:** `npm start`
- **Region/Host:** Web service with WebSocket support (default on Render/Railway).
- **Disk:** enable the persistent disk / writable filesystem under `server/` so
  `./uploads` survives restarts. For a free/cheap plan or ephemeral disk, set up
  **Cloudinary** (`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`)
  and `UPLOAD_DIR` can then be ignored — uploads go to Cloudinary instead of disk.

After it starts, note the backend URL, e.g. `https://your-backend.onrender.com`.
**Verify:** open `https://your-backend.onrender.com/api/health` → `{ success: true, status: "ok" }`.

---

## 3. Deploy the FRONTEND (Vercel)

`vercel.json` (in `client/`) already contains an SPA rewrite so React Router works
on every path.

### Set build-time environment variables on Vercel
In the Vercel project (**Settings → Environment Variables**), add:

| Name | Value |
| --- | --- |
| `VITE_API_URL` | `https://your-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://your-backend.onrender.com` |

These are baked into the JS bundle at build time. The local `client/.env`
(localhost) is gitignored and will **not** be deployed.

### Option A — Deploy via git (recommended)
1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, **New Project → Import** the repo.
3. Set **Root Directory** to `client`.
4. Vercel auto-detects Vite. Framework Preset: **Vite**; Build: `npm run build`;
   Output: `dist`.
5. Add the two env vars above, then **Deploy**.

### Option B — Deploy with the Vercel CLI
```bash
cd client
npm i -g vercel
vercel             # first time: link project, set root dir
vercel env add VITE_API_URL production
vercel env add VITE_SOCKET_URL production
vercel --prod
```

Once deployed the frontend URL is e.g. `https://your-app.vercel.app`.

---

## 4. Link them together

Make sure `CLIENT_URL` on the backend equals the Vercel frontend URL (step 2).
The backend uses CORS to allow only that origin, and the refresh cookie is set
with `SameSite=None; Secure` so it is sent across the Vercel → backend origins.

---

## 5. Final checks
- [ ] `GET https://<backend>/api/health` returns ok.
- [ ] Open `https://<your-app>.vercel.app`, register a fresh account.
- [ ] Open a second tab/window, log in with another account, send a message → appears
      in real time (Socket.IO working).
- [ ] Send an image (< 15 MB) → it uploads and renders.
- [ ] Refresh the page while logged in → session persists (refresh cookie works).

---

## Troubleshooting
- **CORS errors in the browser** → confirm `CLIENT_URL` on the backend exactly
  matches the Vercel origin (no trailing slash), and it was a **rebuild/deploy**
  after changing it.
- **Login says refresh/cookie missing after a while** → make sure the backend was
  deployed with `NODE_ENV=production` so the cookie is `SameSite=None; Secure`
  (HTTPS required — Render/Railway/Vercel all provide HTTPS).
- **Uploads fail / don't persist** → use a persistent disk or add Cloudinary env vars.
- **Real-time events don't arrive** → confirm the host supports WebSockets and that
  `VITE_SOCKET_URL` points at the backend root (not `/api`).
