export const prerender = true;

const site = "https://getblanc.pages.dev";

const pages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/download/", priority: "0.9", changefreq: "weekly" },
  { path: "/docs/", priority: "0.8", changefreq: "monthly" },
  { path: "/showcase/", priority: "0.8", changefreq: "weekly" },
  { path: "/changelog/", priority: "0.7", changefreq: "weekly" },
  { path: "/feedback/", priority: "0.6", changefreq: "monthly" },
];

export async function GET() {
  const lastmod = new Date().toISOString().split("T")[0];
  const urls = pages
    .map(
      (p) => `  <url>
    <loc>${site}${p.path}</loc>
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
