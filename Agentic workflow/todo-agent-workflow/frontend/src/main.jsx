import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const SAMPLE_TODOS = `Submit project update today
Email mentor about review notes
Prepare slides for Friday demo
Buy snacks for study group
Read agentic workflow chapter
Plan something for later`;

const ROUTES = {
  "/multi-agent": {
    mode: "multi",
    title: "Multi-Agent To-Do Team",
    subtitle: "Specialized agents create visible handoffs, then a coordinator publishes the final plan.",
    endpoint: "/api/multi-agent/todos"
  },
  "/single-agent": {
    mode: "single",
    title: "Single-Agent To-Do Manager",
    subtitle: "One agent handles the complete workflow in one continuous thread.",
    endpoint: "/api/single-agent/todos"
  }
};

function App() {
  const route = ROUTES[window.location.pathname] || ROUTES["/single-agent"];
  const [text, setText] = useState(SAMPLE_TODOS);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  async function runWorkflow(event) {
    event.preventDefault();

    if (!text.trim()) {
      setError("Add a few tasks before running the workflow.");
      return;
    }

    setError("");
    setResult(null);
    setIsRunning(true);

    try {
      const response = await fetch(route.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The workflow could not complete.");
      }

      setResult(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Module 07 Agentic Workflow</p>
          <h1>{route.title}</h1>
          <p>{route.subtitle}</p>
        </div>
        <nav aria-label="Demo routes">
          <a className={route.mode === "single" ? "active" : ""} href="/single-agent">
            Single Agent
          </a>
          <a className={route.mode === "multi" ? "active" : ""} href="/multi-agent">
            Multi Agent
          </a>
        </nav>
      </header>

      <section className="layout">
        <WorkflowForm
          error={error}
          isRunning={isRunning}
          onRun={runWorkflow}
          onSample={() => setText(SAMPLE_TODOS)}
          text={text}
          setText={setText}
        />
        <WorkflowView mode={route.mode} result={result} isRunning={isRunning} />
      </section>

      <TaskBoard board={result?.board} />
    </main>
  );
}

function WorkflowForm({ error, isRunning, onRun, onSample, text, setText }) {
  return (
    <form className="panel input-panel" onSubmit={onRun}>
      <div className="panel-heading">
        <h2>Raw to-do input</h2>
        <button className="secondary" type="button" onClick={onSample}>
          Load sample
        </button>
      </div>
      <textarea
        aria-label="Raw to-do text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={14}
      />
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" disabled={isRunning}>
        {isRunning ? "Workflow running..." : "Run workflow"}
      </button>
    </form>
  );
}

function WorkflowView({ mode, result, isRunning }) {
  const placeholderThreads = useMemo(
    () =>
      mode === "single"
        ? [
            {
              id: "singleAgentThread",
              title: "Single Agent Thread",
              agent: "Single Agent",
              stages: []
            }
          ]
        : ["Intake Agent", "Priority Agent", "Scheduling Agent", "Review Agent", "Coordinator Agent"].map(
            (agent) => ({
              id: agent.toLowerCase().replace(/\s+/g, "-"),
              title: agent,
              agent,
              stages: []
            })
          ),
    [mode]
  );

  const threads = result?.threads || placeholderThreads;

  return (
    <section className={`workflow ${mode === "multi" ? "multi" : ""}`} aria-label="Workflow threads">
      {threads.map((thread) => (
        <ThreadCard key={thread.id} thread={thread} isRunning={isRunning} />
      ))}
    </section>
  );
}

function ThreadCard({ thread, isRunning }) {
  return (
    <article className="panel thread-card">
      <div className="thread-header">
        <span>{thread.agent}</span>
        <h2>{thread.title}</h2>
      </div>
      {thread.stages.length ? (
        <div className="stages">
          {thread.stages.map((stage) => (
            <StageCard key={stage.id} stage={stage} />
          ))}
        </div>
      ) : (
        <p className="empty">{isRunning ? "Waiting for handoff..." : "Run the workflow to reveal this thread."}</p>
      )}
    </article>
  );
}

function StageCard({ stage }) {
  return (
    <article className="stage-card">
      <div className="stage-top">
        <span className={`status ${stage.status}`}>{stage.status}</span>
        <h3>{stage.title}</h3>
      </div>
      <p>{stage.message}</p>
      <dl>
        <Detail label="Input" value={stage.details.input} />
        <Detail label="Decision" value={stage.details.decision} />
        <Detail label="Handoff" value={stage.details.handoff} />
        <Detail label="Changed" value={stage.details.changed} />
      </dl>
    </article>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{formatValue(value)}</dd>
    </div>
  );
}

function TaskBoard({ board }) {
  const lanes = [
    ["today", "Today"],
    ["thisWeek", "This Week"],
    ["later", "Later"]
  ];

  return (
    <section className="board" aria-label="Final prioritized task board">
      <h2>Final prioritized task board</h2>
      <div className="lanes">
        {lanes.map(([key, title]) => (
          <article className="panel lane" key={key}>
            <h3>{title}</h3>
            {board?.[key]?.length ? (
              <ul>
                {board[key].map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong>
                    <span>
                      {task.category} - P{task.priority}
                    </span>
                    {task.notes.length ? <em>{task.notes.join(" ")}</em> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No tasks yet.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "None";
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, count]) => `${formatLabel(key)}: ${count}`)
      .join(", ");
  }

  return String(value || "None");
}

function formatLabel(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
