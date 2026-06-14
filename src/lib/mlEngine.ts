/**
 * Machine Learning & Explainable AI (XAI) Engine
 * Implements SHAP-like and LIME-like explanations with ML predictions
 */

export interface DataContext {
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
}

export interface PredictionResult {
  prediction: any;
  confidence: number;
  explanation: string;
  featureImportance: Array<{ feature: string; importance: number }>;
  limeExplanation: string;
}

export interface MLAnalysis {
  predictiveFeatures: Array<{ name: string; importance: number }>;
  targetVariable: string | null;
  models: Record<string, any>;
  anomalies: any[];
}

/**
 * Calculate correlation-based feature importance (SHAP-like)
 */
const calculateFeatureImportance = (
  data: Record<string, any>[],
  columns: Array<{ name: string; type: string }>,
  targetCol?: string
): Array<{ feature: string; importance: number }> => {
  const numericCols = columns
    .filter(c => c.type === 'numeric')
    .map(c => c.name);

  if (numericCols.length < 2) return [];

  const target = targetCol && numericCols.includes(targetCol) ? targetCol : numericCols[0];
  const correlations: Record<string, number> = {};

  for (const col of numericCols) {
    if (col === target) continue;

    const paired = data
      .map(row => ({ x: Number(row[col]), y: Number(row[target]) }))
      .filter(pair => !Number.isNaN(pair.x) && !Number.isNaN(pair.y));

    if (paired.length < 2) continue;

    const xMean = paired.reduce((sum, pair) => sum + pair.x, 0) / paired.length;
    const yMean = paired.reduce((sum, pair) => sum + pair.y, 0) / paired.length;
    let covariance = 0;
    let varianceX = 0;
    let varianceY = 0;

    for (const pair of paired) {
      covariance += (pair.x - xMean) * (pair.y - yMean);
      varianceX += Math.pow(pair.x - xMean, 2);
      varianceY += Math.pow(pair.y - yMean, 2);
    }

    if (varianceX === 0 || varianceY === 0) continue;
    const corr = Math.abs(covariance / Math.sqrt(varianceX * varianceY));
    correlations[col] = Number(corr.toFixed(2));
  }

  return Object.entries(correlations)
    .sort((a, b) => b[1] - a[1])
    .map(([feature, importance]) => ({
      feature,
      importance,
    }));
};

const transposeMatrix = (matrix: number[][]): number[][] =>
  matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));

const multiplyMatrices = (a: number[][], b: number[][]): number[][] => {
  const result: number[][] = Array.from({ length: a.length }, () => Array(b[0].length).fill(0));
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b[0].length; j++) {
      for (let k = 0; k < b.length; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
};

const invertMatrix = (matrix: number[][]): number[][] | null => {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);

  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(augmented[j][i]) > Math.abs(augmented[pivot][i])) {
        pivot = j;
      }
    }

    if (Math.abs(augmented[pivot][i]) < 1e-12) {
      return null;
    }

    [augmented[i], augmented[pivot]] = [augmented[pivot], augmented[i]];
    const pivotValue = augmented[i][i];
    for (let j = 0; j < augmented[i].length; j++) {
      augmented[i][j] /= pivotValue;
    }

    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const factor = augmented[j][i];
      for (let k = i; k < augmented[j].length; k++) {
        augmented[j][k] -= factor * augmented[i][k];
      }
    }
  }

  return augmented.map(row => row.slice(n));
};

interface RegressionModel {
  intercept: number;
  coefficients: Record<string, number>;
  r2: number;
}

const buildRegressionModel = (
  data: Record<string, any>[],
  featureCols: string[],
  targetCol: string
): RegressionModel | null => {
  const records = data
    .map((row) => {
      const features = featureCols.map(col => Number(row[col]));
      const target = Number(row[targetCol]);
      if (features.some(v => Number.isNaN(v)) || Number.isNaN(target)) {
        return null;
      }
      return { features, target };
    })
    .filter((record): record is { features: number[]; target: number } => record !== null);

  if (records.length < featureCols.length + 2) {
    return null;
  }

  const X = records.map(record => [1, ...record.features]);
  const y = records.map(record => [record.target]);
  const Xt = transposeMatrix(X);
  const XtX = multiplyMatrices(Xt, X);
  const XtXInv = invertMatrix(XtX);
  if (!XtXInv) return null;
  const XtY = multiplyMatrices(Xt, y);
  const beta = multiplyMatrices(XtXInv, XtY).flat();

  const coefficients: Record<string, number> = {};
  featureCols.forEach((col, idx) => {
    coefficients[col] = beta[idx + 1];
  });

  const yMean = records.reduce((sum, record) => sum + record.target, 0) / records.length;
  let ssTot = 0;
  let ssRes = 0;
  for (const record of records) {
    const predicted = beta[0] + record.features.reduce((sum, value, idx) => sum + value * beta[idx + 1], 0);
    ssRes += Math.pow(record.target - predicted, 2);
    ssTot += Math.pow(record.target - yMean, 2);
  }

  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
  return { intercept: beta[0], coefficients, r2: Number(r2.toFixed(2)) };
};

