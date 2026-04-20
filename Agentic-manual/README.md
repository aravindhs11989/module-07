# Agentic Manual

A small front-end learning project that demonstrates two approaches for planning a to-do list:

- Single-agent workflow
- Multi-agent workflow

Each demo turns raw task text into a prioritized board with `Today`, `This Week`, and `Later` lanes.

## What Is Included

- `index.html`, `app.js`, `styles.css`: single-agent demo
- `single-agent-workflow.md`: notes for single-agent flow
- `singleAgentThread`: single-agent thread reference
- `SKILL.md`: single-agent skill contract
- `multiple-agent/`: multi-agent demo and related docs
  - `index.html`, `app.js`, `styles.css`
  - `multi-agent-workflow.md`
  - `multiAgentThreads`
  - `SKILL.md`

## How To Run

No build step is required.

1. Open `Agentic-manual/index.html` in a browser for the single-agent demo.
2. Open `Agentic-manual/multiple-agent/index.html` in a browser for the multi-agent demo.

If your browser blocks local script loading, run with a local static server (for example, VS Code Live Server).

## Workflow Summary

### Single-Agent

- One agent owns all stages end-to-end in `singleAgentThread`.
- Stages: Understanding -> Planning -> Executing -> Reviewing -> Adjusting -> Completed.

### Multi-Agent

- Five specialized agents collaborate through explicit handoffs:
  - Intake Agent
  - Priority Agent
  - Scheduling Agent
  - Review Agent
  - Coordinator Agent

## Goal

Use this module to compare transparency, coordination, and output behavior between single-thread and multi-thread agentic planning patterns.
