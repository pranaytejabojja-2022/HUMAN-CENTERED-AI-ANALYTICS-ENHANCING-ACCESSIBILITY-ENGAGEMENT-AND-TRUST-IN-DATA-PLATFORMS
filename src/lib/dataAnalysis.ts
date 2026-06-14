export type ColumnType = 'numeric' | 'categorical' | 'date' | 'text';

export interface ColumnInfo {
  name: string;
  type: ColumnType;
  missing: number;
  unique: number;
  sample: any[];
}

export interface DataAnalysis {
  rowCount: number;
  columnCount: number;
  columns: ColumnInfo[];
  summary: Record<string, any>;
  correlations: Record<string, Record<string, number>>;
  distributions: Record<string, Record<string, number>>;
}

export interface AnalysisResult {
  fileName: string;
  fileSize: number;
  analysis: DataAnalysis;
  visualizations: any[];
  insights: {
    summary: string;
    insights: string[];
    recommendations: string[];
  };
  data: Record<string, any>[];
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

export function parseCSV(content: string): Record<string, any>[] {
  const normalized = normalizeContent(content).trim();
  if (!normalized) return [];

  const delimiter = guessDelimiter(normalized);
  const rows = parseDelimited(normalized, delimiter).filter((row) => row.some(cell => cell.trim() !== ''));
  if (rows.length < 2) return [];

  const headers = rows[0].map(header => header.trim().replace(/^['"]|['"]$/g, ''));
  return rows.slice(1).map(row => {
    const record: Record<string, any> = {};
    headers.forEach((header, index) => {
      let value = row[index] ?? '';
      value = value.trim().replace(/^['"]|['"]$/g, '');

      if (value !== '' && !Number.isNaN(Number(value))) {
        const numericValue = Number(value);
        record[header] = Number.isFinite(numericValue) ? numericValue : value;
      } else {
        record[header] = value;
      }
    });
    return record;
  }).filter(row => Object.values(row).some(value => value !== ''));
}

export function parseJSON(content: string): Record<string, any>[] {
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && parsed !== null) {
    const keys = Object.keys(parsed);
    if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
      return parsed[keys[0]];
    }
    return [parsed];
  }
  return [];
}

export function detectColumnType(values: any[]): ColumnType {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';

  const sample = nonNull.slice(0, 100);
  const numericCount = sample.filter(v => !Number.isNaN(Number(v)) && Number.isFinite(Number(v))).length;
  if (numericCount / sample.length > 0.8) return 'numeric';

  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, 
    /^\d{2}\/\d{2}\/\d{4}$/, 
    /^\d{2}-\d{2}-\d{4}$/, 
    /^\w+ \d{1,2}, \d{4}$/,
  ];

  const dateCount = sample.filter(v => {
    const str = String(v).trim();
    return datePatterns.some(p => p.test(str)) || !Number.isNaN(Date.parse(str));
  }).length;
  if (dateCount / sample.length > 0.8) return 'date';

  const uniqueRatio = new Set(sample.map(String)).size / sample.length;
  if (uniqueRatio < 0.5) return 'categorical';

  return 'text';
}

export function calculateNumericStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;

  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mean = sum / n;
  const variance = sorted.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    count: n,
    mean: Math.round(mean * 100) / 100,
    std: Math.round(stdDev * 100) / 100,
    min: sorted[0],
    max: sorted[n - 1],
    median: n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)],
    q25: sorted[Math.floor(n * 0.25)],
    q75: sorted[Math.floor(n * 0.75)],
  };
}

