# AION Business Radar v0.1 — SEEKAPI_CASHFLOW_PILOT_01

This controlled copy keeps upstream `agents-radar` intact enough for provenance while adding the narrow Gate 1 pilot lane requested in `kiddhu/aion-governance#767`.

Pilot command:

```bash
pnpm aion:cashflow-pilot
```

Configured hosts are exactly the 8 hosts from #767, in `config/aion-cashflow-pilot-hosts.yml`:

1. assafelovic/gpt-researcher
2. open-webui/open-webui
3. langgenius/dify
4. BerriAI/litellm
5. browser-use/browser-use
6. crewAIInc/crewAI
7. microsoft/autogen
8. unclecode/crawl4ai

Runtime boundary:

- GitHub Actions only.
- The workflow has `workflow_dispatch` only; recurring schedule remains disabled until a manual run passes.
- Provider mode is `no-paid/local-template`; it uses GitHub source data and deterministic Chinese Markdown, not paid LLM credentials.
- The pilot writes Markdown plus evidence JSON under `digests/YYYY-MM-DD/`.
- The pilot does not create comments/issues in monitored repositories and does not touch AION server/runtime, dashboards, vector DBs, payment, production, database, webhook, or secrets.
