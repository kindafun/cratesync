// @ts-nocheck
/**
 * Variant C: "Broadcast Amber"
 *
 * Rationale: Warm amber-on-dark aesthetic evoking vintage broadcast and
 * monitoring equipment. Three-column layout: status rail | workspace | monitor.
 * Large status numerals dominate. The job console resembles a broadcast
 * signal monitor with level meters. Dense but with warm visual weight.
 */

import { collectionItems, destinationAccount, jobDetail, previewResult, sourceAccount } from "../fixtures";

const BG    = "#0b0800";
const C1    = "#111008";
const C2    = "#160f04";
const BORD  = "#2a2000";
const INK   = "#f0e0c0";
const MUTED = "#7a6040";
const AMBER = "#e08820";
const AMBERLT = "rgba(224, 136, 32, 0.12)";
const GREEN = "#40a870";
const GREENLT = "rgba(64, 168, 112, 0.12)";
const RED   = "#d04428";

const s: Record<string, React.CSSProperties> = {
  root: { fontFamily: "'Bricolage Grotesque', sans-serif", background: BG, color: INK, minHeight: "100vh", display: "flex", flexDirection: "column" },
  topStrip: { background: C1, borderBottom: `1px solid ${BORD}`, padding: "0.6rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" },
  appTitle: { fontFamily: "'Instrument Serif', serif", fontSize: "1rem", fontWeight: 400, letterSpacing: "-0.01em", color: INK },
  appEyebrow: { fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase" as const, color: AMBER, display: "block", marginBottom: "0.2rem" },
  statusDot: (ok: boolean) => ({ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.68rem", color: ok ? GREEN : RED }),
  dot: (ok: boolean) => ({ width: 6, height: 6, borderRadius: "50%", background: ok ? GREEN : RED }),
  layout: { display: "grid", gridTemplateColumns: "200px 1fr 280px", flex: 1, gap: 0 },
  col: { borderRight: `1px solid ${BORD}`, padding: "1rem 0.9rem", background: C1 },
  colMain: { padding: "1rem 1.25rem", background: BG },
  colRight: { padding: "1rem 0.9rem", background: C2 },
  sectionHead: { fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: AMBER, paddingBottom: "0.45rem", borderBottom: `1px solid ${BORD}`, marginBottom: "0.75rem" },
  accountCard: { marginBottom: "0.75rem", padding: "0.65rem", background: BG, border: `1px solid ${BORD}`, borderRadius: "3px" },
  rolePill: (role: string) => ({ display: "inline-block", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, padding: "0.15rem 0.45rem", borderRadius: "2px", marginBottom: "0.3rem", background: role === "source" ? GREENLT : AMBERLT, color: role === "source" ? GREEN : AMBER, border: `1px solid ${role === "source" ? GREEN : AMBER}` }),
  accountName: { fontSize: "0.85rem", fontWeight: 700, letterSpacing: "-0.01em", margin: "0.15rem 0" },
  accountMeta: { fontSize: "0.66rem", color: MUTED },
  miniBtn: { fontSize: "0.62rem", fontWeight: 600, padding: "0.22rem 0.55rem", border: `1px solid ${BORD}`, borderRadius: "2px", cursor: "pointer", background: "transparent", color: MUTED, marginTop: "0.4rem", marginRight: "0.3rem" },
  miniBtnPrimary: { fontSize: "0.62rem", fontWeight: 600, padding: "0.22rem 0.55rem", border: `1px solid ${AMBER}`, borderRadius: "2px", cursor: "pointer", background: AMBERLT, color: AMBER },
  field: { marginBottom: "0.55rem" },
  lbl: { fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: MUTED, display: "block", marginBottom: "0.2rem" },
  inp: { width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: "2px", color: INK, padding: "0.38rem 0.5rem", fontSize: "0.78rem" },
  tog: { display: "flex", border: `1px solid ${BORD}`, borderRadius: "2px", overflow: "hidden" },
  togOpt: (active: boolean) => ({ flex: 1, padding: "0.32rem", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: active ? 700 : 400, background: active ? AMBERLT : "transparent", color: active ? AMBER : MUTED, textAlign: "center" as const }),

  // Monitor section (right col)
  monBlock: { marginBottom: "1.2rem" },
  bigNum: { fontFamily: "'Instrument Serif', serif", fontSize: "2.8rem", fontWeight: 400, lineHeight: 1, color: INK, display: "block" },
  bigNumLbl: { fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: MUTED },
  meterTrack: { height: "6px", background: BORD, borderRadius: "3px", overflow: "hidden", marginTop: "0.5rem" },
  meterFill: (pct: number, color: string) => ({ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s ease", borderRadius: "3px" }),
  jobBadge: { display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, padding: "0.2rem 0.55rem", background: AMBERLT, color: AMBER, border: `1px solid ${AMBER}`, borderRadius: "2px" },
  evFeed: { maxHeight: "8rem", overflowY: "auto" as const, border: `1px solid ${BORD}`, borderRadius: "2px" },
  evRow: (lv: string): React.CSSProperties => ({ display: "grid", gridTemplateColumns: "3px 1fr", fontSize: "0.7rem", borderBottom: `1px solid ${BORD}` }),
  evStripe: (lv: string): React.CSSProperties => ({ background: lv === "info" ? `${GREEN}66` : lv === "warning" ? `${AMBER}66` : `${RED}66` }),
  evBody: (lv: string): React.CSSProperties => ({ padding: "0.35rem 0.55rem", color: lv === "info" ? MUTED : lv === "warning" ? AMBER : RED }),

  // Main area
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "0.74rem" },
  th: { padding: "0.38rem 0.65rem", borderBottom: `1px solid ${BORD}`, textAlign: "left" as const, fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.16em", color: AMBER, whiteSpace: "nowrap" as const, background: C1 },
  td: { padding: "0.36rem 0.65rem", borderBottom: `1px solid rgba(42,32,0,0.6)`, color: INK, whiteSpace: "nowrap" as const },
  tableWrap: { border: `1px solid ${BORD}`, borderRadius: "3px", overflow: "auto" },
  panelHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" },
  panelH2: { fontFamily: "'Instrument Serif', serif", fontSize: "1.1rem", fontWeight: 400, margin: 0, color: INK, letterSpacing: "-0.01em" },
};

const pct = Math.round((jobDetail.job.summary.copied / jobDetail.job.summary.total) * 100);

export function VariantC() {
  return (
    <div style={s.root}>
      <div style={s.topStrip}>
        <div>
          <span style={s.appEyebrow}>CrateSync · Local v0.1</span>
          <span style={s.appTitle}>CrateSync</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span style={s.statusDot(true)}><span style={s.dot(true)} /> Backend online</span>
          <button style={s.miniBtn}>Clear data</button>
        </div>
      </div>

      <div style={s.layout}>
        {/* Left col: Accounts + Planner */}
        <div style={s.col}>
          <div style={s.sectionHead}>Accounts</div>

          {[sourceAccount, destinationAccount].map((acc) => (
            <div key={acc.id} style={s.accountCard}>
              <span style={s.rolePill(acc.role)}>{acc.role}</span>
              <p style={s.accountName}>{acc.username}</p>
              <p style={s.accountMeta}>Synced {acc.role === "source" ? "Mar 30" : "Mar 28"}, 2026</p>
              <div>
                <button style={s.miniBtnPrimary}>Sync</button>
                <button style={s.miniBtn}>Disconnect</button>
              </div>
            </div>
          ))}

          <div style={{ ...s.sectionHead, marginTop: "1rem" }}>Planner</div>

          <div style={s.field}>
            <label style={s.lbl}>Plan name</label>
            <input style={s.inp} defaultValue="Digital archive split" />
          </div>
          <div style={s.field}>
            <span style={s.lbl}>Workflow</span>
            <div style={s.tog}>
              <button style={s.togOpt(true)}>Copy</button>
              <button style={s.togOpt(false)}>Move</button>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.lbl}>Text filter</label>
            <input style={s.inp} placeholder="artist, title…" />
          </div>
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.65rem" }}>
            <button style={s.miniBtn}>Preview</button>
            <button style={{ ...s.miniBtnPrimary, flex: 1, textAlign: "center" as const }}>Launch job</button>
          </div>
        </div>

        {/* Center: Snapshot tables */}
        <div style={s.colMain}>
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={s.panelHead}>
              <h2 style={s.panelH2}>Source snapshot</h2>
              <span style={{ fontSize: "0.72rem", color: MUTED }}>{collectionItems.length} items</span>
            </div>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr>{["Artist", "Title", "Year", "Folder", "Labels"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>{collectionItems.slice(0, 8).map(it => (
                  <tr key={it.id}>
                    <td style={s.td}>{it.artist}</td>
                    <td style={s.td}>{it.title}</td>
                    <td style={s.td}>{it.year}</td>
                    <td style={s.td}>{it.folder_name}</td>
                    <td style={s.td}>{it.labels[0]}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div>
            <div style={s.panelHead}>
              <h2 style={s.panelH2}>Destination snapshot</h2>
              <span style={{ fontSize: "0.72rem", color: MUTED }}>4 items</span>
            </div>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr>{["Artist", "Title", "Year", "Folder", "Labels"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>{collectionItems.slice(0, 4).map(it => (
                  <tr key={it.id}>
                    <td style={s.td}>{it.artist}</td>
                    <td style={s.td}>{it.title}</td>
                    <td style={s.td}>{it.year}</td>
                    <td style={s.td}>{it.folder_name}</td>
                    <td style={s.td}>{it.labels[0]}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right col: Monitor / Job console */}
        <div style={s.colRight}>
          <div style={s.sectionHead}>Monitor</div>

          {/* Big status numbers */}
          <div style={s.monBlock}>
            <span style={s.bigNum}>{previewResult.selected_count}</span>
            <span style={s.bigNumLbl}>items selected</span>
            <div style={s.meterTrack}><div style={s.meterFill(Math.round(previewResult.selected_count / (previewResult.selected_count + previewResult.retained_count) * 100), AMBER)} /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1.8rem", fontWeight: 400, lineHeight: 1, color: INK, display: "block" }}>{previewResult.retained_count}</span>
              <span style={s.bigNumLbl}>retained</span>
            </div>
            <div>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1.8rem", fontWeight: 400, lineHeight: 1, color: MUTED, display: "block" }}>{previewResult.duplicate_release_ids.length}</span>
              <span style={s.bigNumLbl}>dupes</span>
            </div>
          </div>

          <div style={s.sectionHead}>Active job</div>

          <div style={{ marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: "0.95rem", fontWeight: 400 }}>{jobDetail.job.name}</span>
              <span style={s.jobBadge}>running</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: MUTED, marginBottom: "0.5rem" }}>
              {jobDetail.job.summary.copied} / {jobDetail.job.summary.total} items
            </div>
            <div style={s.meterTrack}><div style={s.meterFill(pct, AMBER)} /></div>
            <div style={{ fontSize: "0.64rem", color: MUTED, textAlign: "right" as const, marginTop: "0.2rem" }}>{pct}%</div>
          </div>

          <div style={s.evFeed}>
            {jobDetail.events.map(ev => (
              <div key={ev.id} style={s.evRow(ev.level)}>
                <div style={s.evStripe(ev.level)} />
                <div style={s.evBody(ev.level)}>{ev.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
