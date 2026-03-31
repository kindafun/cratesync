// @ts-nocheck
/**
 * Variant B: "Patch Bay"
 *
 * Rationale: Ultra-dense, four-quadrant grid layout inspired by audio hardware
 * patch bays and studio racks. Zero decoration. Every element is labeled with
 * uppercase identifiers like physical jack labels. Maximum data per square inch.
 * Dark near-black with copper/orange as the only accent.
 */

import { collectionItems, destinationAccount, jobDetail, previewResult, sourceAccount } from "../fixtures";

const BG = "#080808";
const PANEL = "#111111";
const BORDER = "#2a2a2a";
const TEXT = "#e8e2d8";
const MUTED = "#6a6460";
const COPPER = "#c87941";
const COPPERLIGHT = "rgba(200, 121, 65, 0.12)";
const GREEN = "#3a7c5a";
const GREENLIGHT = "rgba(58, 124, 90, 0.12)";
const RED = "#c0392b";

const label = (text: string): React.CSSProperties => ({
  fontSize: "0.58rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.22em",
  color: COPPER,
  display: "block",
  marginBottom: "0.3rem",
});

const s: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Bricolage Grotesque', sans-serif", background: BG, color: TEXT, minHeight: "100vh", display: "flex", flexDirection: "column" },
  topBar: { background: PANEL, borderBottom: `1px solid ${BORDER}`, padding: "0.55rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" },
  topId: { fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase" as const, color: COPPER },
  topName: { fontFamily: "'Instrument Serif', serif", fontSize: "1.05rem", fontWeight: 400, letterSpacing: "-0.01em", color: TEXT },
  statusChip: { fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, padding: "0.18rem 0.5rem", background: GREENLIGHT, color: GREEN, border: `1px solid ${GREEN}`, borderRadius: "2px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: "1px", flex: 1, background: BORDER },
  cell: { background: PANEL, padding: "0.85rem" },
  cellFull: { gridColumn: "span 2", background: PANEL, padding: "0.85rem" },
  cellHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", paddingBottom: "0.45rem", borderBottom: `1px solid ${BORDER}` },
  cellId: { fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: COPPER },
  cellActions: { display: "flex", gap: "0.35rem" },
  btn: { fontSize: "0.62rem", fontWeight: 600, padding: "0.22rem 0.55rem", border: `1px solid ${BORDER}`, borderRadius: "2px", cursor: "pointer", background: "transparent", color: MUTED, letterSpacing: "0.04em" },
  btnPrimary: { fontSize: "0.62rem", fontWeight: 700, padding: "0.22rem 0.55rem", border: `1px solid ${COPPER}`, borderRadius: "2px", cursor: "pointer", background: COPPERLIGHT, color: COPPER, letterSpacing: "0.04em" },
  accountRow: { display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.5rem 0", borderBottom: `1px solid ${BORDER}` },
  rolePip: (role: string) => ({ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: role === "source" ? GREEN : COPPER }),
  accountName: { fontSize: "0.82rem", fontWeight: 700, letterSpacing: "-0.01em" },
  accountSub: { fontSize: "0.62rem", color: MUTED, marginLeft: "auto" },
  inputRow: { display: "flex", flexDirection: "column" as const, gap: "0.6rem" },
  fieldGroup: { display: "grid", gap: "0.25rem" },
  input: { background: BG, border: `1px solid ${BORDER}`, borderRadius: "2px", color: TEXT, padding: "0.38rem 0.5rem", fontSize: "0.78rem", width: "100%" },
  toggleRow: { display: "flex", border: `1px solid ${BORDER}`, borderRadius: "2px", overflow: "hidden" },
  tOpt: (active: boolean) => ({ flex: 1, padding: "0.35rem", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: active ? 700 : 400, background: active ? COPPERLIGHT : "transparent", color: active ? COPPER : MUTED, letterSpacing: "0.04em", textAlign: "center" as const }),
  statsRow: { display: "flex", gap: 0, borderTop: `1px solid ${BORDER}`, marginTop: "0.75rem" },
  statBox: { flex: 1, padding: "0.5rem 0.65rem", borderRight: `1px solid ${BORDER}` },
  statNum: { fontFamily: "'Instrument Serif', serif", fontSize: "1.6rem", fontWeight: 400, lineHeight: 1, color: TEXT, display: "block" },
  statLbl: { fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: MUTED, display: "block" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.72rem" },
  th: { padding: "0.35rem 0.5rem", borderBottom: `1px solid ${BORDER}`, textAlign: "left" as const, fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.18em", color: COPPER, whiteSpace: "nowrap" as const },
  td: { padding: "0.32rem 0.5rem", borderBottom: `1px solid rgba(42,42,42,0.6)`, color: TEXT, whiteSpace: "nowrap" as const },
  evFeed: { maxHeight: "7rem", overflowY: "auto" as const, border: `1px solid ${BORDER}` },
  evRow: (lv: string) => ({ display: "grid", gridTemplateColumns: "3px 1fr", fontSize: "0.72rem", borderBottom: `1px solid rgba(42,42,42,0.5)` }),
  evStripe: (lv: string) => ({ background: lv === "info" ? `${GREEN}88` : lv === "warning" ? `${COPPER}88` : `${RED}88` }),
  evText: (lv: string) => ({ padding: "0.35rem 0.6rem", color: lv === "info" ? MUTED : lv === "warning" ? COPPER : RED }),
  jobHeader: { display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" },
  jobName: { fontFamily: "'Instrument Serif', serif", fontSize: "1.05rem", fontWeight: 400, color: TEXT },
  jobBadge: { fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, padding: "0.18rem 0.5rem", background: COPPERLIGHT, color: COPPER, border: `1px solid ${COPPER}`, borderRadius: "2px" },
};

const LABEL = (text: string) => <span style={label(text)}>{text}</span>;

export function VariantB() {
  return (
    <div style={s.root}>
      {/* Top bar */}
      <div style={s.topBar}>
        <div>
          <span style={s.topId}>DMIG-LOCAL · v0.1</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={s.topName}>Collection split control room</span>
            <span style={s.statusChip}>● Backend online</span>
          </div>
        </div>
        <button style={s.btn}>CLR DATA</button>
      </div>

      {/* Four-quadrant grid */}
      <div style={s.grid}>

        {/* Q1: Accounts */}
        <div style={s.cell}>
          <div style={s.cellHead}>
            {LABEL("ACCT · OAuth docking bay")}
            <div style={s.cellActions}>
              <button style={s.btnPrimary}>CONNECT</button>
            </div>
          </div>
          {[sourceAccount, destinationAccount].map((acc) => (
            <div key={acc.id} style={s.accountRow}>
              <span style={s.rolePip(acc.role)} />
              <span style={s.accountName}>{acc.username}</span>
              <span style={s.accountSub}>{acc.role} · synced {acc.role === "source" ? "Mar 30" : "Mar 28"}</span>
              <button style={s.btn}>SYNC</button>
              <button style={s.btn}>DXN</button>
            </div>
          ))}
        </div>

        {/* Q2: Planner */}
        <div style={s.cell}>
          <div style={s.cellHead}>
            {LABEL("PLN · Migration composer")}
            <div style={s.cellActions}>
              <button style={s.btn}>PREVIEW</button>
              <button style={s.btnPrimary}>LAUNCH</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
            <div style={s.fieldGroup}>
              {LABEL("Plan name")}
              <input style={s.input} defaultValue="Digital archive split" />
            </div>
            <div style={s.fieldGroup}>
              {LABEL("Workflow")}
              <div style={s.toggleRow}>
                <button style={s.tOpt(true)}>Copy</button>
                <button style={s.tOpt(false)}>Move</button>
              </div>
            </div>
            <div style={s.fieldGroup}>
              {LABEL("Added before")}
              <input style={s.input} type="datetime-local" />
            </div>
            <div style={s.fieldGroup}>
              {LABEL("Text filter")}
              <input style={s.input} placeholder="artist, title…" />
            </div>
          </div>
          <div style={s.statsRow}>
            <div style={s.statBox}><span style={s.statNum}>{previewResult.selected_count}</span><span style={s.statLbl}>Selected</span></div>
            <div style={s.statBox}><span style={s.statNum}>{previewResult.retained_count}</span><span style={s.statLbl}>Retained</span></div>
            <div style={{ ...s.statBox, borderRight: "none" }}><span style={s.statNum}>{previewResult.duplicate_release_ids.length}</span><span style={s.statLbl}>Dupes</span></div>
          </div>
        </div>

        {/* Q3+Q4: Snapshots side by side (full width) */}
        <div style={{ ...s.cell, gridColumn: "span 2" }}>
          {LABEL("SNAP · Collection snapshots")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: BORDER, marginTop: "0.5rem" }}>
            {[
              { label: "Source — recordseller_vinyl", items: collectionItems },
              { label: "Destination — digiarchive_juan", items: collectionItems.slice(0, 4) },
            ].map(({ label: lbl, items }) => (
              <div key={lbl} style={{ background: PANEL, padding: "0.5rem" }}>
                {LABEL(lbl)}
                <table style={s.table}>
                  <thead><tr>{["Artist", "Title", "Yr", "Folder", "Genre"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {items.slice(0, 6).map(it => (
                      <tr key={it.id}>
                        <td style={s.td}>{it.artist}</td>
                        <td style={s.td}>{it.title}</td>
                        <td style={s.td}>{it.year}</td>
                        <td style={s.td}>{it.folder_name}</td>
                        <td style={s.td}>{it.genres[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        {/* Q5: Job console (full width) */}
        <div style={{ ...s.cell, gridColumn: "span 2" }}>
          <div style={s.cellHead}>
            {LABEL("JOB · Execution console")}
            <div style={s.cellActions}>
              <button style={s.btn}>EXPORT</button>
            </div>
          </div>
          <div style={s.jobHeader}>
            <span style={s.jobName}>{jobDetail.job.name}</span>
            <span style={s.jobBadge}>running copy</span>
            <span style={{ fontSize: "0.72rem", color: MUTED, marginLeft: "auto" }}>
              {jobDetail.job.summary.copied}/{jobDetail.job.summary.total} copied · {jobDetail.job.summary.skipped} skipped
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: BORDER }}>
            <div style={{ background: PANEL, padding: "0.5rem" }}>
              {LABEL("Event feed")}
              <div style={s.evFeed}>
                {jobDetail.events.map(ev => (
                  <div key={ev.id} style={s.evRow(ev.level)}>
                    <div style={s.evStripe(ev.level)} />
                    <div style={s.evText(ev.level)}>{ev.message}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: PANEL, padding: "0.5rem" }}>
              {LABEL("Item audit")}
              <table style={s.table}>
                <thead><tr>{["Release", "Instance", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {jobDetail.items.slice(0, 5).map(it => (
                    <tr key={it.id}>
                      <td style={s.td}>{it.release_id}</td>
                      <td style={s.td}>{it.instance_id}</td>
                      <td style={{ ...s.td, color: it.status === "copied" ? GREEN : MUTED, fontWeight: 600 }}>{it.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
