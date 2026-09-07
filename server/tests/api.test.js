process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/whatsapp_clone_test";
process.env.PORT = "0";
process.env.NODE_ENV = "test";

import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import mongoose from "mongoose";
import User from "../src/models/User.js";

let server;
let base;
let createdUsers = [];

before(async () => {
  const { default: app } = await import("../src/app.js");
  const { default: connectDB } = await import("../src/config/db.js");
  await connectDB();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

afterEach(async () => {
  const ids = createdUsers.flatMap((u) => [u._id, ...(u.otherIds || [])]).map(String);
  if (ids.length) await User.deleteMany({ _id: { $in: ids } });
  createdUsers = [];
});

after(async () => {
  await User.deleteMany({});
  server?.close();
  await mongoose.disconnect();
});
process.on("exit", () => mongoose.disconnect().catch(() => {}));

const j = (obj) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(obj) });

const regUser = async (name, email) => {
  const res = await fetch(`${base}/auth/register`, j({
    name,
    username: name.toLowerCase().replace(/\s/g, ""),
    email,
    password: "password123",
  }));
  const body = await res.json();
  assert.equal(res.status, 201, JSON.stringify(body));
  assert.equal(body.success, true);
  return { res, body, token: body.data.accessToken, id: body.data.user.id };
};

test("health endpoint responds", async () => {
  const res = await fetch(`${base}/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.status, "ok");
});

test("register + duplicate email conflict", async () => {
  const alice = await regUser("Alice", "a@test.dev");
  createdUsers.push({ _id: alice.id });
  const res = await fetch(`${base}/auth/register`, j({
    name: "Alice 2",
    username: "alice2",
    email: "a@test.dev",
    password: "password123",
  }));
  const body = await res.json();
  assert.equal(res.status, 409);
  assert.equal(body.code, "DUPLICATE_VALUE");
});

test("login rejects bad credentials", async () => {
  const res = await fetch(`${base}/auth/login`, j({ email: "nobody@test.dev", password: "wrong" }));
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.code, "INVALID_CREDENTIALS");
});

test("validation error for malformed input", async () => {
  const res = await fetch(`${base}/auth/register`, j({ name: "X", username: "x", email: "bademail", password: "1" }));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.ok(body.errors.length > 0);
});

test("protected routes require auth", async () => {
  const res = await fetch(`${base}/users/me`);
  assert.equal(res.status, 401);
});

test("full chat flow: conversation -> message -> reaction", async () => {
  const a1 = await regUser("Ann", "ann@test.dev");
  const a2 = await regUser("Ben", "ben@test.dev");
  createdUsers.push({ _id: a1.id });

  const auth = (token) => ({ authorization: `Bearer ${token}` });

  const convo = await fetch(`${base}/conversations`, {
    ...j({ userId: a2.id }),
    headers: { ...j({ userId: a2.id }).headers, ...auth(a1.token) },
  });
  const convoBody = await convo.json();
  assert.equal(convo.status, 200, JSON.stringify(convoBody));
  const convId = convoBody.data.id;

  const msg = await fetch(`${base}/conversations/${convId}/messages`, {
    ...j({ type: "text", text: "Hello Ben" }),
    headers: { ...j({ type: "text", text: "Hello Ben" }).headers, ...auth(a1.token) },
  });
  const msgBody = await msg.json();
  assert.equal(msg.status, 201, JSON.stringify(msgBody));
  const messageId = msgBody.data.id;

  const history = await fetch(`${base}/conversations/${convId}/messages?limit=10`, {
    headers: auth(a1.token),
  });
  const hist = await history.json();
  assert.equal(hist.data.messages.length, 1);
  assert.equal(hist.data.messages[0].text, "Hello Ben");
  assert.equal(hist.data.messages[0].senderId, a1.id);

  const reaction = await fetch(`${base}/messages/${messageId}/reactions`, {
    ...j({ emoji: "🔥" }),
    headers: { ...j({ emoji: "🔥" }).headers, ...auth(a2.token) },
  });
  const reactBody = await reaction.json();
  assert.equal(reaction.status, 200);
  assert.equal(reactBody.data.reactions.length, 1);

  const delivered = await fetch(`${base}/conversations/${convId}/delivered`, {
    ...j({}),
    headers: { ...j({}).headers, ...auth(a2.token) },
  });
  const delBody = await delivered.json();
  assert.equal(delivered.status, 200);
  assert.ok(delBody.data.delivered.includes(messageId));
});

test("non-member cannot read conversation", async () => {
  const a1 = await regUser("Cara", "cara@test.dev");
  const a2 = await regUser("Dev", "dev@test.dev");
  const stranger = await regUser("Eve", "eve@test.dev");
  createdUsers.push({ _id: a1.id, otherIds: [a2.id, stranger.id] });

  const convo = await fetch(`${base}/conversations`, {
    ...j({ userId: a2.id }),
    headers: { ...j({ userId: a2.id }).headers, ...{ authorization: `Bearer ${a1.token}` } },
  });
  const convoBody = await convo.json();
  assert.equal(convo.status, 200, JSON.stringify(convoBody));
  const convId = convoBody.data.id;

  const res = await fetch(`${base}/conversations/${convId}/messages?limit=5`, {
    headers: { authorization: `Bearer ${stranger.token}` },
  });
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "FORBIDDEN");
});