export function calculateCorrelation(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const meanX = x.reduce((acc, val) => acc + val, 0) / n;
  const meanY = y.reduce((acc, val) => acc + val, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : Math.round((numerator / denom) * 100) / 100;
}

export function analyzeData(data: Record<string, any>[]): DataAnalysis {
  if (data.length === 0) {
    return {
      rowCount: 0,
      columnCount: 0,
      columns: [],
      summary: {},
      correlations: {},
      distributions: {},
    };
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
      const numericValues = nonNullValues.map(Number).filter(n => !Number.isNaN(n));
      numericColumns[col] = numericValues;
      summary[col] = calculateNumericStats(numericValues);
    } else if (colType === 'categorical') {
      const counts: Record<string, number> = {};
      nonNullValues.forEach(value => {
        const key = String(value);
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

export function generateVisualizations(data: Record<string, any>[], analysis: DataAnalysis) {
  const visualizations: any[] = [];
  const numericCols = analysis.columns.filter(c => c.type === 'numeric');
  const categoricalCols = analysis.columns.filter(c => c.type === 'categorical');
  const dateCols = analysis.columns.filter(c => c.type === 'date');

  if (categoricalCols.length > 0 && numericCols.length > 0) {
    const catCol = categoricalCols[0];
    const numCol = numericCols[0];
    const aggregated: Record<string, number[]> = {};

    data.forEach(row => {
      const key = String(row[catCol.name]);
      if (!aggregated[key]) aggregated[key] = [];
      const value = Number(row[numCol.name]);
      if (!Number.isNaN(value)) aggregated[key].push(value);
    });

    const chartData = Object.entries(aggregated)
      .map(([name, values]) => ({
        [catCol.name]: name,
        [numCol.name]: Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100,
      }))
      .slice(0, 10);

    if (chartData.length > 0) {
      visualizations.push({
        chart_type: 'bar',
        title: `${numCol.name} by ${catCol.name}`,
        data: chartData,
        x_axis: catCol.name,
        y_axis: numCol.name,
        color: 'cyan',
      });
    }
  }

  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0];
    const numCol = numericCols[0];
    const sortedData = [...data]
      .filter(row => row[dateCol.name])
      .sort((a, b) => new Date(a[dateCol.name]).getTime() - new Date(b[dateCol.name]).getTime())
      .slice(0, 50)
      .map(row => ({
        [dateCol.name]: row[dateCol.name],
        [numCol.name]: row[numCol.name],
      }));

    if (sortedData.length > 0) {
      visualizations.push({
        chart_type: 'line',
        title: `${numCol.name} Over Time`,
        data: sortedData,
        x_axis: dateCol.name,
        y_axis: numCol.name,
        color: 'emerald',
      });
    }
  }

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

    if (pieData.length > 0) {
      visualizations.push({
        chart_type: 'pie',
        title: `Distribution of ${catCol.name}`,
        data: pieData,
        x_axis: 'name',
        y_axis: 'count',
        color: 'purple',
      });
    }
  }

  if (numericCols.length >= 2) {
    const col1 = numericCols[0];
    const col2 = numericCols[1];
    const scatterData = data
      .filter(row => !Number.isNaN(Number(row[col1.name])) && !Number.isNaN(Number(row[col2.name])))
      .slice(0, 100)
      .map(row => ({
        [col1.name]: Number(row[col1.name]),
        [col2.name]: Number(row[col2.name]),
      }));

    if (scatterData.length > 0) {
      visualizations.push({
        chart_type: 'scatter',
        title: `${col1.name} vs ${col2.name}`,
        data: scatterData,
        x_axis: col1.name,
        y_axis: col2.name,
        color: 'amber',
      });
    }
  }

  if (numericCols.length > 0) {
    const numCol = numericCols[0];
    const values = data.map(row => Number(row[numCol.name])).filter(v => !Number.isNaN(v));
    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
      const binWidth = (max - min) / binCount || 1;
      const bins: Record<string, number> = {};

      for (let i = 0; i < binCount; i += 1) {
        const binStart = min + i * binWidth;
        const binEnd = binStart + binWidth;
        const label = `${Math.round(binStart)}-${Math.round(binEnd)}`;
        bins[label] = 0;
      }

      values.forEach(v => {
        const index = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
        const binStart = min + index * binWidth;
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

export function generateFallbackInsights(analysis: DataAnalysis, visualizations: any[]) {
  const insights: string[] = [];
  const recommendations: string[] = [];

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

  const colsWithMissing = analysis.columns.filter(c => c.missing > 0);
  if (colsWithMissing.length > 0) {
    insights.push(`${colsWithMissing.length} column(s) have missing values that may need attention`);
    recommendations.push('Consider handling missing values through imputation or removal.');
  }

  const numericColNames = Object.keys(analysis.correlations);
  for (let i = 0; i < numericColNames.length; i += 1) {
    for (let j = i + 1; j < numericColNames.length; j += 1) {
      const corr = analysis.correlations[numericColNames[i]]?.[numericColNames[j]];
      if (corr && Math.abs(corr) > 0.7) {
        insights.push(`Strong correlation (${corr}) found between ${numericColNames[i]} and ${numericColNames[j]}`);
      }
    }
  }

  recommendations.push('Review the generated visualizations for patterns.');
  recommendations.push('Consider segmenting the data by key categories for deeper analysis.');

  return {
    summary: `This dataset contains ${analysis.rowCount} records across ${analysis.columnCount} columns, with ${numericCols.length} numeric and ${categoricalCols.length} categorical variables.`,
    insights: insights.slice(0, 5),
    recommendations: recommendations.slice(0, 3),
  };
}

export async function analyzeFileLocally(file: File): Promise<AnalysisResult> {
  const content = await file.text();
  const fileName = file.name.toLowerCase();
  let data: Record<string, any>[] = [];

  if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
    data = parseCSV(content);
  } else if (fileName.endsWith('.json')) {
    data = parseJSON(content);
  } else {
    throw new Error('Unsupported local file format. Please upload CSV, TSV, or JSON files.');
  }

  if (data.length === 0) {
    throw new Error('File is empty or could not be parsed.');
  }

  const analysis = analyzeData(data);
  const visualizations = generateVisualizations(data, analysis);
  const insights = generateFallbackInsights(analysis, visualizations);

  return {
    fileName: file.name,
    fileSize: file.size,
    analysis,
    visualizations,
    insights,
    data: data.slice(0, 100),
  };
}
