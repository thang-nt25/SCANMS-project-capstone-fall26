import test from "node:test";
import assert from "node:assert/strict";
import { kolOverviewRange } from "../src/features/workspace/kol-overview";

test("KOL metrics use Vietnam calendar days including today, matching the web", () => {
  const now = new Date("2026-11-04T18:00:00.000Z");
  const week = kolOverviewRange(7, now);
  assert.equal(week.startDate, "2026-10-29T17:00:00.000Z");
  assert.equal(week.endDate, now.toISOString());
  assert.equal(week.range, "custom");
  assert.equal(week.days, "7");
  assert.equal(kolOverviewRange(30, now).startDate, "2026-10-06T17:00:00.000Z");
  assert.notEqual(week.startDate, kolOverviewRange(90, now).startDate);
});
test("invalid KOL periods cannot silently request another date range", () => {
  for (const days of [0, -1, 1.5, 367, NaN]) assert.throws(() => kolOverviewRange(days));
  assert.throws(() => kolOverviewRange(7, new Date("invalid")));
});
