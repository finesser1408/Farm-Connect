import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 4200 },
  { month: "Feb", revenue: 5800 },
  { month: "Mar", revenue: 7300 },
  { month: "Apr", revenue: 6100 },
  { month: "May", revenue: 8900 },
  { month: "Jun", revenue: 9500 },
];

const farmerPerformance = [
  { farmer: "Green Valley", sales: 1200 },
  { farmer: "Sunrise", sales: 980 },
  { farmer: "Meadow", sales: 850 },
  { farmer: "Golden", sales: 720 },
  { farmer: "Bee Haven", sales: 650 },
];

export default function AdminReports() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Reports & Analytics</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg text-foreground">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 85%)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="hsl(142, 40%, 28%)" strokeWidth={2} dot={{ fill: "hsl(142, 40%, 28%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg text-foreground">Farmer Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={farmerPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 85%)" />
              <XAxis type="number" tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
              <YAxis dataKey="farmer" type="category" tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} width={80} />
              <Tooltip />
              <Bar dataKey="sales" fill="hsl(30, 30%, 40%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
