import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { useToast } from "@/hooks/use-toast";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Platform-wide settings have no persistence endpoint yet, so they are kept in
// this browser until a settings API lands. Password changes below are real.

interface PlatformFields {
  platformName: string;
  supportEmail: string;
  deliveryFee: string;
}

type PlatformErrors = Partial<Record<keyof PlatformFields, string>>;

export default function AdminSettings() {
  const { toast } = useToast();
  const [fields, setFields] = useState<PlatformFields>({
    platformName: "Farm Connect",
    supportEmail: "",
    deliveryFee: "5.00",
  });
  const [errors, setErrors] = useState<PlatformErrors>({});
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);

  const update = (name: keyof PlatformFields) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setFields((prev) => ({ ...prev, [name]: event.target.value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (): boolean => {
    const next: PlatformErrors = {};

    if (!fields.platformName.trim()) {
      next.platformName = "Platform name is required.";
    }

    if (!EMAIL_PATTERN.test(fields.supportEmail.trim())) {
      next.supportEmail = "Enter a valid support email.";
    }

    const fee = Number(fields.deliveryFee);
    if (fields.deliveryFee.trim() === "" || Number.isNaN(fee)) {
      next.deliveryFee = "Enter a numeric delivery fee.";
    } else if (fee < 0) {
      next.deliveryFee = "Delivery fee can't be negative.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSavePlatform = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      localStorage.setItem("farmconnect.platformSettings", JSON.stringify(fields));
      toast({
        title: "Platform settings saved",
        description: `${fields.platformName} · ${fields.supportEmail} · $${fields.deliveryFee} delivery`,
      });
    } catch {
      toast({
        title: "Couldn't save settings",
        description: "This browser blocked local storage.",
        variant: "destructive",
      });
    }
  };

  const handleSavePreferences = () => {
    toast({
      title: "Preferences saved",
      description: `Theme: ${theme}. Notifications: ${notifications ? "on" : "off"}.`,
    });
  };

  const fieldError = (name: keyof PlatformFields) =>
    errors[name] ? (
      <p role="alert" className="mt-1 text-xs text-destructive">{errors[name]}</p>
    ) : null;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide preferences and your own account security.
        </p>
      </div>

      {/* Platform Settings */}
      <form onSubmit={handleSavePlatform} className="space-y-4 rounded-lg border border-border bg-card p-6" noValidate>
        <h2 className="font-display text-lg text-foreground">Platform Settings</h2>

        <div>
          <Label htmlFor="platformName">Platform Name</Label>
          <Input
            id="platformName"
            value={fields.platformName}
            onChange={update("platformName")}
            aria-invalid={Boolean(errors.platformName)}
          />
          {fieldError("platformName")}
        </div>

        <div>
          <Label htmlFor="supportEmail">Support Email</Label>
          <Input
            id="supportEmail"
            type="email"
            placeholder="support@farmconnect.zchpc.ac.zw"
            value={fields.supportEmail}
            onChange={update("supportEmail")}
            aria-invalid={Boolean(errors.supportEmail)}
          />
          {fieldError("supportEmail")}
        </div>

        <div>
          <Label htmlFor="deliveryFee">Delivery Fee ($)</Label>
          <Input
            id="deliveryFee"
            type="number"
            step="0.01"
            min="0"
            value={fields.deliveryFee}
            onChange={update("deliveryFee")}
            aria-invalid={Boolean(errors.deliveryFee)}
          />
          {fieldError("deliveryFee")}
        </div>

        <Button type="submit">
          <Save className="mr-2 h-4 w-4" /> Save Settings
        </Button>
      </form>

      {/* Preferences */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-lg text-foreground">Preferences</h2>
        <div>
          <Label htmlFor="theme">Theme</Label>
          <select
            id="theme"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={notifications}
            onChange={() => setNotifications((prev) => !prev)}
            className="h-4 w-4 rounded border-input"
          />
          Email notifications for orders
        </label>
        <Button onClick={handleSavePreferences}>
          <Save className="mr-2 h-4 w-4" /> Save Preferences
        </Button>
      </div>

      {/* Account security */}
      <div className="rounded-lg border border-border bg-card p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}