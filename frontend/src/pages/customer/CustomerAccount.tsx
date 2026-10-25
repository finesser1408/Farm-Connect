import { BadgeCheck, CircleAlert, Leaf, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function CustomerAccount() {
  const { user } = useAuth();
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "Customer";

  const details = [
    { icon: UserRound, label: "Name", value: displayName },
    { icon: Mail, label: "Email", value: user?.email ?? "—" },
    { icon: Phone, label: "Phone", value: user?.phone || "Not added yet" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-foreground">My Account</h1>
            <p className="text-sm text-muted-foreground">Manage your details, security and email verification.</p>
          </div>
          <Link to="/customer">
            <Button variant="outline" size="sm">Back to dashboard</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-6 shadow-[var(--card-shadow)]">
            <h2 className="mb-4 font-display text-lg text-foreground">Profile</h2>
            <dl className="space-y-4">
              {details.map((detail) => (
                <div key={detail.label} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <detail.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{detail.label}</dt>
                    <dd className="text-sm font-medium text-foreground">{detail.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div
              className={`mt-6 flex items-start gap-3 rounded-lg border p-4 ${
                user?.is_verified
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              {user?.is_verified ? (
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              )}
              <div className="text-sm">
                <p className={`font-medium ${user?.is_verified ? "text-emerald-800" : "text-amber-800"}`}>
                  {user?.is_verified ? "Email verified" : "Email not verified yet"}
                </p>
                <p className={user?.is_verified ? "text-emerald-700" : "text-amber-700"}>
                  {user?.is_verified
                    ? "Your address has been confirmed."
                    : "Enter the one-time code we email you to confirm this address."}
                </p>
                {!user?.is_verified && (
                  <Link to="/verify-email" className="mt-2 inline-block font-medium text-amber-900 underline">
                    Verify now
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow-[var(--card-shadow)]">
            <ChangePasswordForm />
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              Forgotten your current password?{" "}
              <Link to="/forgot-password" className="text-primary underline">
                Request a reset link
              </Link>
            </p>
          </section>
        </div>

        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Leaf className="h-3.5 w-3.5 text-primary" />
          Farm Connect keeps your details private — they're only used to fulfil your orders.
        </p>
      </main>
      <Footer />
    </div>
  );
}