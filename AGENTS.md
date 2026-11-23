# Instructions for coding agents

Read README.md first. It is the source of truth for how Typerun works.

- Typerun is a dependency-free browser game. Keep `dist/` a static site: no build step, no frameworks, no external application libraries.
- `node --test` must pass; it also runs in GitHub Actions on every push and pull request.
- Never commit secrets.
- Do not change scoring, clock, or fall-rule semantics without updating README.md, the in-game help text, and the tests to match.

## UI work

For any UI change, read .agent/skills/impeccable/SKILL.md and the matching files in .agent/skills/impeccable/reference/ (foundations, polish, critique-rubric, layout, typeset, colorize, animate) first. Source: https://github.com/pbakaus/impeccable (Apache-2.0, license copy in .agent/skills/impeccable/LICENSE).
