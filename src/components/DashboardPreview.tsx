import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, Target } from "lucide-react";

const lineData = [
  { name: "Jan", value: 4000, prediction: 4200 },
  { name: "Feb", value: 3000, prediction: 3100 },
  { name: "Mar", value: 5000, prediction: 4800 },
  { name: "Apr", value: 4780, prediction: 5000 },
  { name: "May", value: 5890, prediction: 5700 },
  { name: "Jun", value: 6390, prediction: 6500 },
];

const barData = [
  { name: "Product A", value: 4000 },
  { name: "Product B", value: 3000 },
  { name: "Product C", value: 2000 },
  { name: "Product D", value: 2780 },
];

const pieData = [
  { name: "Organic", value: 45 },
  { name: "Direct", value: 25 },
  { name: "Social", value: 20 },
  { name: "Referral", value: 10 },
];

const COLORS = [
  "hsl(230, 80%, 55%)",
  "hsl(187, 85%, 43%)",
  "hsl(158, 64%, 52%)",
  "hsl(38, 92%, 50%)",
];

const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  positive = true,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  positive?: boolean;
}) => (
  <motion.div
    whileHover={{ y: -2 }}
    className="glass-card rounded-xl p-4"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div
        className={`flex items-center gap-1 text-xs font-medium ${
          positive ? "text-success" : "text-destructive"
        }`}
      >
        {positive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {change}
      </div>
    </div>
    <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
    <p className="text-sm text-muted-foreground">{title}</p>
  </motion.div>
);

const DashboardPreview = () => {
  return (
    <section id="dashboard" className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Interactive Analytics Dashboard
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Visualize your data with beautiful, interactive charts. Drill down,
            filter, and explore insights in real-time.
          </p>
        </motion.div>

        {/* Dashboard Mock */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card rounded-2xl p-6 md:p-8"
        >
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Revenue"
              value="$124.5k"
              change="+12.5%"
              icon={DollarSign}
              positive
            />
            <StatCard
              title="Active Users"
              value="8,942"
              change="+8.2%"
              icon={Users}
              positive
            />
            <StatCard
              title="Conversion Rate"
              value="3.24%"
              change="-0.4%"
              icon={Target}
              positive={false}
            />
            <StatCard
              title="Engagement"
              value="67.8%"
              change="+5.1%"
              icon={Activity}
              positive
            />
          </div>

          {/* Charts Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Line Chart */}
            <div className="lg:col-span-2 bg-card rounded-xl p-4 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Revenue Trend</h3>
                  <p className="text-sm text-muted-foreground">
                    Actual vs Predicted
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Actual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <span className="text-muted-foreground">Predicted</span>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lineData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(230, 80%, 55%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(230, 80%, 55%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorPrediction"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(187, 85%, 43%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(187, 85%, 43%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(220, 13%, 91%)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(220, 9%, 46%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(220, 9%, 46%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(220, 13%, 91%)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(230, 80%, 55%)"
                      strokeWidth={2}
                      fill="url(#colorValue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="prediction"
                      stroke="hsl(187, 85%, 43%)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#colorPrediction)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">
                Traffic Sources
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.name} ({item.value}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="lg:col-span-3 bg-card rounded-xl p-4 border border-border/50">
              <h3 className="font-semibold text-foreground mb-4">
                Product Performance
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(220, 13%, 91%)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(220, 9%, 46%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(220, 9%, 46%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(220, 13%, 91%)",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(230, 80%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;