/**
 * Detect anomalies using statistical methods
 */
const detectAnomalies = (
  data: Record<string, any>[],
  columns: Array<{ name: string; type: string }>
): any[] => {
  const numericCols = columns
    .filter(c => c.type === 'numeric')
    .map(c => c.name);

  const anomalies: any[] = [];

  for (const col of numericCols) {
    const values = data
      .map((row, idx) => ({ value: row[col], index: idx }))
      .filter(v => v.value !== null && v.value !== undefined && !isNaN(v.value));

    if (values.length < 3) continue;

    const nums = values.map(v => v.value);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / nums.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) continue;

    // Z-score > 3 is anomaly
    for (const v of values) {
      const zScore = Math.abs((v.value - mean) / stdDev);
      if (zScore > 3) {
        anomalies.push({
          rowIndex: v.index,
          column: col,
          value: v.value,
          zScore: Math.round(zScore * 100) / 100,
          reason: `Outlier (${Math.round(zScore)}σ from mean)`,
        });
      }
    }
  }

  return anomalies.slice(0, 10); // Top 10 anomalies
};

/**
 * Segment data into clusters (simple K-means-like approach)
 */
const segmentData = (
  data: Record<string, any>[],
  columns: Array<{ name: string; type: string }>,
  k: number = 3
): Record<string, any> => {
  const numericCols = columns
    .filter(c => c.type === 'numeric')
    .map(c => c.name);

  if (numericCols.length === 0) return {};

  // Simple clustering: divide by first numeric column
  const primaryCol = numericCols[0];
  const values = data.map(row => row[primaryCol]).filter(v => !isNaN(v));
  
  if (values.length < k) return {};

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / k;

  const segments: Record<string, any> = {};
  for (let i = 0; i < k; i++) {
    const lower = min + i * binSize;
    const upper = i === k - 1 ? max + 1 : min + (i + 1) * binSize;
    segments[`Segment ${i + 1}`] = {
      range: `${Math.round(lower)} - ${Math.round(upper)}`,
      count: values.filter(v => v >= lower && v < upper).length,
    };
  }

  return segments;
};

/**
 * Make predictions based on data patterns
 */
