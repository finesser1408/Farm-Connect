import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const salesData: { month: string; revenue: number }[] = [];

const topProducts: { name: string; value: number }[] = [];

const COLORS = ["hsl(142, 40%, 28%)", "hsl(30, 30%, 40%)", "hsl(45, 60%, 55%)", "hsl(40, 20%, 90%)"];

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-sm text-muted-foreground sm:h-[300px]">
      {message}
    </div>
  );
}

export default function FarmerAnalytics() {
  return (
    <div className="min-w-0">
      <h1 className="mb-6 font-display text-2xl text-foreground">Sales Analytics</h1>
      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg text-foreground">Monthly Revenue</h2>
          {salesData.length === 0 ? (
            <EmptyChart message="Revenue data will appear once you have sales." />
          ) : (
            <div className="h-[220px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 85%)" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
                  <YAxis width={40} tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(142, 40%, 28%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg text-foreground">Top Selling Products</h2>
          {topProducts.length === 0 ? (
            <EmptyChart message="Top products will appear once you have sales." />
          ) : (
            <div className="h-[220px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topProducts} cx="50%" cy="50%" outerRadius="70%" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
