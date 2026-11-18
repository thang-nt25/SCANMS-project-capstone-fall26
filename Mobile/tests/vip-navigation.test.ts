import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { ROLE_TABS } from "../src/navigation/role-tabs";

test("KOL VIP action opens a dedicated stack route instead of a protected hidden tab", () => {
  const router = readFileSync(new URL("../src/navigation/router.tsx", import.meta.url), "utf8");
  const route = router.match(/Deals:\s*"([^"]+)"/)?.[1];
  assert.equal(route, "/(private)/vip-deals");
  assert.ok(existsSync(new URL(`../src/app${route}.tsx`, import.meta.url)));
  assert.ok(!existsSync(new URL(`../src/app/(private)/(tabs)/${route?.split("/").at(-1)}.tsx`, import.meta.url)));
  const layout = readFileSync(new URL("../src/app/(private)/_layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /name="vip-deals"/);
  assert.ok(!ROLE_TABS.COLLABORATOR.includes("deals"));
});
