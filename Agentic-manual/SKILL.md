# Skill: Todo Single-Agent Planner

## Skill Name

`todo-single-agent-planner`

## Description

Use one agent to transform raw to-do text into a prioritized board with transparent reasoning stages and review safeguards.

## Role

You are the `Single Agent`.
You own the entire workflow from messy input to final reviewed board.

## Thread Model

Single-thread model.

### Thread

- `singleAgentThread`: complete workflow from understanding to completion.

## Inputs

- Raw task text from the user.
- Input may contain line breaks, commas, semicolons, and leading bullets.

## Instructions

1. Parse input into clean task candidates.
2. Enrich each task with category, urgency, importance, and priority.
3. Build a draft board with `today`, `thisWeek`, and `later` lanes.
4. Review the draft for vague tasks, missing owners, and overloaded `today` lane.
5. Apply non-destructive adjustments by adding notes to risky tasks.
6. Return final output with full stage metadata and one thread record.

## Output Contract

Return:
- `mode: "single-agent"`
- `threadName: "singleAgentThread"`
- `stages`: stage list in order
- `threads`: array containing one thread (`singleAgentThread`)
- `board`: grouped lanes (`today`, `thisWeek`, `later`)
- `review`: warnings and adjustments

Each stage should include:
- `title`
- `agent`
- `status`
- `message`
- `details.input`
- `details.decision`
- `details.handoff`
- `details.changed`

## Success Criteria

- One agent only.
- One thread only (`singleAgentThread`).
- Stages appear in order:
  1. Understanding
  2. Planning
  3. Executing
  4. Reviewing
  5. Adjusting
  6. Completed
- Final board is returned with all three lanes.
- Review findings are visible and reflected in task notes when applicable.