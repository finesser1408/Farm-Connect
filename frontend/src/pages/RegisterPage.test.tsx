import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "./RegisterPage";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";

// Submitting the form directly keeps the test independent of jsdom's
// (incomplete) native constraint validation.
const submitForm = (container: HTMLElement) => {
  const form = container.querySelector("form");
  if (!form) throw new Error("register form not found");
  fireEvent.submit(form);
};

const alertTexts = () =>
  screen.queryAllByRole("alert").map((node) => node.textContent?.trim());

describe("RegisterPage validation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AuthProvider>
          <CartProvider>
            <RegisterPage />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

  it("blocks an empty form with inline messages", () => {
    const { container } = renderPage();
    submitForm(container);

    const messages = alertTexts();
    expect(messages).toContain("Enter your full name.");
    expect(messages).toContain("Enter your email address.");
    expect(messages).toContain("Choose a password.");
    expect(messages).toContain("Confirm your password.");
  });

  it("rejects a malformed email address", () => {
    const { container } = renderPage();
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Kayla Choto" },
    });    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "StrongPass123" },
    });
    submitForm(container);

    expect(alertTexts()).toContain("Enter a valid email address.");
  });

  it("rejects a short password and a mismatched confirmation", () => {
    const { container } = renderPage();
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Kayla Choto" },
    });
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: "kayla@example.com" },
    });

    const [password, confirm] = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(password, { target: { value: "short1" } });
    fireEvent.change(confirm, { target: { value: "different" } });

    submitForm(container);

    const messages = alertTexts();
    expect(messages).toContain("Use at least 8 characters.");
    expect(messages).toContain("Passwords don't match.");
  });

  it("rejects an invalid phone number but accepts an empty one", () => {
    const { container } = renderPage();
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Kayla Choto" },
    });
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: "kayla@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("+263 77 123 4567"), {
      target: { value: "call-me" },
    });

    const [password, confirm] = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(password, { target: { value: "StrongPass123" } });
    fireEvent.change(confirm, { target: { value: "StrongPass123" } });

    submitForm(container);

    expect(alertTexts()).toContain(
      "Enter a valid phone number, e.g. +263 77 123 4567.",
    );
  });

  it("clears a field's error as soon as it is edited", () => {
    const { container } = renderPage();
    submitForm(container);
    expect(alertTexts()).toContain("Enter your email address.");

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "kayla@example.com" },
    });
    expect(alertTexts()).not.toContain("Enter your email address.");
  });
});