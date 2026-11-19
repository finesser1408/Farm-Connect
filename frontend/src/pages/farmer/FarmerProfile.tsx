import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthErrorMessage, useAuth } from "@/lib/auth-context";

export default function FarmerProfile() {
  const { user, updateProfile } = useAuth();
  const [location, setLocation] = useState(user?.farmer_profile?.location || "");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    setLocation(user?.farmer_profile?.location || "");
  }, [user?.farmer_profile?.location]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      setFeedback({ message: "Enter a city, town, or district.", isError: true });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await updateProfile({ farmer_profile: { location: trimmedLocation } });
      setFeedback({ message: "Location updated.", isError: false });
    } catch (error) {
      setFeedback({ message: getAuthErrorMessage(error), isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl text-foreground">Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <Label htmlFor="farmer-full-name">Full Name</Label>
          <Input id="farmer-full-name" value={fullName} readOnly />
        </div>
        <div>
          <Label htmlFor="farmer-email">Email</Label>
          <Input id="farmer-email" type="email" value={user?.email || ""} readOnly />
        </div>
        <div>
          <Label htmlFor="farmer-phone">Phone</Label>
          <Input id="farmer-phone" value={user?.phone || ""} readOnly />
        </div>
        <div>
          <Label htmlFor="farm-name">Farm Name</Label>
          <Input id="farm-name" value={user?.farmer_profile?.farm_name || ""} readOnly />
        </div>
        <div>
          <Label htmlFor="farmer-location">Location</Label>
          <Input
            id="farmer-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="City, town, or district (e.g. Harare)"
            maxLength={255}
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Share your farm’s city, town, or district, not a street address.
          </p>
        </div>
        {feedback && (
          <p role={feedback.isError ? "alert" : "status"} className="text-sm text-muted-foreground">
            {feedback.message}
          </p>
        )}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
