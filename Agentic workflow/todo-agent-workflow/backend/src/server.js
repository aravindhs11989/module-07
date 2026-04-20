const cors = require("cors");
const express = require("express");
const {
  runMultiAgentWorkflow,
  runSingleAgentWorkflow
} = require("./workflow");

const app = express();
const port = process.env.PORT || 4010;

app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "todo-agent-workflow-backend" });
});

app.post("/api/single-agent/todos", (req, res) => {
  const text = typeof req.body.text === "string" ? req.body.text : "";

  if (!text.trim()) {
    res.status(400).json({ error: "Add a to-do list before running the workflow." });
    return;
  }

  res.json(runSingleAgentWorkflow(text));
});

app.post("/api/multi-agent/todos", (req, res) => {
  const text = typeof req.body.text === "string" ? req.body.text : "";

  if (!text.trim()) {
    res.status(400).json({ error: "Add a to-do list before running the workflow." });
    return;
  }

  res.json(runMultiAgentWorkflow(text));
});

const server = app.listen(port, () => {
  console.log(`To-do agent workflow API listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. The backend may already be running at http://localhost:${port}.`
    );
    console.error(
      `Stop the existing process or start this server on another port with: $env:PORT=4011; npm.cmd run start`
    );
    process.exit(1);
  }

  throw error;
});
