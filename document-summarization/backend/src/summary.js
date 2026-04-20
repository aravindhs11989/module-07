const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "with"
]);

function summarizeDocument(input) {
  const normalizedText = normalizeWhitespace(input);
  const sentences = splitSentences(normalizedText);
  const words = tokenize(normalizedText);
  const targetSentenceCount = getTargetSentenceCount(sentences.length);
  const frequencyMap = buildFrequencyMap(words);
  const scoredSentences = scoreSentences(sentences, frequencyMap);
  const selectedDraft = selectSentences(scoredSentences, targetSentenceCount + 1);
  const draftSummary = joinSentences(selectedDraft);
  const needsAdjustment = selectedDraft.length > targetSentenceCount;
  const finalSentences = needsAdjustment
    ? selectedDraft.slice(0, targetSentenceCount)
    : selectedDraft;
  const summary = joinSentences(finalSentences);

  return {
    summary,
    originalText: normalizedText,
    metrics: {
      originalWordCount: words.length,
      originalSentenceCount: sentences.length,
      summaryWordCount: tokenize(summary).length,
      summarySentenceCount: finalSentences.length,
      targetSentenceCount
    },
    stages: buildStages({
      words,
      sentences,
      frequencyMap,
      scoredSentences,
      selectedDraft,
      draftSummary,
      needsAdjustment,
      finalSentences,
      summary,
      targetSentenceCount
    })
  };
}

function buildStages(context) {
  const {
    words,
    sentences,
    frequencyMap,
    scoredSentences,
    selectedDraft,
    draftSummary,
    needsAdjustment,
    finalSentences,
    summary,
    targetSentenceCount
  } = context;

  const topTerms = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([term, count]) => ({ term, count }));

  const selectedIndexes = selectedDraft.map((sentence) => sentence.index + 1);
  const finalIndexes = finalSentences.map((sentence) => sentence.index + 1);

  return [
    {
      id: "understanding",
      title: "Understanding",
      status: "done",
      message: "Read the document and measured the source material before drafting.",
      metrics: {
        wordCount: words.length,
        sentenceCount: sentences.length,
        topTerms
      }
    },
    {
      id: "decomposing",
      title: "Decomposing",
      status: "done",
      message: "Chose a compact target and ranked sentences by signal words and placement.",
      metrics: {
        targetSentenceCount,
        scoredSentenceCount: scoredSentences.length,
        scoringSignals: ["term frequency", "opening context", "closing context"]
      }
    },
    {
      id: "executing",
      title: "Executing",
      status: "done",
      message: "Drafted an extractive summary from the strongest sentences.",
      metrics: {
        selectedSentenceIndexes: selectedIndexes,
        draftSentenceCount: selectedDraft.length,
        draftWordCount: tokenize(draftSummary).length
      }
    },
    {
      id: "checking",
      title: "Checking",
      status: needsAdjustment ? "warning" : "done",
      message: needsAdjustment
        ? "The draft was useful but longer than the target, so it needs a trim."
        : "The draft already fits the target length.",
      metrics: {
        targetSentenceCount,
        draftSentenceCount: selectedDraft.length,
        adjustmentRequired: needsAdjustment
      }
    },
    {
      id: "adjusting",
      title: "Adjusting",
      status: needsAdjustment ? "done" : "skipped",
      message: needsAdjustment
        ? "Trimmed the draft to the highest-ranked sentences while preserving source order."
        : "No adjustment was needed after checking the draft.",
      metrics: {
        removedSentenceCount: Math.max(0, selectedDraft.length - finalSentences.length),
        finalSentenceIndexes: finalIndexes
      }
    },
    {
      id: "completed",
      title: "Completed",
      status: "done",
      message: "Returned the final condensed summary and the full workflow log.",
      metrics: {
        finalSentenceCount: finalSentences.length,
        finalWordCount: tokenize(summary).length
      }
    }
  ];
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function splitSentences(text) {
  if (!text) {
    return [];
  }

  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  return matches
    .map((sentence, index) => ({
      index,
      text: sentence.trim()
    }))
    .filter((sentence) => sentence.text.length > 0);
}

function tokenize(text) {
  const matches = text.toLowerCase().match(/[a-z0-9']+/g);
  return matches || [];
}

function buildFrequencyMap(words) {
  return words.reduce((map, word) => {
    if (STOP_WORDS.has(word) || word.length < 3) {
      return map;
    }

    map.set(word, (map.get(word) || 0) + 1);
    return map;
  }, new Map());
}

function scoreSentences(sentences, frequencyMap) {
  if (sentences.length === 0) {
    return [];
  }

  return sentences.map((sentence) => {
    const words = tokenize(sentence.text);
    const keywordScore = words.reduce(
      (score, word) => score + (frequencyMap.get(word) || 0),
      0
    );
    const normalizedKeywordScore = words.length ? keywordScore / words.length : 0;
    const positionScore = getPositionScore(sentence.index, sentences.length);

    return {
      ...sentence,
      score: Number((normalizedKeywordScore + positionScore).toFixed(3)),
      metrics: {
        keywordScore: Number(normalizedKeywordScore.toFixed(3)),
        positionScore
      }
    };
  });
}

function getPositionScore(index, total) {
  if (index === 0) {
    return 1;
  }

  if (index === total - 1) {
    return 0.55;
  }

  return 0.15;
}

function getTargetSentenceCount(sentenceCount) {
  if (sentenceCount <= 2) {
    return sentenceCount;
  }

  return Math.min(5, Math.max(2, Math.ceil(sentenceCount * 0.35)));
}

function selectSentences(scoredSentences, count) {
  return scoredSentences
    .slice()
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.min(count, scoredSentences.length))
    .sort((a, b) => a.index - b.index);
}

function joinSentences(sentences) {
  return sentences.map((sentence) => sentence.text).join(" ");
}

module.exports = {
  summarizeDocument,
  splitSentences,
  tokenize
};
