import assert from "node:assert/strict";
import test from "node:test";
import { channelUrlExamples, evaluationDate } from "../src/features/account/social-presentation";

test("missing or invalid evaluation date is shown in Vietnamese", () => {
  for (const value of [undefined, null, "", "not-a-date"]) {
    assert.equal(evaluationDate(value), "Chưa có lịch xét");
  }
});
test("tier evaluation date uses Vietnam timezone across month boundary", () => {
  const display = evaluationDate("2026-11-30T17:15:00.000Z");
  assert.match(display, /00:15/);
  assert.match(display, /01\/12\/2026/);
});
test("each supported platform has its own HTTPS channel example", () => {
  assert.equal(Object.keys(channelUrlExamples).length, 7);
  assert.equal(new Set(Object.values(channelUrlExamples)).size, 7);
  for (const url of Object.values(channelUrlExamples)) assert.equal(new URL(url).protocol, "https:");
  assert.match(channelUrlExamples.FACEBOOK, /facebook\.com/);
});
