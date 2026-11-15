interface Env {
  GITHUB_TOKEN?: string;
}

interface ReportPayload {
  type?: "bug" | "feature";
  title?: string;
  website?: string; // honeypot
  contact?: string;
  // Bug fields
  description?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  os?: string;
  rustVersion?: string;
  engineVersion?: string;
  // Feature fields
  summary?: string;
  motivation?: string;
  proposedDesign?: string;
}

const REPO_OWNER = "Kharisdestianmaulana-hub";
const REPO_NAME = "blanc-engine";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function clean(val: unknown, max = 4000): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, max);
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  if (!env.GITHUB_TOKEN) {
    return jsonResponse(
      {
        error:
          "Server is missing GITHUB_TOKEN configuration. Please set it in Cloudflare Pages Variables and Secrets.",
      },
      500
    );
  }

  let payload: ReportPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  // Honeypot check
  if (clean(payload.website, 200)) {
    return jsonResponse({ ok: true, issueUrl: null });
  }

  const type = payload.type === "feature" ? "feature" : "bug";
  const rawTitle = clean(payload.title, 180);
  const contact = clean(payload.contact, 160);

  if (rawTitle.length < 4) {
    return jsonResponse(
      { error: "Title must be at least 4 characters." },
      400
    );
  }

  let issueTitle = "";
  let issueBody = "";
  let labels: string[] = [];

  if (type === "bug") {
    const description = clean(payload.description, 4000);
    const steps = clean(payload.steps, 4000);
    const expected = clean(payload.expected, 2000);
    const actual = clean(payload.actual, 2000);
    const os = clean(payload.os, 120) || "Not specified";
    const rustVersion = clean(payload.rustVersion, 120) || "N/A (Pre-built binary)";
    const engineVersion = clean(payload.engineVersion, 120) || "Not specified";

    if (description.length < 10 || steps.length < 5) {
      return jsonResponse(
        { error: "Please provide a clear description and steps to reproduce." },
        400
      );
    }

    issueTitle = rawTitle.startsWith("[Bug]") ? rawTitle : `[Bug] ${rawTitle}`;
    labels = ["bug"];
    issueBody = [
      "## Description",
      description,
      "",
      "## Steps to Reproduce",
      steps,
      "",
      "## Expected Behavior",
      expected || "Not specified",
      "",
      "## Actual Behavior",
      actual || "Not specified",
      "",
      "## Environment",
      `- OS: ${os}`,
      `- Rust Version (\`rustc --version\`): ${rustVersion}`,
      `- Blanc Engine Commit / Version: ${engineVersion}`,
      contact ? `- Contact (from web form): ${contact}` : "",
      "",
      "---",
      "_Submitted via Blanc Engine Website (`/feedback`) without a GitHub account._",
    ]
      .filter((line) => line !== "")
      .join("\n");
  } else {
    const summary = clean(payload.summary, 4000);
    const motivation = clean(payload.motivation, 3000);
    const proposedDesign = clean(payload.proposedDesign, 3000);

    if (summary.length < 10 || motivation.length < 5) {
      return jsonResponse(
        { error: "Please provide a feature summary and motivation / use case." },
        400
      );
    }

    issueTitle = rawTitle.startsWith("[Feature]")
      ? rawTitle
      : `[Feature] ${rawTitle}`;
    labels = ["enhancement"];
    issueBody = [
      "## Summary",
      summary,
      "",
      "## Motivation / Use Case",
      motivation,
      "",
      "## Proposed Design (Optional)",
      proposedDesign || "None specified.",
      contact ? `\n## Contact\n${contact}` : "",
      "",
      "---",
      "_Submitted via Blanc Engine Website (`/feedback`) without a GitHub account._",
    ]
      .filter((line) => line !== "")
      .join("\n");
  }

  const ghRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "blanc-engine-website",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels,
      }),
    }
  );

  if (!ghRes.ok) {
    const errText = await ghRes.text();
    return jsonResponse(
      {
        error: `GitHub API error (${ghRes.status}): Unable to create issue.`,
        detail: errText.slice(0, 300),
      },
      502
    );
  }

  const created = (await ghRes.json()) as { html_url: string; number: number };
  return jsonResponse({
    ok: true,
    issueNumber: created.number,
    issueUrl: created.html_url,
  });
}
