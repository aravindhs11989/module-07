const SAMPLE = `Submit project update today
Email mentor about review notes
Prepare slides for Friday demo
Buy snacks for study group
Read agentic workflow chapter
Plan something for later`;

const CATEGORY_KEYWORDS = [
  { category: "learning", words: ["study", "learn", "read", "practice", "course"] },
  { category: "communication", words: ["email", "call", "message", "reply", "meet"] },
  { category: "delivery", words: ["submit", "send", "publish", "deploy", "share"] },
  { category: "home", words: ["buy", "clean", "cook", "laundry", "snacks"] },
  { category: "planning", words: ["plan", "schedule", "prepare", "outline", "slides"] }
];

const URGENT_WORDS = ["today", "urgent", "asap", "now", "tonight", "deadline"];
const SOON_WORDS = ["tomorrow", "soon", "week", "friday", "monday", "next"];
const VAGUE_WORDS = ["stuff", "things", "misc", "something", "later"];

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const error = document.getElementById("error");
const stagesContainer = document.getElementById("stages");
const stageCount = document.getElementById("stage-count");
const sampleButton = document.getElementById("load-sample");

sampleButton.addEventListener("click", () => {
  input.value = SAMPLE;
  error.textContent = "";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  error.textContent = "";

  const rawText = input.value || "";
  if (!rawText.trim()) {
    error.textContent = "Add a to-do list before running the workflow.";
    return;
  }

  const result = runSingleAgentWorkflow(rawText);
  renderStages(result.stages);
  renderBoard(result.board);
});

input.value = SAMPLE;

function runSingleAgentWorkflow(rawText) {
  const parsed = parseTodos(rawText);
  const planned = enrichTodos(parsed);
  const board = buildBoard(planned);
  const review = reviewPlan(planned, board);
  const adjustedBoard = adjustBoard(board, review);

  const stages = [
    makeStage("Understanding", "Single Agent", "Read the raw list and cleaned it into task candidates.", {
      input: rawText.trim(),
      decision: `Found ${parsed.length} task candidates.`,
      handoff: "Use the cleaned tasks as planning input.",
      changed: "Removed empty lines and normalized separators."
    }),
    makeStage("Planning", "Single Agent", "Estimated category, urgency, importance, and owner risk for each task.", {
      input: `${parsed.length} cleaned tasks`,
      decision: "Use keyword signals to score urgency and group related work.",
      handoff: "Pass enriched tasks to execution.",
      changed: "Added category, priority, and risk flags."
    }),
    makeStage("Executing", "Single Agent", "Built the first task board from the enriched list.", {
      input: "Scored tasks",
      decision: "Place high urgency tasks today, medium tasks this week, and low urgency tasks later.",
      handoff: "Send board to review.",
      changed: summarizeBoard(board)
    }),
    makeStage("Reviewing", "Single Agent", "Checked vague tasks, overload, and missing ownership details.", {
      input: "Draft task board",
      decision: review.warnings.length ? "The plan needs small adjustments before completion." : "The plan is ready without adjustment.",
      handoff: "Send warnings to adjustment.",
      changed: review.warnings
    }, review.warnings.length ? "warning" : "done"),
    makeStage("Adjusting", "Single Agent", "Added review notes and marked risky tasks for clarification.", {
      input: "Review warnings",
      decision: review.warnings.length ? "Keep placement stable, add annotations for risky tasks." : "No changes needed.",
      handoff: "Return final board.",
      changed: review.adjustments
    }, review.warnings.length ? "done" : "skipped"),
    makeStage("Completed", "Single Agent", "Returned one continuous workflow thread and the final to-do board.", {
      input: "Adjusted board",
      decision: "Expose the whole reasoning trail in a single thread.",
      handoff: "singleAgentThread",
      changed: summarizeBoard(adjustedBoard)
    })
  ];

  return {
    mode: "single-agent",
    threadName: "singleAgentThread",
    stages,
    board: adjustedBoard,
    review
  };
}

function parseTodos(rawText) {
  return rawText
    .split(/\r?\n|;|,/)
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean)
    .map((title, index) => ({
      id: `task-${index + 1}`,
      title
    }));
}

