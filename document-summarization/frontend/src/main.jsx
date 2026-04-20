import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const WORKFLOW_STAGES = [
  "Understanding",
  "Decomposing",
  "Executing",
  "Checking",
  "Adjusting",
  "Completed"
];

const SAMPLE_TEXT = `Agentic workflows help teams break large goals into visible steps. The agent first reads the source material and identifies what matters. It then decomposes the work into smaller tasks that can be checked independently. After that, it drafts an answer using the strongest evidence from the document. A useful workflow also checks whether the draft is concise, accurate, and aligned with the request. If the answer needs refinement, the agent adjusts the result before returning a final response. This pattern makes complex automation easier to teach because every decision leaves a trail.`;

function App() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [activeStage, setActiveStage] = useState(-1);

  const timeline = useMemo(() => {
    if (result?.stages) {
      return result.stages;
    }

    return WORKFLOW_STAGES.map((title, index) => ({
      id: title.toLowerCase(),
      title,
      status: getPendingStatus(index, activeStage, isRunning),
      message: getPendingMessage(index, activeStage, isRunning),
      metrics: {}
    }));
  }, [activeStage, isRunning, result]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!text.trim() && !file) {
      setError("Paste text or choose a .txt file.");
      return;
    }

    setError("");
    setResult(null);
    setIsRunning(true);
    setActiveStage(0);

    const intervalId = window.setInterval(() => {
      setActiveStage((current) =>
        current < WORKFLOW_STAGES.length - 2 ? current + 1 : current
      );
    }, 550);

    try {
      const body = new FormData();
      body.append("text", text);

      if (file) {
        body.append("document", file);
      }

      const response = await fetch("/api/summarize", {
        method: "POST",
        body
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The workflow stopped before completion.");
      }

      setResult(payload);
      setActiveStage(WORKFLOW_STAGES.length - 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      window.clearInterval(intervalId);
      setIsRunning(false);
    }
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
  }

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="page-title">
        <div className="intro">
          <p className="eyebrow">Module 07 Lab</p>
          <h1 id="page-title">Document Summarization Workflow</h1>
          <p>
            Run a document through Understanding, Decomposing, Executing,
            Checking, Adjusting, and Completed.
          </p>
        </div>

        <form className="summarizer" onSubmit={handleSubmit}>
          <label htmlFor="document-text">Document text</label>
          <textarea
            id="document-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={13}
          />

          <div className="file-row">
            <label className="file-label" htmlFor="document-file">
              Upload .txt
            </label>
            <input
              id="document-file"
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileChange}
            />
            <span>{file ? file.name : "No file selected"}</span>
          </div>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={isRunning}>
            {isRunning ? "Workflow running..." : "Run Codex workflow"}
          </button>
        </form>

        <Timeline stages={timeline} />

        <Summary result={result} />
      </section>
    </main>
  );
}

function Timeline({ stages }) {
  return (
    <section className="timeline" aria-label="Workflow stages">
      {stages.map((stage) => (
        <article className="stage" key={stage.id}>
          <div className="stage-header">
            <span className={`status ${stage.status}`}>{stage.status}</span>
            <h2>{stage.title}</h2>
          </div>
          <p>{stage.message}</p>
          <MetricList metrics={stage.metrics} />
        </article>
      ))}
    </section>
  );
}

function MetricList({ metrics }) {
  const entries = Object.entries(metrics || {});

  if (entries.length === 0) {
    return null;
  }

  return (
    <dl className="metrics">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{formatLabel(key)}</dt>
          <dd>{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Summary({ result }) {
  if (!result) {
    return (
      <section className="summary empty" aria-label="Summary">
        <h2>Final summary</h2>
        <p>The condensed summary will appear here.</p>
      </section>
    );
  }

  return (
    <section className="summary" aria-label="Summary">
      <h2>Final summary</h2>
      <p>{result.summary}</p>
      <dl className="summary-stats">
        <div>
          <dt>Source words</dt>
          <dd>{result.metrics.originalWordCount}</dd>
        </div>
        <div>
          <dt>Summary words</dt>
          <dd>{result.metrics.summaryWordCount}</dd>
        </div>
        <div>
          <dt>Target sentences</dt>
          <dd>{result.metrics.targetSentenceCount}</dd>
        </div>
      </dl>
    </section>
  );
}

function getPendingStatus(index, activeStage, isRunning) {
  if (!isRunning) {
    return "queued";
  }

  if (index < activeStage) {
    return "done";
  }

  if (index === activeStage) {
    return "running";
  }

  return "queued";
}

function getPendingMessage(index, activeStage, isRunning) {
  if (!isRunning) {
    return "Waiting for the workflow to start.";
  }

  if (index < activeStage) {
    return "Stage completed.";
  }

  if (index === activeStage) {
    return "Working through this step now.";
  }

  return "Queued.";
}

function formatLabel(value) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "None";
    }

    if (typeof value[0] === "object") {
      return value.map((item) => `${item.term} (${item.count})`).join(", ");
    }

    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
