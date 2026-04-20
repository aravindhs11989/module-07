const cors = require("cors");
const express = require("express");
const multer = require("multer");
const { summarizeDocument } = require("./summary");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const isText =
      file.mimetype === "text/plain" ||
      file.originalname.toLowerCase().endsWith(".txt");

    if (!isText) {
      cb(new Error("Only .txt uploads are supported for this lab."));
      return;
    }

    cb(null, true);
  }
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "document-summarization-backend" });
});

app.post("/api/summarize", upload.single("document"), (req, res) => {
  try {
    const pastedText = typeof req.body.text === "string" ? req.body.text : "";
    const uploadedText = req.file ? req.file.buffer.toString("utf8") : "";
    const documentText = uploadedText || pastedText;

    if (!documentText.trim()) {
      res.status(400).json({
        error: "Add pasted text or upload a .txt file before running the workflow."
      });
      return;
    }

    const result = summarizeDocument(documentText);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "The summarization workflow could not complete.",
      detail: error.message
    });
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({
    error: error.message || "The request could not be processed."
  });
});

const port = process.env.PORT || 4001;

app.listen(port, () => {
  console.log(`Document summarization API listening on http://localhost:${port}`);
});
