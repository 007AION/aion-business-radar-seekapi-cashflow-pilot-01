import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const EXPECTED_HOSTS = [
  "assafelovic/gpt-researcher",
  "open-webui/open-webui",
  "langgenius/dify",
  "BerriAI/litellm",
  "browser-use/browser-use",
  "crewAIInc/crewAI",
  "microsoft/autogen",
  "unclecode/crawl4ai",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function headers() {
  return {
    Authorization: `Bearer ${requireEnv("GITHUB_TOKEN")}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function githubGet(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const resp = await fetch(u.toString(), { headers: headers() });
  if (!resp.ok) throw new Error(`GitHub API error ${resp.status} for ${url}`);
  return await resp.json();
}

async function fetchItems(repo, type, since, paginated) {
  const perPage = paginated ? 100 : 50;
  const maxPages = paginated ? 3 : 1;
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const params = { state: "all", sort: "updated", direction: "desc", per_page: String(perPage), page: String(page) };
    if (type === "issues") params.since = since.toISOString();
    const pageItems = await githubGet(`https://api.github.com/repos/${repo}/${type}`, params);
    const filtered = type === "pulls" ? pageItems.filter((i) => new Date(i.updated_at ?? 0) >= since) : pageItems;
    all.push(...filtered);
    if (pageItems.length < perPage) break;
    const last = pageItems[pageItems.length - 1];
    if (last?.updated_at && new Date(last.updated_at) < since) break;
  }
  return all;
}

async function fetchReleases(repo, since) {
  const releases = await githubGet(`https://api.github.com/repos/${repo}/releases`, { per_page: "20" });
  return releases.filter((r) => new Date(r.published_at ?? 0) >= since);
}

function topTitles(items, prefix, limit) {
  return items.slice(0, limit).map((item) => {
    const n = item.number ? `#${item.number} ` : item.tag_name ? `${item.tag_name} ` : "";
    return `${prefix} ${n}${item.title ?? item.name ?? "untitled"}`.trim();
  });
}

function loadHosts() {
  const configPath = process.env.RADAR_CONFIG ?? "config/aion-cashflow-pilot-hosts.yml";
  const raw = yaml.load(fs.readFileSync(configPath, "utf8"));
  const hosts = raw.host_candidates ?? [];
  const repos = hosts.map((h) => h.repo);
  const expected = JSON.stringify(EXPECTED_HOSTS);
  if (hosts.length !== 8 || JSON.stringify(repos) !== expected) {
    throw new Error(`Host guard failed. Expected exact #767 host order ${expected}; got ${JSON.stringify(repos)}`);
  }
  return hosts;
}

function renderDigest(results, generatedAt, durationMs, actionsRunUrl) {
  const total = results.reduce((sum, r) => sum + r.counts.total, 0);
  const failures = results.flatMap((r) => r.failures.map((f) => `${r.host.repo}: ${f}`));
  const rows = results
    .map((r) => `| ${r.host.name} | ${r.host.repo} | ${r.counts.issues} | ${r.counts.prs} | ${r.counts.releases} | ${r.counts.total} |`)
    .join("\n");
  const signalSections = results
    .map((r) => {
      const signals = r.topSignals.length ? r.topSignals.map((s) => `- ${s}`).join("\n") : "- 过去 24 小时未发现 issue/PR/release 更新。";
      return `### ${r.host.name}\n\n${signals}`;
    })
    .join("\n\n");

  return `# AION Business Radar v0.1 — SEEKAPI_CASHFLOW_PILOT_01\n\n` +
    `> 生成时间: ${generatedAt} UTC | Host count: ${results.length} | Source fetch total: ${total} | Provider mode: no-paid/local-template | Runtime: ${(durationMs / 1000).toFixed(1)}s\n\n` +
    `## 执行边界\n\n` +
    `- 上游来源: duanyytop/agents-radar @ 8063466e6c89d440c9d4076d2a6b7d83a9a7f758\n` +
    `- 运行方式: GitHub Actions 手动触发；recurring schedule disabled\n` +
    `- LLM/provider: no-paid/local-template（未使用付费 LLM credential）\n` +
    `- Actions run: ${actionsRunUrl}\n` +
    `- 禁区: 未安装 AION server；未新增 dashboard；未新增 vector DB；未新增 paid infra；未对监控仓库写评论/issue\n\n` +
    `## Source fetch counts\n\n` +
    `| Host | Repo | Issues | PRs | Releases | Total |\n|---|---|---:|---:|---:|---:|\n${rows}\n\n` +
    `## 中文信号摘要\n\n` +
    `${signalSections}\n\n` +
    `## Failures\n\n` +
    `${failures.length ? failures.map((f) => `- ${f}`).join("\n") : "- none"}\n`;
}

async function main() {
  const started = Date.now();
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
  const hosts = loadHosts();
  const actionsRunUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "LOCAL_RUN";

  console.log(`[aion-radar] starting | hosts=${hosts.length} | provider=no-paid/local-template`);
  const results = [];
  for (const host of hosts) {
    const failures = [];
    let issues = [];
    let pulls = [];
    let releases = [];
    try {
      const issuesRaw = await fetchItems(host.repo, "issues", since, Boolean(host.paginated));
      const prs = await fetchItems(host.repo, "pulls", since, Boolean(host.paginated));
      const rels = await fetchReleases(host.repo, since);
      issues = issuesRaw.filter((i) => !i.pull_request);
      pulls = prs;
      releases = rels;
    } catch (err) {
      failures.push(String(err));
    }
    console.log(`[${host.id}] issues=${issues.length} prs=${pulls.length} releases=${releases.length} failures=${failures.length}`);
    results.push({
      host,
      counts: { issues: issues.length, prs: pulls.length, releases: releases.length, total: issues.length + pulls.length + releases.length },
      topSignals: [...topTitles(issues, "Issue", 3), ...topTitles(pulls, "PR", 3), ...topTitles(releases, "Release", 2)].slice(0, 6),
      failures,
    });
  }

  const durationMs = Date.now() - started;
  const generatedAt = now.toISOString();
  const digest = renderDigest(results, generatedAt, durationMs, actionsRunUrl);
  const outDir = path.join("digests", dateStr);
  fs.mkdirSync(outDir, { recursive: true });
  const digestPath = path.join(outDir, "aion-business-radar.md");
  const evidencePath = path.join(outDir, "aion-business-radar.evidence.json");
  fs.writeFileSync(digestPath, digest, "utf8");
  fs.writeFileSync(
    evidencePath,
    JSON.stringify({
      project_id: "SEEKAPI_CASHFLOW_PILOT_01",
      provider_mode: "no-paid/local-template",
      host_count: hosts.length,
      hosts: hosts.map((h) => h.repo),
      source_fetch_counts: Object.fromEntries(results.map((r) => [r.host.repo, r.counts])),
      failures: results.flatMap((r) => r.failures.map((f) => ({ repo: r.host.repo, failure: f }))),
      runtime_duration_seconds: Number((durationMs / 1000).toFixed(1)),
      actions_run_url: actionsRunUrl,
      recurring_schedule_enabled: false,
      generated_digest: digestPath,
    }, null, 2),
    "utf8",
  );
  console.log(`[aion-radar] wrote ${digestPath}`);
  console.log(`[aion-radar] wrote ${evidencePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
