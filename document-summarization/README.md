# Document Summarization (Module 07)

This mini-lab demonstrates how Codex behaves as an agent: it understands the document, decomposes the work, executes a draft summary, checks the results, adjusts if needed, and then returns a final output. The React frontend mirrors each stage with a timeline and the Express backend emits rich stage data so learners can narrate the flow.

## Structure

- `backend/` – Express server (`POST /api/summarize`) that accepts a `.txt` upload or pasted text, runs a lightweight extractive summarizer, and returns both the shortened text and a sequence of structured stages (Understanding → Decomposing → Executing → Checking → Adjusting → Completed).
- `frontend/` – Vite + React UI that uploads documents, displays the returned summary, and renders a timeline/log that highlights every stage Codex says it performed. The timeline badges update colors/statuses to reflect when each stage is running, warning, skipped, or done.

## Running the demo

1. **Backend**
   ```powershell
   cd modules/module-07-agentic-workflows/document-summarization/backend
   npm install
   npm run start
   ```
   The server listens on `http://localhost:4001` and exposes `POST /api/summarize` for uploads.

2. **Frontend**
   ```powershell
   cd modules/module-07-agentic-workflows/document-summarization/frontend
   npm install
   npm run dev
   ```
   Visit `http://localhost:5173` to open the React experience. The Vite dev server proxies `/api` calls to Port 4001, so both services can run locally.

3. **Demonstrating the agentic workflow**
   - Upload a `.txt` file or paste the document text, then click **Run Codex workflow**.
   - While the request is running, the timeline shows a live animation of the Understanding → ... → Completed stages.
   - After the backend responds, each stage displays the structured details (word counts, sentence indexes, warnings about adjustments) so you can read aloud how Codex reasoned about the text.
   - Use the timeline’s “Checking” and “Adjusting” entries to explain how Codex evaluated the draft summary and trimmed it, with the final summary below the form reflecting the completed plan.

## Teaching talking points

- **Understanding**: Highlight word/sentence counts emitted by the backend and mention how Codex spots the document length before doing anything else.
- **Decomposing**: Point to the target sentence count and explain how Codex decided how much to trim.
- **Executing → Checking**: Show how the frontend timeline switches from `running` to `warning` (when the summary is too long) and how the backend explains the reason in the stage details.
- **Adjusting → Completed**: Emphasize that Codex trims the summary in the backend, updates the timeline status to `done`, and the UI surface shows the final text so students can link each log entry back to the actual behavior.

## Notes

- If you modify the summarizer heuristics in `backend/src/summary.js`, the timeline automatically reflects new scoring/selection details because they are included in the `metrics` objects returned with each stage.
- The demo intentionally relies on a rule-based summarizer so it can run without API keys; change the summarizer only if you want to explore wiring Codex to another service.
