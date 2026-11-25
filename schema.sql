CREATE TABLE IF NOT EXISTS showcase (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  cover_url TEXT NOT NULL,
  screenshots TEXT DEFAULT '[]',
  status TEXT DEFAULT 'In Development',
  steam_url TEXT DEFAULT '',
  itch_url TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  is_approved INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_showcase_approved ON showcase(is_approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_showcase_slug ON showcase(slug);

CREATE TABLE IF NOT EXISTS roadmap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL,
  target_date TEXT DEFAULT '',
  status TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roadmap_order ON roadmap(sort_order ASC, created_at ASC);

INSERT OR IGNORE INTO roadmap (version, target_date, status, category, title, description, sort_order)
VALUES
  ('v0.1.1', '2026-11-20', 'Completed', 'Security & Stability', 'Atomic File Writes & Corruption Guard', 'Replaced direct writes with atomic temp-file writes for .blanc, scenes, settings, and saves to prevent corruption on unexpected shutdowns.', 1),
  ('v0.1.1', '2026-11-20', 'Completed', 'Security & Core', 'Path Traversal & Bounds Validation', 'Added safe_join_relative and bounds checks for .bpack archives and installer extraction to block path traversal and out-of-memory crashes.', 2),
  ('v0.1.1', '2026-11-20', 'Completed', 'Core & Safety', 'System & Root Folder Deletion Guard', 'Added strict directory safety validation blocking accidental deletion of user profile folders (Documents, Desktop, or drive roots).', 3),
  ('v0.1.1', '2026-11-20', 'Completed', 'Runtime & Controls', 'Full Keyboard & Gamepad Settings Navigation', 'Added Tab, Shift+Tab, Q, E, and Arrow keys to switch Settings tabs (Audio, Gameplay, System), and unblocked WASD navigation in menus.', 4),
  ('v0.1.1', '2026-11-20', 'Completed', 'Runtime & Audio', 'Scene Recursion Guard & Save Audio Fix', 'Added recursion depth limiter to prevent freeze on cyclic flow nodes, and fixed duplicate BGM playback when loading saves.', 5),
  ('v0.1.1', '2026-11-20', 'Completed', 'Editor & UX', 'Localization Docs & Safe Project Deletion', 'Added Localization guide in Learn & Docs, confirmation dialog for project removal, and excluded build/backup folders from export.', 6),
  ('v0.1.1', '2026-11-20', 'Completed', 'Installer', 'Manifest-Based Clean Uninstaller', 'Recorded installed files in .blanc_uninstall.json so uninstallation only removes game files and leaves unrelated folders untouched.', 7),
  ('v0.2.0', '2026-12-25', 'In Progress', 'UI & UX', 'Next-Gen Free-Form UI Canvas Studio', '3-panel studio (Hierarchy, 1920x1080 Gizmo Canvas, Inspector) for free-form drag-and-drop menu design, nine-slice margins, and zero-code data binding.', 8),
  ('v0.2.0', '2026-12-25', 'Completed', 'Core & Story Flow', 'Visual Variables & Condition Branching', 'Variable Manager (Boolean, Number, String), Modify Variable action blocks, and Condition Nodes in Story Flow for multi-ending route logic.', 9),
  ('v0.2.0', '2026-12-25', 'In Progress', 'Gameplay & Choices', 'Choice Requirements & Conditional Visibility', 'Lock or hide dialogue choice options based on player variable stats, character affection levels, or inventory flags.', 10),
  ('v0.2.0', '2026-12-25', 'In Progress', 'Features & Extras', 'Unlockable CG Gallery & Music Room', 'Persistent cross-playthrough unlock system (persistent_data.bdata) with built-in fullscreen event CG viewer and BGM player rooms.', 11),
  ('v0.2.0', '2026-12-25', 'In Progress', 'Runtime & Dialogue', 'Dynamic Rich Text & Dialogue Effects', 'Inline tags for typewriter pauses ({w=0.5}), speed overrides ({speed=0.01}), text animations ({shake}, {wave}), and inline color formatting.', 12),
  ('v0.2.0', '2026-12-25', 'In Progress', 'Visual Effects & Camera', '2D Camera Effects (Shake, Zoom, Pan & Screen Flash)', 'Cinematic Action Blocks for screen shakes with intensity curves, smooth camera zoom/pan, and screen flashes without video dependencies.', 13),
  ('v0.2.0', '2026-12-25', 'In Progress', 'Export & Platform', 'Native macOS Universal Binary Export (.app & .dmg)', 'One-click export supporting Apple Silicon (M1-M4) and Intel Macs with automated multi-platform GitHub Actions CI builds.', 14),
  ('v0.2.0', '2026-12-25', 'In Progress', 'Editor & Ecosystem', 'In-App Version Update Checker & Notifications', 'Asynchronous GitHub Releases query displaying subtle update badges in the Project Hub with one-click changelog access.', 15);
