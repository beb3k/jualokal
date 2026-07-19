# Repository guidance

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `beb3k/jualokal`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository; use root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

### Product development workflow

Use the Matt Pocock workflow for product changes. Slash-command phases are user-invoked; naming this workflow does not authorize commits, pushes, pull requests, merges, or other external changes.

- For an unclear new feature or materially changed requirement, use `/grill-with-docs -> /to-spec -> /to-tickets`. Record settled terminology and decisions in `CONTEXT.md` and `docs/adr/`, and track the resulting PRD and tickets in GitHub Issues.
- For an existing unblocked issue labelled `ready-for-agent`, use a fresh Codex task and `/implement` that issue only. Use `/tdd` during implementation, then run `/code-review` against both repository standards and the issue. Do not repeat planning phases unless the requirements materially changed.
- For every issue implementation, create and switch to a dedicated issue branch from the intended base branch before modifying files. Use one issue per branch, never make issue changes while `main` is checked out, and use the `codex/issue-<number>-<short-name>` naming pattern unless the project owner specifies another name.
- The workflow does not override this file's authorization, verification, GitNexus, privacy, or repository-hygiene rules. Define finishing criteria first, keep the change limited to the ticket, and record only completed, verified hackathon evidence in `docs/submission/CODEX_BUILD_LOG.md`.
- For the Primary Core Build Session, record the starting commit and preserve its model evidence, verification results, commit range, and required `/feedback` Session ID while that task is active.

## Working approach

- Start with the smallest relevant files, symbols, headings, and output. Expand only when needed.
- Keep command output focused. Use targeted searches, excerpts, counts, and unique errors instead of printing large files, logs, diffs, generated artifacts, or reports.
- Summarize evidence as findings, risks, unexpected scope, and blockers.
- State assumptions and define concrete finishing criteria before non-trivial work.
- Make the minimum change that satisfies the ticket. Match the existing style and avoid speculative abstractions, adjacent cleanup, and unrelated improvements.
- Run expensive checks after the final relevant edit. Repeat them only when a later change could invalidate the result.

## Verification

Verify completed work with the lowest-cost checks that genuinely prove the requested outcome, while still running any broader checks required by the active implementation workflow:

1. Static inspection or a focused assertion.
2. Targeted lint, type checking, or a focused test.
3. Direct route, service, database, or migration verification.
4. Full lint or test suite.
5. Production build.

- Use focused tests for isolated behavior and broader suites for cross-cutting risk.
- Prefer a type check before a production build when TypeScript is the likely failure mode.
- Verify database or schema migrations directly against the target database.
- For visual or interaction changes, run the smallest focused automated browser checks needed to prove the behavior. Normally run the complete automated browser suite only once, after the final relevant edit.
- Do not repeat a passing browser suite unless a later edit could invalidate it or a failure requires confirmation.
- The project owner performs final live-browser and visual acceptance testing on the relevant phone and desktop layouts. Do not perform live-browser walkthroughs unless the user explicitly requests them or the task is specifically diagnosing a browser-only problem.
- Provide an exact page-testing checklist and report live-browser acceptance as pending until the project owner confirms it. Do not record live-browser verification as completed evidence before that confirmation.
- Backend-only, schema-only, mapping, and data-source changes do not require browser verification unless visible output may have changed.
- After every successful issue implementation, include a short, plain-English "What to test on the page" checklist in the final response. Tailor it to the issue acceptance criteria: state where to start, the actions to take, and the expected result, including relevant privacy boundaries and phone/desktop checks for visible work.
- Include a local URL in the final response only when a working server remains available.
- After every successful issue implementation, explain in the final response what was built in plain English and give the user clear, step-by-step instructions to run and test it. Include any required setup, the exact commands to use, what the user should check, and the expected result; do not assume they will read the code.

## Code, commits, and repository hygiene

- Use the `karpathy-guidelines` skill when writing, reviewing, or refactoring code.
- Create commits only when the user or active workflow authorizes them. Keep each commit narrow and specifically named.
- Do not create a commit for an issue implementation until the project owner completes manual acceptance testing and explicitly authorizes the commit. This overrides any skill or workflow instruction that says to commit automatically.
- Remove task-created screenshots, design dumps, scratch scripts, logs, build caches, and temporary verification folders before reporting completion.
- Preserve product documentation, ADRs, issue-tracker guidance, and meaningful workflow state unless the task explicitly changes them.
- When creating a project note, write for a future reader: capture the context, outcome, important decisions and rationale, verified results, evidence links, and any follow-ups. Omit repetitive command output and conversation transcripts; scale detail to the task's risk and complexity.
- Store Jualokal project notes in the `jualokal/` folder of the configured `the-future-is-ai` Obsidian vault. For full note creation or replacement, write the Markdown file directly. Use the Obsidian CLI only for reading, searching, opening notes, properties, and small operations that can be immediately verified. Do not pass full multiline notes through the CLI `content=` argument or type full notes through UI automation. If direct write access is unavailable, request access instead of using a workaround. After writing, read the file back and verify its path, frontmatter, title, headings, content, and links.
- Do not add framework, test, build, or development commands to this file until the actual Jualokal toolchain provides and verifies them.

## Instruction maintenance

- Keep root guidance durable and concise. Put specialized subtree rules in nested `AGENTS.md` files and reusable procedures in skills or references.
- Use prompts for one-off constraints rather than making them permanent repository rules.
- Pair recurring rules with automated checks where practical.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **jualokal** (682 symbols, 1541 relationships, 55 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/jualokal/context` | Codebase overview, check index freshness |
| `gitnexus://repo/jualokal/clusters` | All functional areas |
| `gitnexus://repo/jualokal/processes` | All execution flows |
| `gitnexus://repo/jualokal/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
