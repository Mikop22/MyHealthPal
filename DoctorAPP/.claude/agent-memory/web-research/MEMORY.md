# Web Research Agent Memory

## Key Reference URLs

- Claude Code Agent Teams official docs: https://code.claude.com/docs/en/agent-teams
- Claude Code Custom Subagents official docs: https://code.claude.com/docs/en/sub-agents
- Claude Code Common Workflows (git worktrees section): https://code.claude.com/docs/en/common-workflows
- Awesome Claude Code Subagents (100+ examples): https://github.com/VoltAgent/awesome-claude-code-subagents
- Claude Code system prompts (reverse-engineered): https://github.com/Piebald-AI/claude-code-system-prompts

## Agent Teams (as of Feb 2026)

- Experimental feature; enable via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json
- Architecture: Team Lead + Teammates + Shared Task List + Mailbox
- Task states: pending, in-progress, completed. Dependencies prevent claiming blocked tasks.
- Teammates communicate directly (mesh), not only hub-and-spoke
- Team config stored at `~/.claude/teams/{team-name}/config.json`
- Task list stored at `~/.claude/tasks/{team-name}/`
- Display: in-process (default) or split-pane (requires tmux or iTerm2)
- Navigate teammates: Shift+Down to cycle; Ctrl+T toggles task list
- Known limits: no session resumption for in-process teammates, one team per session, no nested teams

## Built-in Subagent Types

- **Explore**: Haiku, read-only, codebase search/analysis
- **Plan**: Inherits model, read-only, used during plan mode
- **General-purpose**: Inherits model, all tools, complex multi-step tasks
- **Bash**: Inherits model, runs terminal commands in separate context
- **statusline-setup**: Sonnet, for /statusline config
- **Claude Code Guide**: Haiku, answers questions about Claude Code features

## Custom Subagent Key Facts

- Defined as Markdown files with YAML frontmatter in `.claude/agents/` (project) or `~/.claude/agents/` (user)
- Fields: name, description, tools, disallowedTools, model (sonnet/opus/haiku/inherit), permissionMode, maxTurns, skills, mcpServers, hooks, memory, background, isolation
- `isolation: worktree` runs subagent in isolated git worktree automatically
- `memory: user/project/local` enables persistent cross-session memory; MEMORY.md first 200 lines loaded into context
- Subagents cannot spawn other subagents (no nesting)
- Created/managed via `/agents` command or manual file creation

## Git Worktrees for Agent Isolation

- Built-in Claude Code support: `claude --worktree <name>` or `claude -w <name>`
- Creates worktree at `<repo>/.claude/worktrees/<name>`, branch `worktree-<name>`
- Add `.claude/worktrees/` to `.gitignore`
- No-change sessions auto-clean; sessions with changes prompt keep/remove
- Can also use `git worktree add` manually for more control

## Verified PMC Article IDs — Diagnostic Project

PMC redirects: ncbi.nlm.nih.gov/pmc/articles/PMC{id}/ now 301s to pmc.ncbi.nlm.nih.gov — always use the pmc. subdomain directly.

Round-number PMCIDs (e.g. PMC5555555) are almost always fabricated — verify before use.

Confirmed real open-access PMCIDs for uterine fibroids/anemia/HMB topic cluster:
- PMC9699995 — "Cardiometabolic Risk and Cardiovascular Disease in Young Women With Uterine Fibroids" (NHANES, CVD odds ratio 3.10)
- PMC11494454 — "A Multicenter Retrospective Cohort Study Assessing the Incidence of Anemia in Patients Associated With Uterine Fibroids" (75% submucosal fibroid patients had anemia)
- PMC6142441 — "Heavy menstrual bleeding: work-up and management" (broad differential: uterine, ovulatory, coagulation causes)

## Full-Stack (FastAPI + Next.js) Patterns

- Use 2-3 agent approach: Planner (read-only), Backend agent, Frontend agent
- Each agent owns non-overlapping files to prevent merge conflicts
- CLAUDE.md should include: stack-specific build commands, directory structure, coding conventions per layer, env variable notes
- Recommended MCPs: Context7 (live docs), Serena (semantic search), Sequential Thinking
- Slash commands pattern: /plan -> /implement -> /test -> /deploy
