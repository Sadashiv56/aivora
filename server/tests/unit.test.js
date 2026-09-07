import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { ApiError } from "../src/utils/ApiError.js";
import {
  registerSchema,
  loginSchema,
  createGroupSchema,
  messageCreateSchema,
} from "../src/utils/schemas.js";

test("ApiError has expected shape and helpers", () => {
  const e = ApiError.badRequest("nope", "VALIDATION_ERROR", [{ field: "x", message: "y" }]);
  assert.equal(e.statusCode, 400);
  assert.equal(e.code, "VALIDATION_ERROR");
  assert.equal(e.isOperational, true);
  assert.equal(ApiError.unauthorized().statusCode, 401);
  assert.equal(ApiError.forbidden().statusCode, 403);
  assert.equal(ApiError.notFound().statusCode, 404);
  assert.equal(ApiError.conflict().statusCode, 409);
});

test("register schema accepts valid input and coerces nothing", () => {
  const r = registerSchema.safeParse({
    name: "Ada",
    username: "ada",
    email: "ada@example.com",
    password: "supersecret",
  });
  assert.equal(r.success, true);
});

test("register schema rejects short password and bad email", () => {
  const r = registerSchema.safeParse({
    name: "Ada",
    username: "ada",
    email: "not-an-email",
    password: "123",
  });
  assert.equal(r.success, false);
  const fields = r.error.issues.map((i) => i.path[0]);
  assert.ok(fields.includes("email"));
  assert.ok(fields.includes("password"));
});

test("login schema requires both fields", () => {
  const r = loginSchema.safeParse({ email: "ada@example.com" });
  assert.equal(r.success, false);
});

test("create group schema builds default empty members", () => {
  const r = createGroupSchema.safeParse({ name: "Team" });
  assert.equal(r.success, true);
  assert.deepEqual(r.data.memberIds, []);
});

test("message schema accepts replyTo null and text cap", () => {
  const r = messageCreateSchema.safeParse({
    conversationId: new mongoose.Types.ObjectId().toString(),
    type: "text",
    text: "hello",
    replyToMessageId: null,
  });
  assert.equal(r.success, true);
  assert.equal(r.data.replyToMessageId, null);
});

test("message schema rejects overlong text", () => {
  const r = messageCreateSchema.safeParse({
    conversationId: new mongoose.Types.ObjectId().toString(),
    text: "x".repeat(10001),
  });
  assert.equal(r.success, false);
});