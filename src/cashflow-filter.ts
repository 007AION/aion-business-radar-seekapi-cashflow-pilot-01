import fs from "node:fs";
import path from "node:path";

const PROJECT_ID = "SEEKAPI_CASHFLOW_PILOT_01";
const MAX_CARDS = 3;

const HOST_NAME_TO_REPO: Record<string, string> = {
  "GPT Researcher": "assafelovic/gpt-researcher",
  "Open WebUI": "open-webui/open-webui",
  Dify: "langgenius/dify",
  LiteLLM: "BerriAI/litellm",
  "Browser Use": "browser-use/browser-use",
  CrewAI: "crewAIInc/crewAI",
  AutoGen: "microsoft/autogen",
  Crawl4AI: "unclecode/crawl4ai",
};

type SkuType = "launch_pack" | "rescue_pack" | "compatibility_pass" | "outcome_credit";
type Verdict = "BUILD" | "RESEARCH" | "WATCH" | "IGNORE";

export interface DigestSignal {
  observedAt: string;
  hostName: string;
  repo: string;
  kind: "Issue" | "PR" | "Release";
  number?: number;
  title: string;
  evidenceLinks: string[];
}

export interface OpportunityCard {
  opportunity_id: string;
  observed_at: string;
  host: {
    repo: string;
    upstream_ref_or_version: string;
  };
  signal: {
    exact_problem: string;
    evidence_links: string[];
    complaint_or_event_count: number;
    signal_type: string;
  };
  buyer: {
    exact_user_type: string;
    reachable_at: string;
    existing_spend_or_workaround: string;
  };
  offer: {
    sku_type: SkuType;
    sellable_product: string;
    manual_delivery_path: string;
    price_hypothesis: string;
  };
  economics: {
    direct_cost_known: string;
    support_minutes_hypothesis: string;
  };
  validation: {
    fastest_test: string;
    kill_criteria: string[];
  };
  risks: {
    license: string;
    security: string;
    acquisition: string;
  };
  verdict: Verdict;
  confidence: string;
}

export interface CashflowFilterResult {
  project_id: string;
  generated_from_digest: string;
  output_count_cap: number;
  malformed_digest_fail_closed: boolean;
  cards: OpportunityCard[];
  ignored_signals: Array<{
    host: string;
    repo: string;
    title: string;
    reason: string;
    evidence_links: string[];
  }>;
  forbidden_actions_preserved: Record<string, boolean>;
}

function requireMatch(text: string, regex: RegExp, message: string): RegExpMatchArray {
  const match = text.match(regex);
  if (!match) throw new Error(`Malformed digest: ${message}`);
  return match;
}

