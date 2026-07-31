# AION Business Radar v0.1 — SEEKAPI_CASHFLOW_PILOT_01

> 生成时间: 2026-07-31T16:55:33.334Z UTC | Host count: 8 | Source fetch total: 572 | Provider mode: no-paid/local-template | Runtime: 16.5s

## 执行边界

- 上游来源: duanyytop/agents-radar @ 8063466e6c89d440c9d4076d2a6b7d83a9a7f758
- 运行方式: GitHub Actions 手动触发；recurring schedule disabled
- LLM/provider: no-paid/local-template（未使用付费 LLM credential）
- Actions run: https://github.com/007AION/aion-business-radar-seekapi-cashflow-pilot-01/actions/runs/30649077894
- 禁区: 未安装 AION server；未新增 dashboard；未新增 vector DB；未新增 paid infra；未对监控仓库写评论/issue

## Source fetch counts

| Host | Repo | Issues | PRs | Releases | Total |
|---|---|---:|---:|---:|---:|
| GPT Researcher | assafelovic/gpt-researcher | 0 | 6 | 0 | 6 |
| Open WebUI | open-webui/open-webui | 40 | 47 | 0 | 87 |
| Dify | langgenius/dify | 32 | 56 | 0 | 88 |
| LiteLLM | BerriAI/litellm | 60 | 242 | 3 | 305 |
| Browser Use | browser-use/browser-use | 2 | 17 | 0 | 19 |
| CrewAI | crewAIInc/crewAI | 11 | 39 | 1 | 51 |
| AutoGen | microsoft/autogen | 5 | 9 | 0 | 14 |
| Crawl4AI | unclecode/crawl4ai | 1 | 1 | 0 | 2 |

## 中文信号摘要

### GPT Researcher

- PR #2021 Mastery Brain: specialization, memory, and team polish
- PR #2020 fix(pubmed): guard esearch idlist shape before iterating
- PR #2019 fix(publisher): coerce None research_data/sources in layout

### Open WebUI

- Issue #27818 issue: OFFLINE_MODE does not prevent the Whisper model from downloading
- Issue #27808 issue: Overflowing UI element in modal for settings
- Issue #27801 issue: Knowledge attached to a project can no longer be previewed directly
- PR #27824 perf: stop query_collection blocking the event loop
- PR #27821 perf: read the model pool with one HGETALL instead of one HGET per model
- PR #27822 perf: index group_member on (user_id, group_id)

### Dify

- Issue #36141 feat: tool plugin support show_on param
- Issue #39861 Batch segment deletion can remove segments outside the selected document
- Issue #37451 Native Asynchronous "Fire-and-Forget" Execution Mode for HTTP / Workflow Nodes
- PR #39862 fix(web): align secondary sidebar help trigger
- PR #38217 fix(api): scope segment batch deletes
- PR #37569 feat: allow knowledge base API keys to be scoped to a single dataset

### LiteLLM

- Issue #24230 [Bug]: LiteLLMAiohttpTransport can leak recycled aiohttp ClientSession instances
- Issue #35377 LITELLM
- Issue #35357 [Bug]: One failing batch aborts the whole CheckBatchCost poll cycle, stranding every other batch
- PR #35293 fix(tool-management): drop unsupported prisma select kwarg from team lookup
- PR #32110 fix(deepseek): fill reasoning_content on anthropic-compatible endpoint for multi-turn thinking conversations
- PR #35288 fix(tag-management): drop unsupported prisma select kwarg from key lookup

### Browser Use

- Issue #5333 Support mcp 2.x (Python SDK): hard pin mcp==1.26.0 blocks 2.0.0
- Issue #5331 Broken (404's) profile sh link
- PR #5336 fix(utils): harden URL and version parsing
- PR #5335 fix(utils): resolve redact cascade bug
- PR #5337 test(ci): Windows path execution tests for skill install docs

### CrewAI

- Issue #6750 Support mcp 2.x (Python SDK): pin blocks mcp 2.0.0
- Issue #6736 after_llm_call hooks never run on acall(): eight native provider handlers skip _invoke_after_llm_call_hooks
- Issue #5056 [Security] crewai create ships template with eval() on unsanitized LLM input
- PR #6744 Fix MCP connection timeouts and disable tool call retries by default
- PR #6536 fix(deps): bump json-repair past GHSA-xf7x-x43h-rpqh vulnerable range
- PR #6757 docs: add approval-bound tool execution example

### AutoGen

- Issue #8008 Workbench-level tool-call approval gate — a working implementation of #7405's 'Integration Point 2'
- Issue #7405 Proposal: GuardrailProvider protocol for tool call interception
- Issue #7949 Abmc
- PR #7679 fix(docs): update .NET LM Studio article and snippet references
- PR #7881 tools: add GuardrailProvider protocol for tool call interception
- PR #7931 fix: drop trailing assistant message when it is empty after rstrip

### Crawl4AI

- Issue #2116 [Bug]: `/md` and `/llm/{url}` return HTTP 500 when anti-bot detection marks a result failed
- PR #2114 fix(scraping): a nested <noscript> discards the entire page body

## Failures

- none
