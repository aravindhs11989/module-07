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
      handoff: "Use the cleaned tasks as the planning input.",
      changed: "Removed empty lines and normalized separators."
    }),
    makeStage("Planning", "Single Agent", "Estimated category, urgency, importance, and owner risk for each task.", {
      input: `${parsed.length} cleaned tasks`,
      decision: "Use keyword signals to score urgency and group related work.",
      handoff: "Pass enriched tasks to execution.",
      changed: "Added priority scores and categories."
    }),
    makeStage("Executing", "Single Agent", "Built the first task board from the enriched list.", {
      input: "Scored tasks",
      decision: "Place high urgency tasks today, medium tasks this week, and low urgency tasks later.",
      handoff: "Send board to review.",
      changed: summarizeBoard(board)
    }),
    makeStage("Reviewing", "Single Agent", "Checked vague tasks, overload, and missing ownership details.", {
      input: "Draft task board",
      decision: review.warnings.length
        ? "The plan needs small adjustments before completion."
        : "The plan is ready without adjustment.",
      handoff: "Send warnings to adjustment.",
      changed: review.warnings
    }, review.warnings.length ? "warning" : "done"),
    makeStage("Adjusting", "Single Agent", "Added review notes and marked risky tasks for clarification.", {
      input: "Review warnings",
      decision: review.warnings.length
        ? "Keep task placement stable, but annotate risks so the user can fix them."
        : "No changes needed.",
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
    threads: [
      {
        id: "singleAgentThread",
        title: "Single Agent Thread",
        agent: "Single Agent",
        stages
      }
    ],
    board: adjustedBoard,
    review
  };
}

function runMultiAgentWorkflow(rawText) {
  const parsed = parseTodos(rawText);
  const enriched = enrichTodos(parsed);
  const board = buildBoard(enriched);
  const review = reviewPlan(enriched, board);
  const adjustedBoard = adjustBoard(board, review);

  const threads = [
    makeThread("intakeThread", "Intake Thread", "Intake Agent", [
      makeStage("Understanding", "Intake Agent", "Cleaned the messy input into explicit to-do items.", {
        input: rawText.trim(),
        decision: `Accept ${parsed.length} non-empty tasks.`,
        handoff: "Cleaned task list for Priority Agent.",
        changed: parsed.map((task) => task.title)
      })
    ]),
    makeThread("priorityThread", "Priority Thread", "Priority Agent", [
      makeStage("Planning", "Priority Agent", "Assigned urgency, importance, and category signals.", {
        input: "Cleaned task list",
        decision: "Urgent words and delivery verbs raise priority.",
        handoff: "Scored tasks for Scheduling Agent.",
        changed: enriched.map((task) => `${task.title}: P${task.priority}`)
      })
    ]),
    makeThread("scheduleThread", "Schedule Thread", "Scheduling Agent", [
      makeStage("Executing", "Scheduling Agent", "Placed tasks into today, this week, and later lanes.", {
        input: "Scored task list",
        decision: "Use priority score first, then urgency hints.",
        handoff: "Draft board for Review Agent.",
        changed: summarizeBoard(board)
      })
    ]),
    makeThread("reviewThread", "Review Thread", "Review Agent", [
      makeStage("Reviewing", "Review Agent", "Checked vague tasks, missing owners, and overloaded today lane.", {
        input: "Draft board",
        decision: review.warnings.length ? "Send warnings to Coordinator Agent." : "Approve the board.",
        handoff: "Review findings for Coordinator Agent.",
        changed: review.warnings
      }, review.warnings.length ? "warning" : "done")
    ]),
    makeThread("coordinatorThread", "Coordinator Thread", "Coordinator Agent", [
      makeStage("Adjusting", "Coordinator Agent", "Merged agent handoffs and applied review notes.", {
        input: "Draft board and review findings",
        decision: review.warnings.length
          ? "Annotate risky tasks while preserving useful scheduling."
          : "Publish board as reviewed.",
        handoff: "Final board for the learner.",
        changed: review.adjustments
      }, review.warnings.length ? "done" : "skipped"),
      makeStage("Completed", "Coordinator Agent", "Returned separate threads plus the final coordinated plan.", {
        input: "All agent handoffs",
        decision: "Show each specialist contribution alongside the final result.",
        handoff: "coordinatorThread",
        changed: summarizeBoard(adjustedBoard)
      })
    ])
  ];

  return {
    mode: "multi-agent",
    threadName: "coordinatorThread",
    stages: threads.flatMap((thread) => thread.stages),
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
    const urgency = getSignalScore(lowerTitle, URGENT_WORDS, 3) + getSignalScore(lowerTitle, SOON_WORDS, 1);
    const importance = /submit|send|deliver|deadline|exam|project|client|manager/.test(lowerTitle) ? 3 : 1;
    const priority = Math.min(5, Math.max(1, urgency + importance));
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

function getSignalScore(value, words, score) {
  return words.some((word) => value.includes(word)) ? score : 0;
}

function getCategory(value) {
  const match = CATEGORY_KEYWORDS.find((entry) =>
    entry.words.some((word) => value.includes(word))
  );

  return match ? match.category : "general";
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

function makeThread(id, title, agent, stages) {
  return { id, title, agent, stages };
}

function makeStage(title, agent, message, details, status = "done") {
  return {
    id: `${agent}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title,
    agent,
    status,
    message,
    details
  };
}

function summarizeBoard(board) {
  return {
    today: board.today.length,
    thisWeek: board.thisWeek.length,
    later: board.later.length
  };
}

module.exports = {
  runMultiAgentWorkflow,
  runSingleAgentWorkflow
};
