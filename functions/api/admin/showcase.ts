// Cloudflare Pages Function: /api/admin/showcase
// Admin management for Showcase games (GET all, POST create, PUT update/approve, DELETE)

interface Env {
  DB?: any;
  ADMIN_PASSWORD?: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function checkAdminAuth(request: Request, env: Env): boolean {
  const expected = (env.ADMIN_PASSWORD || "blanc2026").trim();
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const keyHeader = (request.headers.get("x-admin-key") || "").trim();
  return token === expected || keyHeader === expected;
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

// GET: Fetch all submissions (including pending reviews)
export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: "D1 database 'DB' is not configured in Cloudflare Pages." }, 503);
  }

  try {
    const { results } = await db
      .prepare(
        "SELECT id, slug, title, author, description, cover_url, screenshots, status, steam_url, itch_url, contact, is_approved, is_featured, created_at FROM showcase ORDER BY created_at DESC"
      )
      .all();

    const formatted = (results || []).map((r: any) => ({
      ...r,
      screenshots: typeof r.screenshots === "string" ? JSON.parse(r.screenshots || "[]") : r.screenshots,
    }));

    return jsonResponse({ success: true, games: formatted });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to query showcase" }, 500);
  }
}

// POST: Create a new game directly from admin (is_approved = 1)
export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const body = (await context.request.json()) as Record<string, any>;
    const { title, author, description, cover, screenshots, status, steam, itch, contact, is_featured } = body;

    if (!title || !author || !cover) {
      return jsonResponse({ error: "Title, Author, and Cover URL are required" }, 400);
    }

    let baseSlug = slugify(title);
    const existing = await db.prepare("SELECT id FROM showcase WHERE slug = ? LIMIT 1").bind(baseSlug).first();
    if (existing) baseSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

    const screenshotsJson = Array.isArray(screenshots) ? JSON.stringify(screenshots) : "[]";

    await db
      .prepare(
        `INSERT INTO showcase (slug, title, author, description, cover_url, screenshots, status, steam_url, itch_url, contact, is_approved, is_featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
      )
      .bind(
        baseSlug,
        title.trim(),
        author.trim(),
        (description || "").trim(),
        cover.trim(),
        screenshotsJson,
        status || "Released",
        (steam || "").trim(),
        (itch || "").trim(),
        (contact || "").trim(),
        is_featured ? 1 : 0
      )
      .run();

    return jsonResponse({ success: true, message: "Game created successfully" }, 201);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to create game" }, 500);
  }
}

// PUT: Update an existing game (approve, feature, edit details)
export async function onRequestPut(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const body = (await context.request.json()) as Record<string, any>;
    const { id, is_approved, is_featured, title, author, description, cover_url, status, steam_url, itch_url } = body;

    if (!id) return jsonResponse({ error: "Game ID is required" }, 400);

    // If partial toggle action (quick approve or feature)
    if (is_approved !== undefined && title === undefined) {
      await db.prepare("UPDATE showcase SET is_approved = ? WHERE id = ?").bind(is_approved ? 1 : 0, id).run();
      return jsonResponse({ success: true, message: `Status updated to ${is_approved ? "Approved" : "Pending"}` });
    }

    if (is_featured !== undefined && title === undefined) {
      await db.prepare("UPDATE showcase SET is_featured = ? WHERE id = ?").bind(is_featured ? 1 : 0, id).run();
      return jsonResponse({ success: true, message: `Featured status updated to ${is_featured ? "Featured" : "Normal"}` });
    }

    // Full update
    await db
      .prepare(
        `UPDATE showcase
         SET title = ?, author = ?, description = ?, cover_url = ?, status = ?, steam_url = ?, itch_url = ?, is_approved = ?, is_featured = ?
         WHERE id = ?`
      )
      .bind(
        (title || "").trim(),
        (author || "").trim(),
        (description || "").trim(),
        (cover_url || "").trim(),
        status || "In Development",
        (steam_url || "").trim(),
        (itch_url || "").trim(),
        is_approved ? 1 : 0,
        is_featured ? 1 : 0,
        id
      )
      .run();

    return jsonResponse({ success: true, message: "Game updated successfully" });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to update game" }, 500);
  }
}

// DELETE: Delete a game
export async function onRequestDelete(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id) return jsonResponse({ error: "Game ID is required" }, 400);

    await db.prepare("DELETE FROM showcase WHERE id = ?").bind(id).run();
    return jsonResponse({ success: true, message: "Game deleted successfully" });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to delete game" }, 500);
  }
}
