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
const threadsContainer = document.getElementById("threads");
const threadCount = document.getElementById("thread-count");
const sampleBtn = document.getElementById("sample-btn");

sampleBtn.addEventListener("click", () => {
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

  const result = runMultiAgentWorkflow(rawText);
  renderThreads(result.threads);
  renderBoard(result.board);
});

input.value = SAMPLE;

function runMultiAgentWorkflow(rawText) {
  const parsed = parseTodos(rawText);
  const enriched = enrichTodos(parsed);
  const board = buildBoard(enriched);
  const review = reviewPlan(enriched, board);
  const adjustedBoard = adjustBoard(board, review);

  const threads = [
    makeThread("intakeThread", "Intake Thread", "Intake Agent", [
      makeStage("Understanding", "Intake Agent", {
        input: rawText.trim(),
        decision: `Accept ${parsed.length} non-empty tasks.`,
        handoff: "Cleaned task list for Priority Agent.",
        changed: parsed.map((task) => task.title)
      })
    ]),
    makeThread("priorityThread", "Priority Thread", "Priority Agent", [
      makeStage("Planning", "Priority Agent", {
        input: "Cleaned task list",
        decision: "Urgent words and delivery verbs raise priority.",
        handoff: "Scored tasks for Scheduling Agent.",
        changed: enriched.map((task) => `${task.title}: P${task.priority}`)
      })
    ]),
    makeThread("scheduleThread", "Schedule Thread", "Scheduling Agent", [
      makeStage("Executing", "Scheduling Agent", {
        input: "Scored task list",
        decision: "Use priority score first, then urgency hints.",
        handoff: "Draft board for Review Agent.",
        changed: summarizeBoard(board)
      })
    ]),
    makeThread("reviewThread", "Review Thread", "Review Agent", [
      makeStage("Reviewing", "Review Agent", {
        input: "Draft board",
        decision: review.warnings.length ? "Send warnings to Coordinator Agent." : "Approve the board.",
        handoff: "Review findings for Coordinator Agent.",
        changed: review.warnings
      }, review.warnings.length ? "warning" : "done")
    ]),
    makeThread("coordinatorThread", "Coordinator Thread", "Coordinator Agent", [
      makeStage("Adjusting", "Coordinator Agent", {
        input: "Draft board and review findings",
        decision: review.warnings.length ? "Annotate risky tasks while preserving schedule." : "Publish board as reviewed.",
        handoff: "Final board for learner.",
        changed: review.adjustments
      }, review.warnings.length ? "done" : "skipped"),
      makeStage("Completed", "Coordinator Agent", {
        input: "All agent handoffs",
        decision: "Show specialist contributions and final coordinated result.",
        handoff: "coordinatorThread",
        changed: summarizeBoard(adjustedBoard)
      })
    ])
  ];

  return {
    mode: "multi-agent",
    threadName: "coordinatorThread",
    threads,
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
    const urgency = signal(lowerTitle, URGENT_WORDS, 3) + signal(lowerTitle, SOON_WORDS, 1);
    const importance = /submit|send|deliver|deadline|exam|project|client|manager/.test(lowerTitle) ? 3 : 1;
    const priority = clamp(urgency + importance, 1, 5);
    const category = getCategory(lowerTitle);
    const isVague = VAGUE_WORDS.some((word) => lowerTitle.includes(word)) || task.title.length < 8;
    const needsOwner = /call|email|meet|message|send/.test(lowerTitle) && !/to |with |for /.test(lowerTitle);

    return { ...task, urgency, importance, priority, category, isVague, needsOwner, notes: [] };
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
  const vague = tasks.filter((task) => task.isVague);
  const missingOwner = tasks.filter((task) => task.needsOwner);

  if (board.today.length > 4) {
    warnings.push("Today has more than four tasks; consider moving lower priority work.");
  }

  if (vague.length) {
    warnings.push(`Clarify vague tasks: ${vague.map((task) => task.title).join(", ")}.`);
  }

  if (missingOwner.length) {
    warnings.push(`Add recipient or owner details for: ${missingOwner.map((task) => task.title).join(", ")}.`);
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

function makeThread(id, title, agent, stages) {
  return { id, title, agent, stages };
}

function makeStage(title, agent, details, status = "done") {
  return { title, agent, details, status };
}

function renderThreads(threads) {
  threadCount.textContent = `${threads.length} threads`;
  threadsContainer.innerHTML = "";

  threads.forEach((thread) => {
    const card = document.createElement("article");
    card.className = "thread-card";

    const stageHtml = thread.stages
      .map(
        (stage) => `
          <div class="stage">
            <p class="stage-title">${escapeHtml(stage.title)} (${escapeHtml(stage.status)})</p>
            <p class="stage-meta"><strong>Input:</strong> ${escapeHtml(formatValue(stage.details.input))}</p>
            <p class="stage-meta"><strong>Decision:</strong> ${escapeHtml(formatValue(stage.details.decision))}</p>
            <p class="stage-meta"><strong>Handoff:</strong> ${escapeHtml(formatValue(stage.details.handoff))}</p>
            <p class="stage-meta"><strong>Changed:</strong> ${escapeHtml(formatValue(stage.details.changed))}</p>
          </div>
        `
      )
      .join("");

    card.innerHTML = `
      <div class="thread-head">
        <h3>${escapeHtml(thread.title)}</h3>
        <span class="agent">${escapeHtml(thread.agent)}</span>
      </div>
      ${stageHtml}
    `;

    threadsContainer.appendChild(card);
  });
}

function renderBoard(board) {
  renderLane("today", board.today);
  renderLane("thisWeek", board.thisWeek);
  renderLane("later", board.later);
}

function renderLane(id, tasks) {
  const list = document.querySelector(`#lane-${id} ul`);
  list.innerHTML = "";

  if (!tasks.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No tasks.";
    list.appendChild(empty);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="task-title">${escapeHtml(task.title)}</span>
      <span class="task-meta">${escapeHtml(task.category)} - P${task.priority}</span>
      ${task.notes.length ? `<span class="task-note">${escapeHtml(task.notes.join(" "))}</span>` : ""}
    `;

    list.appendChild(item);
  });
}

function signal(value, words, score) {
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}