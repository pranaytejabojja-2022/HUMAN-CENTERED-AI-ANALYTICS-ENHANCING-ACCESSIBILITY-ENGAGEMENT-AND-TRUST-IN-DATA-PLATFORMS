import { motion } from "framer-motion";
import { Github, Linkedin, Mail } from "lucide-react";

const team = [
  {
    name: "Nandini Pagidimarri",
    role: "Project Lead & NLP Engineer",
    focus: "Natural Language Processing, Query Understanding",
    avatar: "NP",
    gradient: "from-primary to-primary/60",
  },
  {
    name: "P. Nikitha",
    role: "ML Engineer & XAI Specialist",
    focus: "Predictive Models, SHAP/LIME Integration",
    avatar: "PN",
    gradient: "from-accent to-accent/60",
  },
  {
    name: "B. Pranay Teja",
    role: "Full-Stack & Visualization Lead",
    focus: "Dashboard UI, System Architecture",
    avatar: "PT",
    gradient: "from-success to-success/60",
  },
];

const TeamSection = () => {
  return (
    <section id="team" className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Meet the Team
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            CSE – Data Science students at the Institute of Aeronautical
            Engineering, Hyderabad. Passionate about making AI accessible to
            everyone.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {team.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              whileHover={{ y: -4 }}
              className="glass-card rounded-2xl p-6 text-center"
            >
              {/* Avatar */}
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.gradient} mx-auto mb-4 flex items-center justify-center shadow-lg`}
              >
                <span className="text-2xl font-bold text-primary-foreground">
                  {member.avatar}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1">
                {member.name}
              </h3>
              <p className="text-sm text-primary font-medium mb-2">
                {member.role}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {member.focus}
              </p>

              {/* Social Links */}
              <div className="flex items-center justify-center gap-3">
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Institute Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-secondary/50 border border-border">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">IARE</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                Institute of Aeronautical Engineering
              </p>
              <p className="text-xs text-muted-foreground">
                Hyderabad, India • November 2025
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TeamSection;
