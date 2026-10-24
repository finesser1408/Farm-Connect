import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import apiClient from "@/lib/api-client";

export default function ResetPasswordPage() {
  const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("The passwords do not match.");
      return;
    }

    if (!uidb64 || !token) {
      setError("This password reset link is invalid.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/auth/password-reset/confirm/${uidb64}/${token}/`, {
        new_password: password,
        new_password_confirm: passwordConfirm,
      });
      setIsComplete(true);
    } catch (requestError: unknown) {
      if (isAxiosError<{ error?: string; new_password?: string[] }>(requestError)) {
        const responseData = requestError.response?.data;
        setError(
          responseData?.error ??
            responseData?.new_password?.join(" ") ??
            "This reset link is invalid or expired. Request a new one and try again.",
        );
      } else {
        setError("We couldn't reset your password right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-[var(--card-shadow)]">
          <div className="mb-6 text-center">
            <Leaf className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h1 className="font-display text-2xl text-foreground">
              {isComplete ? "Password updated" : "Choose a new password"}
            </h1>
          </div>

          {isComplete ? (
            <div role="status" className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Your password has been reset successfully.</p>
              <Link to="/login" className="text-sm font-medium text-primary hover:underline">
                Sign in with your new password
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password-confirm">Confirm new password</Label>
                <Input
                  id="password-confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                />
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Reset password"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Need a new reset link?{" "}
                <Link to="/forgot-password" className="font-medium text-primary hover:underline">
                  Request one
                </Link>
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