export function parseDigest(digestMarkdown: string): DigestSignal[] {
  requireMatch(
    digestMarkdown,
    /^# AION Business Radar v0\.1 — SEEKAPI_CASHFLOW_PILOT_01/m,
    "missing AION Business Radar title",
  );
  const observedAt = requireMatch(
    digestMarkdown,
    /> 生成时间: ([^|]+?) UTC/m,
    "missing generated timestamp",
  )[1]!.trim();
  requireMatch(digestMarkdown, /Host count: 8\b/, "host count must be 8");
  requireMatch(digestMarkdown, /## 中文信号摘要/m, "missing signal summary section");
  requireMatch(
    digestMarkdown,
    /## Failures\s*\n\s*- none/m,
    "failures must be explicit none for G1 card generation",
  );

  const signals: DigestSignal[] = [];
  const sectionRegex = /^### (.+?)\s*$([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm;
  let sectionMatch: RegExpExecArray | null;
  while ((sectionMatch = sectionRegex.exec(digestMarkdown)) !== null) {
    const hostName = sectionMatch[1]!.trim();
    const repo = HOST_NAME_TO_REPO[hostName];
    if (!repo) throw new Error(`Malformed digest: unknown host section ${hostName}`);
    const body = sectionMatch[2] ?? "";
    for (const line of body.split("\n")) {
      const item = line.match(/^- (Issue|PR|Release)(?: #?(\d+))?\s+(.+)$/);
      if (!item) continue;
      const kind = item[1] as DigestSignal["kind"];
      const number = item[2] ? Number(item[2]) : undefined;
      const title = item[3]!.trim();
      const evidencePath = kind === "Issue" ? "issues" : kind === "PR" ? "pull" : "releases";
      const evidenceLinks = number
        ? [`https://github.com/${repo}/${evidencePath}/${number}`]
        : [`https://github.com/${repo}/releases`];
      signals.push({
        observedAt,
        hostName,
        repo,
        kind,
        number,
        title,
        evidenceLinks,
      });
    }
  }

  if (signals.length === 0) throw new Error("Malformed digest: no parseable Issue/PR/Release signals");
  return signals;
}

function scoreSignal(signal: DigestSignal): number {
  const text = signal.title.toLowerCase();
  let score = 0;
  const weightedTerms: Array<[RegExp, number]> = [
    [
      /\bbug\b|broken|fail|failing|failure|error|500|404|leak|leaks|regression|rollback|abort|stranding|blocks?|pin blocks|timeout|vulnerable|security|eval\(\)/,
      5,
    ],
    [
      /cost|bill|price|pricing|spend|batch|provider|mcp|tool call|embedding|model|compatib|api key|offline_mode|download/,
      4,
    ],
    [/support|proposal|feat|docs|perf|ui|polish|example|test\(ci\)/, -2],
    [/mastery brain|abmc|litellm$/, -5],
  ];
  for (const [pattern, weight] of weightedTerms) if (pattern.test(text)) score += weight;
  if (signal.kind === "Issue") score += 3;
  if (signal.kind === "PR") score -= 1;
  if (/resale|scrap|spam|bulk outreach|bypass|evad/.test(text)) score -= 20;
  return score;
}

function classifySignal(signal: DigestSignal): {
  verdict: Verdict;
  reason: string;
} {
  const text = signal.title.toLowerCase();
  if (/resale|scrap|spam|bulk outreach|bypass|evad/.test(text))
    return {
      verdict: "IGNORE",
      reason: "forbidden spam/resale/evasion-oriented signal",
    };
  if (/mastery brain|polish|docs:|test\(ci\)|example|ui element|help trigger|abmc/.test(text))
    return {
      verdict: "IGNORE",
      reason: "low-value news or non-commercial maintenance item",
    };
  if (
    /cost|bill|price|batch|provider|mcp|tool call|compatib|offline_mode|download|timeout|vulnerable|security|500|404|leak|regression|rollback|blocks?/.test(
      text,
    )
  ) {
    return {
      verdict: "RESEARCH",
      reason: "evidence-backed pain, but buyer willingness is not validated",
    };
  }
  if (/feat|proposal|support/.test(text))
    return {
      verdict: "WATCH",
      reason: "possible need, but buyer/offer evidence is incomplete",
    };
  return { verdict: "IGNORE", reason: "does not match cashflow-weighted pain" };
}

function buyerFor(signal: DigestSignal): OpportunityCard["buyer"] {
  const repo = signal.repo.toLowerCase();
  if (repo.includes("litellm")) {
    return {
      exact_user_type:
        "AI platform operator running LiteLLM for multi-provider routing or batch cost reconciliation",
      reachable_at: signal.evidenceLinks[0]!,
      existing_spend_or_workaround:
        "Already operates paid model/provider traffic; workaround is manual retry/reconciliation when provider or batch-cost flows fail.",
    };
  }
  if (repo.includes("crewai") || repo.includes("browser-use")) {
    return {
      exact_user_type:
        "Python agent framework user blocked by MCP/tooling compatibility during local integration",
      reachable_at: signal.evidenceLinks[0]!,
      existing_spend_or_workaround:
        "Pins older dependencies, patches examples locally, or waits for upstream compatibility fixes.",
    };
  }
  if (repo.includes("open-webui") || repo.includes("dify")) {
    return {
      exact_user_type: "self-hosted AI app administrator maintaining knowledge/model/provider configuration",
      reachable_at: signal.evidenceLinks[0]!,
      existing_spend_or_workaround:
        "Spends operator time triaging config drift, regressions, or manual recovery steps.",
    };
  }
  return {
    exact_user_type: "developer/operator directly affected by the linked repository issue",
    reachable_at: signal.evidenceLinks[0]!,
    existing_spend_or_workaround:
      "Existing spend is unknown; likely workaround is manual patching or waiting for upstream resolution.",
  };
}

function skuFor(signal: DigestSignal): SkuType {
  const text = signal.title.toLowerCase();
  if (/mcp|compatib|pin blocks|model|provider|tool call|embedding/.test(text)) return "compatibility_pass";
  if (/500|404|broken|fail|leak|regression|rollback|timeout|vulnerable|security/.test(text))
    return "rescue_pack";
  return "launch_pack";
}

function makeCard(signal: DigestSignal, index: number): OpportunityCard {
  const sku = skuFor(signal);
  const slug = `${signal.repo.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${signal.number ?? index}`.replace(
    /^-|-$/g,
    "",
  );
  return {
    opportunity_id: `${PROJECT_ID}-${String(index + 1).padStart(2, "0")}-${slug}`,
    observed_at: signal.observedAt,
    host: {
      repo: signal.repo,
      upstream_ref_or_version: signal.number ? `${signal.kind} #${signal.number}` : signal.kind,
    },
    signal: {
      exact_problem: signal.title,
      evidence_links: signal.evidenceLinks,
      complaint_or_event_count: 1,
      signal_type: `${signal.kind.toLowerCase()}_cashflow_pain_candidate`,
    },
    buyer: buyerFor(signal),
    offer: {
      sku_type: sku,
      sellable_product:
        sku === "compatibility_pass"
          ? "BYOK compatibility diagnosis + patch notes pack"
          : "BYOK rescue diagnosis + rollback/troubleshooting pack",
      manual_delivery_path:
        "Manual read-only triage from the linked public issue/PR; deliver a repo-local checklist, patch hypothesis, and validation transcript. No automatic outreach or external issue creation.",
      price_hypothesis:
        "USD 9 small-pilot test price hypothesis only; not validated revenue or proven demand.",
    },
    economics: {
      direct_cost_known: "No paid infrastructure required for the card; direct cost not validated.",
      support_minutes_hypothesis: "45-90 minutes manual triage for first-pack delivery hypothesis.",
    },
    validation: {
      fastest_test:
        "Within one manual session, reproduce/read upstream symptom and draft a BYOK-only compatibility/rescue checklist against the linked evidence.",
      kill_criteria: [
        "No affected buyer can be identified from the linked public evidence.",
        "The issue is already fully resolved upstream before outreach-free validation.",
        "Resolution requires API resale, Managed Key, production deployment, customer data, secrets, or unsolicited bulk outreach.",
      ],
    },
    risks: {
      license:
        "Public issue/PR metadata only; verify upstream license/trademark before packaging any derived materials.",
      security:
        "Do not request or process secrets, customer data, logs with tokens, or production credentials.",
      acquisition:
        "Reachable only through public evidence and opted-in/manual channels; no automatic comments, issues, DMs, or bulk outreach.",
    },
    verdict: "RESEARCH",
    confidence: "medium: signal is concrete, but willingness-to-pay remains unvalidated.",
  };
}

export function runCashflowFilter(digestMarkdown: string, sourcePath: string): CashflowFilterResult {
  const signals = parseDigest(digestMarkdown);
  const ranked = [...signals]
    .map((signal) => ({
      signal,
      score: scoreSignal(signal),
      classification: classifySignal(signal),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.signal.repo.localeCompare(b.signal.repo) ||
        a.signal.title.localeCompare(b.signal.title),
    );

  const cards: OpportunityCard[] = [];
  const ignored_signals: CashflowFilterResult["ignored_signals"] = [];
  for (const item of ranked) {
    if (item.classification.verdict === "IGNORE") {
      ignored_signals.push({
        host: item.signal.hostName,
        repo: item.signal.repo,
        title: item.signal.title,
        reason: item.classification.reason,
        evidence_links: item.signal.evidenceLinks,
      });
      continue;
    }
    if (cards.length < MAX_CARDS) {
      const card = makeCard(item.signal, cards.length);
      card.verdict = item.classification.verdict === "BUILD" ? "RESEARCH" : item.classification.verdict;
      cards.push(card);
    }
  }

  return {
    project_id: PROJECT_ID,
    generated_from_digest: sourcePath,
    output_count_cap: MAX_CARDS,
    malformed_digest_fail_closed: true,
    cards,
    ignored_signals,
    forbidden_actions_preserved: {
      dashboard_created: false,
      opportunity_database_created: false,
      external_issue_created: false,
      automatic_outreach: false,
      revenue_validation_claimed: false,
      api_resale_or_managed_key: false,
    },
  };
}

export function renderOpportunityCardMarkdown(
  card: OpportunityCard,
  sourceDigest: string,
  cardNumber: number,
): string {
  return (
    `# Opportunity Card ${cardNumber} — ${card.opportunity_id}\n\n` +
    `Linked master control: https://github.com/kiddhu/aion-governance/issues/765\n` +
    `Input digest: ${sourceDigest}\n\n` +
    `\`\`\`yaml\n${yamlLike(card)}\n\`\`\`\n\n` +
    `## Guardrails\n\n` +
    `- No claim of revenue validation.\n` +
    `- No dashboard, opportunity database, automatic external issue creation, or automatic outreach.\n` +
    `- No API resale, Managed Key, production/payment/database/webhook/secret/customer-data surface.\n`
  );
}

function yamlLike(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    return value.length
      ? value
          .map(
            (item) =>
              `${pad}- ${typeof item === "object" && item !== null ? `\n${yamlLike(item, indent + 2)}` : quoteScalar(item)}`,
          )
          .join("\n")
      : `${pad}[]`;
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        if (Array.isArray(val)) return `${pad}${key}:\n${yamlLike(val, indent + 2)}`;
        if (typeof val === "object" && val !== null) return `${pad}${key}:\n${yamlLike(val, indent + 2)}`;
        return `${pad}${key}: ${quoteScalar(val)}`;
      })
      .join("\n");
  }
  return `${pad}${quoteScalar(value)}`;
}

function quoteScalar(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[:#[\]{}\n]|^\s|\s$/.test(text)) return JSON.stringify(text);
  return text;
}

function latestDigestPath(): string {
  const root = path.join("digests");
  const dates = fs
    .readdirSync(root)
    .filter((name: string) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
  if (!dates.length) throw new Error("No digest date directories found");
  return path.join(root, dates[dates.length - 1]!, "aion-business-radar.md");
}

export function main(argv = process.argv.slice(2)): void {
  const digestPath = argv[0] ?? latestDigestPath();
  const outputDir = argv[1] ?? path.join(path.dirname(digestPath), "opportunity-cards");
  const digest = fs.readFileSync(digestPath, "utf8");
  const result = runCashflowFilter(digest, digestPath);
  fs.mkdirSync(outputDir, { recursive: true });
  const resultPath = path.join(outputDir, "cashflow-filter.result.json");
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");
  result.cards.forEach((card, index) => {
    fs.writeFileSync(
      path.join(outputDir, `${card.opportunity_id}.md`),
      renderOpportunityCardMarkdown(card, digestPath, index + 1),
      "utf8",
    );
  });
  console.log(
    `[cashflow_filter] cards=${result.cards.length} ignored=${result.ignored_signals.length} output=${outputDir}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
