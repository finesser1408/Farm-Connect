import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PasswordResetRequestPage from "@/pages/PasswordResetRequestPage";
import PasswordResetConfirmPage from "@/pages/PasswordResetConfirmPage";
import apiClient from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  default: { post: vi.fn() },
}));

vi.mock("@/components/Navbar", () => ({
  default: () => null,
}));

describe("password reset pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests a reset link and displays the generic server response", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { message: "If an account with that email exists, password reset instructions will be sent." },
    } as never);

    render(
      <MemoryRouter initialEntries={["/password-reset"]}>
        <Routes>
          <Route path="/password-reset" element={<PasswordResetRequestPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account with that email exists, password reset instructions will be sent.",
    );
    expect(apiClient.post).toHaveBeenCalledWith("/auth/password-reset/", {
      email: "person@example.com",
    });
  });

  it("shows a safe error when requesting a reset fails", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("network failure"));

    render(
      <MemoryRouter initialEntries={["/password-reset"]}>
        <Routes>
          <Route path="/password-reset" element={<PasswordResetRequestPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't process your request right now. Please try again later.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent(/account exists/i);
  });

  it("submits a new password and offers sign-in after success", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: "Password reset successful." } } as never);

    render(
      <MemoryRouter initialEntries={["/password-reset/confirm/NA/token-value/"]}>
        <Routes>
          <Route
            path="/password-reset/confirm/:uidb64/:token"
            element={<PasswordResetConfirmPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "Secure-unique-password-482!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "Secure-unique-password-482!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Your password has been reset.");
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/login");
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/auth/password-reset/confirm/NA/token-value/",
        {
          new_password: "Secure-unique-password-482!",
          new_password_confirm: "Secure-unique-password-482!",
        },
      );
    });
  });

  it("handles invalid or expired links without exposing account details", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { error: "Invalid or expired reset link." } },
    });

    render(
      <MemoryRouter initialEntries={["/password-reset/confirm/NA/expired-token/"]}>
        <Routes>
          <Route
            path="/password-reset/confirm/:uidb64/:token"
            element={<PasswordResetConfirmPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "Secure-unique-password-482!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "Secure-unique-password-482!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This reset link is invalid, expired, or already used. Please request a new one.",
    );
  });
});
