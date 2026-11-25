// Cloudflare Pages Function: GET /api/showcase & POST /api/showcase
// Interacts with Cloudflare D1 Database binding 'DB'

interface Env {
  DB?: any;
}

interface ShowcaseRow {
  id: number;
  slug: string;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  screenshots: string;
  status: string;
  steam_url: string;
  itch_url: string;
  contact: string;
  is_approved: number;
  is_featured: number;
  created_at: string;
}

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

function slugify(text: string): string {
  const base = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
  return base || `game-${Date.now().toString(36)}`;
}

// GET: Fetch all approved games for showcase display
export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  const db = context.env.DB;

  if (!db) {
    return jsonResponse({
      status: "fallback",
      message: "D1 database binding 'DB' not detected. Please configure in Cloudflare Pages settings.",
      games: [],
    });
  }

  try {
    const url = new URL(context.request.url);
    const slug = url.searchParams.get("slug");

    // Single game detail query
    if (slug) {
      const row = await db
        .prepare("SELECT * FROM showcase WHERE slug = ? AND is_approved = 1 LIMIT 1")
        .bind(slug)
        .first();

      if (!row) {
        return jsonResponse({ error: "Game not found" }, 404);
      }

      return jsonResponse({
        game: {
          ...row,
          screenshots: typeof row.screenshots === "string" ? JSON.parse(row.screenshots || "[]") : row.screenshots,
        },
      });
    }

    // List all approved games
    const { results } = await db
      .prepare(
        "SELECT id, slug, title, author, description, cover_url, screenshots, status, steam_url, itch_url, is_featured, created_at FROM showcase WHERE is_approved = 1 ORDER BY is_featured DESC, created_at DESC"
      )
      .all();

    const formatted = (results as ShowcaseRow[]).map((r) => ({
      ...r,
      screenshots: typeof r.screenshots === "string" ? JSON.parse(r.screenshots || "[]") : r.screenshots,
    }));

    return jsonResponse({ status: "ok", games: formatted });
  } catch (err: any) {
    return jsonResponse({ status: "error", message: err?.message || "Failed to query D1 database" }, 500);
  }
}

// POST: Submit a new showcase game (stored as is_approved = 0 for review)
export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  const db = context.env.DB;

  if (!db) {
    return jsonResponse(
      { error: "D1 database binding 'DB' is not configured yet. Please configure in Cloudflare Pages Settings." },
      503
    );
  }

  try {
    const body = await context.request.json() as Record<string, any>;
    const { title, author, description, cover, screenshots, status, steam, itch, contact } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return jsonResponse({ error: "Title is required" }, 400);
    }
    if (!author || typeof author !== "string" || !author.trim()) {
      return jsonResponse({ error: "Author is required" }, 400);
    }
    if (!cover || typeof cover !== "string" || !cover.trim()) {
      return jsonResponse({ error: "Cover image URL is required" }, 400);
    }

    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();
    const cleanDesc = (description || "").toString().trim().slice(0, 1000);
    const cleanCover = cover.trim();
    const cleanStatus = (status || "In Development").toString().trim();
    const cleanSteam = (steam || "").toString().trim();
    const cleanItch = (itch || "").toString().trim();
    const cleanContact = (contact || "").toString().trim();

    // Prepare screenshots array
    let screenshotsJson = "[]";
    if (Array.isArray(screenshots)) {
      const validUrls = screenshots.filter((s: unknown) => typeof s === "string" && s.trim());
      screenshotsJson = JSON.stringify(validUrls);
    }

    // Generate unique slug
    let baseSlug = slugify(cleanTitle);
    const existing = await db
      .prepare("SELECT id FROM showcase WHERE slug = ? LIMIT 1")
      .bind(baseSlug)
      .first();

    if (existing) {
      baseSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    // Insert into D1 (is_approved = 0 by default for moderation)
    await db
      .prepare(
        `INSERT INTO showcase (slug, title, author, description, cover_url, screenshots, status, steam_url, itch_url, contact, is_approved, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
      )
      .bind(
        baseSlug,
        cleanTitle,
        cleanAuthor,
        cleanDesc,
        cleanCover,
        screenshotsJson,
        cleanStatus,
        cleanSteam,
        cleanItch,
        cleanContact
      )
      .run();

    return jsonResponse(
      {
        success: true,
        message: "Thank you! Your game was submitted and will be displayed after a quick review.",
        slug: baseSlug,
      },
      201
    );
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Internal server error submitting game" }, 500);
  }
}
