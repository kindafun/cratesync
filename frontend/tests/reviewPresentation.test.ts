import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveReviewState,
  getReviewBlockersRefreshCue,
  getReviewBlockersTitle,
  getReviewCapabilityIntro,
  getReviewCustomFieldConflictBody,
  getReviewCustomFieldConflictTitle,
  getReviewEvidenceDescription,
  getReviewFolderConflictBody,
  getReviewFolderConflictTitle,
  getReviewSummaryStaleMessage,
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
  assert.deepEqual(
    reviewState.checklist.map((item) => item.label),
    [
      "Both accounts connected",
      "Items selected",
      "Preview ready",
    ],
  );
});

test("review support copy is concise and user-oriented", () => {
  assert.deepEqual(getReviewCapabilityIntro(), {
    title: "What carries over",
    message: "Use this to confirm what will transfer before you start.",
  });
  assert.equal(getReviewBlockersTitle(1), "Resolve before launch");
  assert.equal(getReviewBlockersTitle(2), "Resolve before launch (2)");
  assert.equal(
    getReviewBlockersRefreshCue(),
    "After updating any blocker, refresh preview to confirm these issues are cleared.",
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

test("stale preview summary copy explains count mismatches directly", () => {
  assert.equal(
    getReviewSummaryStaleMessage({
      selectedSourceCount: 872,
      previewSelectedCount: 861,
    }),
    "Preview is out of date. Last preview included 861 releases; 872 are now selected. Refresh preview.",
  );
});

test("stale preview summary copy stays accurate when counts match", () => {
  assert.equal(
    getReviewSummaryStaleMessage({
      selectedSourceCount: 861,
      previewSelectedCount: 861,
    }),
    "Preview is out of date. Filters or mappings changed since the last preview. Refresh preview.",
  );
});

test("blocker card copy turns raw identifiers into explicit tasks", () => {
  assert.equal(
    getReviewCustomFieldConflictTitle("field_1"),
    'Map source field "field_1"',
  );
  assert.equal(
    getReviewCustomFieldConflictBody("field_1"),
    'This source field is not mapped in the destination yet. Enter the destination field name for "field_1", or keep the same name on both sides.',
  );
  assert.equal(
    getReviewFolderConflictTitle("Wishlist"),
    'Choose destination folder for "Wishlist"',
  );
  assert.equal(
    getReviewFolderConflictBody("Wishlist"),
    'The destination account has more than one folder named "Wishlist". Choose the folder this source folder should map to.',
  );
});
