export const prerender = true;

const site = "https://getblanc.web.id";

interface SitemapEntry {
  path: string;
  priority: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
}

const pages: SitemapEntry[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/blog/", priority: "0.9", changefreq: "daily" },
  { path: "/download/", priority: "0.9", changefreq: "weekly" },
  { path: "/download/archive/", priority: "0.8", changefreq: "weekly" },
  { path: "/docs/", priority: "0.8", changefreq: "monthly" },
  { path: "/showcase/", priority: "0.8", changefreq: "weekly" },
  { path: "/roadmap/", priority: "0.8", changefreq: "weekly" },
  { path: "/changelog/", priority: "0.7", changefreq: "weekly" },
  { path: "/feedback/", priority: "0.6", changefreq: "monthly" },
  { path: "/blog/post/?slug=blanc-engine-v020-devlog-free-form-ui-canvas-studio-custom-ui-skins-and-visual-logic", priority: "0.8", changefreq: "monthly" },
  { path: "/blog/post/?slug=blanc-engine-v011-security-hardening-atomic-saves-and-runtime-stability", priority: "0.8", changefreq: "monthly" },
  { path: "/blog/post/?slug=blanc-engine-v010-released-write-design-and-ship-visual-novels-with-zero-code", priority: "0.8", changefreq: "monthly" },
  { path: "/blog/post/?slug=welcome-to-blanc-engine", priority: "0.8", changefreq: "monthly" },
];

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

export async function GET() {
  const lastmod = new Date().toISOString().split("T")[0];
  const urls = pages
    .map(
      (p) => `  <url>
    <loc>${escapeXml(`${site}${p.path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
