import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/styles/features/review.css", import.meta.url),
  "utf8",
);

test("review summary layout restores a top-aligned side-by-side ready state", () => {
  assert.match(
    css,
    /\.review-head-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.45fr\)\s*minmax\(18rem,\s*0\.95fr\);[\s\S]*align-items:\s*start;/,
  );
  assert.match(css, /\.review-summary\s*\{[\s\S]*align-content:\s*start;/);
  assert.match(css, /\.review-checklist\s*\{[\s\S]*align-items:\s*flex-start;/);
});

test("review summary strip and conflict cards add local hierarchy without generic cards", () => {
  assert.match(
    css,
    /\.review-summary-actions\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
  );
  assert.match(
    css,
    /\.review-summary-strip\s*\{[\s\S]*padding-top:\s*var\(--space-xs\);[\s\S]*border-top:\s*var\(--border-grid\);[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
  );
  assert.match(
    css,
    /\.review-summary-stale\s*\{[\s\S]*margin:\s*0;/,
  );
  assert.match(
    css,
    /\.review-capability-card\s*\{[\s\S]*padding-top:\s*var\(--space-xs\);[\s\S]*border-top:\s*var\(--border-grid\);/,
  );
  assert.match(
    css,
    /\.conflict-card-type\s*\{[\s\S]*text-transform:\s*uppercase;/,
  );
});
