import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

const farmers = [
  { id: "f1", name: "Jane Farmer", farm: "Green Valley Farm", location: "Harare", status: "Verified", products: 12 },
  { id: "f2", name: "Tom Grower", farm: "Sunrise Berries", location: "Mutare", status: "Pending", products: 5 },
  { id: "f3", name: "Sara Fields", farm: "Golden Fields", location: "Chinhoyi", status: "Verified", products: 8 },
];

export default function AdminFarmers() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Farmer Management</h1>
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Farmer</th><th className="px-6 py-3">Farm</th><th className="px-6 py-3">Location</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Products</th><th className="px-6 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {farmers.map((f) => (
                <tr key={f.id}>
                  <td className="px-6 py-3 font-medium text-foreground">{f.name}</td>
                  <td className="px-6 py-3 text-foreground">{f.farm}</td>
                  <td className="px-6 py-3 text-muted-foreground">{f.location}</td>
                  <td className="px-6 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.status === "Verified" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"}`}>{f.status}</span></td>
                  <td className="px-6 py-3">{f.products}</td>
                  <td className="px-6 py-3 text-right">
                    {f.status === "Pending" && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="text-primary"><CheckCircle className="mr-1 h-4 w-4" /> Verify</Button>
                        <Button variant="ghost" size="sm" className="text-destructive"><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                      </div>
                    )}
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
