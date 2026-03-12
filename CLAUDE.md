# Superbuilders

OSMO-style math game: computer vision recognizes physical number tiles via iPad camera, powering an interactive arithmetic game for ages 5-8.

## Commands
```bash
pnpm dev              # Local dev server (HTTPS via mkcert)
pnpm test             # Unit tests (Vitest)
pnpm test:watch       # Unit tests in watch mode
pnpm lint             # Lint + format check (Biome)
pnpm lint:fix         # Auto-fix lint + format
pnpm typecheck        # TypeScript type checking
pnpm build            # Production build (typecheck + vite build)
pnpm preview          # Preview production build
```

## Rules
<!-- Auto-discovered from .claude/rules/ — listed here for visibility -->
@.claude/rules/immutable.md
@.claude/rules/conventions.md
@.claude/rules/stack.md

## System
See `docs/product-overview.md` for architecture, domain model, patterns, and gotchas.

## Decisions
See `docs/decisions.md` — append-only ADR log. Read during planning, not loaded every session.

## Personal Overrides
Create `CLAUDE.local.md` (gitignored) for personal, project-specific preferences.

## Workflow
`/prd` → `/research` → `/plan` → `/milestone` (repeat) → `/complete`

## Escalation Policy
- If a test or typecheck fails 3 times after attempted fixes, STOP and report what you've tried.
- If a plan step is ambiguous, ask before implementing — don't guess.
- If you discover a new invariant, add it to `.claude/rules/immutable.md`.
- After completing a feature, run `/complete` to clean up plans and log decisions.
