import { useState } from "react";

import type { ConnectedAccount, PreviewResponse } from "../lib/types";

interface PlannerPanelProps {
  accounts: ConnectedAccount[];
  onPreview(payload: Record<string, unknown>): Promise<void>;
  onCreateJob(payload: Record<string, unknown>): Promise<void>;
  preview: PreviewResponse | null;
}

export function PlannerPanel({ accounts, onPreview, onCreateJob, preview }: PlannerPanelProps) {
  const [planName, setPlanName] = useState("Digital archive split");
  const [workflowMode, setWorkflowMode] = useState<"copy" | "move">("copy");
  const [dateTo, setDateTo] = useState("");
  const [textQuery, setTextQuery] = useState("");

  const source = accounts.find((account) => account.role === "source");
  const destination = accounts.find((account) => account.role === "destination");

  const payload = {
    source_account_id: source?.id,
    destination_account_id: destination?.id,
    snapshot_id: "",
    workflow_mode: workflowMode,
    name: planName,
    filters: {
      date_to: dateTo || null,
      text_query: textQuery || null,
      manual_include_snapshot_item_ids: [],
      manual_exclude_snapshot_item_ids: [],
    },
    folder_mapping_overrides: {},
    custom_field_mapping_overrides: {},
  };

  return (
    <section className="panel panel-full">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Planner</p>
          <h2>Migration composer</h2>
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={() => void onPreview(payload)}>
            Preview plan
          </button>
          <button className="btn btn-primary" onClick={() => void onCreateJob(payload)}>
            Launch job
          </button>
        </div>
      </div>

      <div className="planner-fields">
        <div className="field">
          <label className="field-label" htmlFor="plan-name">Plan name</label>
          <input
            id="plan-name"
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="field-label" id="workflow-mode-label">Workflow mode</span>
          <div className="toggle-group" role="radiogroup" aria-labelledby="workflow-mode-label">
            <button
              className={`toggle-option${workflowMode === "copy" ? " active" : ""}`}
              role="radio"
              aria-checked={workflowMode === "copy"}
              onClick={() => setWorkflowMode("copy")}
            >
              Copy only
            </button>
            <button
              className={`toggle-option${workflowMode === "move" ? " active" : ""}`}
              role="radio"
              aria-checked={workflowMode === "move"}
              onClick={() => setWorkflowMode("move")}
            >
              Two-phase move
            </button>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="date-to">Added on or before</label>
          <input
            id="date-to"
            type="datetime-local"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="text-query">Text filter</label>
          <input
            id="text-query"
            type="text"
            placeholder="artist, title, label, genre"
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
          />
        </div>
      </div>

      {preview && (
        <>
          <div className="preview-stats">
            <div className="preview-stat">
              <div className="preview-stat-value">{preview.selected_count}</div>
              <div className="preview-stat-label">Selected</div>
            </div>
            <div className="preview-stat">
              <div className="preview-stat-value">{preview.retained_count}</div>
              <div className="preview-stat-label">Retained</div>
            </div>
            <div className="preview-stat">
              <div className="preview-stat-value">{preview.duplicate_release_ids.length}</div>
              <div className="preview-stat-label">Duplicates skipped</div>
            </div>
          </div>

          {(preview.warnings.length > 0 || preview.blocking_conflicts.length > 0) && (
            <div className="message-list">
              {preview.warnings.map((w) => (
                <div key={w.code} className="message message-warning">{w.message}</div>
              ))}
              {preview.blocking_conflicts.map((c, i) => (
                <div key={`${c.type}-${i}`} className="message message-error">{c.message}</div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
