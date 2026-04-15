// @ts-nocheck

import { collectionItems, previewResult } from "../fixtures";

const PAPER = "#f5f0e6";
const PANEL = "#fffaf0";
const INK = "#171412";
const MUTED = "#6f6258";
const LINE = "#cdbfae";
const ACCENT = "#c65b1c";
const ACCENT_WASH = "#f1d2bb";
const SUCCESS = "#2f6a44";
const SUCCESS_WASH = "#d8e7da";
const CAUTION = "#7f4d18";
const CAUTION_WASH = "#ecd7bf";
const SHADE = "#efe5d8";

const capabilityGroups = [
  {
    label: "Folder placement",
    value: "Mapped",
    tone: "ready",
    note: "Existing folder matches and overrides are ready.",
  },
  {
    label: "Collection notes",
    value: "Partial",
    tone: "attention",
    note: "Some notes will flatten into plain text.",
  },
  {
    label: "Date added",
    value: "Not carried",
    tone: "blocked",
    note: "Discogs does not expose write access for added dates.",
  },
  {
    label: "Ratings",
    value: "Ready",
    tone: "ready",
    note: "Ratings can be copied into the destination collection.",
  },
];

const readiness = [
  { label: "Source snapshot current", tone: "ready" },
  { label: "Destination snapshot current", tone: "ready" },
  { label: "Metadata caveats reviewed", tone: "attention" },
  { label: "No duplicate blockers", tone: "ready" },
];

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #f7f2ea 0%, #f1e7da 52%, #ecdfd0 100%)",
    color: INK,
    fontFamily: "var(--font-ui)",
  },
  shell: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "2rem 1.5rem 3rem",
    display: "grid",
    gap: "1.15rem",
  },
  eyebrow: {
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: ACCENT,
  },
  titleRow: {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: "1rem",
    paddingBottom: "0.85rem",
    borderBottom: `1px solid ${LINE}`,
  },
  titleBlock: { display: "grid", gap: "0.25rem" },
  title: {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: "2.4rem",
    fontWeight: 500,
    letterSpacing: "-0.05em",
    lineHeight: 0.95,
  },
  subtitle: {
    margin: 0,
    fontSize: "0.88rem",
    color: MUTED,
    maxWidth: "58ch",
    lineHeight: 1.5,
  },
  headGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(19rem, 0.9fr)",
    gap: "1rem",
    alignItems: "start",
  },
  summaryPanel: {
    display: "grid",
    gap: "0.95rem",
    padding: "1rem",
    border: `1px solid ${LINE}`,
    background: PANEL,
    boxShadow: "0 1px 0 rgba(23,20,18,0.04)",
  },
  summaryTop: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "1rem",
    alignItems: "start",
  },
  summaryCopy: { display: "grid", gap: "0.4rem" },
  summaryLabel: {
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: MUTED,
  },
  summaryHeading: {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: "1.7rem",
    fontWeight: 500,
    letterSpacing: "-0.05em",
    lineHeight: 0.98,
  },
  summaryMessage: {
    margin: 0,
    color: MUTED,
    fontSize: "0.95rem",
    lineHeight: 1.55,
    maxWidth: "54ch",
  },
  actionStack: {
    display: "grid",
    gap: "0.5rem",
    minWidth: "11rem",
  },
  primaryBtn: {
    border: `1px solid ${ACCENT}`,
    background: ACCENT,
    color: "#fff9f2",
    padding: "0.72rem 0.95rem",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    textAlign: "center",
  },
  ghostBtn: {
    border: `1px solid ${LINE}`,
    background: "transparent",
    color: INK,
    padding: "0.72rem 0.95rem",
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    textAlign: "center",
  },
  metricStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "0.75rem",
  },
  metricCard: {
    display: "grid",
    gap: "0.25rem",
    padding: "0.85rem 0.95rem",
    background: PAPER,
    border: `1px solid ${LINE}`,
  },
  metricValue: {
    fontFamily: "var(--font-display)",
    fontSize: "2rem",
    lineHeight: 0.92,
    letterSpacing: "-0.05em",
  },
  metricLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: MUTED,
  },
  checklistBlock: {
    display: "grid",
    gap: "0.55rem",
    paddingTop: "0.2rem",
    borderTop: `1px solid ${LINE}`,
  },
  checklistGrid: {
    display: "flex",
    gap: "0.55rem",
    flexWrap: "wrap",
  },
  checklistItem: (tone: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.45rem",
    minHeight: "1.9rem",
    padding: "0.15rem 0.65rem",
    border: `1px solid ${
      tone === "ready" ? SUCCESS : tone === "attention" ? LINE : ACCENT
    }`,
    background:
      tone === "ready"
        ? SUCCESS_WASH
        : tone === "attention"
          ? PAPER
          : ACCENT_WASH,
    color:
      tone === "ready" ? SUCCESS : tone === "attention" ? MUTED : ACCENT,
    fontSize: "0.71rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  }),
  dot: (tone: string): React.CSSProperties => ({
    width: "0.42rem",
    height: "0.42rem",
    borderRadius: "50%",
    background:
      tone === "ready" ? SUCCESS : tone === "attention" ? MUTED : ACCENT,
    flexShrink: 0,
  }),
  capabilityRail: {
    display: "grid",
    gap: "0.8rem",
    padding: "1rem",
    border: `1px solid ${LINE}`,
    background: SHADE,
  },
  railHead: {
    display: "grid",
    gap: "0.35rem",
    paddingBottom: "0.4rem",
    borderBottom: `1px solid ${LINE}`,
  },
  railTitle: {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: "1.25rem",
    fontWeight: 500,
    letterSpacing: "-0.04em",
  },
  railCopy: {
    margin: 0,
    fontSize: "0.84rem",
    lineHeight: 1.5,
    color: MUTED,
  },
  capabilityList: { display: "grid", gap: "0.6rem" },
  capabilityCard: (tone: string): React.CSSProperties => ({
    display: "grid",
    gap: "0.28rem",
    padding: "0.8rem",
    background: PANEL,
    border: `1px solid ${
      tone === "ready" ? SUCCESS : tone === "attention" ? CAUTION : ACCENT
    }`,
  }),
  capabilityMeta: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  capabilityLabel: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: INK,
  },
  capabilityValue: (tone: string): React.CSSProperties => ({
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color:
      tone === "ready" ? SUCCESS : tone === "attention" ? CAUTION : ACCENT,
  }),
  capabilityNote: {
    fontSize: "0.78rem",
    lineHeight: 1.48,
    color: MUTED,
  },
  blockers: {
    display: "grid",
    gap: "0.85rem",
    padding: "1rem",
    border: `1px solid ${LINE}`,
    background: PANEL,
  },
  blockersHead: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: "1rem",
  },
  blockersTitle: {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: "1.4rem",
    fontWeight: 500,
    letterSpacing: "-0.04em",
  },
  blockersCopy: {
    margin: "0.2rem 0 0",
    fontSize: "0.86rem",
    lineHeight: 1.5,
    color: MUTED,
    maxWidth: "56ch",
  },
  blockerBadge: {
    minWidth: "4rem",
    padding: "0.5rem 0.7rem",
    border: `1px solid ${ACCENT}`,
    background: ACCENT_WASH,
    color: ACCENT,
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    textAlign: "center",
  },
  blockerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.75rem",
  },
  blockerCard: {
    display: "grid",
    gap: "0.38rem",
    padding: "0.9rem",
    border: `1px solid ${LINE}`,
    background: PAPER,
  },
  blockerLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: MUTED,
  },
  blockerTitle: {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: "1.05rem",
    fontWeight: 500,
    letterSpacing: "-0.04em",
  },
  blockerText: {
    margin: 0,
    color: MUTED,
    fontSize: "0.82rem",
    lineHeight: 1.45,
  },
  tableBlock: {
    display: "grid",
    gap: "0.7rem",
    padding: "1rem",
    border: `1px solid ${LINE}`,
    background: PANEL,
  },
  tableHead: {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: "1rem",
  },
  tableTitle: {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: "1.28rem",
    fontWeight: 500,
    letterSpacing: "-0.04em",
  },
  tableCopy: {
    margin: "0.2rem 0 0",
    fontSize: "0.84rem",
    color: MUTED,
  },
  toggleRow: { display: "flex", gap: "0.45rem", flexWrap: "wrap" },
  toggle: (active: boolean): React.CSSProperties => ({
    padding: "0.45rem 0.7rem",
    border: `1px solid ${active ? INK : LINE}`,
    background: active ? INK : "transparent",
    color: active ? PANEL : MUTED,
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  }),
  tableWrap: {
    border: `1px solid ${LINE}`,
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.84rem",
  },
  th: {
    padding: "0.72rem 0.75rem",
    textAlign: "left",
    fontSize: "0.66rem",
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: MUTED,
    background: SHADE,
    borderBottom: `1px solid ${LINE}`,
  },
  td: {
    padding: "0.8rem 0.75rem",
    borderBottom: `1px solid ${LINE}`,
    verticalAlign: "top",
  },
  tableState: (tone: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    minHeight: "1.5rem",
    padding: "0.12rem 0.48rem",
    border: `1px solid ${
      tone === "clear" ? SUCCESS : tone === "warning" ? CAUTION : ACCENT
    }`,
    background:
      tone === "clear"
        ? SUCCESS_WASH
        : tone === "warning"
          ? CAUTION_WASH
          : ACCENT_WASH,
    color:
      tone === "clear" ? SUCCESS : tone === "warning" ? CAUTION : ACCENT,
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  }),
};

