# Single-Agent Workflow: To-Do Planner

This document describes the single-agent workflow implemented in `todo-agent-workflow`.

## Goal

Convert a raw to-do list into a prioritized task board with three lanes:
- `today`
- `thisWeek`
- `later`

The workflow also flags risks such as vague tasks or missing owner details.

## Workflow Type

Single-agent workflow with one continuous thread.

## Agent

- `Single Agent`

The same agent performs the full sequence from input cleaning to final output.

## Thread

- `singleAgentThread`

This is the only thread used by the workflow. It contains all stages and the full reasoning trail.

## Input

`POST /api/single-agent/todos`

Request body:

```json
{
  "text": "Submit project update today\nEmail mentor\nBuy snacks"
}
```

Rules:
- Input must be non-empty text.
- Tasks are parsed from newline, comma, or semicolon separators.

## Stages

1. `Understanding`
- Read raw input.
- Remove empty lines and normalize task candidates.
- Handoff: cleaned tasks to planning.

2. `Planning`
- Enrich each task with category, urgency, importance, priority.
- Detect review risks (`isVague`, `needsOwner`).
- Handoff: scored tasks to execution.

3. `Executing`
- Build initial board:
  - high priority/urgency -> `today`
  - medium -> `thisWeek`
  - low -> `later`
- Handoff: draft board to review.

4. `Reviewing`
- Check for:
  - overloaded `today` lane (>4 tasks)
  - vague tasks
  - communication tasks missing owner/recipient
- Handoff: warnings to adjustment.

5. `Adjusting`
- Keep board placement stable.
- Add notes on risky tasks (clarify action, add owner).
- Handoff: adjusted board to completion.

6. `Completed`
- Return final board.
- Return stage trail inside `singleAgentThread`.

## Output

Response includes:
- `mode: "single-agent"`
- `threadName: "singleAgentThread"`
- `stages` (all stage records)
- `threads` (array containing one thread)
- `board` (`today`, `thisWeek`, `later`)
- `review` (`warnings`, `adjustments`)

## Success Criteria

- Exactly one agent is used.
- Exactly one thread is returned: `singleAgentThread`.
- All six stages appear in order.
- Final board includes `today`, `thisWeek`, and `later`.
- Review warnings are surfaced and reflected as notes in adjusted tasks when needed.