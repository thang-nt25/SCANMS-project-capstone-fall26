import test from "node:test";
import assert from "node:assert/strict";
import { mapNamePredicateScript, vietnameseMapLabel } from "../src/features/addresses/map-language";
import { runInNewContext } from "node:vm";
const isPlaceNameLabel = runInNewContext(`(${mapNamePredicateScript})`) as (field: unknown) => boolean;

test("map changes place names while preserving highway references and house numbers", () => {
  assert.ok(isPlaceNameLabel(["coalesce", ["get", "name_en"], ["get", "name"]]));
  assert.ok(isPlaceNameLabel("{name:latin}"));
  assert.ok(!isPlaceNameLabel(["to-string", ["get", "ref"]]));
  assert.ok(!isPlaceNameLabel(["get", "housenumber"]));
});
test("Vietnamese names take priority over local names and skip empty translations", () => {
  const expression = vietnameseMapLabel();
  const evaluate = (node: unknown, properties: Record<string, string>): unknown => {
    if (!Array.isArray(node)) return node;
    const [op, ...args] = node;
    if (op === "format") return evaluate(args[0], properties);
    if (op === "get") return properties[String(args[0])] ?? null;
    if (op === "to-string") return String(evaluate(args[0], properties) ?? "");
    if (op === "!=") return evaluate(args[0], properties) !== evaluate(args[1], properties);
    if (op === "case") return evaluate(evaluate(args[0], properties) ? args[1] : args[2], properties);
    throw new Error(`Unsupported operator ${op}`);
  };
  assert.equal(expression[0], "format");
  assert.equal(evaluate(expression, { "name:vi": "Việt Nam", name: "Vietnam" }), "Việt Nam");
  assert.equal(evaluate(expression, { "name:vi": "", name_vi: "Hà Nội", name: "Hanoi" }), "Hà Nội");
  assert.equal(evaluate(expression, { name: "Đường số 1" }), "Đường số 1");
  assert.equal(evaluate(expression, {}), "");
  assert.ok(!JSON.stringify(expression).includes("null"));
});
