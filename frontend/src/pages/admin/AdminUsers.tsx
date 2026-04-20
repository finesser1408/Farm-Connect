import { Button } from "@/components/ui/button";
import { Ban, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();

  // TODO: replace with real API call
  useEffect(() => {
    setUsers([]);
  }, []);

  const handleToggleBlock = (userId: string, currentStatus: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, status: currentStatus === "Active" ? "Blocked" : "Active" } : u
    ));
    const newStatus = currentStatus === "Active" ? "Blocked" : "Active";
    const action = newStatus === "Blocked" ? "blocked" : "unblocked";
    toast({
      title: `User ${action}`,
      description: `User has been ${action} successfully.`,
    });
  };

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
                    <Button variant="ghost" size="sm" onClick={() => handleToggleBlock(u.id, u.status)}>{u.status === "Active" ? <><Ban className="mr-1 h-4 w-4" /> Block</> : <><CheckCircle className="mr-1 h-4 w-4" /> Unblock</>}</Button>
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
