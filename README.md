# Aivora — MERN Real-Time Chat

A production-oriented, WhatsApp-style real-time messaging application built with the **MERN** stack and **Socket.IO**.

- **Frontend:** React + Vite, React Router, Axios, Socket.IO Client, Context API
- **Backend:** Node.js + Express, Socket.IO
- **Database:** MongoDB + Mongoose
- **Media:** local disk upload by default, Cloudinary supported via env vars
- **Scaling:** optional Redis + Socket.IO adapter for multiple Node instances

## Features

- Register / login / logout with JWT (HttpOnly refresh-token cookie)
- User search, profile, avatar, about, privacy settings
- One-to-one and group chats
- Text + emoji messages, reply, edit, delete, reactions
- Image / video / audio / document upload
- Typing indicator, online/offline + last seen presence
- Sent / delivered / read receipts
- Unread counts, cursor-based message pagination
- Search across your messages
- Block / unblock / report
- Responsive desktop + mobile UI (WhatsApp-style)
- Unit + API tests (node:test), Socket.IO smoke test

## Project Structure

```
.
├── client/                      # React + Vite frontend
│   └── src/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── utils/
│       ├── App.jsx
│       └── main.jsx
├── server/                      # Express + Socket.IO backend
│   └── src/
│       ├── config/              # env + MongoDB connection
│       ├── controllers/
│       ├── middleware/          # JWT, validation, rate limits, upload
│       ├── models/              # User, Conversation, Message, Group
│       ├── routes/
│       ├── services/            # business logic
│       ├── sockets/
│       ├── utils/
│       ├── app.js
│       └── server.js            # bootstraps HTTP + Socket.IO
├── docker-compose.yml
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)
- (Optional) Redis for the multi-instance Socket.IO adapter
- (Optional) Cloudinary keys for cloud media storage

## Getting Started

### 1. Environment configuration

```bash
# server
cp server/.env.example server/.env
# edit secret values in server/.env

# client
cp client/.env.example client/.env
```

### 2. Install dependencies

```bash
npm install --prefix server
npm install --prefix client
```

### 3. Seed the database (optional demo data)

```bash
npm run seed --prefix server
```

Demo accounts (password `password123`):

| Email               | Username |
| ------------------- | -------- |
| alice@example.com   | alice    |
| bob@example.com     | bob      |
| carol@example.com   | carol    |
| dave@example.com    | dave     |

### 4. Run

```bash
npm run dev --prefix server   # http://localhost:5000 (API + Socket.IO)
npm run dev --prefix client   # http://localhost:5173 (UI)
```

Log in with a demo account (or register a new one). Create a group, send messages, images and reactions, and watch receipts/typing/presence update in real time.

## Tests

```bash
npm test --prefix server                 # unit + API integration tests
node server/tests/socket-smoke.mjs       # live Socket.IO flow (server + seeded DB must be running)
```

## REST API (summary)

| Method | Endpoint                                    | Purpose                          |
| ------ | ------------------------------------------- | -------------------------------- |
| POST   | /api/auth/register                          | Create account                   |
| POST   | /api/auth/login                             | Login                            |
| POST   | /api/auth/refresh                           | Refresh session                  |
| POST   | /api/auth/logout                            | Logout                           |
| GET    | /api/users/me                               | Current user                     |
| PATCH  | /api/users/me                               | Update profile / privacy         |
| GET    | /api/users/search?q=                        | Search users                     |
| POST   | /api/conversations                          | Create / find direct chat        |
| GET    | /api/conversations                          | List conversations               |
| GET    | /api/conversations/:id/messages?before=&limit= | Paginated history            |
| POST   | /api/conversations/:id/messages             | Send message (REST fallback)     |
| POST   | /api/conversations/:id/delivered            | Mark delivered                   |
| POST   | /api/conversations/:id/read                 | Mark read                        |
| PATCH  | /api/messages/:id                           | Edit message                     |
| DELETE | /api/messages/:id                           | Delete message                   |
| POST   | /api/messages/:id/reactions                 | Add / toggle reaction            |
| GET    | /api/search/messages?q=                     | Search messages                  |
| POST   | /api/groups                                 | Create group                     |
| PATCH  | /api/groups/:id                             | Update group                     |
| POST   | /api/groups/:id/members                     | Add members                      |
| DELETE | /api/groups/:id/members/:userId             | Remove member                    |
| POST   | /api/groups/:id/leave                       | Leave group                      |
| POST   | /api/groups/:id/members/:userId             | Change member role               |
| POST   | /api/uploads                                | Upload media (multipart `file`)  |

Response format:

```json
{ "success": true, "data": { }, "message": "OK" }
{ "success": false, "message": "Validation failed", "code": "VALIDATION_ERROR", "errors": [] }
```

## Socket.IO Events

| Client → Server          | Server → Client       | Purpose                |
| ------------------------ | --------------------- | ---------------------- |
| `message:send`           | `message:new`         | Send / receive message |
| `message:delivered`      | `message:status`      | Delivery receipts      |
| `message:read`           | `message:status`      | Read receipts          |
| `typing:start`/`typing:stop` | `typing:update`   | Typing indicator       |
| `message:edit`           | `message:updated`     | Edit message           |
| `message:delete`         | `message:deleted`     | Delete message         |
| `reaction:add`           | `reaction:updated`    | Reactions              |
| `conversation:join`      | —                      | Enter conversation room |
| —                        | `user:online`/`user:offline` | Presence         |
| —                        | `group:updated`/`user:updated` | Info refresh    |

**Rooms:** `user:<userId>` and `conversation:<conversationId>`.

## Security

- Passwords hashed with bcrypt; access tokens short-lived, refresh token in HttpOnly (`Secure` in prod) cookie
- Socket.IO connections authenticated during handshake
- Conversation membership enforced on every message operation — `senderId` is always taken from the authenticated session, never the payload
- Zod validation on every body/query; express-rate-limit on auth, search and the API globally
- Helmet security headers, explicit CORS, upload MIME/size validation
- No secrets in client code (media uploads go through the authenticated backend)

## Deployment

- **Frontend:** Vercel/Netlify (`npm run build` → `client/dist`); set `VITE_API_URL`/`VITE_SOCKET_URL` to the deployed API.
- **Backend:** Render/Railway/AWS/Docker. Set all `server/.env` values; use MongoDB Atlas.
- **Multi-instance Socket.IO:** set `REDIS_URL` — the server automatically uses the `@socket.io/redis-adapter`.
- **Media:** leave Cloudinary keys empty to store under `server/uploads`, or set the Cloudinary env vars.

### Docker

```bash
docker compose up --build
```

`docker-compose.yml` runs the API, the Vite-built client (served statically), and MongoDB.

## Roadmap / Phase 2

OTP auth, voice/video calls, push notifications (Web Push/FCM), multi-device sync, end-to-end encryption (use a vetted protocol), communities, advanced media processing and observability.

> This application is **not** end-to-end encrypted by default. The MERN stack stores messages in plaintext in MongoDB.