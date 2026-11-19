import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthErrorMessage, useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";

export default function FarmerProfile() {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [farmName, setFarmName] = useState(user?.farmer_profile?.farm_name || "");
  const [location, setLocation] = useState(user?.farmer_profile?.location || "");
  const [description, setDescription] = useState(user?.farmer_profile?.description || "");

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.phone || "");
      setFarmName(user.farmer_profile?.farm_name || "");
      setLocation(user.farmer_profile?.location || "");
      setDescription(user.farmer_profile?.description || "");
    }
  }, [user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedFarmName = farmName.trim();
    const trimmedLocation = location.trim();

    if (!trimmedFarmName) {
      setFeedback({ message: "Farm name is required.", isError: true });
      return;
    }

    if (!trimmedLocation) {
      setFeedback({ message: "Enter a city, town, or district.", isError: true });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        farmer_profile: {
          farm_name: trimmedFarmName,
          location: trimmedLocation,
          description: description.trim(),
        },
      });

      // Invalidate all product queries so updated farmer name & location immediately reflect
      // on Featured Products, Marketplace, Shop by Category, and Product Details
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
      ]);

      setFeedback({ message: "Profile updated successfully.", isError: false });
    } catch (error) {
      setFeedback({ message: getAuthErrorMessage(error), isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <h1 className="mb-6 font-display text-2xl text-foreground">Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="farmer-first-name">First Name</Label>
            <Input
              id="farmer-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>
          <div>
            <Label htmlFor="farmer-last-name">Last Name</Label>
            <Input
              id="farmer-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="farmer-email">Email (Account identifier)</Label>
          <Input id="farmer-email" type="email" value={user?.email || ""} readOnly className="bg-muted text-muted-foreground" />
        </div>

        <div>
          <Label htmlFor="farmer-phone">Phone</Label>
          <Input
            id="farmer-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+263 77 123 4567"
          />
        </div>

        <div>
          <Label htmlFor="farm-name">Farm Name *</Label>
          <Input
            id="farm-name"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            placeholder="e.g. Green Valley Farm"
            maxLength={255}
            required
          />
        </div>

        <div>
          <Label htmlFor="farmer-location">Location *</Label>
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

        <div>
          <Label htmlFor="farm-description">Farm Description</Label>
          <textarea
            id="farm-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell customers about your farm and produce..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {feedback && (
          <p role={feedback.isError ? "alert" : "status"} className={`text-sm ${feedback.isError ? "text-destructive" : "text-green-600 font-medium"}`}>
            {feedback.message}
          </p>
        )}

        <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
