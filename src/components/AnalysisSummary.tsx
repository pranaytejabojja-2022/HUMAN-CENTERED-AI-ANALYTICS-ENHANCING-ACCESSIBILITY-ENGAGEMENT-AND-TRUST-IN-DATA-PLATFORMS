import React from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Columns, 
  Hash, 
  Type, 
  Calendar, 
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  FileText
} from 'lucide-react';

interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'text';
  missing: number;
  unique: number;
}

interface AnalysisSummaryProps {
  analysis: {
    rowCount: number;
    columnCount: number;
    columns: ColumnInfo[];
    summary: Record<string, any>;
    correlations: Record<string, Record<string, number>>;
  };
  insights: {
    summary: string;
    insights: string[];
    recommendations: string[];
  };
}

const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ analysis, insights }) => {
  const numericCount = analysis.columns.filter(c => c.type === 'numeric').length;
  const categoricalCount = analysis.columns.filter(c => c.type === 'categorical').length;
  const dateCount = analysis.columns.filter(c => c.type === 'date').length;
  const totalMissing = analysis.columns.reduce((acc, c) => acc + c.missing, 0);

  const stats = [
    { icon: Database, label: 'Total Rows', value: analysis.rowCount.toLocaleString(), color: 'text-primary' },
    { icon: Columns, label: 'Columns', value: analysis.columnCount, color: 'text-accent' },
    { icon: Hash, label: 'Numeric', value: numericCount, color: 'text-cyan-500' },
    { icon: Type, label: 'Categorical', value: categoricalCount, color: 'text-purple-500' },
    { icon: Calendar, label: 'Date', value: dateCount, color: 'text-amber-500' },
    { icon: AlertTriangle, label: 'Missing', value: totalMissing, color: totalMissing > 0 ? 'text-destructive' : 'text-success' },
  ];

  // Find strong correlations
  const strongCorrelations: { col1: string; col2: string; value: number }[] = [];
  const correlationKeys = Object.keys(analysis.correlations);
  for (let i = 0; i < correlationKeys.length; i++) {
    for (let j = i + 1; j < correlationKeys.length; j++) {
      const corr = analysis.correlations[correlationKeys[i]]?.[correlationKeys[j]];
      if (corr && Math.abs(corr) > 0.5 && corr !== 1) {
        strongCorrelations.push({
          col1: correlationKeys[i],
          col2: correlationKeys[j],
          value: corr,
        });
      }
    }
  }
  strongCorrelations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border/50 rounded-xl p-4 text-center"
          >
            <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* AI Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border/50 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Summary</h3>
        </div>
        <p className="text-muted-foreground leading-relaxed">{insights.summary}</p>
      </motion.div>

      {/* Insights & Recommendations Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Key Insights */}
        {insights.insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary/5 border border-primary/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Key Insights</h3>
            </div>
            <ul className="space-y-2">
              {insights.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="text-muted-foreground">{insight}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-amber-500">Recommendations</h3>
            </div>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Correlations */}
      {strongCorrelations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border/50 rounded-xl p-4"
        >
          <h3 className="font-semibold mb-3">Notable Correlations</h3>
          <div className="flex flex-wrap gap-2">
            {strongCorrelations.slice(0, 6).map((corr, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  corr.value > 0 
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}
              >
                {corr.col1} ↔ {corr.col2}: <span className="font-semibold">{corr.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnalysisSummary;