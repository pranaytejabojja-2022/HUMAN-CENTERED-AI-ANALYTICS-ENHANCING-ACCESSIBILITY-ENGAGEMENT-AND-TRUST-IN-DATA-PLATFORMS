import { motion } from "framer-motion";
import { MessageSquare, Cpu, LineChart, FileText } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    step: "01",
    title: "Ask Your Question",
    description:
      "Type a question in natural language. No SQL or coding knowledge required.",
    example: '"What caused the sales drop in Q3?"',
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI Processes & Analyzes",
    description:
      "NLP parses your query, ML models run predictions, and XAI generates explanations.",
    example: "Intent detection → Model inference → SHAP analysis",
  },
  {
    icon: LineChart,
    step: "03",
    title: "Visualize Results",
    description:
      "Interactive charts and dashboards present your data in meaningful ways.",
    example: "Trend charts, comparisons, drill-downs",
  },
  {
    icon: FileText,
    step: "04",
    title: "Get Human-Readable Insights",
    description:
      "NLG converts complex analytics into clear, actionable narratives.",
    example: '"Sales dropped 12% due to supply chain delays..."',
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From question to insight in seconds. Our pipeline makes complex
            analytics feel effortless.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-1/2 transform -translate-x-1/2 w-[80%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                {/* Step indicator */}
                <div className="relative z-10 flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <step.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <span className="text-xs font-bold text-primary mb-2 block">
                    STEP {step.step}
                  </span>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {step.description}
                  </p>
                  <div className="inline-block px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-muted-foreground font-mono">
                    {step.example}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
