import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'text';
  missing: number;
  unique: number;
  sample: any[];
}

interface DataAnalysis {
  rowCount: number;
  columnCount: number;
  columns: ColumnInfo[];
  summary: Record<string, any>;
  correlations: Record<string, Record<string, number>>;
  distributions: Record<string, Record<string, number>>;
}

// Detect column type
function detectColumnType(values: any[]): 'numeric' | 'categorical' | 'date' | 'text' {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';

  const sample = nonNull.slice(0, 100);
  
  // Check if numeric
  const numericCount = sample.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
  if (numericCount / sample.length > 0.8) return 'numeric';

  // Check if date
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{2}-\d{2}-\d{4}$/,
    /^\w+ \d{1,2}, \d{4}$/,
  ];
  const dateCount = sample.filter(v => {
    const str = String(v);
    return datePatterns.some(p => p.test(str)) || !isNaN(Date.parse(str));
  }).length;
  if (dateCount / sample.length > 0.8) return 'date';

  // Check if categorical (few unique values relative to total)
  const uniqueRatio = new Set(sample.map(String)).size / sample.length;
  if (uniqueRatio < 0.5) return 'categorical';

  return 'text';
}

// Calculate basic statistics for numeric columns
function calculateNumericStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;

  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    count: n,
    mean: Math.round(mean * 100) / 100,
    std: Math.round(stdDev * 100) / 100,
    min: sorted[0],
    max: sorted[n - 1],
    median: n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)],
    q25: sorted[Math.floor(n * 0.25)],
    q75: sorted[Math.floor(n * 0.75)],
  };
}

// Calculate correlation between two numeric arrays
function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : Math.round((numerator / denom) * 100) / 100;
}

function normalizeContent(content: string) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function guessDelimiter(content: string) {
  const lines = normalizeContent(content)
    .split('\n')
    .filter(line => line.trim().length > 0)
    .slice(0, 5);

  const counts: Record<string, number> = {
    ',': 0,
    '\t': 0,
    ';': 0,
    '|': 0,
  };

  lines.forEach((line) => {
    Object.keys(counts).forEach((delimiter) => {
      const matches = line.match(new RegExp(`\\${delimiter}`, 'g'));
      counts[delimiter] += matches ? matches.length : 0;
    });
  });

  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ',';
}

