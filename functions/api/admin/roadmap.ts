// Cloudflare Pages Function: /api/admin/roadmap
// Admin management for Roadmap milestones (POST create, PUT update, DELETE)

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

// POST: Add new roadmap item
export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const body = (await context.request.json()) as Record<string, any>;
    const { version, target_date, status, category, title, description, sort_order } = body;

    if (!version || !title || !description) {
      return jsonResponse({ error: "Version, Title, and Description are required" }, 400);
    }

    await db
      .prepare(
        `INSERT INTO roadmap (version, target_date, status, category, title, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        version.trim(),
        (target_date || "").trim(),
        status || "In Progress",
        category || "General",
        title.trim(),
        description.trim(),
        Number(sort_order) || 0
      )
      .run();

    return jsonResponse({ success: true, message: "Roadmap milestone added successfully" }, 201);
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to add roadmap item" }, 500);
  }
}

// PUT: Update milestone (quick status toggle or full edit)
export async function onRequestPut(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const body = (await context.request.json()) as Record<string, any>;
    const { id, status, version, target_date, category, title, description, sort_order } = body;

    if (!id) return jsonResponse({ error: "Milestone ID is required" }, 400);

    // Quick status update
    if (status !== undefined && title === undefined) {
      await db.prepare("UPDATE roadmap SET status = ? WHERE id = ?").bind(status, id).run();
      return jsonResponse({ success: true, message: `Status updated to ${status}` });
    }

    // Full update
    await db
      .prepare(
        `UPDATE roadmap
         SET version = ?, target_date = ?, status = ?, category = ?, title = ?, description = ?, sort_order = ?
         WHERE id = ?`
      )
      .bind(
        (version || "").trim(),
        (target_date || "").trim(),
        status || "In Progress",
        (category || "General").trim(),
        (title || "").trim(),
        (description || "").trim(),
        Number(sort_order) || 0,
        id
      )
      .run();

    return jsonResponse({ success: true, message: "Milestone updated successfully" });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to update milestone" }, 500);
  }
}

// DELETE: Delete milestone
export async function onRequestDelete(context: { env: Env; request: Request }): Promise<Response> {
  if (!checkAdminAuth(context.request, context.env)) {
    return jsonResponse({ error: "Unauthorized access" }, 401);
  }

  const db = context.env.DB;
  if (!db) return jsonResponse({ error: "D1 database is not configured" }, 503);

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id) return jsonResponse({ error: "Milestone ID is required" }, 400);

    await db.prepare("DELETE FROM roadmap WHERE id = ?").bind(id).run();
    return jsonResponse({ success: true, message: "Milestone deleted successfully" });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to delete milestone" }, 500);
  }
}
