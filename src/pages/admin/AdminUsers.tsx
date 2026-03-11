import { Button } from "@/components/ui/button";
import { Ban, CheckCircle } from "lucide-react";

const users = [
  { id: "u1", name: "John Customer", email: "john@example.com", role: "Customer", status: "Active", joined: "2026-01-15" },
  { id: "u2", name: "Alice Buyer", email: "alice@example.com", role: "Customer", status: "Active", joined: "2026-02-01" },
  { id: "u3", name: "Bob Smith", email: "bob@example.com", role: "Customer", status: "Blocked", joined: "2026-01-20" },
];

export default function AdminUsers() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">User Management</h1>
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Name</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Joined</th><th className="px-6 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-3">{u.role}</td>
                  <td className="px-6 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.status === "Active" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{u.status}</span></td>
                  <td className="px-6 py-3 text-muted-foreground">{u.joined}</td>
                  <td className="px-6 py-3 text-right">
                    <Button variant="ghost" size="sm">{u.status === "Active" ? <><Ban className="mr-1 h-4 w-4" /> Block</> : <><CheckCircle className="mr-1 h-4 w-4" /> Unblock</>}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