function parseDelimited(content: string, delimiter: string) {
  const normalized = normalizeContent(content);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// Parse CSV content
function parseCSV(content: string): Record<string, any>[] {
  const normalized = normalizeContent(content).trim();
  if (!normalized) return [];

  const delimiter = guessDelimiter(normalized);
  const rows = parseDelimited(normalized, delimiter).filter(row => row.some(cell => cell.trim() !== ''));
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().replace(/^['\"]|['\"]$/g, ''));
  return rows.slice(1).map(line => {
    const values = line.map(v => v.trim().replace(/^['\"]|['\"]$/g, ''));
    const row: Record<string, any> = {};
    headers.forEach((header, i) => {
      let value: any = values[i] || '';
      if (value !== '' && !isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
        value = parseFloat(value);
      }
      row[header] = value;
    });
    return row;
  }).filter(row => Object.values(row).some(v => v !== ''));
}
function parseJSON(content: string): Record<string, any>[] {
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && parsed !== null) {
    // Check for common JSON structures
    const keys = Object.keys(parsed);
    if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
      return parsed[keys[0]];
    }
    return [parsed];
  }
  return [];
}

// Analyze the dataset
function analyzeData(data: Record<string, any>[]): DataAnalysis {
  if (data.length === 0) {
    return { rowCount: 0, columnCount: 0, columns: [], summary: {}, correlations: {}, distributions: {} };
  }

  const columns = Object.keys(data[0]);
  const columnInfos: ColumnInfo[] = [];
  const numericColumns: Record<string, number[]> = {};
  const summary: Record<string, any> = {};
  const distributions: Record<string, Record<string, number>> = {};

  for (const col of columns) {
    const values = data.map(row => row[col]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const colType = detectColumnType(values);
    
    const info: ColumnInfo = {
      name: col,
      type: colType,
      missing: values.length - nonNullValues.length,
      unique: new Set(nonNullValues.map(String)).size,
      sample: nonNullValues.slice(0, 5),
    };
    columnInfos.push(info);

    if (colType === 'numeric') {
      const numericValues = nonNullValues.map(Number).filter(n => !isNaN(n));
      numericColumns[col] = numericValues;
      summary[col] = calculateNumericStats(numericValues);
    } else if (colType === 'categorical') {
      // Calculate distribution
      const counts: Record<string, number> = {};
      nonNullValues.forEach(v => {
        const key = String(v);
        counts[key] = (counts[key] || 0) + 1;
      });
      distributions[col] = counts;
      summary[col] = {
        type: 'categorical',
        unique: info.unique,
        topValues: Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({ value, count })),
      };
    }
  }

  // Calculate correlations for numeric columns
  const numericColNames = Object.keys(numericColumns);
  const correlations: Record<string, Record<string, number>> = {};
  
  for (const col1 of numericColNames) {
    correlations[col1] = {};
    for (const col2 of numericColNames) {
      correlations[col1][col2] = calculateCorrelation(numericColumns[col1], numericColumns[col2]);
    }
  }

  return {
    rowCount: data.length,
    columnCount: columns.length,
    columns: columnInfos,
    summary,
    correlations,
    distributions,
  };
}

// Generate visualizations based on data analysis
function generateVisualizations(data: Record<string, any>[], analysis: DataAnalysis) {
  const visualizations: any[] = [];
  
  const numericCols = analysis.columns.filter(c => c.type === 'numeric');
  const categoricalCols = analysis.columns.filter(c => c.type === 'categorical');
  const dateCols = analysis.columns.filter(c => c.type === 'date');

  // 1. Bar chart for categorical + numeric
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    const catCol = categoricalCols[0];
    const numCol = numericCols[0];
    
    // Aggregate by category
    const aggregated: Record<string, number[]> = {};
    data.forEach(row => {
      const key = String(row[catCol.name]);
      if (!aggregated[key]) aggregated[key] = [];
      const val = parseFloat(row[numCol.name]);
      if (!isNaN(val)) aggregated[key].push(val);
    });

    const chartData = Object.entries(aggregated)
      .map(([name, values]) => ({
        [catCol.name]: name,
        [numCol.name]: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100,
      }))
      .slice(0, 10);

    visualizations.push({
      chart_type: 'bar',
      title: `${numCol.name} by ${catCol.name}`,
      data: chartData,
      x_axis: catCol.name,
      y_axis: numCol.name,
      color: 'cyan',
    });
  }

  // 2. Line chart for time series
  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0];
    const numCol = numericCols[0];
    
    const sortedData = [...data]
      .sort((a, b) => new Date(a[dateCol.name]).getTime() - new Date(b[dateCol.name]).getTime())
      .slice(0, 50)
      .map(row => ({
        [dateCol.name]: row[dateCol.name],
        [numCol.name]: row[numCol.name],
      }));

    visualizations.push({
      chart_type: 'line',
      title: `${numCol.name} Over Time`,
      data: sortedData,
      x_axis: dateCol.name,
      y_axis: numCol.name,
      color: 'emerald',
    });
  }

  // 3. Pie chart for categorical distribution
  if (categoricalCols.length > 0) {
    const catCol = categoricalCols[0];
    const counts: Record<string, number> = {};
    data.forEach(row => {
      const key = String(row[catCol.name]);
      counts[key] = (counts[key] || 0) + 1;
    });

    const pieData = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, count]) => ({ name, count }));

    visualizations.push({
      chart_type: 'pie',
      title: `Distribution of ${catCol.name}`,
      data: pieData,
      x_axis: 'name',
      y_axis: 'count',
      color: 'purple',
    });
  }

  // 4. Scatter plot for two numeric columns
  if (numericCols.length >= 2) {
    const col1 = numericCols[0];
    const col2 = numericCols[1];
    
    const scatterData = data
      .filter(row => !isNaN(parseFloat(row[col1.name])) && !isNaN(parseFloat(row[col2.name])))
      .slice(0, 100)
      .map(row => ({
        [col1.name]: parseFloat(row[col1.name]),
        [col2.name]: parseFloat(row[col2.name]),
      }));

    visualizations.push({
      chart_type: 'scatter',
      title: `${col1.name} vs ${col2.name}`,
      data: scatterData,
      x_axis: col1.name,
      y_axis: col2.name,
      color: 'amber',
    });
  }

  // 5. Histogram for numeric distribution (as bar chart)
  if (numericCols.length > 0) {
    const numCol = numericCols[0];
    const values = data.map(row => parseFloat(row[numCol.name])).filter(v => !isNaN(v));
    
    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
      const binWidth = (max - min) / binCount || 1;
      
      const bins: Record<string, number> = {};
      for (let i = 0; i < binCount; i++) {
        const binStart = min + i * binWidth;
        const binEnd = binStart + binWidth;
        const label = `${Math.round(binStart)}-${Math.round(binEnd)}`;
        bins[label] = 0;
      }
      
      values.forEach(v => {
        const binIndex = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
        const binStart = min + binIndex * binWidth;
        const binEnd = binStart + binWidth;
        const label = `${Math.round(binStart)}-${Math.round(binEnd)}`;
        bins[label] = (bins[label] || 0) + 1;
      });

      const histData = Object.entries(bins).map(([range, count]) => ({ range, count }));

      visualizations.push({
        chart_type: 'bar',
        title: `Distribution of ${numCol.name}`,
        data: histData,
        x_axis: 'range',
        y_axis: 'count',
        color: 'rose',
      });
    }
  }

  return visualizations;
}

