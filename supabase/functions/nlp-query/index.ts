import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAMPLE_DATA = {
  sales: {
    monthly: [
      { month: "Jan", revenue: 45000, orders: 320 },
      { month: "Feb", revenue: 52000, orders: 380 },
      { month: "Mar", revenue: 48000, orders: 340 },
      { month: "Apr", revenue: 61000, orders: 420 },
      { month: "May", revenue: 55000, orders: 390 },
      { month: "Jun", revenue: 67000, orders: 450 },
    ],
    by_region: [
      { region: "North America", revenue: 125000, percentage: 38 },
      { region: "Europe", revenue: 98000, percentage: 30 },
      { region: "Asia Pacific", revenue: 72000, percentage: 22 },
      { region: "Other", revenue: 33000, percentage: 10 },
    ],
    by_category: [
      { category: "Premium Widget", sales: 45000, units: 320 },
      { category: "Standard Package", sales: 38000, units: 560 },
      { category: "Enterprise Suite", sales: 72000, units: 89 },
      { category: "Basic Plan", sales: 28000, units: 890 },
      { category: "Add-ons", sales: 15000, units: 1200 },
    ],
    total_revenue: 328000,
    average_order_value: 139.5,
    top_products: ["Premium Widget", "Standard Package", "Enterprise Suite"],
  },
  customers: {
    total: 2847,
    new_this_month: 156,
    churn_rate: 4.2,
    retention_rate: 95.8,
    segments: { enterprise: 320, mid_market: 890, small_business: 1637 },
    age_distribution: [
      { age_group: "18-24", count: 312, percentage: 11 },
      { age_group: "25-34", count: 856, percentage: 30 },
      { age_group: "35-44", count: 742, percentage: 26 },
      { age_group: "45-54", count: 541, percentage: 19 },
      { age_group: "55+", count: 396, percentage: 14 },
    ],
    satisfaction: [
      { rating: "Very Satisfied", count: 1280 },
      { rating: "Satisfied", count: 890 },
      { rating: "Neutral", count: 412 },
      { rating: "Unsatisfied", count: 178 },
      { rating: "Very Unsatisfied", count: 87 },
    ],
  },
  performance: {
    conversion_rate: 3.2,
    avg_session_duration: "4m 32s",
    bounce_rate: 42.1,
    page_views: 89420,
    weekly_traffic: [
      { day: "Mon", visitors: 12400 },
      { day: "Tue", visitors: 14200 },
      { day: "Wed", visitors: 13800 },
      { day: "Thu", visitors: 15100 },
      { day: "Fri", visitors: 11900 },
      { day: "Sat", visitors: 8200 },
      { day: "Sun", visitors: 7600 },
    ],
  },
  forecasts: {
    next_month_revenue: 72000,
    confidence: 87,
    factors: [
      { factor: "Seasonal Trend", impact: 35, direction: "positive" },
      { factor: "Marketing Campaign", impact: 25, direction: "positive" },
      { factor: "Customer Growth", impact: 20, direction: "positive" },
      { factor: "Market Competition", impact: 15, direction: "negative" },
      { factor: "Economic Conditions", impact: 5, direction: "neutral" },
    ],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, stream = false } = await req.json();
    
    if (!query) {
      throw new Error("Query is required");
    }

    console.log("Processing NLP query:", query);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an AI analytics assistant for a Human-Centered Analytics Platform. You help users understand their business data through natural language and visualizations.

Available sample data context:
${JSON.stringify(SAMPLE_DATA, null, 2)}

Your responsibilities:
1. Answer questions about the data clearly and concisely
2. When users ask for visualizations, charts, or graphs, identify the best chart type and provide the data
3. Provide insights and trends when relevant
4. Suggest actionable recommendations based on data patterns
5. Explain your reasoning in simple terms (XAI - Explainable AI)

IMPORTANT: You MUST use the generate_visualization tool when:
- User explicitly asks for a chart, graph, plot, or visualization
- User asks to "show", "display", "visualize", or "plot" data
- User mentions specific chart types (bar, line, pie, scatter, etc.)
- User asks about trends, distributions, or comparisons that are better shown visually

Chart type selection guide:
- bar: For comparing categories (sales by region, products comparison)
- line: For trends over time (monthly revenue, growth patterns)
- pie: For showing proportions/percentages (market share, distribution)
- scatter: For relationships between two variables
- area: For cumulative trends or stacked comparisons

Always provide:
- A direct answer to the question
- Key insights or observations
- Any relevant recommendations`;

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_visualization",
          description: "Generate a chart/graph visualization based on data. Use this when users ask for visual representations of data.",
          parameters: {
            type: "object",
            properties: {
              chart_type: {
                type: "string",
                enum: ["bar", "line", "pie", "scatter", "area"],
                description: "The type of chart to generate"
              },
              title: {
                type: "string",
                description: "Chart title"
              },
              data: {
                type: "array",
                items: {
                  type: "object"
                },
                description: "Array of data objects for the chart"
              },
              x_axis: {
                type: "string",
                description: "The key in data objects to use for X axis"
              },
              y_axis: {
                type: "string", 
                description: "The key in data objects to use for Y axis (or value for pie charts)"
              },
              y_axis_label: {
                type: "string",
                description: "Label for Y axis"
              },
              x_axis_label: {
                type: "string",
                description: "Label for X axis"
              },
              color: {
                type: "string",
                description: "Primary color theme: 'cyan', 'amber', 'emerald', 'purple', 'rose'"
              },
              insights: {
                type: "array",
                items: { type: "string" },
                description: "Key insights about the visualization (2-3 bullet points)"
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "Actionable recommendations based on the data"
              }
            },
            required: ["chart_type", "title", "data", "x_axis", "y_axis", "insights"]
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        tools: tools,
        tool_choice: "auto",
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please check your workspace credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    
    let answer = message?.content || "";
    let visualization = null;

    // Check if tool was called
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function?.name === "generate_visualization") {
        try {
          visualization = JSON.parse(toolCall.function.arguments);
          console.log("Generated visualization:", visualization.chart_type);
        } catch (e) {
          console.error("Failed to parse visualization:", e);
        }
      }
    }

    // If no text answer but we have visualization, generate a summary
    if (!answer && visualization) {
      answer = `Here's your ${visualization.chart_type} chart showing "${visualization.title}".`;
    }

    console.log("Query processed successfully");

    return new Response(
      JSON.stringify({ 
        answer,
        query,
        visualization,
        data_context: SAMPLE_DATA,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing query:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});