# Multi-Agent Workflow: To-Do Team

This document describes the multi-agent workflow used for to-do planning.

## Goal

Convert raw to-do text into a reviewed, prioritized board using specialist agents with explicit handoffs.

## Workflow Type

Multi-agent workflow with five threads.

## Agents

- `Intake Agent`
- `Priority Agent`
- `Scheduling Agent`
- `Review Agent`
- `Coordinator Agent`

## Threads

- `intakeThread`
- `priorityThread`
- `scheduleThread`
- `reviewThread`
- `coordinatorThread`

## Input

`POST /api/multi-agent/todos`

```json
{
  "text": "Prepare slides tomorrow\nEmail mentor\nBuy snacks"
}
```

Rules:
- Input must be non-empty text.
- Tasks can be separated by newline, comma, or semicolon.

## Handoff Sequence

1. `Intake Agent` (`intakeThread`)
- Cleans raw input into explicit tasks.
- Handoff: parsed tasks -> `Priority Agent`.

2. `Priority Agent` (`priorityThread`)
- Adds category, urgency, importance, and priority score.
- Handoff: scored tasks -> `Scheduling Agent`.

3. `Scheduling Agent` (`scheduleThread`)
- Places tasks into `today`, `thisWeek`, `later`.
- Handoff: draft board -> `Review Agent`.

4. `Review Agent` (`reviewThread`)
- Flags overloaded today lane, vague tasks, and missing owner details.
- Handoff: warnings -> `Coordinator Agent`.

5. `Coordinator Agent` (`coordinatorThread`)
- Applies adjustments (notes on risky tasks), merges all handoffs, and publishes final response.

## Output

Response includes:
- `mode: "multi-agent"`
- `threadName: "coordinatorThread"`
- `threads` (all specialist thread records)
- `stages` (flattened stage history)
- `board` (`today`, `thisWeek`, `later`)
- `review` (`warnings`, `adjustments`)

## Success Criteria

- Five specialist agents are visible.
- Each agent has a matching thread.
- Handoffs are explicit between consecutive threads.
- Only `Coordinator Agent` returns final completion.
- Final board includes all three lanes with review notes when required.