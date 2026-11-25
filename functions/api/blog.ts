// Cloudflare Pages Function: GET /api/blog
// Interacts with Cloudflare D1 Database binding 'DB' for public blog posts

interface Env {
  DB?: any;
}

interface PostRow {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_url: string;
  author: string;
  tags: string;
  is_published: number;
  published_at: string;
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

const DEFAULT_POSTS: PostRow[] = [
  {
    id: 1,
    slug: "welcome-to-blanc-engine",
    title: "Welcome to Blanc Engine: The Next-Gen No-Code Visual Novel Engine",
    excerpt: "Introducing Blanc Engine, a modern visual screenplay and timeline editor designed for indie visual novel creators and storytellers.",
    content: "Welcome to the official Blanc Engine devlog! Blanc Engine was created to make visual novel game development fast, visual, and accessible without writing complex script code.\n\n### What Makes Blanc Engine Unique?\n\n- **Screenplay-to-Scene Workflow**: Write character dialogues in a screenplay format, and scenes generate automatically.\n- **Interactive Story Flow**: Visual node canvas connecting scenes, branch choices, and multi-route endings.\n- **Native Packaging**: Package portable builds and standalone installers with one click.\n\nStay tuned for our upcoming v0.2.0 updates featuring the Free-Form UI Canvas Studio and Variable Manager!",
    cover_url: "/screenshots/SS_OVERVIEW.png",
    author: "Blanc Core Team",
    tags: "Announcements, Devlog",
    is_published: 1,
    published_at: "2026-11-25T12:00:00Z",
    created_at: "2026-11-25T12:00:00Z",
  },
];

export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  const db = context.env.DB;
  const url = new URL(context.request.url);
  const slug = url.searchParams.get("slug");

  if (!db) {
    if (slug) {
      const found = DEFAULT_POSTS.find((p) => p.slug === slug);
      if (found) return jsonResponse({ post: found });
      return jsonResponse({ error: "Post not found" }, 404);
    }
    return jsonResponse({ posts: DEFAULT_POSTS, source: "fallback" });
  }

  try {
    if (slug) {
      const post = await db
        .prepare("SELECT * FROM posts WHERE slug = ? AND is_published = 1 LIMIT 1")
        .bind(slug)
        .first();

      if (!post) {
        return jsonResponse({ error: "Post not found" }, 404);
      }
      return jsonResponse({ post });
    }

    const { results } = await db
      .prepare(
        "SELECT id, slug, title, excerpt, cover_url, author, tags, published_at FROM posts WHERE is_published = 1 ORDER BY published_at DESC"
      )
      .all();

    return jsonResponse({ posts: results || [] });
  } catch (err: any) {
    if (slug) {
      const found = DEFAULT_POSTS.find((p) => p.slug === slug);
      if (found) return jsonResponse({ post: found });
    }
    return jsonResponse({ posts: DEFAULT_POSTS, error: err?.message });
  }
}