const makePredictions = (
  data: Record<string, any>[],
  columns: Array<{ name: string; type: string }>
): PredictionResult[] => {
  const predictions: PredictionResult[] = [];
  const numericCols = columns
    .filter(c => c.type === 'numeric')
    .map(c => c.name);

  if (numericCols.length < 2) return predictions;

  const targetCol = numericCols[0];
  const featureCols = numericCols.slice(1);
  const baselineValues = data
    .map(row => row[targetCol])
    .filter(v => v !== null && v !== undefined && !isNaN(v))
    .slice(0, Math.min(100, data.length));

  if (baselineValues.length < 3) return predictions;

  const regression = buildRegressionModel(data, featureCols, targetCol);
  const latestRow = data.slice(-1)[0] || {};
  const lastFeatureValues = featureCols.map(col => Number(latestRow[col] ?? NaN));
  const hasValidLastValues = lastFeatureValues.every(v => !Number.isNaN(v));

  if (regression && hasValidLastValues) {
    const predicted = regression.intercept + featureCols.reduce((sum, col, idx) => sum + regression.coefficients[col] * lastFeatureValues[idx], 0);
    const importance = Object.entries(regression.coefficients)
      .map(([feature, weight]) => ({ feature, importance: Math.abs(weight) }))
      .sort((a, b) => b.importance - a.importance);
    const totalImportance = importance.reduce((sum, item) => sum + item.importance, 0) || 1;

    predictions.push({
      prediction: `Next ${targetCol} value: ${Math.round(predicted * 100) / 100}`,
      confidence: Math.min(0.95, 0.5 + regression.r2 / 2),
      explanation: `The model predicts ${targetCol} using ${featureCols.join(', ')} with a goodness-of-fit of ${Math.round(regression.r2 * 100)}%.`,
      featureImportance: importance.map((item) => ({ feature: item.feature, importance: Math.round((item.importance / totalImportance) * 100) / 100 })),
      limeExplanation: `Prediction based on multivariate regression: the strongest drivers are ${importance.slice(0, 3).map(item => item.feature).join(', ')} with weights ${importance.slice(0, 3).map(item => Math.round(item.importance * 100) / 100).join(', ')}.`,
    });
  } else {
    const indices = Array.from({ length: baselineValues.length }, (_, i) => i);
    const meanX = indices.reduce((a, b) => a + b, 0) / indices.length;
    const meanY = baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < baselineValues.length; i++) {
      numerator += (indices[i] - meanX) * (baselineValues[i] - meanY);
      denominator += (indices[i] - meanX) ** 2;
    }
    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;
    const nextValue = slope * baselineValues.length + intercept;

    predictions.push({
      prediction: `Next ${targetCol} value: ${Math.round(nextValue * 100) / 100}`,
      confidence: Math.min(0.9, 0.55 + Math.abs(slope) / (Math.abs(meanY) || 1)),
      explanation: slope > 0
        ? `${targetCol} shows an upward trend with slope ${Math.round(slope * 100) / 100}`
        : `${targetCol} shows a downward trend with slope ${Math.round(slope * 100) / 100}`,
      featureImportance: [{ feature: targetCol, importance: 1.0 }],
      limeExplanation: `Prediction based on linear trend analysis: the value tends to ${slope > 0 ? 'increase' : 'decrease'} by ~${Math.abs(Math.round(slope * 100) / 100)} units per observation.`,
    });
  }

  return predictions;
};

/**
 * Generate LIME-like local explanation
 */
const generateLimeExplanation = (
  data: Record<string, any>[],
  query: string,
  context: DataContext
): string => {
  const numericCols = context.columns
    .filter(c => c.type === 'numeric')
    .map(c => c.name);

  const target = numericCols[0];
  const importance = calculateFeatureImportance(data, context.columns, target);
  
  if (importance.length === 0) {
    return 'No numeric features available for detailed explanation.';
  }

  const topFeatures = importance.slice(0, 3);
  let explanation = 'Based on local feature importance (LIME-like analysis), the strongest predictors for the target are:\n\n';
  
  topFeatures.forEach((feat, idx) => {
    explanation += `${idx + 1}. **${feat.feature}** contributes ${(feat.importance * 100).toFixed(1)}% to the target relationship.\n`;
  });

  explanation += '\nThis means the model is primarily driven by the top correlated numeric features when explaining local predictions.';
  return explanation;
};

/**
 * Generate SHAP-like summary
 */
const generateShapSummary = (context: DataContext): string => {
  const importance = calculateFeatureImportance(
    context.data,
    context.columns
  );

  if (importance.length === 0) {
    return 'Insufficient numeric data for SHAP analysis.';
  }

  let summary = '**Feature Importance (SHAP-like Summary):**\n\n';
  importance.slice(0, 5).forEach((feat, idx) => {
    const bar = '█'.repeat(Math.round(feat.importance * 10));
    summary += `${idx + 1}. ${feat.feature}: ${bar} ${(feat.importance * 100).toFixed(1)}%\n`;
  });

  return summary;
};

/**
 * Analyze relationships and provide insights
 */
const analyzeRelationships = (context: DataContext): string => {
  const correlations = context.correlations;
  const keys = Object.keys(correlations);
  
  const strongRels: Array<{ cols: string; corr: number }> = [];
  
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const corr = correlations[keys[i]]?.[keys[j]];
      if (corr && Math.abs(corr) > 0.6) {
        strongRels.push({
          cols: `${keys[i]} ↔ ${keys[j]}`,
          corr,
        });
      }
    }
  }

  if (strongRels.length === 0) {
    return 'No strong correlations detected in the data.';
  }

  let analysis = '**Key Relationships & Dependencies:**\n\n';
  strongRels.slice(0, 5).forEach((rel, idx) => {
    const strength = Math.abs(rel.corr) > 0.9 ? 'very strong' : Math.abs(rel.corr) > 0.7 ? 'strong' : 'moderate';
    const direction = rel.corr > 0 ? 'positive' : 'negative';
    analysis += `${idx + 1}. ${rel.cols}: ${strength} ${direction} correlation (${Math.round(rel.corr * 100) / 100})\n`;
  });

  return analysis;
};

