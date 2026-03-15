# Plan: Rename Project from "Superbuilders" to "TileSight"

## Summary

Rename all occurrences of "Superbuilders" that represent the **project/app name** to "TileSight" (or "tilesight" in lowercase contexts like `package.json`). We intentionally preserve references where "Superbuilders" refers to the **company** (contact email, company ecosystem table, Cloudflare deploy target). localStorage keys are kept as-is to avoid silent data loss. The CI deploy command stays unchanged because it references a Cloudflare Pages project name that must be changed in the CF dashboard first (out of scope). This is a textual rename — no file/directory renames, no import path changes, zero risk to builds or CI.

## Files to change

### Milestone 1: App identity + source code (user-facing, build-affecting)

| File | Line(s) | Current | New | Risk | Notes |
|------|---------|---------|-----|------|-------|
| `package.json` | 2 | `"name": "superbuilders"` | `"name": "tilesight"` | **None** — private package, not published, no imports reference it | |
| `index.html` | 12 | `<title>Superbuilders</title>` | `<title>TileSight</title>` | None | Browser tab title |
| `public/manifest.json` | 2-3 | `"name": "Superbuilders"`, `"short_name": "Superbuilders"` | `"name": "TileSight"`, `"short_name": "TileSight"` | None | PWA install name |
| `src/components/TapToStart.tsx` | 96 | `Superbuilders` (JSX text) | `TileSight` | None | Main title on start screen |
| `CLAUDE.md` | 1 | `# Superbuilders` | `# TileSight` | None | Project header |
| `README.md` | 1 | `# Superbuilders` | `# TileSight` | None | |
| `public/icons/icon-192.svg` | 3 | `>S</text>` | `>T</text>` | None | PWA icon letter |
| `public/icons/icon-512.svg` | 3 | `>S</text>` | `>T</text>` | None | PWA icon letter |

### Milestone 2: Documentation (non-user-facing prose)

| File | Line(s) | Current → New | Notes |
|------|---------|---------------|-------|
| `docs/product-overview.md` | 5 | "Superbuilders is an OSMO-style..." → "TileSight is an OSMO-style..." | Product description |
| `docs/research.md` | 3 | "**Project:** Superbuilders" → "**Project:** TileSight" | Research header |
| `docs/research/math-game-design.md` | 7,66,126,128,200,278,295,297,305,374,411,417,436 | "Superbuilders" → "TileSight" | 13 occurrences — all "Relevance for Superbuilders" headers and prose references to the project |
| `docs/research/literacy-science.md` | 1,37,148,187,193,262,278,287 | "Superbuilders" → "TileSight" | 8 occurrences — title and prose |
| `docs/learning-science-research.md` | 3,9,16,24,32,54,72,76,110,160,220,270,314 | "Superbuilders" → "TileSight" | 13 occurrences — project-name references in prose |

### Agent memory files (non-critical, quality of life)

| File | Line(s) | Change | Notes |
|------|---------|--------|-------|
| `.claude/agent-memory/researcher/project_superbuilders.md` | 2,3,7 | Update name/description/heading to TileSight | Memory metadata |
| `.claude/agent-memory/researcher/MEMORY.md` | 5 | Update description text | Memory index |
| `.claude/agent-memory/researcher/math_design_research.md` | 3 | "Superbuilders applicability" → "TileSight applicability" | Description |
| `.claude/agent-memory/researcher/project_brainlift_literacy.md` | 3 | "Superbuilders spelling mode" → "TileSight spelling mode" | Description |
| `.claude/agent-memory/reviewer/MEMORY.md` | 4 | Update description text | Memory index |
| `.claude/agent-memory/reviewer/superbuilders_project.md` | 2 | Update name field | Memory metadata |
| `~/.claude/projects/-Users-seanflanagan-proj-superbuilders/memory/MEMORY.md` | project ref | Update if it references "Superbuilders" as project name | User-level memory |

## Files NOT changing (with rationale)

