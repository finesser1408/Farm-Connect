import { Users, Sprout, Package, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState, type ComponentType } from "react";

type StatItem = { label: string; value: string; icon: ComponentType<{ className?: string }> };
type ActivityItem = { month: string; orders: number };

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [activityData, setActivityData] = useState<ActivityItem[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // TODO: replace with real API calls
  useEffect(() => {
    setStats([
      { label: "Total Users", value: "—", icon: Users },
      { label: "Total Farmers", value: "—", icon: Sprout },
      { label: "Total Products", value: "—", icon: Package },
      { label: "Total Sales", value: "—", icon: DollarSign },
    ]);

    setActivityData([]);
  }, []);

  return (
    <>
      <h1 className="mb-6 font-display text-2xl text-foreground">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <s.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button onClick={() => setBlocked(true)} className="bg-red-500 text-white px-4 py-2 rounded">
          Block
        </button>
        <button onClick={() => setBlocked(false)} className="bg-green-500 text-white px-4 py-2 rounded">
          Unblock
        </button>
        <button onClick={() => setStatus("Verified")} className="bg-blue-500 text-white px-4 py-2 rounded">
          Verify
        </button>
        <button onClick={() => setStatus("Rejected")} className="bg-gray-500 text-white px-4 py-2 rounded">
          Reject
        </button>
      </div>

      {/* Status Display */}
      <div className="mb-4">
        <p>Status: {blocked ? "Blocked" : "Active"}</p>
        {status && <p>Action: {status}</p>}
      </div>

      {/* Chart Section */}
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
    </>
  );
}

