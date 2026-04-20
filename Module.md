# Module 7: Agentic Workflows (2 Hours)

## Focus
- Task decomposition techniques (break feature spec into subtasks, orchestrate dependencies).
- Multi-step problem solving where an agent reasons about the next action before coding.
- Autonomous coding pipelines: planning ? prompt ? code ? test ? deploy.

## Labs structure (1–2 hours each)
> Both labs remain small (a couple of React screens, a single Express router) but demonstrate how Codex can coordinate complex sequences.

### Lab 7.1 – Spec-to-Feature Builder (labs/spec-to-feature)
- Deliverables: React UI where students drop in a feature spec, list subtasks, and visually reorder/combine them; Node/Express backend returns a simulated workflow plus suggested prompts for each subtask.
- Learning: practice writing decomposition prompts, capture decision rationale, and validate that each subtask produces code artifacts the next step can consume.

### Lab 7.2 – Autonomous Pipeline Demo (labs/automation-pipeline)
- Deliverables: React timeline showing planning ? prompt ? code ? test ? deploy steps; Node/Express backend simulates each stage's response (plan summary, generated code snippet, test result, deploy confirmation).
- Learning: show how Codex can run pipelines across multiple skills and monitor statuses in parallel.

### Lab 7.3 – Document Summarization Demo (labs/document-summarization)
- Deliverables: Vite + React uploader paired with a Node/Express summarizer that emits structured stage metadata (Understanding, Decomposing, Executing, Checking, Adjusting, Completed) together with the condensed summary text.
- Learning: narrate how Codex reads the document, decomposes the summary requirements, executes a draft, checks whether adjustments are needed, and logs that entire flow on the timeline as a way to demonstrate autonomous reasoning.

### Module wrap-up
Document the step-by-step prompt pipeline in Module.md so future lab builds can recreate the spec ? agent ? deploy flow with the simple React/Node starter. The document-summarization/README.md explains how to narrate the Codex timeline when running this lab.
