import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api-client";

export default function FarmerProfile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<{ username?: string; phone?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username ?? "");
    setPhone(user.phone ?? "");
    setFarmName(user.farmer_profile?.farm_name ?? "");
    setLocation(user.farmer_profile?.location ?? "");
  }, [user]);

  const validate = () => {
    const next: { username?: string; phone?: string } = {};
    if (!username.trim()) {
      next.username = "Username is required.";
    } else if (username.trim().length < 3) {
      next.username = "Username must be at least 3 characters.";
    }
    if (phone.trim() && !/^[0-9+() -]{7,20}$/.test(phone.trim())) {
      next.phone = "Enter a valid phone number.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await apiClient.patch("/auth/profile/update/", {
        username: username.trim(),
        phone: phone.trim(),
        farmer_profile: {
          farm_name: farmName.trim(),
          location: location.trim(),
        },
      });
      await refreshUser();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (requestError: unknown) {
      const data = isAxiosError<Record<string, string[]>>(requestError)
        ? requestError.response?.data
        : undefined;
      if (data?.username) setErrors({ username: data.username[0] });
      toast({
        title: "Couldn't save changes",
        description: "Check the fields and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Your farm details and account security.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6" noValidate>
        <div>
          <Label htmlFor="profile-username">Username</Label>
          <Input
            id="profile-username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setErrors((prev) => ({ ...prev, username: undefined }));
            }}
            aria-invalid={Boolean(errors.username)}
          />
          {errors.username && (
            <p role="alert" className="mt-1 text-xs text-destructive">{errors.username}</p>
          )}
        </div>

        <div>
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" type="email" defaultValue={user?.email ?? ""} disabled />
        </div>

        <div>
          <Label htmlFor="profile-phone">Phone</Label>
          <Input
            id="profile-phone"
            placeholder="+263 77 123 4567"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && (
            <p role="alert" className="mt-1 text-xs text-destructive">{errors.phone}</p>
          )}
        </div>

        <div>
          <Label htmlFor="profile-farm">Farm Name</Label>
          <Input
            id="profile-farm"
            value={farmName}
            onChange={(event) => setFarmName(event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="profile-location">Location</Label>
          <Input
            id="profile-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </form>

      <div className="rounded-lg border border-border bg-card p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}