// Generate AI insights using Lovable AI
async function generateAIInsights(analysis: DataAnalysis, visualizations: any[]) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return {
      summary: "Unable to generate AI insights - API key not configured.",
      insights: [],
      recommendations: [],
    };
  }

  const prompt = `Analyze this dataset and provide insights:

Dataset Overview:
- Rows: ${analysis.rowCount}
- Columns: ${analysis.columnCount}
- Column Types: ${analysis.columns.map(c => `${c.name} (${c.type})`).join(', ')}

Summary Statistics:
${JSON.stringify(analysis.summary, null, 2)}

Correlations:
${JSON.stringify(analysis.correlations, null, 2)}

Provide:
1. A 2-3 sentence natural language summary of the data
2. 3-5 key insights discovered
3. 2-3 actionable recommendations

Format your response as JSON:
{
  "summary": "...",
  "insights": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a data analyst assistant. Provide clear, actionable insights. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return generateFallbackInsights(analysis);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return generateFallbackInsights(analysis);
  } catch (error) {
    console.error('AI insight generation error:', error);
    return generateFallbackInsights(analysis);
  }
}

function generateFallbackInsights(analysis: DataAnalysis) {
  const insights: string[] = [];
  const recommendations: string[] = [];

  // Generate basic insights
  const numericCols = analysis.columns.filter(c => c.type === 'numeric');
  const categoricalCols = analysis.columns.filter(c => c.type === 'categorical');

  if (numericCols.length > 0) {
    const col = numericCols[0];
    const stats = analysis.summary[col.name];
    if (stats) {
      insights.push(`${col.name} ranges from ${stats.min} to ${stats.max} with an average of ${stats.mean}`);
    }
  }

  if (categoricalCols.length > 0) {
    const col = categoricalCols[0];
    insights.push(`${col.name} has ${col.unique} unique categories`);
  }

  // Check for missing values
  const colsWithMissing = analysis.columns.filter(c => c.missing > 0);
  if (colsWithMissing.length > 0) {
    insights.push(`${colsWithMissing.length} column(s) have missing values that may need attention`);
    recommendations.push('Consider handling missing values through imputation or removal');
  }

  // Check correlations
  const numericColNames = Object.keys(analysis.correlations);
  for (let i = 0; i < numericColNames.length; i++) {
    for (let j = i + 1; j < numericColNames.length; j++) {
      const corr = analysis.correlations[numericColNames[i]]?.[numericColNames[j]];
      if (corr && Math.abs(corr) > 0.7) {
        insights.push(`Strong correlation (${corr}) found between ${numericColNames[i]} and ${numericColNames[j]}`);
      }
    }
  }

  recommendations.push('Review the generated visualizations for additional patterns');
  recommendations.push('Consider segmenting the data by key categories for deeper analysis');

  return {
    summary: `This dataset contains ${analysis.rowCount} records across ${analysis.columnCount} columns, with ${numericCols.length} numeric and ${categoricalCols.length} categorical variables.`,
    insights: insights.slice(0, 5),
    recommendations: recommendations.slice(0, 3),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileName = file.name.toLowerCase();
    const content = await file.text();
    let data: Record<string, any>[] = [];

    // Parse based on file type
    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
      data = parseCSV(content);
    } else if (fileName.endsWith('.json')) {
      data = parseJSON(content);
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported file format. Please upload CSV, TSV, or JSON files.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'File is empty or could not be parsed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Parsed ${data.length} rows from ${fileName}`);

    // Analyze the data
    const analysis = analyzeData(data);
    console.log('Analysis complete:', analysis.columnCount, 'columns,', analysis.rowCount, 'rows');

    // Generate visualizations
    const visualizations = generateVisualizations(data, analysis);
    console.log('Generated', visualizations.length, 'visualizations');

    // Generate AI insights
    const aiInsights = await generateAIInsights(analysis, visualizations);
    console.log('AI insights generated');

    return new Response(
      JSON.stringify({
        success: true,
        fileName: file.name,
        fileSize: file.size,
        analysis,
        visualizations,
        insights: aiInsights,
        data: data.slice(0, 100), // Return first 100 rows for preview
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing file:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process file',
        details: 'Please ensure your file is properly formatted and try again.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

