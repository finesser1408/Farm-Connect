import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettings() {
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);
  const [password, setPassword] = useState("");

  const handleSavePlatform = () => {
    console.log("Platform settings saved");
  };

  const handleSavePayment = () => {
    console.log("Payment settings updated");
  };

  const handleSavePreferences = () => {
    console.log("Preferences saved:", { theme, notifications });
  };

  const handleChangePassword = () => {
    console.log("Password changed:", password);
  };

  return (
    <div className="max-w-auto max-w-xl p-6 space-y-6">
      <h1 className="mb-6 font-display text-2xl text-foreground">Admin Settings</h1>

      {/* Platform Settings */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg text-foreground">Platform Settings</h2>
        <div className="space-y-4">
          <div><Label>Platform Name</Label><Input defaultValue="FarmFresh" /></div>
          <div><Label>Support Email</Label><Input defaultValue="support@farmfresh.co.zw" /></div>
          <div><Label>Delivery Fee ($)</Label><Input type="number" defaultValue="5.00" /></div>
          <Button onClick={handleSavePlatform}>Save Settings</Button>
        </div>
      </div>

      {/* Payment Configuration */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg text-foreground">Payment Configuration</h2>
        <div className="space-y-4">
          <div><Label>EcoCash Merchant ID</Label><Input placeholder="Enter merchant ID" /></div>
          <div><Label>OneMoney Merchant ID</Label><Input placeholder="Enter merchant ID" /></div>
          <Button onClick={handleSavePayment}>Update Payment Settings</Button>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg text-foreground">Preferences</h2>
        <div className="space-y-4">
          <div>
            <Label>Theme</Label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <Label>Notifications</Label>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
            <span className="ml-2">{notifications ? "Enabled" : "Disabled"}</span>
          </div>
          <Button onClick={handleSavePreferences}>Save Preferences</Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg text-foreground">Change Password</h2>
        <div className="space-y-4">
          <div><Label>New Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button onClick={handleChangePassword}>Update Password</Button>
        </div>
      </div>
    </div>
  );
}