export const generateMLInsights = (context: DataContext): MLAnalysis => {
  const importance = calculateFeatureImportance(context.data, context.columns);
  const anomalies = detectAnomalies(context.data, context.columns);
  const segments = segmentData(context.data, context.columns);
  const predictions = makePredictions(context.data, context.columns);

  return {
    predictiveFeatures: importance.slice(0, 5),
    targetVariable: importance.length > 0 ? importance[0].feature : null,
    models: {
      anomalies,
      segments,
      predictions,
    },
    anomalies,
  };
};

export const enhanceResponse = (baseAnswer: string, context: DataContext): string => {
  const shapSummary = generateShapSummary(context);
  const relationships = analyzeRelationships(context);
  const ml = generateMLInsights(context);

  let enhanced = baseAnswer + '\n\n---\n\n';
  
  if (shapSummary) {
    enhanced += shapSummary + '\n\n';
  }

  if (relationships) {
    enhanced += relationships + '\n\n';
  }

  if (ml.models.predictions.length > 0) {
    enhanced += '**Predictive Analytics:**\n\n';
    ml.models.predictions.forEach(pred => {
      enhanced += `- ${pred.prediction}\n`;
      enhanced += `  Confidence: ${(pred.confidence * 100).toFixed(1)}%\n`;
      enhanced += `  ${pred.limeExplanation}\n\n`;
    });
  }

  if (ml.anomalies.length > 0) {
    enhanced += '**Anomalies Detected:**\n\n';
    ml.anomalies.slice(0, 3).forEach(anom => {
      enhanced += `- Row ${anom.rowIndex}: ${anom.column} = ${anom.value} (${anom.zScore}σ from mean)\n`;
    });
    enhanced += '\n';
  }

  return enhanced;
};

export const processComplexQuery = (query: string, context: DataContext): string => {
  const q = query.toLowerCase();
  
  // Prediction queries
  if (q.includes('predict') || q.includes('forecast') || q.includes('trend')) {
    const predictions = makePredictions(context.data, context.columns);
    if (predictions.length > 0) {
      return enhanceResponse(
        `**Predictive Analysis:**\n\n${predictions.map(p => `- ${p.prediction}\n- Confidence: ${(p.confidence * 100).toFixed(1)}%`).join('\n\n')}`,
        context
      );
    }
  }

  // Anomaly queries
  if (q.includes('anomal') || q.includes('outli') || q.includes('unusual')) {
    const anomalies = detectAnomalies(context.data, context.columns);
    if (anomalies.length > 0) {
      let answer = '**Anomalies & Outliers Detected:**\n\n';
      anomalies.slice(0, 5).forEach((anom, idx) => {
        answer += `${idx + 1}. **${anom.column}** in row ${anom.rowIndex}: ${anom.value} (${anom.zScore}σ)\n   ${anom.reason}\n\n`;
      });
      return enhanceResponse(answer, context);
    }
  }

  // Segmentation queries
  if (q.includes('segment') || q.includes('group') || q.includes('cluster')) {
    const segments = segmentData(context.data, context.columns);
    if (Object.keys(segments).length > 0) {
      let answer = '**Data Segmentation Analysis:**\n\n';
      Object.entries(segments).forEach(([seg, info]) => {
        answer += `- **${seg}**: ${info.range} (${info.count} records)\n`;
      });
      return enhanceResponse(answer, context);
    }
  }

  // Relationship queries
  if (q.includes('relat') || q.includes('depend') || q.includes('correlat')) {
    const relationships = analyzeRelationships(context);
    return enhanceResponse(relationships, context);
  }

  // Feature importance queries
  if (q.includes('important') || q.includes('feature') || q.includes('influence')) {
    const shapSummary = generateShapSummary(context);
    return enhanceResponse(shapSummary, context);
  }

  // Default: enhanced response
  return enhanceResponse(
    'Based on comprehensive ML analysis:\n\n' + generateShapSummary(context),
    context
  );
};
