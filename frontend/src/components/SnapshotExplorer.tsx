import type { CollectionItemSnapshot, CollectionSnapshot } from "../lib/types";

interface SnapshotExplorerProps {
  title: string;
  snapshot?: CollectionSnapshot | null;
  items: CollectionItemSnapshot[];
}

export function SnapshotExplorer({ title, snapshot, items }: SnapshotExplorerProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Snapshot</p>
          <h2>{title}</h2>
        </div>
        <div className="snapshot-meta">
          <strong>{snapshot?.total_items ?? 0}</strong>
          {snapshot
            ? `Synced ${new Date(snapshot.created_at).toLocaleString()}`
            : "No local snapshot"}
        </div>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Artist</th>
              <th>Title</th>
              <th>Folder</th>
              <th>Genres</th>
              <th>Labels</th>
              <th>Date added</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 18).map((item) => (
              <tr key={item.id}>
                <td>{item.artist}</td>
                <td>{item.title}</td>
                <td>{item.folder_name ?? item.folder_id}</td>
                <td>{item.genres.join(", ") || "—"}</td>
                <td>{item.labels.join(", ") || "—"}</td>
                <td>{item.date_added ? new Date(item.date_added).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--faint)", textAlign: "center", padding: "2rem" }}>
                  No snapshot data — sync this account to populate.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
