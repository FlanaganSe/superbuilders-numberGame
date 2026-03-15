---
name: Early childhood math game design research
description: Evidence-based findings on multi-digit numbers, multiplication, part-whole, missing addend, subtraction models, and top-evidence app features for ages 5-8 — with direct Superbuilders applicability
type: project
---

Research completed 2026-03-14. Full document at `docs/research/math-game-design.md`.

**Key findings:**

Multi-digit answers: Current MAX_ANSWER=9 constraint is pedagogically sound. Syntactic place value (tens/ones) not reliable until Grade 2 (age 7-8). Displaying two-digit operands on screen (as subtraction already does) is fine; requiring multi-digit tile answers is not appropriate for most of the 5-8 range. Sources: PMC9177579, PMC4460578.

Multiplication: Do not add for ages 5-8. Formal × operation not developmentally appropriate until 7-9. Informal equal-groups situations possible for 7-8 but outside current scope. Sources: Nunes/Bryant (1996), Nuffield Foundation Paper 3.

Missing addend: Highest-priority content addition. Marx et al. (2025) systematic review of 18 apps found none implement systematic part-whole progression. Missing addend ("3 + ? = 7") is architecturally feasible — detected tile fills the unknown operand, validated as answer - left. Age-appropriate for 6-8. Baroody et al. (2016) found this task type significantly more efficacious than drill for subtraction fluency. Source: IEJME DOI 10.29333/iejme/15677.

Explanatory feedback: Single most-cited necessary condition across Outhwaite 2023, My Math Academy RCTs (ESSA Tier 1), Frontiers 2023 systematic review. Motivational-only feedback (current state) is not sufficient for learning gains. Adding "7 = 3 + 4! You needed 4" on timeout closes the most important gap without structural changes.

Subtraction model: Current take-away model (7 - 3 = ?) is correct for ages 5-6 but incomplete. Research supports introducing subtraction-as-missing-addend for 6-8 (join-change-unknown). Baroody 2016: software targeting this rationale was significantly more efficacious than drill. Carpenter/Moser developmental order: join-result, separate-result, join-change, compare, separate-start.

**Recommendation:** Options A (explanatory feedback) + B (missing addend) in sequence, before any learning trajectory redesign. Do not add multiplication. Do not change answer cardinality constraint.

**Why:** Evidence hierarchy is clear — explanatory feedback is the necessary condition identified in every major analysis; missing addend closes the gap Marx et al. found in all 18 apps reviewed. Both are architecturally clean within the existing single-tile, no-backend, localStorage-only constraints.
