import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const salesData = [
  { month: "Jan", revenue: 1200 },
  { month: "Feb", revenue: 1800 },
  { month: "Mar", revenue: 2340 },
  { month: "Apr", revenue: 1900 },
  { month: "May", revenue: 2100 },
  { month: "Jun", revenue: 2500 },
];

const topProducts = [
  { name: "Tomatoes", value: 35 },
  { name: "Carrots", value: 25 },
  { name: "Spinach", value: 20 },
  { name: "Others", value: 20 },
];

const COLORS = ["hsl(142, 40%, 28%)", "hsl(30, 30%, 40%)", "hsl(45, 60%, 55%)", "hsl(40, 20%, 90%)"];

export default function FarmerAnalytics() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Sales Analytics</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg text-foreground">Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 85%)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(142, 40%, 28%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg text-foreground">Top Selling Products</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={topProducts} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
