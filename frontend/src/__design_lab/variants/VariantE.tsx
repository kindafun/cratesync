// @ts-nocheck
/**
 * Variant E: "Signal Flow"
 *
 * Rationale: The migration has a clear pipeline: Source → Filter → Destination.
 * This layout makes that flow explicit and horizontal. Three distinct "stages"
 * arranged left-to-right with connectors between them. The Job console occupies
 * a full-width lower band. Cool steel-blue palette, completely different from
 * the warm amber/orange of the existing design. Dense grid within each stage.
 */

import { collectionItems, destinationAccount, jobDetail, previewResult, sourceAccount } from "../fixtures";

const BG    = "#060c18";
const PANEL = "#0b1424";
const BORD  = "#182840";
const INK   = "#d8e8f8";
const MUTED = "#5878a8";
const BLUE  = "#4888d8";
const BLUELT= "rgba(72, 136, 216, 0.12)";
const TEAL  = "#40b8a8";
const TEALLT= "rgba(64, 184, 168, 0.12)";
const GREEN = "#48c880";
const GREENLT = "rgba(72, 200, 128, 0.12)";
const AMBER = "#d89840";
const RED   = "#c04040";

const s: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Bricolage Grotesque', sans-serif", background: BG, color: INK, minHeight: "100vh", display: "flex", flexDirection: "column" },
  topBar: { background: PANEL, borderBottom: `1px solid ${BORD}`, padding: "0.6rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  appEye: { fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase" as const, color: BLUE },
  appTitle: { fontFamily: "'Instrument Serif', serif", fontSize: "1rem", fontWeight: 400, letterSpacing: "-0.01em", color: INK },
  statusRow: { display: "flex", gap: "0.75rem", alignItems: "center" },
  statusChip: { fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, padding: "0.18rem 0.55rem", background: GREENLT, color: GREEN, border: `1px solid ${GREEN}`, borderRadius: "2px" },
  ghostBtn: { fontSize: "0.7rem", background: "transparent", border: `1px solid ${BORD}`, color: MUTED, padding: "0.25rem 0.65rem", borderRadius: "3px", cursor: "pointer" },
  primaryBtn: { fontSize: "0.7rem", background: BLUE, border: `1px solid ${BLUE}`, color: "#030810", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: "3px", cursor: "pointer" },

  // Pipeline bar
  pipeline: { display: "flex", alignItems: "stretch", padding: "0 1.25rem", background: "rgba(11,20,36,0.6)", borderBottom: `1px solid ${BORD}`, minHeight: "2.2rem" },
  pipelineStage: (active: boolean): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0 1rem", borderRight: `1px solid ${BORD}`, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: active ? BLUE : MUTED }),
  pipeArrow: { color: BORD, fontSize: "0.75rem", display: "flex", alignItems: "center", padding: "0 0.3rem" },
  pipeIdx: (active: boolean): React.CSSProperties => ({ width: 16, height: 16, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontWeight: 700, background: active ? BLUE : BORD, color: active ? "#030810" : MUTED }),

  // Main three-stage layout
  stages: { display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", flex: 1, gap: 0 },
  stage: { background: PANEL, borderRight: `1px solid ${BORD}`, padding: "1rem" },
  connector: { width: "2.5rem", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", background: BG, position: "relative" as const },
  connLine: { width: "100%", height: "2px", background: `linear-gradient(90deg, ${BORD}, ${BLUE}44, ${BORD})` },
  connArrow: { color: MUTED, fontSize: "1.2rem", marginTop: "0.25rem" },

  // Stage internals
  stageHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem", paddingBottom: "0.5rem", borderBottom: `1px solid ${BORD}` },
  stageNum: { width: 20, height: 20, borderRadius: "50%", background: BLUE, color: "#030810", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800 },
  stageTitle: { fontFamily: "'Instrument Serif', serif", fontSize: "1.1rem", fontWeight: 400, letterSpacing: "-0.01em", color: INK },
  stageDesc: { fontSize: "0.68rem", color: MUTED, marginBottom: "0.85rem" },

  // Account card
  accountCard: { background: BG, border: `1px solid ${BORD}`, borderRadius: "3px", padding: "0.75rem", marginBottom: "0.65rem" },
  rolePill: (role: string): React.CSSProperties => ({ display: "inline-block", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", padding: "0.15rem 0.45rem", borderRadius: "2px", marginBottom: "0.3rem", background: role === "source" ? TEALLT : BLUELT, color: role === "source" ? TEAL : BLUE, border: `1px solid ${role === "source" ? TEAL : BLUE}` }),
  accountName: { fontSize: "0.88rem", fontWeight: 700, letterSpacing: "-0.01em" },
  accountMeta: { fontSize: "0.66rem", color: MUTED, margin: "0.15rem 0 0.5rem" },
  btnRow: { display: "flex", gap: "0.35rem" },

  // Table inside stage
  tableWrap: { border: `1px solid ${BORD}`, borderRadius: "3px", overflow: "auto", maxHeight: "14rem" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.72rem" },
  th: { padding: "0.35rem 0.55rem", borderBottom: `1px solid ${BORD}`, textAlign: "left" as const, fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: BLUE, whiteSpace: "nowrap" as const, background: "rgba(11,20,36,0.8)" },
  td: { padding: "0.32rem 0.55rem", borderBottom: `1px solid rgba(24,40,64,0.8)`, color: INK, whiteSpace: "nowrap" as const },

  // Filter stage fields
  fieldGroup: { marginBottom: "0.65rem" },
  fieldLabel: { fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: MUTED, display: "block", marginBottom: "0.22rem" },
  input: { width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: "3px", color: INK, padding: "0.42rem 0.55rem", fontSize: "0.78rem" },
  tog: { display: "flex", border: `1px solid ${BORD}`, borderRadius: "3px", overflow: "hidden" },
  togOpt: (active: boolean): React.CSSProperties => ({ flex: 1, padding: "0.38rem", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: active ? 700 : 400, background: active ? BLUELT : "transparent", color: active ? BLUE : MUTED, textAlign: "center" }),

  // Stats
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: BORD, border: `1px solid ${BORD}`, borderRadius: "3px", overflow: "hidden", marginTop: "0.75rem" },
  statCell: { background: PANEL, padding: "0.6rem 0.65rem" },
  statNum: { fontFamily: "'Instrument Serif', serif", fontSize: "1.7rem", fontWeight: 400, lineHeight: 1, color: INK, display: "block" },
  statLbl: { fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: MUTED },

  // Job console band (full width)
  jobBand: { background: PANEL, borderTop: `1px solid ${BORD}`, padding: "0.85rem 1.25rem" },
  jobBandHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" },
  jobBandTitle: { fontFamily: "'Instrument Serif', serif", fontSize: "1.1rem", fontWeight: 400, color: INK, display: "flex", alignItems: "center", gap: "0.65rem" },
  jobBadge: { fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, padding: "0.18rem 0.5rem", background: BLUELT, color: BLUE, border: `1px solid ${BLUE}`, borderRadius: "2px" },
  jobCols: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: BORD, border: `1px solid ${BORD}`, borderRadius: "3px", overflow: "hidden" },
  jobCol: { background: PANEL, padding: "0.5rem 0.75rem" },
  colLbl: { fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: BLUE, marginBottom: "0.35rem", display: "block" },
  evFeed: { maxHeight: "7rem", overflowY: "auto" as const },
  evRow: (lv: string): React.CSSProperties => ({ display: "grid", gridTemplateColumns: "3px 1fr", fontSize: "0.7rem", borderBottom: `1px solid rgba(24,40,64,0.5)` }),
  evStripe: (lv: string): React.CSSProperties => ({ background: lv === "info" ? `${GREEN}55` : lv === "warning" ? `${AMBER}55` : `${RED}55` }),
  evBody: (lv: string): React.CSSProperties => ({ padding: "0.32rem 0.55rem", color: lv === "info" ? MUTED : lv === "warning" ? AMBER : RED }),
};

export function VariantE() {
  return (
    <div style={s.root}>
      {/* Top bar */}
      <div style={s.topBar}>
        <div>
          <span style={s.appEye}>Discogs Migration · Local v0.1</span>
          <div style={s.appTitle}>Collection split <em>control room</em></div>
        </div>
        <div style={s.statusRow}>
          <span style={s.statusChip}>● Backend online</span>
          <button style={s.ghostBtn}>Clear data</button>
        </div>
      </div>

      {/* Pipeline indicator */}
      <div style={s.pipeline}>
        {[
          { n: 1, label: "Authorize", active: true },
          { n: 2, label: "Snapshot", active: true },
          { n: 3, label: "Plan", active: true },
          { n: 4, label: "Execute", active: false },
        ].map(({ n, label, active }, i, arr) => (
          <>
            <div key={n} style={s.pipelineStage(active)}>
              <span style={s.pipeIdx(active)}>{n}</span>
              {label}
            </div>
            {i < arr.length - 1 && <div key={`a${n}`} style={s.pipeArrow}>›</div>}
          </>
        ))}
      </div>

      {/* Three stages */}
      <div style={s.stages}>

        {/* Stage 1: Source */}
        <div style={s.stage}>
          <div style={s.stageHead}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={s.stageNum}>1</span>
              <span style={s.stageTitle}>Source</span>
            </div>
          </div>
          <p style={s.stageDesc}>Connected Discogs account to migrate from.</p>
          <div style={s.accountCard}>
            <span style={s.rolePill("source")}>Source</span>
            <div style={s.accountName}>{sourceAccount.username}</div>
            <div style={s.accountMeta}>Synced Mar 30, 2026 · {collectionItems.length} items</div>
            <div style={s.btnRow}>
              <button style={s.primaryBtn}>Sync</button>
              <button style={s.ghostBtn}>Disconnect</button>
            </div>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{["Artist", "Title", "Yr", "Folder"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>{collectionItems.slice(0, 10).map(it => (
                <tr key={it.id}>
                  <td style={s.td}>{it.artist}</td>
                  <td style={s.td}>{it.title}</td>
                  <td style={s.td}>{it.year}</td>
                  <td style={s.td}>{it.folder_name}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        {/* Connector A→B */}
        <div style={s.connector}>
          <div style={s.connLine} />
          <span style={s.connArrow}>›</span>
        </div>

        {/* Stage 2: Filter/Plan */}
        <div style={s.stage}>
          <div style={s.stageHead}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={s.stageNum}>2</span>
              <span style={s.stageTitle}>Migration plan</span>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button style={s.ghostBtn}>Preview</button>
              <button style={s.primaryBtn}>Launch</button>
            </div>
          </div>
          <p style={s.stageDesc}>Define what to migrate and how.</p>

          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Plan name</label>
            <input style={s.input} defaultValue="Digital archive split" />
          </div>
          <div style={s.fieldGroup}>
            <span style={s.fieldLabel}>Workflow</span>
            <div style={s.tog}>
              <button style={s.togOpt(true)}>Copy only</button>
              <button style={s.togOpt(false)}>Two-phase move</button>
            </div>
          </div>
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Added on or before</label>
            <input style={s.input} type="datetime-local" />
          </div>
          <div style={s.fieldGroup}>
            <label style={s.fieldLabel}>Text filter</label>
            <input style={s.input} placeholder="artist, title, label…" />
          </div>

          <div style={s.statsGrid}>
            <div style={s.statCell}><span style={s.statNum}>{previewResult.selected_count}</span><span style={s.statLbl}>Selected</span></div>
            <div style={s.statCell}><span style={s.statNum}>{previewResult.retained_count}</span><span style={s.statLbl}>Retained</span></div>
            <div style={s.statCell}><span style={{ ...s.statNum, color: MUTED }}>{previewResult.duplicate_release_ids.length}</span><span style={s.statLbl}>Dupes</span></div>
          </div>
        </div>

        {/* Connector B→C */}
        <div style={s.connector}>
          <div style={s.connLine} />
          <span style={s.connArrow}>›</span>
        </div>

        {/* Stage 3: Destination */}
        <div style={s.stage}>
          <div style={s.stageHead}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={s.stageNum}>3</span>
              <span style={s.stageTitle}>Destination</span>
            </div>
          </div>
          <p style={s.stageDesc}>Target Discogs account to receive releases.</p>
          <div style={s.accountCard}>
            <span style={s.rolePill("destination")}>Destination</span>
            <div style={s.accountName}>{destinationAccount.username}</div>
            <div style={s.accountMeta}>Synced Mar 28, 2026 · 4 items</div>
            <div style={s.btnRow}>
              <button style={s.primaryBtn}>Sync</button>
              <button style={s.ghostBtn}>Disconnect</button>
            </div>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead><tr>{["Artist", "Title", "Yr", "Folder"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>{collectionItems.slice(0, 4).map(it => (
                <tr key={it.id}>
                  <td style={s.td}>{it.artist}</td>
                  <td style={s.td}>{it.title}</td>
                  <td style={s.td}>{it.year}</td>
                  <td style={s.td}>{it.folder_name}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Job console — full width band at bottom */}
      <div style={s.jobBand}>
        <div style={s.jobBandHead}>
          <div style={s.jobBandTitle}>
            Job console
            <span style={{ ...s.jobBadge }}>running copy</span>
            <span style={{ fontFamily: "inherit", fontSize: "0.8rem", fontWeight: 400, color: MUTED }}>{jobDetail.job.name}</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", color: MUTED }}>{jobDetail.job.summary.copied}/{jobDetail.job.summary.total} copied</span>
            <button style={s.ghostBtn}>Export</button>
          </div>
        </div>
        <div style={s.jobCols}>
          <div style={s.jobCol}>
            <span style={s.colLbl}>Event feed</span>
            <div style={s.evFeed}>
              {jobDetail.events.map(ev => (
                <div key={ev.id} style={s.evRow(ev.level)}>
                  <div style={s.evStripe(ev.level)} />
                  <div style={s.evBody(ev.level)}>{ev.message}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={s.jobCol}>
            <span style={s.colLbl}>Item audit</span>
            <table style={s.table}>
              <thead><tr>{["Release", "Instance", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>{jobDetail.items.slice(0, 5).map(it => (
                <tr key={it.id}>
                  <td style={s.td}>{it.release_id}</td>
                  <td style={s.td}>{it.instance_id}</td>
                  <td style={{ ...s.td, color: it.status === "copied" ? GREEN : MUTED, fontWeight: 600 }}>{it.status}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
