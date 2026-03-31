// @ts-nocheck
/**
 * Variant A: "Record Stacks"
 *
 * Rationale: Light theme catalog UI — mimics the dense, row-heavy aesthetic
 * of Discogs.com itself. The tool you use lives in the same visual universe
 * as the platform you're migrating. Two-column layout: narrow status sidebar
 * + wide data panel. Every pixel earns its place.
 */

import { collectionItems, destinationAccount, jobDetail, previewResult, sourceAccount } from "../fixtures";

const G = "#2d6a4f"; // discogs-ish green
const GLight = "#e8f4ee";
const BORDER = "#d0c8ba";
const BG = "#f7f2e8";
const PANEL = "#fffef9";
const TEXT = "#1a1714";
const MUTED = "#6b625a";
const AMBER = "#8a6c00";

const s: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Bricolage Grotesque', sans-serif", background: BG, color: TEXT, minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { background: PANEL, borderBottom: `1px solid ${BORDER}`, padding: "0.7rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontFamily: "'Instrument Serif', serif", fontSize: "1.25rem", fontWeight: 400, letterSpacing: "-0.01em", margin: 0 },
  headerMeta: { fontSize: "0.7rem", textTransform: "uppercase" as const, letterSpacing: "0.18em", color: MUTED, fontWeight: 700 },
  body: { display: "flex", flex: 1, gap: 0 },
  sidebar: { width: "240px", flexShrink: 0, background: PANEL, borderRight: `1px solid ${BORDER}`, padding: "1rem" },
  main: { flex: 1, overflow: "auto", padding: "1rem 1.25rem" },
  sectionTitle: { fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.2em", color: MUTED, margin: "0 0 0.5rem", paddingBottom: "0.4rem", borderBottom: `1px solid ${BORDER}` },
  accountSlot: { marginBottom: "1rem", paddingBottom: "1rem", borderBottom: `1px solid ${BORDER}` },
  accountBadge: { display: "inline-block", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.18em", padding: "0.15rem 0.45rem", borderRadius: "2px", marginBottom: "0.35rem" },
  srcBadge: { background: GLight, color: G, border: `1px solid ${G}` },
  dstBadge: { background: "#e8f0ff", color: "#3a5cc5", border: "1px solid #3a5cc5" },
  accountName: { fontSize: "0.88rem", fontWeight: 700, margin: "0 0 0.15rem" },
  accountMeta: { fontSize: "0.72rem", color: MUTED, margin: 0 },
  btnRow: { display: "flex", gap: "0.4rem", marginTop: "0.6rem" },
  btnSm: { fontSize: "0.68rem", fontWeight: 600, padding: "0.28rem 0.6rem", border: `1px solid ${BORDER}`, borderRadius: "2px", cursor: "pointer", background: "white", color: TEXT },
  btnPrimary: { fontSize: "0.68rem", fontWeight: 600, padding: "0.28rem 0.6rem", border: `1px solid ${G}`, borderRadius: "2px", cursor: "pointer", background: G, color: "white" },
  planSection: { marginBottom: "1rem", paddingBottom: "1rem", borderBottom: `1px solid ${BORDER}` },
  fieldLabel: { display: "block", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.14em", color: MUTED, marginBottom: "0.25rem" },
  input: { width: "100%", fontSize: "0.78rem", padding: "0.35rem 0.5rem", border: `1px solid ${BORDER}`, borderRadius: "2px", background: "white", color: TEXT },
  toggle: { display: "flex", border: `1px solid ${BORDER}`, borderRadius: "2px", overflow: "hidden", fontSize: "0.72rem" },
  toggleOpt: (active: boolean) => ({ flex: 1, padding: "0.3rem 0.5rem", border: "none", cursor: "pointer", fontWeight: active ? 700 : 400, background: active ? G : "white", color: active ? "white" : MUTED, textAlign: "center" as const }),
  statRow: { display: "flex", gap: 0, border: `1px solid ${BORDER}`, borderRadius: "2px", marginTop: "0.5rem" },
  stat: { flex: 1, padding: "0.5rem", borderRight: `1px solid ${BORDER}`, textAlign: "center" as const },
  statNum: { fontFamily: "'Instrument Serif', serif", fontSize: "1.4rem", fontWeight: 400, display: "block", lineHeight: 1 },
  statLabel: { fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: MUTED },
  tableWrap: { border: `1px solid ${BORDER}`, borderRadius: "2px", overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.76rem" },
  th: { padding: "0.45rem 0.7rem", borderBottom: `1px solid ${BORDER}`, textAlign: "left" as const, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: AMBER, background: "#f0ebe0", whiteSpace: "nowrap" as const },
  td: { padding: "0.42rem 0.7rem", borderBottom: `1px solid #e8e0d2`, color: TEXT, whiteSpace: "nowrap" as const },
  panelHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" },
  panelH2: { fontFamily: "'Instrument Serif', serif", fontSize: "1.1rem", fontWeight: 400, margin: 0 },
  metaRight: { fontSize: "0.72rem", color: MUTED },
  jobStatus: { display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.14em", padding: "0.2rem 0.55rem", borderRadius: "2px", background: GLight, color: G, border: `1px solid ${G}` },
  eventFeed: { border: `1px solid ${BORDER}`, borderRadius: "2px", marginTop: "0.6rem", maxHeight: "8rem", overflowY: "auto" as const },
  eventRow: (level: string) => ({ display: "flex", gap: "0.6rem", padding: "0.35rem 0.65rem", borderBottom: `1px solid #e8e0d2`, fontSize: "0.73rem", color: level === "error" ? "#c0392b" : level === "warning" ? AMBER : MUTED }),
  section: { marginBottom: "1.25rem" },
};

export function VariantA() {
  return (
    <div style={s.root}>
      <header style={s.header}>
        <div>
          <span style={s.headerMeta}>Discogs Migration · Local v0.1</span>
          <h1 style={s.headerTitle}>Collection split <em>control room</em></h1>
        </div>
        <button style={s.btnSm}>Clear local data</button>
      </header>

      <div style={s.body}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <p style={s.sectionTitle}>Accounts</p>

          <div style={s.accountSlot}>
            <span style={{ ...s.accountBadge, ...s.srcBadge }}>Source</span>
            <p style={s.accountName}>{sourceAccount.username}</p>
            <p style={s.accountMeta}>Synced Mar 30, 2026</p>
            <div style={s.btnRow}>
              <button style={s.btnPrimary}>Sync</button>
              <button style={s.btnSm}>Disconnect</button>
            </div>
          </div>

          <div style={s.accountSlot}>
            <span style={{ ...s.accountBadge, ...s.dstBadge }}>Destination</span>
            <p style={s.accountName}>{destinationAccount.username}</p>
            <p style={s.accountMeta}>Synced Mar 28, 2026</p>
            <div style={s.btnRow}>
              <button style={s.btnPrimary}>Sync</button>
              <button style={s.btnSm}>Disconnect</button>
            </div>
          </div>

          <p style={s.sectionTitle}>Planner</p>
          <div style={s.planSection}>
            <label style={s.fieldLabel}>Plan name</label>
            <input style={s.input} defaultValue="Digital archive split" />

            <label style={{ ...s.fieldLabel, marginTop: "0.5rem" }}>Workflow</label>
            <div style={s.toggle}>
              <button style={s.toggleOpt(true)}>Copy</button>
              <button style={s.toggleOpt(false)}>Move</button>
            </div>

            <label style={{ ...s.fieldLabel, marginTop: "0.5rem" }}>Text filter</label>
            <input style={s.input} placeholder="artist, title, genre…" />

            <div style={s.btnRow}>
              <button style={{ ...s.btnSm, marginTop: "0.5rem" }}>Preview</button>
              <button style={{ ...s.btnPrimary, marginTop: "0.5rem" }}>Launch job</button>
            </div>

            <div style={s.statRow}>
              <div style={s.stat}><span style={s.statNum}>{previewResult.selected_count}</span><span style={s.statLabel}>Selected</span></div>
              <div style={s.stat}><span style={s.statNum}>{previewResult.retained_count}</span><span style={s.statLabel}>Retained</span></div>
              <div style={{ ...s.stat, borderRight: "none" }}><span style={s.statNum}>{previewResult.duplicate_release_ids.length}</span><span style={s.statLabel}>Dupes</span></div>
            </div>
          </div>

          <div style={{ fontSize: "0.72rem", color: MUTED, paddingTop: "0.5rem" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: G, marginRight: "0.4rem", verticalAlign: "middle" }} />
            Backend online · 2 accounts
          </div>
        </aside>

        {/* Main area */}
        <main style={s.main}>
          {/* Two snapshot tables */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            {["Source", "Destination"].map((label) => (
              <div key={label} style={s.section}>
                <div style={s.panelHead}>
                  <h2 style={s.panelH2}>{label} collection</h2>
                  <span style={s.metaRight}>{collectionItems.length} items · {label === "Source" ? "Mar 30" : "Mar 28"}</span>
                </div>
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead>
                      <tr>{["Artist", "Title", "Year", "Folder", "Genre"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {collectionItems.slice(0, 7).map((item) => (
                        <tr key={item.id}>
                          <td style={s.td}>{item.artist}</td>
                          <td style={s.td}>{item.title}</td>
                          <td style={s.td}>{item.year}</td>
                          <td style={s.td}>{item.folder_name}</td>
                          <td style={s.td}>{item.genres[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Job console */}
          <div style={s.section}>
            <div style={s.panelHead}>
              <h2 style={s.panelH2}>Job console</h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={s.jobStatus}>● running copy</span>
                <button style={s.btnSm}>Export</button>
              </div>
            </div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1rem", marginBottom: "0.5rem", color: MUTED }}>
              {jobDetail.job.name}
              <span style={{ marginLeft: "1rem", fontSize: "0.78rem", color: TEXT }}>
                {jobDetail.job.summary.copied}/{jobDetail.job.summary.total} copied · {jobDetail.job.summary.failed} failed
              </span>
            </div>
            <div style={s.eventFeed}>
              {jobDetail.events.map((ev) => (
                <div key={ev.id} style={s.eventRow(ev.level)}>{ev.message}</div>
              ))}
            </div>
            <div style={{ ...s.tableWrap, marginTop: "0.6rem" }}>
              <table style={s.table}>
                <thead>
                  <tr>{["Release", "Instance", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {jobDetail.items.slice(0, 6).map((item) => (
                    <tr key={item.id}>
                      <td style={s.td}>{item.release_id}</td>
                      <td style={s.td}>{item.instance_id}</td>
                      <td style={{ ...s.td, color: item.status === "copied" ? G : MUTED, fontWeight: 600 }}>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
