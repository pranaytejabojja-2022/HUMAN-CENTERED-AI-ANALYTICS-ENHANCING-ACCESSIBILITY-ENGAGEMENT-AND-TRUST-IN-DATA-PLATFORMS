/**
 * Local NLP Query Handler
 * Answers questions about uploaded datasets without relying on remote API
 */

export interface DataContext {
  fileName: string;
  rowCount: number;
  columnCount: number;
  columns: { name: string; type: string; missing: number; unique: number }[];
  summary: Record<string, any>;
  correlations: Record<string, Record<string, number>>;
  data: Record<string, any>[];
  insights: {
    summary: string;
    insights: string[];
    recommendations: string[];
  };
}

export interface QueryResponse {
  answer: string;
  visualization?: {
    type: 'summary' | 'insight' | 'stat';
    title: string;
    content: string | Record<string, any>;
  };
}

const generateDatasetSummary = (context: DataContext): string => {
  const numericCols = context.columns.filter(c => c.type === 'numeric').length;
  const categoricalCols = context.columns.filter(c => c.type === 'categorical').length;
  const dateCols = context.columns.filter(c => c.type === 'date').length;
  const totalMissing = context.columns.reduce((sum, c) => sum + c.missing, 0);

  return `The dataset "${context.fileName}" contains ${context.rowCount.toLocaleString()} rows and ${context.columnCount} columns. 
  
**Column Breakdown:**
- Numeric columns: ${numericCols}
- Categorical columns: ${categoricalCols}
- Date columns: ${dateCols}

**Data Quality:**
- Missing values: ${totalMissing} (${((totalMissing / (context.rowCount * context.columnCount)) * 100).toFixed(2)}%)
- Unique value ranges: ${context.columns.map(c => `${c.name} (${c.unique} unique)`).join(', ')}

${context.insights.summary}`;
};

const findColumnByName = (context: DataContext, name: string): { name: string; type: string; missing: number; unique: number } | null => {
  const lower = name.toLowerCase();
  return context.columns.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())) || null;
};

const getColumnStats = (context: DataContext, columnName: string): Record<string, any> | null => {
  const col = findColumnByName(context, columnName);
  if (!col) return null;

  const values = context.data.map(row => row[col.name]).filter(v => v !== null && v !== undefined);
  
  if (col.type === 'numeric') {
    const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
    const sorted = nums.sort((a, b) => a - b);
    return {
      column: col.name,
      type: 'numeric',
      count: nums.length,
      mean: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2),
      median: sorted[Math.floor(sorted.length / 2)].toFixed(2),
      min: Math.min(...nums).toFixed(2),
      max: Math.max(...nums).toFixed(2),
      missing: col.missing,
    };
  } else if (col.type === 'categorical') {
    const freq: Record<string, number> = {};
    values.forEach(v => freq[v] = (freq[v] || 0) + 1);
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    return {
      column: col.name,
      type: 'categorical',
      count: values.length,
      unique: col.unique,
      topValues: sorted.slice(0, 5).map(([val, count]) => `${val} (${count})`).join(', '),
      missing: col.missing,
    };
  }
  
  return null;
};

const summarizeTopDrivers = (context: DataContext): string => {
  const correlationPairs = Object.entries(context.correlations)
    .flatMap(([col1, row]) =>
      Object.entries(row)
        .filter(([col2]) => col1 !== col2)
        .map(([col2, value]) => ({ col1, col2, value }))
    )
    .filter(pair => pair.value !== null && pair.value !== undefined && !Number.isNaN(pair.value))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 3);

  if (correlationPairs.length === 0) {
    return 'No strong numeric relationships were detected in the dataset.';
  }

  return correlationPairs
    .map(pair => {
      const direction = pair.value > 0 ? 'positive' : 'negative';
      return `- ${pair.col1} and ${pair.col2}: ${Math.abs(pair.value).toFixed(2)} (${direction} relationship)`;
    })
    .join('\n');
};

