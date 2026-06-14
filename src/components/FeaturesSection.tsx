import { motion } from "framer-motion";
import {
  MessageSquare,
  Brain,
  BarChart3,
  Shield,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Natural Language Queries",
    description:
      "Ask questions in plain English. Our NLP engine understands context, entities, and intent to deliver accurate results.",
    color: "primary",
  },
  {
    icon: Brain,
    title: "Predictive Analytics",
    description:
      "ML-powered forecasting with time-series analysis, classification, and regression models for actionable predictions.",
    color: "accent",
  },
  {
    icon: BarChart3,
    title: "Interactive Dashboards",
    description:
      "Customizable visualizations with drill-down capabilities, filters, and real-time data updates.",
    color: "success",
  },
  {
    icon: Shield,
    title: "Explainable AI",
    description:
      "Every prediction is transparent. SHAP and LIME explanations show exactly what factors drive each insight.",
    color: "warning",
  },
  {
    icon: Users,
    title: "Collaboration Tools",
    description:
      "Share dashboards, export reports, and collaborate with team members on data discoveries.",
    color: "primary",
  },
  {
    icon: Zap,
    title: "Real-time Processing",
    description:
      "Sub-second query execution with optimized caching and efficient data pipelines.",
    color: "accent",
  },
];

const colorClasses = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
  },
  accent: {
    bg: "bg-accent/10",
    text: "text-accent",
    border: "border-accent/20",
  },
  success: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/20",
  },
  warning: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/20",
  },
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need for{" "}
            <span className="gradient-text">Data Intelligence</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete platform designed for accessibility, engagement, and
            trust. Built by data scientists, for everyone.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const colors = colorClasses[feature.color as keyof typeof colorClasses];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="glass-card rounded-xl p-6 group cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
