import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveReviewState,
  getReviewBlockersMessage,
  getReviewCapabilityIntro,
  getReviewEvidenceDescription,
} from "../src/lib/reviewPresentation.ts";

test("deriveReviewState keeps ready-state copy short and operational", () => {
  const reviewState = deriveReviewState({
    preview: {
      snapshot_id: "snap_1",
      selected_count: 10,
      retained_count: 20,
      duplicate_release_ids: [],
      selected_items: [],
      warnings: [],
      blocking_conflicts: [],
      metadata_capabilities: {},
    },
    previewIsStale: false,
    selectedSourceCount: 10,
    sourceAccount: {
      id: "src_1",
      username: "source",
      role: "source",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    destinationAccount: {
      id: "dst_1",
      username: "destination",
      role: "destination",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    sourceSnapshot: {
      id: "snap_1",
      account_id: "src_1",
      username: "source",
      created_at: "2026-01-01T00:00:00Z",
      total_items: 50,
      stale_after: "2026-01-02T00:00:00Z",
    },
  });

  assert.equal(reviewState.title, "Ready to launch");
  assert.equal(
    reviewState.message,
    "Your preview is current and blockers are cleared.",
  );
});

test("review support copy is concise and user-oriented", () => {
  assert.deepEqual(getReviewCapabilityIntro(), {
    title: "What carries over",
    message: "Use this to confirm what will transfer before you start.",
  });
  assert.equal(
    getReviewBlockersMessage(),
    "These need a decision before the migration can start.",
  );
  assert.equal(
    getReviewEvidenceDescription("selected"),
    "Spot-check the rows included in this preview.",
  );
  assert.equal(
    getReviewEvidenceDescription("all"),
    "Compare the preview against the wider filtered source rows.",
  );
});