const processQuery = (query: string, context: DataContext): QueryResponse => {
  const q = query.toLowerCase().trim();

  // "What is this dataset about?" or similar
  if (q.includes('what') && (q.includes('dataset') || q.includes('data') || q.includes('about'))) {
    return {
      answer: generateDatasetSummary(context),
      visualization: {
        type: 'summary',
        title: 'Dataset Overview',
        content: {
          rows: context.rowCount.toLocaleString(),
          columns: context.columnCount,
          fileName: context.fileName,
        },
      },
    };
  }

  // "Tell me about [column]" or "[column] statistics"
  if (q.includes('about') || q.includes('statistics') || q.includes('stats')) {
    for (const col of context.columns) {
      if (q.includes(col.name.toLowerCase())) {
        const stats = getColumnStats(context, col.name);
        if (stats) {
          let answer = `**${stats.column} Statistics:**\n\n`;
          if (stats.type === 'numeric') {
            answer += `- Count: ${stats.count}\n- Mean: ${stats.mean}\n- Median: ${stats.median}\n- Min: ${stats.min}\n- Max: ${stats.max}\n- Missing: ${stats.missing}`;
          } else {
            answer += `- Total Values: ${stats.count}\n- Unique Values: ${stats.unique}\n- Top Values: ${stats.topValues}\n- Missing: ${stats.missing}`;
          }
          return { answer, visualization: { type: 'stat', title: `${stats.column} Stats`, content: stats } };
        }
      }
    }
  }

  // "How many rows" or "total records"
  if ((q.includes('how many') || q.includes('total')) && (q.includes('rows') || q.includes('records') || q.includes('entries'))) {
    return {
      answer: `The dataset contains **${context.rowCount.toLocaleString()}** rows.`,
      visualization: { type: 'stat', title: 'Total Rows', content: { rows: context.rowCount } },
    };
  }

  // "How many columns"
  if ((q.includes('how many') || q.includes('total')) && (q.includes('column'))) {
    return {
      answer: `The dataset has **${context.columnCount}** columns:\n\n${context.columns.map(c => `- **${c.name}** (${c.type})`).join('\n')}`,
      visualization: { type: 'stat', title: 'Total Columns', content: { columns: context.columnCount } },
    };
  }

  // "What are the columns" or "list columns"
  if ((q.includes('column') && q.includes('list')) || q.includes('fields')) {
    return {
      answer: `**Dataset Columns:**\n\n${context.columns.map((c, i) => `${i + 1}. **${c.name}** - ${c.type} (${c.unique} unique values, ${c.missing} missing)`).join('\n')}`,
      visualization: { type: 'summary', title: 'Dataset Columns', content: { columns: context.columns.length, details: context.columns } },
    };
  }

  // "What are the insights" or "key findings"
  if (q.includes('insight') || q.includes('finding') || q.includes('recommend')) {
    let answer = '**Key Insights & Recommendations:**\n\n';
    if (context.insights.insights.length > 0) {
      answer += '**Insights:**\n' + context.insights.insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n') + '\n\n';
    }
    if (context.insights.recommendations.length > 0) {
      answer += '**Recommendations:**\n' + context.insights.recommendations.map((r, idx) => `${idx + 1}. ${r}`).join('\n');
    }
    return { answer, visualization: { type: 'insight', title: 'Insights & Recommendations', content: context.insights } };
  }

  // "Show correlation" or "correlation matrix"
  if (q.includes('correlation')) {
    const correlations = Object.entries(context.correlations)
      .flatMap(([col1, corrs]) => 
        Object.entries(corrs)
          .filter(([col2]) => col1 < col2)
          .map(([col2, val]) => ({ col1, col2, value: val }))
      )
      .filter(c => Math.abs(c.value) > 0.3)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 10);

    if (correlations.length === 0) {
      return { answer: 'No significant correlations found in the dataset.' };
    }

    let answer = '**Top Correlations:**\n\n';
    answer += correlations.map(c => `- **${c.col1}** ↔ **${c.col2}**: ${c.value.toFixed(3)}`).join('\n');
    
    return { answer, visualization: { type: 'stat', title: 'Correlations', content: { correlations } } };
  }

  // "Missing data" or "data quality"
  if (q.includes('missing') || q.includes('quality') || q.includes('null')) {
    const totalMissing = context.columns.reduce((sum, c) => sum + c.missing, 0);
    const missingByCol = context.columns.filter(c => c.missing > 0);
    
    let answer = `**Data Quality Report:**\n\n`;
    answer += `- Total Missing Values: ${totalMissing} (${((totalMissing / (context.rowCount * context.columnCount)) * 100).toFixed(2)}%)\n\n`;
    
    if (missingByCol.length > 0) {
      answer += '**Columns with Missing Values:**\n';
      answer += missingByCol.map(c => `- ${c.name}: ${c.missing} (${((c.missing / context.rowCount) * 100).toFixed(1)}%)`).join('\n');
    } else {
      answer += 'No missing values detected!';
    }
    
    return { answer };
  }

  // Default: provide a helpful response with suggestions
  return {
    answer: `I could not identify a precise question, so I am providing a direct, data-driven analysis of the dataset:\n\n${generateDatasetSummary(context)}\n\n**Top drivers in the dataset:**\n${summarizeTopDrivers(context)}`,
  };
};

export const handleQuery = (query: string, context: DataContext): QueryResponse => {
  try {
    return processQuery(query, context);
  } catch (error) {
    console.error('Query handler error:', error);
    return {
      answer: 'Sorry, I encountered an error processing your query. Please try asking a different question.',
    };
  }
};

export const generateWelcomeMessage = (context: DataContext): string => {
  const numericCols = context.columns.filter(c => c.type === 'numeric').length;
  const categoricalCols = context.columns.filter(c => c.type === 'categorical').length;
  
  return `Welcome! 👋 I'm your AI Analytics Assistant analyzing **${context.fileName}** with ${context.rowCount.toLocaleString()} rows and ${context.columnCount} columns (${numericCols} numeric, ${categoricalCols} categorical).

🤖 **Powered by ChatGPT AI** - I can answer complex questions about your data, provide insights, and make recommendations!

${context.insights.summary}

Ask me anything about your data - I'll provide detailed analysis!`;
};
