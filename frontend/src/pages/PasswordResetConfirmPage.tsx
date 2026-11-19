import { useState } from "react";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api-client";
import { getAuthErrorMessage } from "@/lib/auth-context";

export default function PasswordResetConfirmPage() {
  const { uidb64, token } = useParams();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uidb64 || !token) {
      setError("This reset link is invalid or expired. Please request a new one.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await apiClient.post(
        `/auth/password-reset/confirm/${encodeURIComponent(uidb64)}/${encodeURIComponent(token)}/`,
        {
          new_password: password,
          new_password_confirm: passwordConfirm,
        },
      );
      setIsComplete(true);
    } catch (requestError) {
      const responseData = isAxiosError(requestError) ? requestError.response?.data : null;
      if (isAxiosError(requestError) && requestError.response?.status === 429) {
        setError("Too many attempts. Please wait before trying again.");
      } else if (responseData && typeof responseData === "object" && "error" in responseData) {
        setError("This reset link is invalid, expired, or already used. Please request a new one.");
      } else {
        setError(getAuthErrorMessage(requestError));
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
          {isComplete ? (
            <div className="space-y-4 text-center">
              <h1 className="font-display text-2xl text-foreground">Password updated</h1>
              <p role="status" className="text-sm text-muted-foreground">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Go to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-center font-display text-2xl text-foreground">Choose a new password</h1>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                Choose a strong password that you haven’t used before.
              </p>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                  />
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Reset password"}
                </Button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
