import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export default function FarmerProfile() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl text-foreground">Profile</h1>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div><Label>Full Name</Label><Input defaultValue={user?.name || ""} /></div>
        <div><Label>Email</Label><Input type="email" defaultValue={user?.email || ""} /></div>
        <div><Label>Phone</Label><Input defaultValue={user?.phone || ""} /></div>
        <div><Label>Farm Name</Label><Input defaultValue={user?.farmName || ""} /></div>
        <div><Label>Location</Label><Input defaultValue={user?.farmLocation || ""} /></div>
        <Button>Save Changes</Button>
      </form>
    </div>
  );
}
