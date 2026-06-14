import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, TrendingUp, Users, DollarSign, BarChart3, Loader2, MessageSquare, ChevronLeft, PieChart, LineChart, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import QueryVisualization from '@/components/QueryVisualization';
import { handleQuery, generateWelcomeMessage, type DataContext } from '@/lib/queryHandler';
import { enhanceResponse, processComplexQuery } from '@/lib/mlEngine';

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  visualization?: VisualizationData;
}

const suggestedQueries = [
  { icon: BarChart3, text: "Create a bar chart showing sales by region", color: "text-cyan-400" },
  { icon: LineChart, text: "Show me revenue trends over the last 6 months", color: "text-emerald-400" },
  { icon: PieChart, text: "Display customer segments as a pie chart", color: "text-purple-400" },
  { icon: TrendingUp, text: "Visualize weekly website traffic", color: "text-amber-400" },
  { icon: Users, text: "Show customer age distribution", color: "text-rose-400" },
  { icon: DollarSign, text: "What's our average order value?", color: "text-cyan-400" },
];

const QueryPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataContext, setDataContext] = useState<DataContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load analysis result from sessionStorage on component mount
  useEffect(() => {
    try {
      const storedResult = sessionStorage.getItem('analysisResult');
      if (!storedResult) {
        toast({
          title: 'No Data Loaded',
          description: 'Please upload a file first.',
          variant: 'destructive',
        });
        navigate('/upload');
        return;
      }

      const analysisData = JSON.parse(storedResult);
      const context: DataContext = {
        fileName: analysisData.fileName,
        rowCount: analysisData.analysis.rowCount,
        columnCount: analysisData.analysis.columnCount,
        columns: analysisData.analysis.columns,
        summary: analysisData.analysis.summary,
        correlations: analysisData.analysis.correlations,
        data: analysisData.data,
        insights: analysisData.insights,
      };
      setDataContext(context);

      // Generate welcome message
      const welcomeMessage: Message = {
        id: '0',
        role: 'assistant',
        content: generateWelcomeMessage(context),
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to load analysis result:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your data. Please upload again.',
        variant: 'destructive',
      });
      navigate('/upload');
    }
  }, [navigate, toast]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (query: string) => {
    if (!query.trim() || isLoading || !dataContext) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Try to use OpenAI-powered AI function first
      try {
        const { data, error } = await supabase.functions.invoke('ai-query', {
          body: { 
            query: query.trim(),
            dataContext: {
              fileName: dataContext.fileName,
              rowCount: dataContext.rowCount,
              columnCount: dataContext.columnCount,
              columns: dataContext.columns,
              summary: dataContext.summary,
              correlations: dataContext.correlations,
              data: dataContext.data,
              insights: dataContext.insights,
            }
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'AI query failed');

        // Enhance the AI response with ML analysis
        const enhancedAnswer = enhanceResponse(data.answer, dataContext);
        const suggestionPattern = /(here are some questions|you can ask|ask .* question|what would you like to know|need to know)/i;
        const finalAnswer = suggestionPattern.test(enhancedAnswer)
          ? processComplexQuery(query.trim(), dataContext)
          : enhancedAnswer;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: finalAnswer,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
        return;
      } catch (aiError) {
        // Fall back to ML-powered local handler if AI is unavailable
        console.warn('AI function unavailable, using ML-enhanced local handler:', aiError);
        const mlResponse = processComplexQuery(query.trim(), dataContext);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: mlResponse,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Query error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process query',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">AI Analytics Assistant</h1>
              <p className="text-xs text-muted-foreground">Ask questions or request visualizations</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full py-12"
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-6">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ask me anything about your data</h2>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                I can generate charts, analyze trends, and provide insights—all from natural language.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl">
                {suggestedQueries.map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSubmit(item.text)}
                    className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all text-left group"
                  >
                    <item.icon className={`h-5 w-5 ${item.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-sm">{item.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-2xl px-4 py-3'
                        : 'space-y-3'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <>
                        {/* Text Response */}
                        {message.content && (
                          <div className="bg-card border border-border/50 rounded-2xl px-4 py-3">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {message.content}
                            </div>
                            <div className="text-xs mt-2 text-muted-foreground">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        )}
                        
                        {/* Visualization */}
                        {message.visualization && (
                          <QueryVisualization visualization={message.visualization} />
                        )}
                      </>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </div>
                        <div className="text-xs mt-2 text-primary-foreground/70">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Analyzing and generating visualization...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question or request a visualization..."
                className="min-h-[52px] max-h-[200px] pr-4 resize-none bg-background"
                rows={1}
              />
              <Button
                onClick={() => handleSubmit(input)}
                disabled={!input.trim() || isLoading}
                className="h-[52px] px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Powered by AI • Auto-generates charts • Includes insights and recommendations
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QueryPage;