| File | Line(s) | Text | Reason |
|------|---------|------|--------|
| `.github/workflows/ci.yml` | 105 | `--project-name=superbuilders-numbergame` | **Infrastructure** — Cloudflare Pages project name. Changing this without updating CF dashboard first = broken deploys. Out of scope. |
| `docs/requirements.md` | 7 | `patrick.skinner@superbuilders.school` | **Company email** — not the project name |
| `docs/learning-science-research.md` | 110 | "Patrick Skinner (Superbuilders)" | **Company name** in context of a person's affiliation |
| `docs/learning-science-research.md` | 314 | "the Superbuilders team" | **Company/team name** |
| `docs/learning-science-research.md` | 395,399 | "Superbuilders / Timeback Ecosystem" table | **Company context** |
| `src/engine/session.ts` | 21,74 | `"superbuilders-cumulative"`, `"superbuilders-mute"` | **localStorage keys** — changing silently loses existing user data. These are internal strings, never shown to users. |
| `src/components/CalibrationGuide.tsx` | 10 | `"superbuilders_calibrated"` | **localStorage key** — same rationale |
| `src/engine/session.test.ts` | 76,84 | Test assertions matching localStorage keys | Must match source constants — leave as-is |
| `docs/product-overview.md` | 347-349 | localStorage key documentation | Documents actual key names — must match code |
| `docs/product-overview.md` | 373 | `project name: superbuilders-numbergame` | Documents CF deployment — must match CI |
| `docs/research/digit-training-pipeline.md` | 13,63,147 | `~/proj/superbuilders/...` | **Filesystem paths** — describes actual disk locations, not the project name |
| `.claude/agent-memory/researcher/training_pipeline.md` | 23 | "not in superbuilders repo" | Filesystem context |
| `.claude/agent-memory/researcher/project_superbuilders.md` | 58-60 | localStorage key documentation | Must match code |
| Filesystem directory name | — | `/Users/seanflanagan/proj/superbuilders` | **Not changing** — directory rename is high risk, breaks git remotes, tooling references |

## Files to create

None.

## Milestone outline

- [x] **M1: App identity + source code** — Update all user-facing and build-config references including PWA icons (8 files, ~10 edits). Verify with `pnpm build && pnpm test && pnpm lint`.
  - [x] Step 1 — Edit package.json, index.html, manifest.json, TapToStart.tsx, CLAUDE.md, README.md → verify: `pnpm typecheck`
  - [x] Step 2 — Update PWA icon SVGs (S → T) → verify: visual inspection via read
  - [x] Step 3 — Full verify → `pnpm build && pnpm test && pnpm lint`
  Commit: "feat: rename project from Superbuilders to TileSight"
- [ ] **M2: Documentation + agent memory** — Update all documentation prose and agent memory descriptions (~15 files, ~50 edits). Verify with grep for remaining "Superbuilders" to confirm only KEEP items remain.
  - [ ] Step 1 — Update docs/product-overview.md, docs/research.md → verify: grep count
  - [ ] Step 2 — Update docs/research/math-game-design.md, docs/research/literacy-science.md → verify: grep count
  - [ ] Step 3 — Update docs/learning-science-research.md (13 project-name refs, skip 5 company refs) → verify: grep count
  - [ ] Step 4 — Update agent memory files (6 files) → verify: grep count
  - [ ] Step 5 — Final grep: confirm only KEEP items remain
  Commit: "docs: rename Superbuilders to TileSight in documentation and agent memory"

## Manual setup tasks

None required for this rename. The Cloudflare Pages project name (`superbuilders-numbergame`) is a **future** manual task if you want to rename the deployed project — it requires:
1. Creating a new CF Pages project named `tilesight` (or similar) in the Cloudflare dashboard
2. Updating `.github/workflows/ci.yml:105`
3. Updating `docs/product-overview.md:373`

This is explicitly **out of scope** for this plan.

## Risks

1. **localStorage key rename (mitigated — not doing it):** If we renamed localStorage keys, existing users would lose their star count, session history, calibration state, and mute preference silently. Decision: leave keys as-is.
2. **CI deploy command (mitigated — not doing it):** Changing the `--project-name` without CF dashboard change = broken deploys.
3. **Grep false positives:** The docs contain many "Superbuilders" references in prose. Some refer to the company, some to the project. The categorization above was done by reading each occurrence in context.

## Open questions

None — all decisions resolved:
- PWA icons: updating "S" → "T" (included in M1)
- Agent memory filenames: not renaming (low value, could cause confusion with memory system)
- Ambiguous prose lines (220, 270): renaming (they describe product behavior, not company)
