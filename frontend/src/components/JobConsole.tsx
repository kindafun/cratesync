import type { JobDetailResponse } from "../lib/types";

interface JobConsoleProps {
  detail: JobDetailResponse | null;
  onConfirmDelete(jobId: string): void;
  onRollback(jobId: string): void;
  onExport(jobId: string): void;
}

function getStatusClass(status: string): string {
  if (status.startsWith("running")) return "status-running";
  if (status === "awaiting_delete_confirmation") return "status-waiting";
  if (status === "done" || status === "copy_done") return "status-done";
  if (status.includes("fail") || status.includes("error")) return "status-error";
  return "status-default";
}

export function JobConsole({ detail, onConfirmDelete, onRollback, onExport }: JobConsoleProps) {
  return (
    <section className="panel panel-full">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Execution</p>
          <h2>Job console</h2>
        </div>
        {detail && (
          <div className="btn-row">
            {detail.job.status === "awaiting_delete_confirmation" && (
              <>
                <button className="btn btn-ghost" onClick={() => onRollback(detail.job.id)}>
                  Roll back adds
                </button>
                <button className="btn btn-danger" onClick={() => onConfirmDelete(detail.job.id)}>
                  Confirm delete
                </button>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => onExport(detail.job.id)}>
              Export reports
            </button>
          </div>
        )}
      </div>

      {!detail && (
        <p className="console-empty">
          Launch a job to inspect live progress and audit events.
        </p>
      )}

      {detail && (
        <>
          <div className="job-header">
            <span className="job-name">{detail.job.name}</span>
            <span className={`job-status-badge ${getStatusClass(detail.job.status)}`}>
              {detail.job.status.replace(/_/g, " ")}
            </span>
          </div>

          {Object.keys(detail.job.summary).length > 0 && (
            <div className="job-summary-row">
              {Object.entries(detail.job.summary).map(([key, value]) => (
                <div key={key} className="job-summary-stat">
                  <strong>{value}</strong>
                  <span>{key.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          )}

          {detail.events.length > 0 && (
            <div className="event-feed">
              {detail.events.map((event) => (
                <div key={event.id} className={`event event-${event.level}`}>
                  <div className="event-stripe" />
                  <div className="event-body">{event.message}</div>
                </div>
              ))}
            </div>
          )}

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Release</th>
                  <th>Instance</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.slice(0, 24).map((item) => (
                  <tr key={item.id}>
                    <td>{item.release_id}</td>
                    <td>{item.instance_id}</td>
                    <td>{item.status}</td>
                    <td>{item.message ?? "—"}</td>
                  </tr>
                ))}
                {detail.items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--faint)", textAlign: "center", padding: "1.5rem" }}>
                      No items processed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
