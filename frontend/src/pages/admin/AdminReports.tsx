import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useEffect, useState } from "react";

type RevenueData = { month: string; revenue: number };
type FarmerPerformance = { farmer: string; sales: number };

export default function AdminReports() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [farmerPerformance, setFarmerPerformance] = useState<FarmerPerformance[]>([]);

  // TODO: replace with real API calls
  useEffect(() => {
    setRevenueData([]);
    setFarmerPerformance([]);
  }, []);

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
