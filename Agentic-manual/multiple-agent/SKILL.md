# Skill: Todo Multi-Agent Team

## Skill Name

`todo-multi-agent-planner`

## Description

Use a specialist agent team to transform raw to-do text into a coordinated, reviewed task board.

## Roles

- `Intake Agent`: normalize and parse raw input.
- `Priority Agent`: compute category and priority signals.
- `Scheduling Agent`: build the initial board lanes.
- `Review Agent`: identify risks and warnings.
- `Coordinator Agent`: merge handoffs and publish final output.

## Thread Model

Multi-thread model.

### Threads

- `intakeThread`
- `priorityThread`
- `scheduleThread`
- `reviewThread`
- `coordinatorThread`

## Inputs

- Raw to-do text.
- Input may use newlines, commas, semicolons, and bullet prefixes.

## Instructions

1. Intake Agent parses and cleans tasks.
2. Priority Agent enriches tasks with urgency, importance, and priority.
3. Scheduling Agent places tasks into `today`, `thisWeek`, and `later`.
4. Review Agent emits warnings for overload, vagueness, and missing owners.
5. Coordinator Agent applies review notes and returns final response.

## Output Contract

Return:
- `mode: "multi-agent"`
- `threadName: "coordinatorThread"`
- `threads`: all thread records
- `stages`: all stage records
- `board`: `today`, `thisWeek`, `later`
- `review`: warnings and adjustments

Every stage includes:
- `title`
- `agent`
- `status`
- `message`
- `details.input`
- `details.decision`
- `details.handoff`
- `details.changed`

## Success Criteria

- All five roles appear in output.
- Every role maps to exactly one thread.
- Handoffs follow thread order.
- Only `Coordinator Agent` publishes completion.
- Final board and review metadata are present.