const tableRows = collectionItems.slice(0, 5).map((item, index) => ({
  artist: item.artist,
  title: item.title,
  folder: item.folder_name,
  release: item.release_id,
  added: item.date_added?.slice(0, 10),
  state:
    index === 1
      ? { label: "Duplicate review", tone: "warning" }
      : index === 3
        ? { label: "Date caveat", tone: "blocked" }
        : { label: "Clear", tone: "clear" },
}));

export function VariantF() {
  return (
    <div style={s.root}>
      <div style={s.shell}>
        <div style={s.eyebrow}>Variant F · Review Rail</div>
        <div style={s.titleRow}>
          <div style={s.titleBlock}>
            <h1 style={s.title}>Review should help you decide fast.</h1>
            <p style={s.subtitle}>
              This mock keeps launch readiness in the main lane and moves
              migration details into a supporting rail.
            </p>
          </div>
        </div>

        <section style={s.headGrid}>
          <div style={s.summaryPanel}>
            <div style={s.summaryTop}>
              <div style={s.summaryCopy}>
                <div style={s.summaryLabel}>Launch readiness</div>
                <h2 style={s.summaryHeading}>Ready to launch. One detail will be lost.</h2>
                <p style={s.summaryMessage}>
                  Your selection is ready and folder mapping is resolved. The
                  original added date will not carry over in this run.
                </p>
              </div>
              <div style={s.actionStack}>
                <div style={s.primaryBtn}>Start migration</div>
                <div style={s.ghostBtn}>Refresh preview</div>
              </div>
            </div>

            <div style={s.metricStrip}>
              <div style={s.metricCard}>
                <span style={s.metricValue}>{previewResult.selected_count}</span>
                <span style={s.metricLabel}>Included in preview</span>
              </div>
              <div style={s.metricCard}>
                <span style={s.metricValue}>{previewResult.retained_count}</span>
                <span style={s.metricLabel}>Retained in source</span>
              </div>
              <div style={s.metricCard}>
                <span style={s.metricValue}>{previewResult.duplicate_release_ids.length}</span>
                <span style={s.metricLabel}>Possible duplicates</span>
              </div>
            </div>

            <div style={s.checklistBlock}>
              <div style={s.summaryLabel}>Checklist</div>
              <div style={s.checklistGrid}>
                {readiness.map((item) => (
                  <span key={item.label} style={s.checklistItem(item.tone)}>
                    <span style={s.dot(item.tone)} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside style={s.capabilityRail}>
            <div style={s.railHead}>
              <h3 style={s.railTitle}>What carries over</h3>
              <p style={s.railCopy}>
                Use this to confirm what will transfer before you start.
              </p>
            </div>
            <div style={s.capabilityList}>
              {capabilityGroups.map((group) => (
                <div key={group.label} style={s.capabilityCard(group.tone)}>
                  <div style={s.capabilityMeta}>
                    <span style={s.capabilityLabel}>{group.label}</span>
                    <span style={s.capabilityValue(group.tone)}>{group.value}</span>
                  </div>
                  <div style={s.capabilityNote}>{group.note}</div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section style={s.blockers}>
          <div style={s.blockersHead}>
            <div>
              <h3 style={s.blockersTitle}>Resolve these before launch</h3>
              <p style={s.blockersCopy}>
                These need a decision before the migration can start.
              </p>
            </div>
            <div style={s.blockerBadge}>2 open</div>
          </div>
          <div style={s.blockerGrid}>
            <div style={s.blockerCard}>
              <div style={s.blockerLabel}>Folder mapping</div>
              <h4 style={s.blockerTitle}>Digital folder has no destination match.</h4>
              <p style={s.blockerText}>
                Choose where releases from this folder should go.
              </p>
            </div>
            <div style={s.blockerCard}>
              <div style={s.blockerLabel}>Custom field mapping</div>
              <h4 style={s.blockerTitle}>Condition notes need a destination target.</h4>
              <p style={s.blockerText}>
                Map this field or continue without keeping it structured.
              </p>
            </div>
          </div>
        </section>

        <section style={s.tableBlock}>
          <div style={s.tableHead}>
            <div>
              <h3 style={s.tableTitle}>Preview items</h3>
              <p style={s.tableCopy}>
                Spot-check the rows included in this preview.
              </p>
            </div>
            <div style={s.toggleRow}>
              <span style={s.toggle(true)}>Selected only</span>
              <span style={s.toggle(false)}>All filtered rows</span>
            </div>
          </div>

          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Artist</th>
                  <th style={s.th}>Title</th>
                  <th style={s.th}>Source folder</th>
                  <th style={s.th}>Release</th>
                  <th style={s.th}>Added</th>
                  <th style={s.th}>Review state</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={`${row.artist}-${row.release}`}>
                    <td style={s.td}>{row.artist}</td>
                    <td style={s.td}>{row.title}</td>
                    <td style={s.td}>{row.folder}</td>
                    <td style={s.td}>{row.release}</td>
                    <td style={s.td}>{row.added}</td>
                    <td style={s.td}>
                      <span style={s.tableState(row.state.tone)}>
                        {row.state.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