function enrichTodos(tasks) {
  return tasks.map((task) => {
    const lowerTitle = task.title.toLowerCase();
    const urgency = getSignalScore(lowerTitle, URGENT_WORDS, 3) + getSignalScore(lowerTitle, SOON_WORDS, 1);
    const importance = /submit|send|deliver|deadline|exam|project|client|manager/.test(lowerTitle) ? 3 : 1;
    const priority = clamp(urgency + importance, 1, 5);
    const category = getCategory(lowerTitle);
    const isVague = VAGUE_WORDS.some((word) => lowerTitle.includes(word)) || task.title.length < 8;
    const needsOwner = /call|email|meet|message|send/.test(lowerTitle) && !/to |with |for /.test(lowerTitle);

    return {
      ...task,
      category,
      urgency,
      importance,
      priority,
      isVague,
      needsOwner,
      notes: []
    };
  });
}

function buildBoard(tasks) {
  return tasks.reduce(
    (board, task) => {
      if (task.priority >= 4 || task.urgency >= 3) {
        board.today.push(task);
      } else if (task.priority >= 2 || task.urgency > 0) {
        board.thisWeek.push(task);
      } else {
        board.later.push(task);
      }
      return board;
    },
    { today: [], thisWeek: [], later: [] }
  );
}

function reviewPlan(tasks, board) {
  const warnings = [];
  const vagueTasks = tasks.filter((task) => task.isVague);
  const missingOwnerTasks = tasks.filter((task) => task.needsOwner);

  if (board.today.length > 4) {
    warnings.push("Today has more than four tasks; consider moving lower priority work.");
  }

  if (vagueTasks.length) {
    warnings.push(`Clarify vague tasks: ${vagueTasks.map((task) => task.title).join(", ")}.`);
  }

  if (missingOwnerTasks.length) {
    warnings.push(`Add recipient or owner details for: ${missingOwnerTasks.map((task) => task.title).join(", ")}.`);
  }

  return {
    warnings,
    adjustments: warnings.length
      ? ["Added review notes to tasks that need clarification before execution."]
      : ["No adjustments needed."]
  };
}

function adjustBoard(board, review) {
  if (!review.warnings.length) {
    return board;
  }

  return Object.fromEntries(
    Object.entries(board).map(([lane, tasks]) => [
      lane,
      tasks.map((task) => ({
        ...task,
        notes: [
          ...task.notes,
          ...(task.isVague ? ["Clarify the exact action."] : []),
          ...(task.needsOwner ? ["Add recipient or owner."] : [])
        ]
      }))
    ])
  );
}

function getSignalScore(value, words, score) {
  return words.some((word) => value.includes(word)) ? score : 0;
}

function getCategory(value) {
  const match = CATEGORY_KEYWORDS.find((entry) => entry.words.some((word) => value.includes(word)));
  return match ? match.category : "general";
}

function summarizeBoard(board) {
  return {
    today: board.today.length,
    thisWeek: board.thisWeek.length,
    later: board.later.length
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function makeStage(title, agent, message, details, status = "done") {
  return { title, agent, message, details, status };
}

function renderStages(stages) {
  stageCount.textContent = `${stages.length} stages`;
  stagesContainer.innerHTML = "";

  stages.forEach((stage) => {
    const card = document.createElement("article");
    card.className = "stage-card";

    card.innerHTML = `
      <div class="stage-top">
        <h3>${escapeHtml(stage.title)}</h3>
        <span class="status ${escapeHtml(stage.status)}">${escapeHtml(stage.status)}</span>
      </div>
      <p>${escapeHtml(stage.message)}</p>
      <div class="meta">
        <div><strong>Input:</strong> ${escapeHtml(formatValue(stage.details.input))}</div>
        <div><strong>Decision:</strong> ${escapeHtml(formatValue(stage.details.decision))}</div>
        <div><strong>Handoff:</strong> ${escapeHtml(formatValue(stage.details.handoff))}</div>
        <div><strong>Changed:</strong> ${escapeHtml(formatValue(stage.details.changed))}</div>
      </div>
    `;

    stagesContainer.appendChild(card);
  });
}

function renderBoard(board) {
  renderLane("today", board.today);
  renderLane("thisWeek", board.thisWeek);
  renderLane("later", board.later);
}

function renderLane(laneId, tasks) {
  const laneList = document.querySelector(`#lane-${laneId} ul`);
  laneList.innerHTML = "";

  if (!tasks.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No tasks.";
    laneList.appendChild(empty);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("li");
    const notes = task.notes.length ? `<span class="task-note">${escapeHtml(task.notes.join(" "))}</span>` : "";

    item.innerHTML = `
      <span class="task-title">${escapeHtml(task.title)}</span>
      <span class="task-meta">${escapeHtml(task.category)} - P${escapeHtml(String(task.priority))}</span>
      ${notes}
    `;

    laneList.appendChild(item);
  });
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "None";
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, count]) => `${key}: ${count}`)
      .join(", ");
  }

  return String(value || "None");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
