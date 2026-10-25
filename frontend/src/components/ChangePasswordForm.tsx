import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api-client";

interface Fields {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

const EMPTY: Fields = { current_password: "", new_password: "", new_password_confirm: "" };

const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 8, message: "At least 8 characters" },
  { test: (v: string) => /[A-Za-z]/.test(v), message: "Contains a letter" },
  { test: (v: string) => /[0-9]/.test(v), message: "Contains a number" },
];

/** Password change form shown inside a signed-in user's account settings. */
export default function ChangePasswordForm() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const set = (name: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [name]: event.target.value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Fields> = {};

    if (!fields.current_password) {
      next.current_password = "Enter your current password.";
    }

    const failedRule = PASSWORD_RULES.find((rule) => !rule.test(fields.new_password));
    if (!fields.new_password) {
      next.new_password = "Enter a new password.";
    } else if (failedRule) {
      next.new_password = `New password needs ${failedRule.message.toLowerCase()}.`;
    } else if (fields.new_password === fields.current_password) {
      next.new_password = "New password must differ from your current one.";
    }

    if (!fields.new_password_confirm) {
      next.new_password_confirm = "Confirm your new password.";
    } else if (fields.new_password !== fields.new_password_confirm) {
      next.new_password_confirm = "Passwords don't match.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/password-change/", fields);
      setFields(EMPTY);
      toast({
        title: "Password updated",
        description: "Use your new password the next time you sign in.",
      });
    } catch (requestError: unknown) {
      if (isAxiosError<Record<string, string[]>>(requestError)) {
        const data = requestError.response?.data;
        if (data) {
          setErrors({
            current_password: data.current_password?.[0],
            new_password: data.new_password?.[0],
            new_password_confirm: data.new_password_confirm?.[0] ?? data.non_field_errors?.[0],
          });
        }
      }
      toast({
        title: "Couldn't update password",
        description: "Check your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg text-foreground">Change Password</h3>
      </div>

      <div>
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={fields.current_password}
          onChange={set("current_password")}
          aria-invalid={Boolean(errors.current_password)}
        />
        {errors.current_password && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {errors.current_password}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="new-password">New password</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={fields.new_password}
            onChange={set("new_password")}
            aria-invalid={Boolean(errors.new_password)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {PASSWORD_RULES.map((rule) => (
            <li key={rule.message} className={rule.test(fields.new_password) ? "text-emerald-600" : ""}>
              {rule.test(fields.new_password) ? "\u2713" : "\u2022"} {rule.message}
            </li>
          ))}
        </ul>
        {errors.new_password && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {errors.new_password}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={fields.new_password_confirm}
          onChange={set("new_password_confirm")}
          aria-invalid={Boolean(errors.new_password_confirm)}
        />
        {errors.new_password_confirm && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {errors.new_password_confirm}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Update password
      </Button>
    </form>
  );
}