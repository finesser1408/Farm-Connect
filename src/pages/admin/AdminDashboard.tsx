import { Users, Sprout, Package, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const stats = [
  { label: "Total Users", value: "1,248", icon: Users },
  { label: "Total Farmers", value: "86", icon: Sprout },
  { label: "Total Products", value: "342", icon: Package },
  { label: "Total Sales", value: "$45,200", icon: DollarSign },
];

const activityData = [
  { month: "Jan", orders: 120 },
  { month: "Feb", orders: 180 },
  { month: "Mar", orders: 240 },
  { month: "Apr", orders: 200 },
  { month: "May", orders: 310 },
  { month: "Jun", orders: 280 },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Admin Dashboard</h1>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><s.icon className="h-6 w-6" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg text-foreground">Marketplace Activity</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 85%)" />
            <XAxis dataKey="month" tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
            <YAxis tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="orders" fill="hsl(142, 40%, 28%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
