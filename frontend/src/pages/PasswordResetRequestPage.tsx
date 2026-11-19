import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api-client";
import { isAxiosError } from "axios";

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await apiClient.post("/auth/password-reset/", { email });
      setMessage(response.data.message);
    } catch (requestError) {
      setMessage("");
      setError(
        isAxiosError(requestError) && requestError.response?.status === 429
          ? "Too many requests. Please wait before trying again."
          : "We couldn't process your request right now. Please try again later.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-[var(--card-shadow)]">
          <h1 className="mb-2 text-center font-display text-2xl text-foreground">Reset your password</h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Enter your account email. If an account exists, we’ll send password reset instructions.
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {message && <p role="status" className="text-sm text-primary">{message}</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Remembered your password? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
