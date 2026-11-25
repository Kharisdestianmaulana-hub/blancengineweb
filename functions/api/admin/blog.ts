// Cloudflare Pages Function: /api/admin/blog
// Admin management for Blog Posts (GET all, POST create, PUT update, DELETE)

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
  return base || `post-${Date.now().toString(36)}`;
}

// GET: Fetch all posts (including drafts)
export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const { results } = await db
      .prepare("SELECT * FROM posts ORDER BY created_at DESC")
      .all();

    return jsonResponse({ success: true, posts: results || [] });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to query blog posts" }, 500);
  }
}

// POST: Create a new blog post
export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const body = (await context.request.json()) as Record<string, any>;
    const { title, excerpt, content, cover_url, author, tags, is_published } = body;

    if (!title || !content) {
      return jsonResponse({ error: "Title and Content are required" }, 400);
    }

    let baseSlug = slugify(title);
    const existing = await db.prepare("SELECT id FROM posts WHERE slug = ? LIMIT 1").bind(baseSlug).first();
    if (existing) baseSlug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

    await db
      .prepare(
        `INSERT INTO posts (slug, title, excerpt, content, cover_url, author, tags, is_published, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .bind(
        baseSlug,
        title.trim(),
        (excerpt || title).trim(),
        content.trim(),
        (cover_url || "").trim(),
        (author || "Blanc Team").trim(),
        (tags || "Devlog").trim(),
        is_published ? 1 : 0
      )
      .run();

    return jsonResponse({ success: true, message: "Blog post published successfully" }, 201);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to save blog post" }, 500);
  }
}

// PUT: Update an existing blog post
export async function onRequestPut(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const body = (await context.request.json()) as Record<string, any>;
    const { id, title, excerpt, content, cover_url, author, tags, is_published } = body;

    if (!id) return jsonResponse({ error: "Post ID is required" }, 400);

    // Quick toggle published status
    if (is_published !== undefined && title === undefined) {
      await db.prepare("UPDATE posts SET is_published = ? WHERE id = ?").bind(is_published ? 1 : 0, id).run();
      return jsonResponse({ success: true, message: `Status updated to ${is_published ? "Published" : "Draft"}` });
    }

    await db
      .prepare(
        `UPDATE posts
         SET title = ?, excerpt = ?, content = ?, cover_url = ?, author = ?, tags = ?, is_published = ?
         WHERE id = ?`
      )
      .bind(
        (title || "").trim(),
        (excerpt || "").trim(),
        (content || "").trim(),
        (cover_url || "").trim(),
        (author || "Blanc Team").trim(),
        (tags || "Devlog").trim(),
        is_published ? 1 : 0,
        id
      )
      .run();

    return jsonResponse({ success: true, message: "Post updated successfully" });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to update post" }, 500);
  }
}

// DELETE: Delete a blog post
export async function onRequestDelete(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id) return jsonResponse({ error: "Post ID is required" }, 400);

    await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();

    return jsonResponse({ success: true, message: "Post deleted successfully" });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to delete post" }, 500);
  }
}
