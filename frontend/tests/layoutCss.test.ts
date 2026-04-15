import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/styles/layout.css", import.meta.url),
  "utf8",
);

test("shell content uses a centered max width instead of spanning the full viewport", () => {
  assert.match(
    css,
    /\.shell-content\s*\{[\s\S]*max-width:\s*96rem;[\s\S]*margin:\s*0\s+auto;/,
  );
});
