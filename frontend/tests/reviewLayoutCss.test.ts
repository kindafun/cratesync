import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/styles/features/review.css", import.meta.url),
  "utf8",
);

test("review head grid explicitly stretches the summary and capabilities panels", () => {
  assert.match(css, /\.review-head-grid\s*\{[\s\S]*align-items:\s*stretch;/);
  assert.match(
    css,
    /\.review-head-grid\s*>\s*\.review-summary,\s*[\r\n]+\s*\.review-head-grid\s*>\s*\.review-capabilities\s*\{[\s\S]*height:\s*100%;/,
  );
  assert.match(
    css,
    /\.review-head-grid\s*>\s*\.review-summary,\s*[\r\n]+\s*\.review-head-grid\s*>\s*\.review-capabilities\s*\{[\s\S]*margin-bottom:\s*0;/,
  );
});

test("review summary strip and conflict cards add local hierarchy without generic cards", () => {
  assert.match(
    css,
    /\.review-summary-strip\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/,
  );
  assert.match(
    css,
    /\.review-summary-stale\s*\{[\s\S]*border-top:\s*var\(--border-grid\);/,
  );
  assert.match(
    css,
    /\.conflict-card-type\s*\{[\s\S]*text-transform:\s*uppercase;/,
  );
});
