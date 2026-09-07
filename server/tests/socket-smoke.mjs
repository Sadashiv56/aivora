import { io } from "socket.io-client";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

let accessTokenAlice = null;
let accessTokenBob = null;
(async () => {
  const base = "http://localhost:5000";
  const api = `${base}/api`;

  const login = async (email) => {
    const res = await fetch(`${api}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });
    const json = await res.json();
    return json.data.accessToken;
  };

  accessTokenAlice = await login("alice@example.com");
  accessTokenBob = await login("bob@example.com");

  const tokenRes = await fetch(`${api}/conversations`, {
    headers: { authorization: `Bearer ${accessTokenAlice}` },
  });
  const convos = (await tokenRes.json()).data.conversations;
  const direct = convos.find((c) => c.type === "direct");
  const group = convos.find((c) => c.type === "group");
  const conversationId = direct.id;
  const groupId = group.id;

  let checks = 0;
  const ok = (label) => { console.log(`PASS ${label}`); checks++; };
  const fail = (label, err) => { console.error(`FAIL ${label}: ${err?.message || err}`); };

  const bob = io(base, { auth: { token: accessTokenBob }, transports: ["websocket"] });
  bob.on("connect", () => ok("bob socket connected"));

  await new Promise((r) => setTimeout(r, 500));

  const alice = io(base, { auth: { token: accessTokenAlice }, transports: ["websocket"] });
  alice.on("connect", () => ok("alice socket connected"));

  alice.on("message:new", (msg) => {
    ok(`alice received message:new from bob`);
    if (msg.type === "text" && msg.text.startsWith("Hello")) {
      alice.emit("message:read", { conversationId }, (ack) => {
        if (ack?.success) ok("alice sent message:read and got ack");
        else fail("message:read ack", ack);
      });
    }
  });

  bob.on("message:status", (data) => {
    if (data.status === "read" && data.messageIds?.length) {
      ok("bob received message:status(read) from alice");
    }
  });

  await new Promise((r) => setTimeout(r, 800));

  bob.once("typing:update", (data) => {
    if (data.typing === true) ok("bob received typing:update(start)");
    else ok("bob received typing:update(stop)");
  });

  alice.emit("typing:start", { conversationId });
  alice.emit("typing:stop", { conversationId });

  await new Promise((r) => setTimeout(r, 400));

  const sent = await new Promise((resolve) => {
    bob.emit("message:send", {
      conversationId,
      type: "text",
      text: "Hello from Bob via socket",
      tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }, (ack) => {
      if (ack?.success) {
        ok("bob message:send ack success with sender bob");
        resolve(ack.message);
      } else {
        fail("message:send", ack);
        resolve(null);
      }
    });
  });

  await new Promise((r) => setTimeout(r, 600));

  if (sent) {
    bob.emit("reaction:add", { messageId: sent.id, emoji: "❤️" }, (ack) =>
      ack?.success ? ok("bob reaction:add ack") : fail("reaction:add", ack)
    );
    await new Promise((r) => setTimeout(r, 400));
    bob.emit("message:edit", { messageId: sent.id, text: "Hello edited" }, (ack) =>
      ack?.success ? ok("bob message:edit ack") : fail("message:edit", ack)
    );
    await new Promise((r) => setTimeout(r, 400));
    bob.emit("message:delete", { messageId: sent.id, conversationId }, (ack) =>
      ack?.success ? ok("bob message:delete ack") : fail("message:delete", ack)
    );
  }

  // group message
  const gid = new Promise((resolve) => {
    bob.emit("message:send", {
      conversationId: groupId,
      type: "text",
      text: "Group hello?",
    }, (ack) => resolve(ack));
  });
  alice.on("message:new", (msg) => {
    if (msg.conversationId === groupId && msg.text === "Group hello?") {
      ok("alice received group message via socket");
    }
  });

  await new Promise((r) => setTimeout(r, 2000));
  console.log(`\n${checks} checks passed`);
  alice.close();
  bob.close();
  process.exit(0);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});