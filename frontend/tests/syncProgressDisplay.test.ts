import assert from "node:assert/strict";
import test from "node:test";

import { advanceDisplayedSyncProgress } from "../src/lib/syncProgressDisplay.ts";

test("advances displayed sync progress one item at a time toward the backend target", () => {
  const target = { fetched: 5, total: 12 };

  let current = { fetched: 0, total: 12 };
  current = advanceDisplayedSyncProgress(current, target);
  assert.deepEqual(current, { fetched: 1, total: 12 });

  current = advanceDisplayedSyncProgress(current, target);
  assert.deepEqual(current, { fetched: 2, total: 12 });

  current = advanceDisplayedSyncProgress(current, target);
  assert.deepEqual(current, { fetched: 3, total: 12 });
});

test("snaps to the backend target when progress resets or total metadata changes", () => {
  assert.deepEqual(
    advanceDisplayedSyncProgress(
      { fetched: 42, total: 100 },
      { fetched: 0, total: null },
    ),
    { fetched: 0, total: null },
  );
});
