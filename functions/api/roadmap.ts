// Cloudflare Pages Function: GET /api/roadmap
// Interacts with Cloudflare D1 Database binding 'DB'

interface Env {
  DB?: any;
}

interface RoadmapRow {
  id: number;
  version: string;
  target_date: string;
  status: string;
  category: string;
  title: string;
  description: string;
  sort_order: number;
}

const DEFAULT_ROADMAP: Omit<RoadmapRow, "id">[] = [
  {
    version: "v0.1.1",
    target_date: "2026-11-20",
    status: "Completed",
    category: "Security & Stability",
    title: "Atomic File Writes & Corruption Guard",
    description:
      "Replaced direct writes with atomic temp-file writes for .blanc, scenes, settings, and saves to prevent corruption on unexpected shutdowns.",
    sort_order: 1,
  },
  {
    version: "v0.1.1",
    target_date: "2026-11-20",
    status: "Completed",
    category: "Security & Core",
    title: "Path Traversal & Bounds Validation",
    description:
      "Added safe_join_relative and bounds checks for .bpack archives and installer extraction to block path traversal and out-of-memory crashes.",
    sort_order: 2,
  },
  {
    version: "v0.1.1",
    target_date: "2026-11-20",
    status: "Completed",
    category: "Core & Safety",
    title: "System & Root Folder Deletion Guard",
    description:
      "Added strict directory safety validation blocking accidental deletion of user profile folders (Documents, Desktop, or drive roots).",
    sort_order: 3,
  },
  {
    version: "v0.1.1",
    target_date: "2026-11-20",
    status: "Completed",
    category: "Runtime & Controls",
    title: "Full Keyboard & Gamepad Settings Navigation",
    description:
      "Added Tab, Shift+Tab, Q, E, and Arrow keys to switch Settings tabs (Audio, Gameplay, System), and unblocked WASD navigation in menus.",
    sort_order: 4,
  },
  {
    version: "v0.1.1",
    target_date: "2026-11-20",
    status: "Completed",
    category: "Runtime & Audio",
    title: "Scene Recursion Guard & Save Audio Fix",
    description:
      "Added recursion depth limiter to prevent freeze on cyclic flow nodes, and fixed duplicate BGM playback when loading saves.",
    sort_order: 5,
  },
  {
    version: "v0.1.1",
    target_date: "2026-11-20",
    status: "Completed",
    category: "Editor & UX",
    title: "Localization Docs & Safe Project Deletion",
    description:
      "Added Localization guide in Learn & Docs, confirmation dialog for project removal, and excluded build/backup folders from export.",
    sort_order: 6,
  },
  {
    version: "v0.1.1",
    target_date: "2026-11-20",
    status: "Completed",
    category: "Installer",
    title: "Manifest-Based Clean Uninstaller",
    description:
      "Recorded installed files in .blanc_uninstall.json so uninstallation only removes game files and leaves unrelated folders untouched.",
    sort_order: 7,
  },
  {
    version: "v0.2.0",
    target_date: "2026-12-25",
    status: "In Progress",
    category: "UI & UX",
    title: "Next-Gen Free-Form UI Canvas Studio",
    description:
      "3-panel studio (Hierarchy, 1920x1080 Gizmo Canvas, Inspector) for free-form drag-and-drop menu design, nine-slice margins, and zero-code data binding.",
    sort_order: 8,
  },
  {
    version: "v0.2.0",
    target_date: "2026-12-25",
    status: "Completed",
    category: "Core & Story Flow",
    title: "Visual Variables & Condition Branching",
    description:
      "Variable Manager (Boolean, Number, String), Modify Variable action blocks, and Condition Nodes in Story Flow for multi-ending route logic.",
    sort_order: 9,
  },
  {
    version: "v0.2.0",
    target_date: "2026-12-25",
    status: "In Progress",
    category: "Gameplay & Choices",
    title: "Choice Requirements & Conditional Visibility",
    description:
      "Lock or hide dialogue choice options based on player variable stats, character affection levels, or inventory flags.",
    sort_order: 10,
  },
  {
    version: "v0.2.0",
    target_date: "2026-12-25",
    status: "In Progress",
    category: "Features & Extras",
    title: "Unlockable CG Gallery & Music Room",
    description:
      "Persistent cross-playthrough unlock system (persistent_data.bdata) with built-in fullscreen event CG viewer and BGM player rooms.",
    sort_order: 11,
  },
  {
    version: "v0.2.0",
    target_date: "2026-12-25",
    status: "In Progress",
    category: "Runtime & Dialogue",
    title: "Dynamic Rich Text & Dialogue Effects",
    description:
      "Inline tags for typewriter pauses ({w=0.5}), speed overrides ({speed=0.01}), text animations ({shake}, {wave}), and inline color formatting.",
    sort_order: 12,
  },
  {
    version: "v0.2.0",
    target_date: "2026-12-25",
    status: "In Progress",
    category: "Visual Effects & Camera",
    title: "2D Camera Effects (Shake, Zoom, Pan & Screen Flash)",
    description:
      "Cinematic Action Blocks for screen shakes with intensity curves, smooth camera zoom/pan, and screen flashes without video dependencies.",
    sort_order: 13,
  },
  {
    version: "v0.2.0",
    target_date: "2026-12-25",
    status: "In Progress",
    category: "Export & Platform",
    title: "Native macOS Universal Binary Export (.app & .dmg)",
    description:
      "One-click export supporting Apple Silicon (M1-M4) and Intel Macs with automated multi-platform GitHub Actions CI builds.",
    sort_order: 14,
  },
  {
    version: "v0.2.0",
    target_date: "2026-12-25",
    status: "In Progress",
    category: "Editor & Ecosystem",
    title: "In-App Version Update Checker & Notifications",
    description:
      "Asynchronous GitHub Releases query displaying subtle update badges in the Project Hub with one-click changelog access.",
    sort_order: 15,
  },
];

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const db = context.env.DB;

  if (!db) {
    return jsonResponse({
      status: "fallback",
      source: "local-seed",
      items: DEFAULT_ROADMAP.map((r, i) => ({ ...r, id: i + 1 })),
    });
  }

  try {
    const { results } = await db
      .prepare(
        "SELECT id, version, target_date, status, category, title, description, sort_order FROM roadmap ORDER BY sort_order ASC, created_at ASC"
      )
      .all();

    if (!results || results.length === 0) {
      return jsonResponse({
        status: "ok",
        source: "seed-fallback",
        items: DEFAULT_ROADMAP.map((r, i) => ({ ...r, id: i + 1 })),
      });
    }

    return jsonResponse({ status: "ok", source: "d1", items: results });
  } catch (err: any) {
    return jsonResponse(
      {
        status: "error",
        message: err?.message || "Failed to query D1 roadmap",
        items: DEFAULT_ROADMAP.map((r, i) => ({ ...r, id: i + 1 })),
      },
      200
    );
  }
}
