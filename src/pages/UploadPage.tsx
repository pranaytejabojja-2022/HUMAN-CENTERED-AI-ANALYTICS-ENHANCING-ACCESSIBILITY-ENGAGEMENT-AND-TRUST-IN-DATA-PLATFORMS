import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Upload, Sparkles, BarChart3, FileSpreadsheet, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analyzeFileLocally } from '@/lib/dataAnalysis';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import AnalysisSummary from '@/components/AnalysisSummary';
import QueryVisualization from '@/components/QueryVisualization';

interface AnalysisResult {
  fileName: string;
  fileSize: number;
  analysis: {
    rowCount: number;
    columnCount: number;
    columns: { name: string; type: 'numeric' | 'categorical' | 'date' | 'text'; missing: number; unique: number }[];
    summary: Record<string, any>;
    correlations: Record<string, Record<string, number>>;
    distributions: Record<string, Record<string, number>>;
  };
  visualizations: any[];
  insights: {
    summary: string;
    insights: string[];
    recommendations: string[];
  };
  data: Record<string, any>[];
}

const UploadPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [remoteAvailable, setRemoteAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  useEffect(() => {
    // check sessionStorage first to avoid repeated network checks
    if (!hasSupabaseConfig) {
      setRemoteAvailable(false);
      return;
    }

    const stored = sessionStorage.getItem('remoteAvailable');
    if (stored === '1') {
      setRemoteAvailable(true);
      return;
    }
    if (stored === '0') {
      setRemoteAvailable(false);
      return;
    }

    // perform a quick reachability probe
    let aborted = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/analyze-file`;
        const resp = await fetch(url, { method: 'OPTIONS', signal: controller.signal });
        if (!aborted && resp) {
          // any response means the host is reachable (status may be 204/200/404)
          setRemoteAvailable(true);
          sessionStorage.setItem('remoteAvailable', '1');
        }
      } catch (e) {
        if (!aborted) {
          setRemoteAvailable(false);
          sessionStorage.setItem('remoteAvailable', '0');
        }
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      aborted = true;
      try { controller.abort(); } catch {};
    };
  }, [hasSupabaseConfig]);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    const fileExtension = file.name.split('.')?.pop()?.toLowerCase() || '';
    const canLocalAnalyze = ['csv', 'tsv', 'json'].includes(fileExtension);

    if (!hasSupabaseConfig || remoteAvailable === false) {
      try {
        const localResult = await analyzeFileLocally(file);
        setResult(localResult);
        // Store in sessionStorage for QueryPage access
        sessionStorage.setItem('analysisResult', JSON.stringify(localResult));
        // silently use local analysis when remote is intentionally unavailable
        if (!hasSupabaseConfig) {
          toast({
            title: 'Local Analysis Enabled',
            description: 'Supabase is not configured. Your file was analyzed locally.',
          });
        }
      } catch (err) {
        console.error('Local analysis error:', err);
        const message = err instanceof Error ? err.message : 'Failed to analyze file locally';
        setError(message);
        toast({
          title: 'Analysis Failed',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    // If remoteAvailable is null (still checking), attempt remote but fall back silently on failure
    const tryRemote = async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const { data, error: invokeError } = await supabase.functions.invoke('analyze-file', {
          body: formData,
        });

        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);

        // success: mark remote available for this session
        setRemoteAvailable(true);
        sessionStorage.setItem('remoteAvailable', '1');

        setResult(data);
        // Store in sessionStorage for QueryPage access
        sessionStorage.setItem('analysisResult', JSON.stringify(data));
        toast({
          title: 'Analysis Complete',
          description: `Successfully analyzed ${data.analysis.rowCount} rows and ${data.analysis.columnCount} columns`,
        });
        return true;
      } catch (err) {
        console.error('Remote invoke failed:', err);
        // mark remote unavailable
        setRemoteAvailable(false);
        sessionStorage.setItem('remoteAvailable', '0');
        return false;
      }
    };

    try {
      const remoteSucceeded = await tryRemote();
      if (!remoteSucceeded) {
        if (canLocalAnalyze) {
          try {
            const localResult = await analyzeFileLocally(file);
            setResult(localResult);            // Store in sessionStorage for QueryPage access
            sessionStorage.setItem('analysisResult', JSON.stringify(localResult));            return;
          } catch (localErr) {
            console.error('Local fallback error:', localErr);
            const message = localErr instanceof Error ? localErr.message : 'Failed to analyze file locally';
            setError(message);
            toast({
              title: 'Analysis Failed',
              description: message,
              variant: 'destructive',
            });
            return;
          }
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Failed to analyze file';
      setError(message);
      toast({
        title: 'Analysis Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
    
  };

  const features = [
    { icon: FileSpreadsheet, title: 'Auto-Detection', desc: 'Detect column types automatically' },
    { icon: Brain, title: 'AI Analysis', desc: 'Get intelligent insights from your data' },
    { icon: BarChart3, title: 'Visualizations', desc: 'Auto-generate relevant charts' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Upload & Analyze</h1>
              <p className="text-xs text-muted-foreground">Upload your data for instant analysis</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              {/* Hero */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-6"
                >
                  <Sparkles className="h-12 w-12 text-primary" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-3">Analyze Your Data Instantly</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Upload any CSV or JSON file and get automatic analysis, 
                  visualizations, and AI-powered insights.
                </p>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center p-4 rounded-xl bg-card border border-border/50"
                  >
                    <feature.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Upload Zone */}
              <FileUpload 
                onFileSelect={handleFileSelect}
                isLoading={isLoading}
                error={error}
              />

              {/* Supported Formats */}
              <p className="text-center text-xs text-muted-foreground mt-4">
                Supported formats: CSV, TSV, JSON • Max size: 10MB
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Analysis Results</h2>
                  <p className="text-muted-foreground">
                    {result.fileName} • {result.analysis.rowCount.toLocaleString()} rows
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to="/query">
                    <Button variant="default" size="sm" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Start Exploring Data
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={() => setResult(null)}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload New File
                  </Button>
                </div>
              </div>

              {/* Summary & Insights */}
              <AnalysisSummary 
                analysis={result.analysis}
                insights={result.insights}
              />

              {/* Visualizations */}
              {result.visualizations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Auto-Generated Visualizations</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {result.visualizations.map((viz, i) => (
                      <QueryVisualization key={i} visualization={viz} />
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview */}
              <DataPreview 
                data={result.data}
                columns={result.analysis.columns}
                fileName={result.fileName}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default UploadPage;