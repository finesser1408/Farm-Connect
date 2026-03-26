import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const [platformName, setPlatformName] = useState("Farm Connect");
  const [supportEmail, setSupportEmail] = useState("support@farmconnect.co.zw");
  const [deliveryFee, setDeliveryFee] = useState("5.00");
  const [ecoCashMerchantId, setEcoCashMerchantId] = useState("");
  const [oneMoneyMerchantId, setOneMoneyMerchantId] = useState("");
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);
  const [password, setPassword] = useState("");

  const { toast } = useToast();

  const handleSavePlatform = () => {
    console.log("Platform settings saved", { platformName, supportEmail, deliveryFee });
    toast({
      title: "Platform settings saved",
      description: `${platformName}, ${supportEmail}, $${deliveryFee}`,
    });
  };

  const handleSavePayment = () => {
    console.log("Payment settings updated", { ecoCashMerchantId, oneMoneyMerchantId });
    if (!ecoCashMerchantId && !oneMoneyMerchantId) {
      toast({ title: "Enter at least one payment merchant ID", variant: "destructive" });
      return;
    }
    toast({ title: "Payment settings updated", description: "Merchant IDs saved successfully." });
  };

  const handleSavePreferences = () => {
    console.log("Preferences saved:", { theme, notifications });
    toast({ title: "Preferences saved", description: `Theme: ${theme}. Notifications: ${notifications ? "on" : "off"}.` });
  };

  const handleChangePassword = () => {
    if (password.trim().length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters", variant: "destructive" });
      return;
    }
    console.log("Password changed:", password);
    toast({ title: "Password updated", description: "Your password has been changed successfully." });
    setPassword("");
  };

  return (
    <div className="max-w-auto max-w-xl p-6 space-y-6">
      <h1 className="mb-6 font-display text-2xl text-foreground">Admin Settings</h1>

      {/* Platform Settings */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg text-foreground">Platform Settings</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="platformName">Platform Name</Label>
            <Input id="platformName" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input id="supportEmail" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="deliveryFee">Delivery Fee ($)</Label>
            <Input id="deliveryFee" type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
          </div>
          <Button onClick={handleSavePlatform}>Save Settings</Button>
        </div>
      </div>

      {/* Payment Configuration */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg text-foreground">Payment Configuration</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ecocashId">EcoCash Merchant ID</Label>
            <Input id="ecocashId" value={ecoCashMerchantId} onChange={(e) => setEcoCashMerchantId(e.target.value)} placeholder="Enter merchant ID" />
          </div>
          <div>
            <Label htmlFor="oneMoneyId">OneMoney Merchant ID</Label>
            <Input id="oneMoneyId" value={oneMoneyMerchantId} onChange={(e) => setOneMoneyMerchantId(e.target.value)} placeholder="Enter merchant ID" />
          </div>
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
