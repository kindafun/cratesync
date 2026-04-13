import { useState, type KeyboardEvent } from "react";
import {
  formatDate,
  formatDateTime,
  formatJobItemStatus,
  formatJobNextAction,
  formatJobPhase,
  formatJobSummaryLabel,
  statusTone,
} from "../lib/format";
import type { JobDetailResponse, MigrationJob } from "../lib/types";
import { StatBlock } from "./ui";

export function JobConsoleSection({
  recentJobs,
  selectedJobId,
  onSelectJob,
  jobDetail,
  onConfirmDelete,
  onRollback,
  onExport,
}: {
  recentJobs: MigrationJob[];
  selectedJobId: string | null;
  onSelectJob(jobId: string): void;
  jobDetail: JobDetailResponse | null;
  onConfirmDelete(jobId: string): void;
  onRollback(jobId: string): void;
  onExport(jobId: string): void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  function handleToggle() {
    setCollapsed((c) => !c);
  }

  function handleHeaderKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  }

  const phaseLabel = jobDetail ? formatJobPhase(jobDetail.job.status) : null;
  const nextAction = jobDetail ? formatJobNextAction(jobDetail.job.status) : null;
  const consoleHeaderNote = jobDetail
    ? `${recentJobs.length} recent job${recentJobs.length === 1 ? "" : "s"}`
    : "Choose a job to inspect the audit record.";

  return (
    <section className={`canvas-section${collapsed ? " is-collapsed" : ""}`}>
      <div className="canvas-header canvas-header-shell">
        <button
          type="button"
          className="canvas-header-toggle"
          aria-expanded={!collapsed}
          onClick={handleToggle}
          onKeyDown={handleHeaderKeyDown}
        >
          <span
            className={`section-collapse-icon${collapsed ? " collapsed" : ""}`}
            aria-hidden="true"
          />
          <div className="canvas-header-title">
            <div className="section-label">Execution</div>
            <h2>Job console</h2>
          </div>
        </button>
        <div className="canvas-header-controls job-console-header-note">
          <div className="header-note">{consoleHeaderNote}</div>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="history-strip">
            {recentJobs.length === 0 && (
              <span className="text-muted text-meta">No jobs created yet.</span>
            )}
            {recentJobs.map((job) => (
              <button
                key={job.id}
                className={`history-pill${selectedJobId === job.id ? " active" : ""}`}
                onClick={() => onSelectJob(job.id)}
              >
                <span>{job.name}</span>
                <span>{formatDateTime(job.created_at)}</span>
              </button>
            ))}
          </div>

          {!jobDetail && (
            <div className="empty-block">
              Launch a migration or choose a recent job to inspect its phase,
              results, and exported audit reports.
            </div>
          )}

          {jobDetail && (
            <>
              <section className="job-phase-summary">
                <div className="job-phase-head">
                  <div>
                    <div className="section-label">Audit phase</div>
                    <div className="job-name-row">
                      <div className="job-name">{jobDetail.job.name}</div>
                      <span
                        className={`job-phase-pill status-${statusTone(jobDetail.job.status)}`}
                      >
                        {phaseLabel}
                      </span>
                    </div>
                    <div className="job-meta">
                      {jobDetail.job.workflow_mode} workflow · created{" "}
                      {formatDateTime(jobDetail.job.created_at)}
                      {jobDetail.job.started_at &&
                        ` · started ${formatDateTime(jobDetail.job.started_at)}`}
                      {jobDetail.job.finished_at &&
                        ` · finished ${formatDateTime(jobDetail.job.finished_at)}`}
                    </div>
                  </div>
                  <div className="job-phase-next-action">
                    <div className="section-label">Next step</div>
                    <p>{nextAction}</p>
                  </div>
                </div>
                <div className="toolbar-actions">
                  {jobDetail.job.status === "awaiting_delete_confirmation" && (
                    <>
                      <button
                        className="btn btn-ghost"
                        onClick={() => onRollback(jobDetail.job.id)}
                      >
                        Roll back adds
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => onConfirmDelete(jobDetail.job.id)}
                      >
                        Confirm delete
                      </button>
                    </>
                  )}
                  <button
                    className="btn btn-ghost"
                    onClick={() => onExport(jobDetail.job.id)}
                  >
                    Export reports
                  </button>
                </div>
              </section>

              <div className="summary-strip">
                {Object.entries(jobDetail.job.summary).map(([key, value]) => (
                  <StatBlock
                    key={key}
                    label={formatJobSummaryLabel(key)}
                    value={value}
                    small
                  />
                ))}
              </div>

              <div className="table-wrap">
                <table className="data-table job-audit-table">
                  <thead>
                    <tr>
                      <th>Release</th>
                      <th>Source folder</th>
                      <th>Outcome</th>
                      <th>Destination</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobDetail.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="job-release-cell">
                            <strong>
                              {item.artist} — {item.title}
                            </strong>
                            <span className="job-row-meta">
                              {item.year ?? "Year unknown"} · release {item.release_id}
                              · instance {item.instance_id}
                            </span>
                            {item.date_added && (
                              <span className="job-row-meta">
                                Source added {formatDate(item.date_added)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{item.source_folder_name ?? `Folder ${item.source_folder_id}`}</td>
                        <td>
                          <div className="job-outcome-cell">
                            <span
                              className={`state-pill status-${statusTone(item.status)}`}
                            >
                              {formatJobItemStatus(item.status)}
                            </span>
                            {item.attempt_count > 1 && (
                              <span className="job-row-meta">
                                {item.attempt_count} attempts
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {item.destination_folder_id != null
                            ? `Folder ${item.destination_folder_id}`
                            : "—"}
                        </td>
                        <td>
                          {item.message ? (
                            <div className="job-note-cell">{item.message}</div>
                          ) : item.destination_instance_id ? (
                            <div className="job-note-cell">
                              Destination instance {item.destination_instance_id}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
