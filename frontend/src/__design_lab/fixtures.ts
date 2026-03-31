// Shared fixture data used by all variants

export const sourceAccount = {
  id: "acc-src-001",
  username: "recordseller_vinyl",
  role: "source" as const,
  discogs_user_id: 4219042,
  created_at: "2026-01-12T09:00:00Z",
  updated_at: "2026-03-30T14:22:11Z",
  last_synced_at: "2026-03-30T14:22:11Z",
};

export const destinationAccount = {
  id: "acc-dst-001",
  username: "digiarchive_juan",
  role: "destination" as const,
  discogs_user_id: 9104728,
  created_at: "2026-01-12T09:00:00Z",
  updated_at: "2026-03-28T10:05:44Z",
  last_synced_at: "2026-03-28T10:05:44Z",
};

export const collectionItems = [
  { id: "i01", release_id: 1285919, instance_id: 29192832, folder_id: 1, folder_name: "All", date_added: "2021-04-12T00:00:00Z", artist: "Aphex Twin", title: "Selected Ambient Works Volume II", year: 1994, labels: ["Warp Records"], genres: ["Electronic"], formats: ["2×LP"], rating: 5 },
  { id: "i02", release_id: 8129302, instance_id: 39293011, folder_id: 2, folder_name: "Digital", date_added: "2021-07-20T00:00:00Z", artist: "Boards of Canada", title: "Music Has the Right to Children", year: 1998, labels: ["Warp Records"], genres: ["Electronic"], formats: ["2×LP"], rating: 5 },
  { id: "i03", release_id: 2049210, instance_id: 44012882, folder_id: 1, folder_name: "All", date_added: "2022-01-08T00:00:00Z", artist: "John Coltrane", title: "A Love Supreme", year: 1965, labels: ["Impulse!"], genres: ["Jazz"], formats: ["LP"], rating: 5 },
  { id: "i04", release_id: 3820110, instance_id: 51029302, folder_id: 3, folder_name: "Vinyl", date_added: "2022-04-15T00:00:00Z", artist: "Miles Davis", title: "Kind of Blue", year: 1959, labels: ["Columbia"], genres: ["Jazz"], formats: ["LP"], rating: 5 },
  { id: "i05", release_id: 4910230, instance_id: 60293012, folder_id: 2, folder_name: "Digital", date_added: "2022-08-22T00:00:00Z", artist: "Burial", title: "Untrue", year: 2007, labels: ["Hyperdub"], genres: ["Electronic"], formats: ["2×LP"], rating: 4 },
  { id: "i06", release_id: 5030120, instance_id: 71029312, folder_id: 3, folder_name: "Vinyl", date_added: "2023-01-30T00:00:00Z", artist: "Talk Talk", title: "Spirit of Eden", year: 1988, labels: ["EMI"], genres: ["Rock", "Ambient"], formats: ["LP"], rating: 5 },
  { id: "i07", release_id: 6219032, instance_id: 83920132, folder_id: 2, folder_name: "Digital", date_added: "2023-05-10T00:00:00Z", artist: "Flying Lotus", title: "You're Dead!", year: 2014, labels: ["Warp Records"], genres: ["Electronic", "Jazz"], formats: ["LP"], rating: 4 },
  { id: "i08", release_id: 7390123, instance_id: 91029302, folder_id: 1, folder_name: "All", date_added: "2023-09-18T00:00:00Z", artist: "Autechre", title: "Tri Repetae", year: 1995, labels: ["Warp Records"], genres: ["Electronic"], formats: ["2×LP"], rating: 4 },
  { id: "i09", release_id: 8801230, instance_id: 100293021, folder_id: 3, folder_name: "Vinyl", date_added: "2024-02-14T00:00:00Z", artist: "Arca", title: "Mutant", year: 2015, labels: ["Mute"], genres: ["Electronic"], formats: ["LP"], rating: 4 },
  { id: "i10", release_id: 9120320, instance_id: 112930293, folder_id: 2, folder_name: "Digital", date_added: "2024-06-01T00:00:00Z", artist: "Oneohtrix Point Never", title: "R Plus Seven", year: 2013, labels: ["Software"], genres: ["Electronic"], formats: ["LP"], rating: 4 },
];

export const previewResult = {
  snapshot_id: "snap-001",
  selected_count: 234,
  retained_count: 891,
  duplicate_release_ids: [1285919, 2049210, 4910230],
  selected_items: collectionItems.slice(0, 5),
  warnings: [
    { code: "METADATA_LOSS", message: "date_added cannot be preserved — Discogs API limitation" },
  ],
  blocking_conflicts: [],
  metadata_capabilities: {},
};

export const jobDetail = {
  job: {
    id: "job-20260330-001",
    name: "Digital archive split",
    source_account_id: "acc-src-001",
    destination_account_id: "acc-dst-001",
    snapshot_id: "snap-001",
    workflow_mode: "copy" as const,
    status: "running_copy",
    created_at: "2026-03-30T15:00:00Z",
    updated_at: "2026-03-30T15:02:44Z",
    started_at: "2026-03-30T15:00:12Z",
    finished_at: null,
    summary: { total: 234, copied: 87, failed: 0, skipped: 3 },
  },
  events: [
    { id: "ev1", job_id: "job-20260330-001", level: "info" as const, message: "Job started. Processing 234 items.", created_at: "2026-03-30T15:00:12Z" },
    { id: "ev2", job_id: "job-20260330-001", level: "info" as const, message: "Batch 1/8 complete. 30 items copied.", created_at: "2026-03-30T15:00:42Z" },
    { id: "ev3", job_id: "job-20260330-001", level: "warning" as const, message: "Rate limit approached (52/60 req/min). Throttling.", created_at: "2026-03-30T15:01:02Z" },
    { id: "ev4", job_id: "job-20260330-001", level: "info" as const, message: "Batch 2/8 complete. 60 items copied.", created_at: "2026-03-30T15:01:44Z" },
    { id: "ev5", job_id: "job-20260330-001", level: "info" as const, message: "Batch 3/8 complete. 87 items copied.", created_at: "2026-03-30T15:02:44Z" },
  ],
  items: collectionItems.slice(0, 8).map((item, i) => ({
    id: `ji${i}`,
    job_id: "job-20260330-001",
    snapshot_item_id: item.id,
    release_id: item.release_id,
    instance_id: item.instance_id,
    source_folder_id: item.folder_id,
    destination_folder_id: 1,
    status: i < 6 ? "copied" : "pending",
    attempt_count: 1,
    destination_instance_id: i < 6 ? 90000000 + i : null,
    message: null,
    updated_at: "2026-03-30T15:02:44Z",
  })),
};
