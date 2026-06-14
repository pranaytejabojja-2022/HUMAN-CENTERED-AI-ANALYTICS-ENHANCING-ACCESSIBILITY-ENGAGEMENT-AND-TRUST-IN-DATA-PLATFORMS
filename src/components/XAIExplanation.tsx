import { motion } from "framer-motion";
import { Lightbulb, ChevronRight, BarChart3, AlertCircle } from "lucide-react";

const featureImportance = [
  { name: "Service Wait Time", impact: 0.34, direction: "negative" },
  { name: "Engagement Score", impact: 0.28, direction: "negative" },
  { name: "Subscription Length", impact: 0.18, direction: "positive" },
  { name: "Support Tickets", impact: 0.12, direction: "negative" },
  { name: "Purchase Frequency", impact: 0.08, direction: "positive" },
];

const XAIExplanation = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Lightbulb className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">
                Explainable AI
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Understand <span className="gradient-text">Why</span> AI Made
              That Prediction
            </h2>

            <p className="text-lg text-muted-foreground mb-8">
              Every prediction comes with transparent explanations using SHAP
              and LIME. See exactly which factors influenced the outcome and by
              how much.
            </p>

            {/* NLG Insight */}
            <div className="glass-card rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">
                    AI-Generated Insight
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Natural language explanation of the prediction
                  </p>
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-foreground leading-relaxed">
                  "Customer churn is predicted to{" "}
                  <span className="font-semibold text-destructive">
                    increase by 4.2%
                  </span>{" "}
                  next month. The primary drivers are{" "}
                  <span className="font-semibold">
                    longer service wait times
                  </span>{" "}
                  (contributing 34%) and{" "}
                  <span className="font-semibold">
                    declining engagement scores
                  </span>{" "}
                  (28%). Consider prioritizing customer support response times
                  to mitigate this trend."
                </p>
              </div>
            </div>

            <a
              href="#"
              className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
            >
              Learn more about our XAI approach
              <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Feature Importance Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Feature Impact Analysis
                </h3>
                <p className="text-sm text-muted-foreground">
                  SHAP values for churn prediction
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {featureImportance.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {feature.name}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        feature.direction === "negative"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {feature.direction === "negative" ? "↑ Risk" : "↓ Risk"}
                    </span>
                  </div>
                  <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${feature.impact * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className={`h-full rounded-full ${
                        feature.direction === "negative"
                          ? "bg-gradient-to-r from-destructive/60 to-destructive"
                          : "bg-gradient-to-r from-success/60 to-success"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {(feature.impact * 100).toFixed(0)}% contribution
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Model Confidence</span>
                <span className="font-semibold text-foreground">92.4%</span>
              </div>
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "92.4%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                  className="h-full bg-gradient-primary rounded-full"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default XAIExplanation;
