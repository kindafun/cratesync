// @ts-nocheck
/**
 * Variant D: "Liner Notes"
 *
 * Rationale: Typography is the hero. Radically asymmetric — section headings
 * at 5-6rem in Instrument Serif with minimal supporting chrome. Reads like
 * album credits or an art catalog. Maximum contrast between display text and
 * dense data rows. The connected account names are celebrated like artist credits.
 * Dark with warm cream type on near-black.
 */

import { collectionItems, destinationAccount, jobDetail, previewResult, sourceAccount } from "../fixtures";

const BG   = "#0c0b09";
const RULE = "#282420";
const INK  = "#f0ead8";
const MUTED= "#6a6258";
const AMBER= "#d4a050";
const GREEN= "#5ab87a";
const RED  = "#c44832";

const s: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Bricolage Grotesque', sans-serif", background: BG, color: INK, minHeight: "100vh" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "1.5rem 2rem 0.75rem", borderBottom: `1px solid ${RULE}` },
  topEye: { fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase" as const, color: AMBER },
  topActions: { display: "flex", gap: "0.75rem", alignItems: "center" },
  statusPip: { fontSize: "0.68rem", color: MUTED, display: "flex", alignItems: "center", gap: "0.35rem" },
  dot: { width: 5, height: 5, borderRadius: "50%", background: GREEN, display: "inline-block" },
  ghostBtn: { fontSize: "0.72rem", background: "none", border: `1px solid ${RULE}`, color: MUTED, padding: "0.28rem 0.7rem", borderRadius: "3px", cursor: "pointer" },
  primaryBtn: { fontSize: "0.72rem", background: AMBER, border: `1px solid ${AMBER}`, color: "#1a1200", fontWeight: 700, padding: "0.28rem 0.7rem", borderRadius: "3px", cursor: "pointer" },

  // Main two-col layout
  layout: { display: "grid", gridTemplateColumns: "1fr 2.5fr", minHeight: "calc(100vh - 3.5rem)" },
  leftCol: { borderRight: `1px solid ${RULE}`, padding: "2rem" },
  rightCol: { padding: "2rem 2rem 2rem 2.5rem" },

  // Big display text
  displayHeading: { fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2.5rem, 5vw, 5rem)", fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.03em", margin: "0 0 1.5rem", color: INK },
  displaySub: { fontFamily: "'Instrument Serif', serif", fontStyle: "italic", color: AMBER },

  // Account credits style
  creditBlock: { marginBottom: "2rem" },
  creditLabel: { fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase" as const, color: AMBER, marginBottom: "0.5rem", display: "block" },
  creditName: { fontFamily: "'Instrument Serif', serif", fontSize: "1.6rem", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.1, color: INK, marginBottom: "0.2rem" },
  creditMeta: { fontSize: "0.72rem", color: MUTED },

  // Form section
  formSection: { borderTop: `1px solid ${RULE}`, paddingTop: "1.5rem", marginTop: "1.5rem" },
  formHead: { fontFamily: "'Instrument Serif', serif", fontSize: "1.2rem", fontWeight: 400, letterSpacing: "-0.01em", marginBottom: "1rem", color: INK },
  fieldRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" },
  fieldLabel: { fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: MUTED, display: "block", marginBottom: "0.25rem" },
  input: { width: "100%", background: "#14120f", border: `1px solid ${RULE}`, borderRadius: "3px", color: INK, padding: "0.5rem 0.65rem", fontSize: "0.82rem" },
  tog: { display: "flex", border: `1px solid ${RULE}`, borderRadius: "3px", overflow: "hidden" },
  togOpt: (active: boolean): React.CSSProperties => ({ flex: 1, padding: "0.45rem", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: active ? 700 : 400, background: active ? "rgba(212, 160, 80, 0.14)" : "transparent", color: active ? AMBER : MUTED, textAlign: "center" }),
  actionRow: { display: "flex", gap: "0.6rem", marginTop: "0.75rem" },

  // Stats as inline data
  statsLine: { display: "flex", gap: "2rem", borderTop: `1px solid ${RULE}`, paddingTop: "1rem", marginTop: "1rem" },
  statItem: {},
  statNum: { fontFamily: "'Instrument Serif', serif", fontSize: "2rem", fontWeight: 400, lineHeight: 1, color: INK, display: "block" },
  statLabel: { fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: MUTED },

  // Right col sections
  sectionHead: { fontFamily: "'Instrument Serif', serif", fontSize: "1.5rem", fontWeight: 400, letterSpacing: "-0.015em", marginBottom: "0.75rem", color: INK, borderBottom: `1px solid ${RULE}`, paddingBottom: "0.5rem" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.76rem" },
  th: { padding: "0.4rem 0.65rem", borderBottom: `1px solid ${RULE}`, textAlign: "left" as const, fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: AMBER, whiteSpace: "nowrap" as const },
  td: { padding: "0.38rem 0.65rem", borderBottom: `1px solid rgba(40,36,32,0.7)`, color: INK, whiteSpace: "nowrap" as const },

  // Job section
  jobSection: { marginTop: "2rem", paddingTop: "1.5rem", borderTop: `1px solid ${RULE}` },
  jobName: { fontFamily: "'Instrument Serif', serif", fontSize: "1.2rem", fontWeight: 400, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" },
  jobBadge: { fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, padding: "0.18rem 0.5rem", background: "rgba(212, 160, 80, 0.12)", color: AMBER, border: `1px solid ${AMBER}`, borderRadius: "2px" },
  evFeed: { maxHeight: "8rem", overflowY: "auto" as const, border: `1px solid ${RULE}`, borderRadius: "3px", marginBottom: "0.75rem" },
  evRow: (lv: string): React.CSSProperties => ({ display: "grid", gridTemplateColumns: "3px 1fr", fontSize: "0.73rem", borderBottom: `1px solid rgba(40,36,32,0.5)` }),
  evStripe: (lv: string): React.CSSProperties => ({ background: lv === "info" ? `${GREEN}55` : lv === "warning" ? `${AMBER}55` : `${RED}55` }),
  evBody: (lv: string): React.CSSProperties => ({ padding: "0.35rem 0.6rem", color: lv === "info" ? MUTED : lv === "warning" ? AMBER : RED }),
};

export function VariantD() {
  return (
    <div style={s.root}>
      <div style={s.topBar}>
        <span style={s.topEye}>Discogs Migration · Local v0.1</span>
        <div style={s.topActions}>
          <span style={s.statusPip}><span style={s.dot} /> Backend online</span>
          <button style={s.ghostBtn}>Clear data</button>
        </div>
      </div>

      <div style={s.layout}>
        {/* Left column: big heading + account credits + planner */}
        <div style={s.leftCol}>
          <h1 style={s.displayHeading}>
            Collection split<br />
            <span style={s.displaySub}>control room</span>
          </h1>

          {/* Account credits */}
          <div style={s.creditBlock}>
            <span style={s.creditLabel}>Source account</span>
            <div style={s.creditName}>{sourceAccount.username}</div>
            <div style={s.creditMeta}>Synced 30 Mar 2026 · {collectionItems.length} items</div>
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
              <button style={s.primaryBtn}>Sync</button>
              <button style={s.ghostBtn}>Disconnect</button>
            </div>
          </div>

          <div style={s.creditBlock}>
            <span style={s.creditLabel}>Destination account</span>
            <div style={s.creditName}>{destinationAccount.username}</div>
            <div style={s.creditMeta}>Synced 28 Mar 2026 · 4 items</div>
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
              <button style={s.primaryBtn}>Sync</button>
              <button style={s.ghostBtn}>Disconnect</button>
            </div>
          </div>

          {/* Planner */}
          <div style={s.formSection}>
            <h3 style={s.formHead}>Migration composer</h3>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={s.fieldLabel}>Plan name</label>
              <input style={s.input} defaultValue="Digital archive split" />
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <span style={s.fieldLabel}>Workflow mode</span>
              <div style={s.tog}>
                <button style={s.togOpt(true)}>Copy only</button>
                <button style={s.togOpt(false)}>Two-phase move</button>
              </div>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={s.fieldLabel}>Text filter</label>
              <input style={s.input} placeholder="artist, title, label, genre" />
            </div>

            <div style={s.actionRow}>
              <button style={s.ghostBtn}>Preview plan</button>
              <button style={{ ...s.primaryBtn, flex: 1, textAlign: "center" as const }}>Launch job</button>
            </div>

            <div style={s.statsLine}>
              <div style={s.statItem}><span style={s.statNum}>{previewResult.selected_count}</span><span style={s.statLabel}>Selected</span></div>
              <div style={s.statItem}><span style={s.statNum}>{previewResult.retained_count}</span><span style={s.statLabel}>Retained</span></div>
              <div style={s.statItem}><span style={{ ...s.statNum, color: MUTED }}>{previewResult.duplicate_release_ids.length}</span><span style={s.statLabel}>Dupes</span></div>
            </div>
          </div>
        </div>

        {/* Right column: Data tables + job console */}
        <div style={s.rightCol}>
          {/* Snapshots */}
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={s.sectionHead}>Source — {sourceAccount.username}</h2>
            <table style={s.table}>
              <thead><tr>{["Artist", "Title", "Year", "Folder", "Genre", "Label", "Added"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>{collectionItems.map(it => (
                <tr key={it.id}>
                  <td style={s.td}>{it.artist}</td>
                  <td style={s.td}>{it.title}</td>
                  <td style={s.td}>{it.year}</td>
                  <td style={s.td}>{it.folder_name}</td>
                  <td style={s.td}>{it.genres[0]}</td>
                  <td style={s.td}>{it.labels[0]}</td>
                  <td style={{ ...s.td, color: MUTED }}>{it.date_added ? new Date(it.date_added).toLocaleDateString() : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          {/* Job console */}
          <div style={s.jobSection}>
            <h2 style={s.sectionHead}>Job console</h2>
            <div style={s.jobName}>
              {jobDetail.job.name}
              <span style={s.jobBadge}>running copy</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: MUTED, marginBottom: "0.75rem" }}>
              {jobDetail.job.summary.copied} of {jobDetail.job.summary.total} items copied · {jobDetail.job.summary.skipped} skipped
            </div>

            <div style={s.evFeed}>
              {jobDetail.events.map(ev => (
                <div key={ev.id} style={s.evRow(ev.level)}>
                  <div style={s.evStripe(ev.level)} />
                  <div style={s.evBody(ev.level)}>{ev.message}</div>
                </div>
              ))}
            </div>

            <table style={s.table}>
              <thead><tr>{["Release ID", "Instance ID", "Status", "Message"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>{jobDetail.items.map(it => (
                <tr key={it.id}>
                  <td style={s.td}>{it.release_id}</td>
                  <td style={s.td}>{it.instance_id}</td>
                  <td style={{ ...s.td, color: it.status === "copied" ? GREEN : MUTED, fontWeight: 600 }}>{it.status}</td>
                  <td style={{ ...s.td, color: MUTED }}>{it.message ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
