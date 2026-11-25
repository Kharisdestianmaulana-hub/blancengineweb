interface Env {
  DB?: any;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  // 1. Redirect *.pages.dev to getblanc.web.id
  if (url.hostname.endsWith(".pages.dev")) {
    url.hostname = "getblanc.web.id";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  // 2. Block old /admin route: redirect to /404 immediately
  if (
    url.pathname === "/admin" ||
    url.pathname === "/admin/" ||
    url.pathname.startsWith("/admin/")
  ) {
    return Response.redirect(new URL("/404", url).toString(), 302);
  }

  // 3. Dynamic Open Graph metadata injection for Blog Posts (WhatsApp, Twitter, Facebook preview)
  const slug = url.searchParams.get("slug");
  if (url.pathname.startsWith("/blog/post") && slug) {
    const res = await context.next();

    let postTitle = "";
    let postExcerpt = "";
    let postCover = "";

    // Query D1 database if binding exists
    if (context.env?.DB) {
      try {
        const row = await context.env.DB.prepare(
          "SELECT title, excerpt, cover_url FROM posts WHERE slug = ? AND is_published = 1 LIMIT 1"
        )
          .bind(slug)
          .first<{ title: string; excerpt: string; cover_url: string }>();

        if (row) {
          postTitle = row.title;
          postExcerpt = row.excerpt;
          postCover = row.cover_url;
        }
      } catch {
        // Fallback
      }
    }

    // Fallback for default post
    if (!postTitle && slug === "welcome-to-blanc-engine") {
      postTitle = "Welcome to Blanc Engine: The Next-Gen No-Code Visual Novel Engine";
      postExcerpt = "Introducing Blanc Engine, a modern visual screenplay and timeline editor designed for indie visual novel creators and storytellers.";
      postCover = "/screenshots/SS_OVERVIEW.png";
    }

    if (postTitle) {
      const fullTitle = `${postTitle} | Blanc Engine Blog`;
      const fullDesc = postExcerpt || "Read official devlog and release announcements from Blanc Engine.";
      let fullImage = postCover || "/screenshots/SS_OVERVIEW.png";
      if (fullImage.startsWith("/")) {
        fullImage = `https://getblanc.web.id${fullImage}`;
      }

      return new HTMLRewriter()
        .on("title", {
          element(el) {
            el.setInnerContent(fullTitle);
          },
        })
        .on('meta[property="og:title"]', {
          element(el) {
            el.setAttribute("content", fullTitle);
          },
        })
        .on('meta[property="og:description"]', {
          element(el) {
            el.setAttribute("content", fullDesc);
          },
        })
        .on('meta[property="og:image"]', {
          element(el) {
            el.setAttribute("content", fullImage);
          },
        })
        .on('meta[property="og:image:alt"]', {
          element(el) {
            el.setAttribute("content", fullTitle);
          },
        })
        .on('meta[property="og:url"]', {
          element(el) {
            el.setAttribute("content", url.toString());
          },
        })
        .on('meta[name="twitter:title"]', {
          element(el) {
            el.setAttribute("content", fullTitle);
          },
        })
        .on('meta[name="twitter:description"]', {
          element(el) {
            el.setAttribute("content", fullDesc);
          },
        })
        .on('meta[name="twitter:image"]', {
          element(el) {
            el.setAttribute("content", fullImage);
          },
        })
        .on('meta[name="description"]', {
          element(el) {
            el.setAttribute("content", fullDesc);
          },
        })
        .transform(res);
    }

    return res;
  }

  // 4. Dynamic Open Graph metadata injection for Showcase Games
  const gameId = url.searchParams.get("id");
  if (url.pathname.startsWith("/showcase/game") && gameId && context.env?.DB) {
    const res = await context.next();
    try {
      const game = await context.env.DB.prepare(
        "SELECT title, description, cover_url FROM showcase WHERE id = ? AND is_approved = 1 LIMIT 1"
      )
        .bind(Number(gameId))
        .first<{ title: string; description: string; cover_url: string }>();

      if (game) {
        const fullTitle = `${game.title} | Blanc Engine Showcase`;
        const fullDesc = game.description || "Explore this indie visual novel created with Blanc Engine.";
        let fullImage = game.cover_url || "/screenshots/SS_STORYFLOW.png";
        if (fullImage.startsWith("/")) {
          fullImage = `https://getblanc.web.id${fullImage}`;
        }

        return new HTMLRewriter()
          .on("title", {
            element(el) {
              el.setInnerContent(fullTitle);
            },
          })
          .on('meta[property="og:title"]', {
            element(el) {
              el.setAttribute("content", fullTitle);
            },
          })
          .on('meta[property="og:description"]', {
            element(el) {
              el.setAttribute("content", fullDesc);
            },
          })
          .on('meta[property="og:image"]', {
            element(el) {
              el.setAttribute("content", fullImage);
            },
          })
          .on('meta[name="twitter:title"]', {
            element(el) {
              el.setAttribute("content", fullTitle);
            },
          })
          .on('meta[name="twitter:description"]', {
            element(el) {
              el.setAttribute("content", fullDesc);
            },
          })
          .on('meta[name="twitter:image"]', {
            element(el) {
              el.setAttribute("content", fullImage);
            },
          })
          .transform(res);
      }
    } catch {
      // Fallback
    }
    return res;
  }

  return context.next();
};
