interface Env {
  GITHUB_TOKEN?: string;
}

const REPO_API = "https://api.github.com/repos/Kharisdestianmaulana-hub/blanc-engine";
const RELEASES_API = `${REPO_API}/releases`;

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "blanc-engine-website",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (context.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${context.env.GITHUB_TOKEN}`;
  }

  try {
    const [repoRes, relRes] = await Promise.all([
      fetch(REPO_API, { headers }),
      fetch(RELEASES_API, { headers }),
    ]);

    let stars: number | null = null;
    if (repoRes.ok) {
      const repoData = (await repoRes.json()) as { stargazers_count?: number };
      if (typeof repoData.stargazers_count === "number") {
        stars = repoData.stargazers_count;
      }
    }

    let latestTag: string | null = null;
    let totalDownloads: number | null = null;
    let releases: unknown[] = [];

    if (relRes.ok) {
      const raw = (await relRes.json()) as Array<{
        tag_name?: string;
        name?: string;
        prerelease?: boolean;
        draft?: boolean;
        published_at?: string;
        html_url?: string;
        body?: string;
        assets?: Array<{
          name?: string;
          size?: number;
          browser_download_url?: string;
          download_count?: number;
        }>;
      }>;

      if (Array.isArray(raw)) {
        const published = raw.filter((r) => !r.draft);
        releases = published;
        if (published[0]?.tag_name) {
          latestTag = published[0].tag_name;
        }
        let sum = 0;
        for (const rel of published) {
          if (!Array.isArray(rel.assets)) continue;
          for (const asset of rel.assets) {
            if (typeof asset.download_count === "number") {
              sum += asset.download_count;
            }
          }
        }
        totalDownloads = sum;
      }
    }

    return new Response(
      JSON.stringify({ stars, latestTag, totalDownloads, releases }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60, s-maxage=120",
        },
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch GitHub stats" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
