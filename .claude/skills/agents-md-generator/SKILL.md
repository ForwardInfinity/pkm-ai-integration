---
name: agents-md-generator
description: Generate or update AGENTS.md files to onboard AI coding agents to codebases. Use this skill when users ask to create, update, improve, or review an AGENTS.md (or CLAUDE.md) file for their project. Triggers include requests like "create an AGENTS.md", "help me write a CLAUDE.md", "improve my agent instructions", or "set up agent context for my repo".
---

# AGENTS.md Generator

Create effective AGENTS.md files that onboard AI coding agents to codebases with the right context—concise, actionable, and universally applicable.

## Workflow

1. **Analyze** the codebase to understand structure, tech stack, and workflows
2. **Identify** build commands, test commands, and key conventions
3. **Draft** the AGENTS.md following the principles below
4. **Validate** the output is concise (<150 lines ideal, <300 max) and universally applicable

## Core Principles

### Less Is More

AI agents can reliably follow ~150-200 instructions. Every instruction added degrades overall performance uniformly. Include only what is:
- Universally applicable to tasks in this codebase
- Non-obvious (don't explain what Claude already knows)
- Essential for correct execution

**Avoid adding:** Task-specific instructions, code style guidelines (use linters), edge cases, or "hotfixes" for one-off issues.

### Cover WHAT, WHY, HOW

| Aspect | What to Include |
|--------|-----------------|
| **WHAT** | Tech stack, project structure, key directories, package layout (especially in monorepos) |
| **WHY** | Project purpose, what each major component does |
| **HOW** | Build commands, test commands, how to verify changes work |

### Use Progressive Disclosure

Don't stuff everything in AGENTS.md. Instead:

```markdown
## Additional Context
- Database schema: see `docs/schema.md`
- API patterns: see `docs/api-patterns.md`
- Security guidelines: see `docs/security.md`
```

This keeps the main file lean while pointing agents to detailed context when needed.

## Structure Template

```markdown
# [Project Name]

[1-2 sentence project description]

## Core Commands

• Build: `[command]`
• Test: `[command]`
• Lint: `[command]`
• Dev server: `[command]`

## Project Layout

[Brief directory structure with purpose of each area]

## Development Patterns

[Only patterns that are non-obvious and universally applicable]

## Additional Context

[Links to detailed docs the agent should read for specific tasks]
```

## What to Include

**Always include:**
- Exact build and test commands (wrapped in backticks)
- Project layout with purpose of key directories
- How to verify changes work
- Links to detailed docs for complex topics

**Consider including:**
- Monorepo workspace structure and navigation
- Environment setup requirements
- Git workflow (branching, commit conventions)
- Critical gotchas that cause common failures

## What to Avoid

| Don't Include | Why |
|---------------|-----|
| Code style guidelines | Use linters instead—they're faster, cheaper, and deterministic |
| Exhaustive command lists | Include only commands used in >80% of tasks |
| Task-specific instructions | These belong in separate docs, referenced via progressive disclosure |
| Long code snippets | They become outdated; use file:line references instead |
| Information Claude already knows | Don't explain common patterns, libraries, or conventions |

## Examples

See `references/examples.md` for complete AGENTS.md examples for different project types.

## Validation Checklist

Before finalizing:

- [ ] Under 150 lines (ideal) or 300 lines (maximum)
- [ ] All commands use backticks and are copy-paste ready
- [ ] No task-specific instructions (use progressive disclosure)
- [ ] No code style rules (use linters)
- [ ] Every section is universally applicable to work in this codebase
- [ ] Uses file references instead of inline code snippets where possible
