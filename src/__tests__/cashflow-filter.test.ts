import { describe, it, expect } from "vitest";
import { parseDigest, runCashflowFilter } from "../cashflow-filter.ts";

function digest(signalLines: string): string {
  return `# AION Business Radar v0.1 — SEEKAPI_CASHFLOW_PILOT_01

> 生成时间: 2026-07-31T16:55:33.334Z UTC | Host count: 8 | Source fetch total: 572 | Provider mode: no-paid/local-template | Runtime: 16.5s

## 执行边界

- Actions run: https://github.com/007AION/aion-business-radar-seekapi-cashflow-pilot-01/actions/runs/30649077894
- 禁区: 未安装 AION server；未新增 dashboard；未新增 vector DB；未新增 paid infra；未对监控仓库写评论/issue

## 中文信号摘要

### LiteLLM

${signalLines}

### CrewAI

- Issue #6750 Support mcp 2.x (Python SDK): pin blocks mcp 2.0.0

## Failures

- none
`;
}

describe("cashflow_filter", () => {
  it("turns a valid digest into deterministic evidence-linked opportunity cards", () => {
    const result = runCashflowFilter(
      digest(
        "- Issue #35357 [Bug]: One failing batch aborts the whole CheckBatchCost poll cycle, stranding every other batch",
      ),
      "digests/2026-08-01/aion-business-radar.md",
    );

    expect(result.cards.length).toBeGreaterThan(0);
    expect(result.cards.length).toBeLessThanOrEqual(3);
    expect(result.cards[0]!.opportunity_id).toBe("SEEKAPI_CASHFLOW_PILOT_01-01-berriai-litellm-35357");
    expect(result.cards[0]!.signal.evidence_links).toEqual([
      "https://github.com/BerriAI/litellm/issues/35357",
    ]);
    expect(result.cards[0]!.buyer.exact_user_type).toContain("LiteLLM");
    expect(result.cards[0]!.offer.price_hypothesis).toContain("not validated revenue");
  });

  it("down-ranks low-value news to IGNORE", () => {
    const result = runCashflowFilter(
      digest("- PR #35288 docs: add approval-bound tool execution example"),
      "digest.md",
    );
    expect(result.ignored_signals.some((s) => s.title.includes("docs: add approval"))).toBe(true);
  });

  it("keeps pain without validated buyer demand as RESEARCH or WATCH, not BUILD", () => {
    const result = runCashflowFilter(
      digest("- Issue #5333 Support mcp 2.x (Python SDK): hard pin mcp==1.26.0 blocks 2.0.0"),
      "digest.md",
    );
    expect(result.cards[0]!.verdict).not.toBe("BUILD");
    expect(["RESEARCH", "WATCH"]).toContain(result.cards[0]!.verdict);
  });

  it("fails closed on malformed digest", () => {
    expect(() => runCashflowFilter("# random notes", "bad.md")).toThrow(/Malformed digest/);
  });

  it("enforces the output count cap", () => {
    const result = runCashflowFilter(
      digest(`- Issue #1 [Bug]: provider timeout failure
- Issue #2 [Bug]: model incompatibility failure
- Issue #3 [Bug]: batch cost failure
- Issue #4 [Bug]: MCP pin blocks users
- Issue #5 [Bug]: 500 regression failure`),
      "digest.md",
    );
    expect(result.cards).toHaveLength(3);
    expect(result.output_count_cap).toBe(3);
  });

  it("ignores forbidden spam or resale-oriented signals", () => {
    const result = runCashflowFilter(
      digest("- Issue #9 Build API resale bulk outreach scraper"),
      "digest.md",
    );
    expect(result.cards.every((card) => !card.signal.exact_problem.includes("resale"))).toBe(true);
    expect(result.ignored_signals.some((s) => s.reason.includes("spam/resale"))).toBe(true);
  });

  it("parses all issue and PR links from digest sections", () => {
    const signals = parseDigest(
      digest("- PR #35293 fix(tool-management): drop unsupported prisma select kwarg from team lookup"),
    );
    expect(signals.map((s) => s.evidenceLinks[0])).toContain("https://github.com/BerriAI/litellm/pull/35293");
    expect(signals.map((s) => s.evidenceLinks[0])).toContain(
      "https://github.com/crewAIInc/crewAI/issues/6750",
    );
  });
});
