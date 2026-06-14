import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Lightbulb, TrendingUp, Info } from 'lucide-react';

interface VisualizationData {
  chart_type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  data: Record<string, any>[];
  x_axis: string;
  y_axis: string;
  x_axis_label?: string;
  y_axis_label?: string;
  color?: string;
  insights?: string[];
  recommendations?: string[];
}

interface QueryVisualizationProps {
  visualization: VisualizationData;
}

const COLOR_THEMES = {
  cyan: { primary: '#06b6d4', secondary: '#22d3ee', gradient: ['#06b6d4', '#22d3ee'] },
  amber: { primary: '#f59e0b', secondary: '#fbbf24', gradient: ['#f59e0b', '#fbbf24'] },
  emerald: { primary: '#10b981', secondary: '#34d399', gradient: ['#10b981', '#34d399'] },
  purple: { primary: '#8b5cf6', secondary: '#a78bfa', gradient: ['#8b5cf6', '#a78bfa'] },
  rose: { primary: '#f43f5e', secondary: '#fb7185', gradient: ['#f43f5e', '#fb7185'] },
};

const PIE_COLORS = ['#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e', '#3b82f6', '#ec4899'];

const QueryVisualization: React.FC<QueryVisualizationProps> = ({ visualization }) => {
  const theme = COLOR_THEMES[visualization.color as keyof typeof COLOR_THEMES] || COLOR_THEMES.cyan;

  const renderChart = () => {
    const { chart_type, data, x_axis, y_axis } = visualization;

    switch (chart_type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey={x_axis} 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar 
                dataKey={y_axis} 
                fill={theme.primary}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey={x_axis} 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey={y_axis}
                stroke={theme.primary}
                strokeWidth={3}
                dot={{ fill: theme.primary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: theme.secondary }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey={y_axis}
                nameKey={x_axis}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.primary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey={x_axis} 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey={y_axis}
                stroke={theme.primary}
                strokeWidth={2}
                fill="url(#colorGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey={x_axis} 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                name={visualization.x_axis_label || x_axis}
              />
              <YAxis 
                dataKey={y_axis}
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                name={visualization.y_axis_label || y_axis}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter data={data} fill={theme.primary} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return <p className="text-muted-foreground">Unsupported chart type</p>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-card border border-border/50 rounded-xl overflow-hidden"
    >
      {/* Chart Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <h3 className="font-semibold text-foreground">{visualization.title}</h3>
        <p className="text-xs text-muted-foreground capitalize">
          {visualization.chart_type} Chart • Auto-generated visualization
        </p>
      </div>

      {/* Chart */}
      <div className="p-4">
        {renderChart()}
      </div>

      {/* Insights & Recommendations */}
      {(visualization.insights?.length || visualization.recommendations?.length) && (
        <div className="px-4 pb-4 space-y-3">
          {visualization.insights && visualization.insights.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Key Insights</span>
              </div>
              <ul className="space-y-1">
                {visualization.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {visualization.recommendations && visualization.recommendations.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">Recommendations</span>
              </div>
              <ul className="space-y-1">
                {visualization.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default QueryVisualization;