// Cloudflare Pages Function: POST /api/admin/auth
// Validates admin password against environment variable ADMIN_PASSWORD

interface Env {
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

export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  try {
    const body = (await context.request.json()) as { password?: string };
    const password = (body?.password || "").trim();

    const expected = (context.env.ADMIN_PASSWORD || "blanc2026").trim();

    if (!password) {
      return jsonResponse({ error: "Password is required" }, 400);
    }

    if (password !== expected) {
      return jsonResponse({ error: "Invalid admin password" }, 401);
    }

    return jsonResponse({
      success: true,
      message: "Authenticated successfully",
      token: expected,
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Failed to parse login request" }, 400);
  }
}
