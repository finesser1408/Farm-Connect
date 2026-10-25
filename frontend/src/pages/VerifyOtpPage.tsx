import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { BadgeCheck, KeyRound, Leaf, Loader2, Mail, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_SECONDS = 60;

export default function VerifyOtpPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState(user?.email ?? "");
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying">("idle");
  const [cooldown, setCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(user?.is_verified ?? false);

  // The address of a signed-in account is already known, so pre-fill it.
  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (user?.is_verified) setIsVerified(true);
  }, [user?.email, user?.is_verified]);

  // Resend countdown, matching the backend's 60 second cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const canSend = useMemo(
    () => status === "idle" && cooldown === 0 && EMAIL_PATTERN.test(email),
    [status, cooldown, email],
  );

  const handleSend = async () => {
    if (!EMAIL_PATTERN.test(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    setCodeError("");
    setStatus("sending");
    try {
      await apiClient.post("/auth/otp/send/", { email, purpose: "verification" });
      setCooldown(COOLDOWN_SECONDS);
      toast({
        title: "Code sent",
        description: "Check your inbox for the 6-digit verification code.",
      });
    } catch (requestError: unknown) {
      const message = isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data?.error
        : undefined;
      if (requestError instanceof Error && !isAxiosError(requestError)) {
        setEmailError("We couldn't reach the mail server. Try again shortly.");
      } else {
        setEmailError(message ?? "We couldn't send the code right now. Please try again.");
      }
    } finally {
      setStatus("idle");
    }
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== 6) {
      setCodeError("Enter the full 6-digit code.");
      return;
    }
    setCodeError("");
    setStatus("verifying");
    try {
      await apiClient.post("/auth/otp/verify/", { email, code, purpose: "verification" });
      setIsVerified(true);
      await refreshUser();
      toast({ title: "Email verified", description: "Your account is now verified." });
    } catch (requestError: unknown) {
      const message = isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data?.error
        : undefined;
      setCodeError(message ?? "That code isn't valid. Check it and try again.");
      setCode("");
    } finally {
      setStatus("idle");
    }
  };

  const goToDashboard = () => {
    const destination =
      user?.user_type === "farmer"
        ? "/farmer"
        : user?.user_type === "admin"
          ? "/admin"
          : "/customer";
    navigate(destination);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-[var(--card-shadow)]">
          <div className="mb-6 text-center">
            <Leaf className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h1 className="font-display text-2xl text-foreground">Verify your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We send a one-time code so we know the address is really yours.
            </p>
          </div>

          {isVerified ? (
            <div role="status" className="space-y-4 text-center">
              <BadgeCheck className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="text-sm text-muted-foreground">
                {email} is verified. You're all set.
              </p>
              <Button className="w-full" onClick={goToDashboard}>
                Continue to dashboard
              </Button>
              <Link to="/marketplace" className="block text-sm font-medium text-primary hover:underline">
                Browse the marketplace
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleVerify} noValidate>
              <div>
                <Label htmlFor="otp-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="otp-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setEmailError("");
                    }}
                    disabled={status !== "idle"}
                    className="pl-9"
                    aria-invalid={Boolean(emailError)}
                  />
                </div>
                {emailError && (
                  <p role="alert" className="mt-1 text-xs text-destructive">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="otp-code">Verification code</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-primary"
                  disabled={!canSend}
                  onClick={handleSend}
                >
                  {cooldown > 0 ? (
                    <>Resend in {cooldown}s</>
                  ) : (
                    <>
                      <RotateCw className="h-3 w-3" />
                      {code ? "Send a new code" : "Send code"}
                    </>
                  )}
                </Button>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  id="otp-code"
                  maxLength={6}
                  value={code}
                  onChange={(next) => {
                    setCode(next);
                    setCodeError("");
                  }}
                  disabled={status !== "idle"}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {codeError && (
                <p role="alert" className="text-center text-sm text-destructive">
                  {codeError}
                </p>
              )}
              {!emailError && !codeError && cooldown === 0 && !code && (
                <p className="text-center text-xs text-muted-foreground">
                  Press <span className="font-medium text-foreground">Send code</span> to
                  receive your one-time code.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={status !== "idle" || code.length !== 6}>
                {status === "verifying" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {status === "sending" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify email
              </Button>

              <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                <KeyRound className="h-3 w-3" />
                Codes expire after 10 minutes and can only be used once.
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}