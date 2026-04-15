import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/ReviewSection.tsx", import.meta.url),
  "utf8",
);

test("review section source drops redundant readiness labels and grouped-conflict note", () => {
  assert.doesNotMatch(source, />Launch readiness</);
  assert.doesNotMatch(source, /Before launch/);
  assert.doesNotMatch(source, /Checks complete/);
  assert.doesNotMatch(source, /Some conflicts are grouped into the same action card\./);
});

test("review section source restores the ready-state side-by-side layout", () => {
  assert.match(source, /review-head-grid/);
  assert.doesNotMatch(source, /review-summary-capabilities/);
});
