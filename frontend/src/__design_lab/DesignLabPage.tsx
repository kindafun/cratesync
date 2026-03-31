import "./lab.css";
import { FeedbackOverlay } from "./FeedbackOverlay";
import { VariantA } from "./variants/VariantA";
import { VariantB } from "./variants/VariantB";
import { VariantC } from "./variants/VariantC";
import { VariantD } from "./variants/VariantD";
import { VariantE } from "./variants/VariantE";

const variants = [
  {
    id: "A" as const,
    name: "Record Stacks",
    rationale: "Light catalog UI — Discogs-native aesthetic. Dense row-heavy data, sidebar layout, Discogs-green accent. Lives in the same visual universe as the platform itself.",
  },
  {
    id: "B" as const,
    name: "Patch Bay",
    rationale: "Ultra-dense four-quadrant grid like audio hardware patch bays. Zero decoration, copper accent, uppercase labels. Maximum data per square inch.",
  },
  {
    id: "C" as const,
    name: "Broadcast Amber",
    rationale: "Three-column broadcast console with warm amber on dark. Large status numerals, progress meters, monitoring-station layout.",
  },
  {
    id: "D" as const,
    name: "Liner Notes",
    rationale: "Typography as the hero. Asymmetric columns, 5rem display headings, account names as artist credits. Maximum contrast, editorial authority.",
  },
  {
    id: "E" as const,
    name: "Signal Flow",
    rationale: "Horizontal pipeline: Source → Plan → Destination. Makes the migration workflow spatially explicit. Steel-blue palette, job console as a bottom monitoring band.",
  },
];

const components: Record<string, React.ReactNode> = {
  A: <VariantA />,
  B: <VariantB />,
  C: <VariantC />,
  D: <VariantD />,
  E: <VariantE />,
};

export function DesignLabPage() {
  return (
    <div className="lab-root">
      {/* Lab header */}
      <header className="lab-header">
        <div className="lab-header-left">
          <span className="lab-badge">Design Lab</span>
          <div>
            <h1 className="lab-title">CrateSync — Full App Redesign</h1>
            <p className="lab-subtitle">
              5 distinct explorations · Fresh direction · Discogs-inspired density
            </p>
          </div>
        </div>
        <div className="lab-instructions">
          <strong>How to give feedback:</strong>
          Click <kbd>Add Feedback</kbd> (bottom-right) → click any element → type your comment.
          Or just describe what you like below each variant.
        </div>
      </header>

      {/* Variant grid */}
      <div className="lab-grid">
        {variants.map(({ id, name, rationale }) => (
          <div key={id} className="lab-variant-wrapper">
            <div className="lab-variant-meta">
              <div className="lab-variant-id">{id}</div>
              <div>
                <span className="lab-variant-name">{name}</span>
                <p className="lab-variant-rationale">{rationale}</p>
              </div>
            </div>
            <div data-variant={id} className="lab-variant-frame">
              {components[id]}
            </div>
          </div>
        ))}
      </div>

      {/* Feedback overlay */}
      <FeedbackOverlay targetName="CrateSyncApp" />
    </div>
  );
}
