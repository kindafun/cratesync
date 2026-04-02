import { formatDateTime, formatJobStatus, statusTone } from "../lib/format";
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
  return (
    <section className="canvas-section">
      <div className="canvas-header">
        <div>
          <div className="section-label">Execution</div>
          <h2>Job console</h2>
        </div>
        <div className="header-note">
          {jobDetail ? formatJobStatus(jobDetail.job.status) : "Choose a recent job to inspect."}
        </div>
      </div>

      <div className="history-strip">
        {recentJobs.length === 0 && <span className="text-muted text-meta">No jobs created yet.</span>}
        {recentJobs.map((job) => (
          <button
            key={job.id}
            className={`history-pill${selectedJobId === job.id ? " active" : ""}`}
            onClick={() => onSelectJob(job.id)}
          >
            <span>{job.name}</span>
            <span>{formatJobStatus(job.status)}</span>
          </button>
        ))}
      </div>

      {!jobDetail && (
        <div className="empty-block">
          Launch a job or select a recent one to inspect events, item outcomes, and exports.
        </div>
      )}

      {jobDetail && (
        <>
          <div className="job-toolbar">
            <div>
              <div className="job-name">{jobDetail.job.name}</div>
              <div className="job-meta">
                {jobDetail.job.workflow_mode} workflow · created {formatDateTime(jobDetail.job.created_at)}
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
              <button className="btn btn-ghost" onClick={() => onExport(jobDetail.job.id)}>
                Export reports
              </button>
            </div>
          </div>

          <div className="summary-strip">
            {Object.entries(jobDetail.job.summary).map(([key, value]) => (
              <StatBlock key={key} label={key.replace(/_/g, " ")} value={value} small />
            ))}
          </div>

          <div className="event-feed">
            {jobDetail.events.length === 0 && (
              <div className="empty-block compact">No job events recorded yet.</div>
            )}
            {jobDetail.events.map((event) => (
              <div key={event.id} className={`event event-${event.level}`}>
                <div className="event-stripe" />
                <div className="event-body">
                  <strong>{formatDateTime(event.created_at)}</strong>
                  <span>{event.message}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Release</th>
                  <th>Instance</th>
                  <th>Status</th>
                  <th>Destination</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {jobDetail.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.release_id}</td>
                    <td>{item.instance_id}</td>
                    <td>
                      <span className={`state-pill status-${statusTone(item.status)}`}>
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{item.destination_folder_id ?? "—"}</td>
                    <td>{item.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
