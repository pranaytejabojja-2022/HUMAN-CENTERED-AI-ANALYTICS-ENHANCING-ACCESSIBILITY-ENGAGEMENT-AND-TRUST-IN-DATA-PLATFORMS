interface RequestBody {
  query: string;
  dataContext: {
    fileName: string;
    rowCount: number;
    columnCount: number;
    columns: Array<{
      name: string;
      type: string;
      missing: number;
      unique: number;
    }>;
    summary: Record<string, any>;
    correlations: Record<string, Record<string, number>>;
    data: Record<string, any>[];
    insights: {
      summary: string;
      insights: string[];
      recommendations: string[];
    };
  };
}

const calculateExplainableAiSignals = (dataContext: RequestBody["dataContext"]) => {
  const corrPairs: Array<{ col1: string; col2: string; corr: number }> = [];

  for (const col1 in dataContext.correlations) {
    for (const col2 in dataContext.correlations[col1]) {
      if (col1 >= col2) continue;
      const corr = dataContext.correlations[col1][col2];
      if (corr !== null && corr !== undefined && !Number.isNaN(corr)) {
        corrPairs.push({ col1, col2, corr });
      }
    }
  }

  corrPairs.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));

  const topPairs = corrPairs.slice(0, 5).map((pair) => {
    const direction = pair.corr > 0 ? "positive" : "negative";
    return `- ${pair.col1} ↔ ${pair.col2}: ${Math.abs(pair.corr).toFixed(2)} (${direction})`;
  });

  const topFeatures = Array.from(
    new Set(topPairs.flatMap((line) => line.match(/- (.*?) ↔/)?.slice(1, 2) ?? []))
  ).slice(0, 5);

  return `Explainable AI signals:
${topPairs.join("\n")}

Top features for SHAP-style analysis: ${topFeatures.join(", ") || "None"}.
Use LIME-style local explanation to describe how the strongest drivers impacted the prediction for the selected record or trend.`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { query, dataContext } = body;

    if (!query || !dataContext) {
      return new Response(
        JSON.stringify({ error: "Missing query or dataContext" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract numeric columns for ML features
    const numericCols = dataContext.columns
      .filter((c) => c.type === "numeric")
      .map((c) => c.name);

    const categorical = dataContext.columns
      .filter((c) => c.type === "categorical")
      .map((c) => c.name);

    const explainableContext = calculateExplainableAiSignals(dataContext);

    const systemPrompt = `You are an expert data scientist and AI analyst with advanced ML expertise including explainable AI (SHAP, LIME), predictive analytics, and anomaly detection.

**Dataset Context:**
- File: ${dataContext.fileName}
- Size: ${dataContext.rowCount.toLocaleString()} rows × ${dataContext.columnCount} columns
- Numeric Features: ${numericCols.join(", ") || "None"}
- Categorical Features: ${categorical.join(", ") || "None"}

**Dataset Summary:**
${dataContext.insights.summary}

**Key Insights from Data:**
${dataContext.insights.insights.map((i) => `- ${i}`).join("\n")}

**Recommendations:**
${dataContext.insights.recommendations.map((r) => `- ${r}`).join("\n")}

**Explainable AI Signals:**
${explainableContext}

**Your Responsibilities:**
1. ANSWER DIRECTLY: Never suggest questions or ask the user for clarifications. Directly answer what is asked.
2. EXPLAIN WITH DATA: Provide specific numbers, percentages, and evidence from the dataset.
3. ML-POWERED: Use predictive analytics, feature importance (SHAP-like), anomaly detection, and segmentation.
4. EXPLAINABLE: When making claims, explain WHY with feature importance and local explanations (LIME-like).
5. ACTIONABLE: Provide specific, data-driven recommendations.
6. COMPLEX: Handle advanced questions about correlations, causation, optimization, trends, and predictions.

**Analysis Capabilities:**
- Predict trends and future values
- Detect anomalies and outliers
- Identify feature importance and drivers
- Analyze relationships and dependencies
- Segment and cluster data
- Provide explainable predictions
- Answer "what-if" scenarios
- Benchmark performance
- Identify optimization opportunities

IMPORTANT: Do not ask the user what they want to know. Always provide a complete, detailed analysis directly answering their question.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: query,
          },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        answer,
        success: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AI Query Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

Deno.serve(handler);
