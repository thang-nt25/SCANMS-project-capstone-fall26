import test from "node:test";
import assert from "node:assert/strict";
import { TokenPersistence } from "../src/services/auth/token-persistence";
test("logout queued during a slow login removes the old token", async () => {
  let token: string | null = null,
    release!: () => void;
  const storage = new TokenPersistence({
    get: async () => token,
    set: async (value) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      token = value;
    },
    remove: async () => {
      token = null;
    },
  });
  const login = storage.write("old");
  await new Promise((resolve) => setImmediate(resolve));
  const logout = storage.write(null);
  release();
  await Promise.all([login, logout]);
  assert.equal(await storage.read(), null);
});
test("stale cleanup cannot erase the next account token", async () => {
  let token: string | null = null,
    generation = 2;
  const storage = new TokenPersistence({
    get: async () => token,
    set: async (value) => {
      token = value;
    },
    remove: async () => {
      token = null;
    },
  });
  await storage.write("new-account", () => generation === 2);
  await storage.write(null, () => generation === 1);
  assert.equal(await storage.read(), "new-account");
  generation++;
});
test("a failed native write does not poison subsequent logout cleanup", async () => {
  let token: string | null = "old";
  const storage = new TokenPersistence({
    get: async () => token,
    set: async () => {
      throw new Error("keystore unavailable");
    },
    remove: async () => {
      token = null;
    },
  });
  await assert.rejects(storage.write("new"));
  await storage.write(null);
  assert.equal(await storage.read(), null);
});
