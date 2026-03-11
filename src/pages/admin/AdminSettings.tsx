import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettings() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl text-foreground">Settings</h1>
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg text-foreground">Platform Settings</h2>
          <div className="space-y-4">
            <div><Label>Platform Name</Label><Input defaultValue="FarmFresh" /></div>
            <div><Label>Support Email</Label><Input defaultValue="support@farmfresh.co.zw" /></div>
            <div><Label>Delivery Fee ($)</Label><Input type="number" defaultValue="5.00" /></div>
            <Button>Save Settings</Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg text-foreground">Payment Configuration</h2>
          <div className="space-y-4">
            <div><Label>EcoCash Merchant ID</Label><Input placeholder="Enter merchant ID" /></div>
            <div><Label>OneMoney Merchant ID</Label><Input placeholder="Enter merchant ID" /></div>
            <Button>Update Payment Settings</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
