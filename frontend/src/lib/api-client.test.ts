import { describe, expect, it } from "vitest";
import { resolveApiUrl, resolveMediaOrigin } from "./api-client";

describe("resolveApiUrl", () => {
  it("never returns an http:// endpoint on an https:// page (mixed content)", () => {
    expect(resolveApiUrl("http://farmconnect.zchpc.ac.zw/api/v1", "https:")).toBe(
      "/api/v1",
    );
  });

  it("keeps an https endpoint on an https page", () => {
    expect(resolveApiUrl("https://api.example.com/api/v1", "https:")).toBe(
      "https://api.example.com/api/v1",
    );
  });

  it("keeps an http endpoint on an http page (local development)", () => {
    expect(resolveApiUrl("http://localhost:8000/api/v1", "http:")).toBe(
      "http://localhost:8000/api/v1",
    );
  });

  it("falls back to same-origin /api/v1 when unset", () => {
    expect(resolveApiUrl(undefined, "https:")).toBe("/api/v1");
    expect(resolveApiUrl(undefined, "http:")).toBe("/api/v1");
  });

  it("keeps a relative path on any page", () => {
    expect(resolveApiUrl("/api/v1", "https:")).toBe("/api/v1");
    expect(resolveApiUrl("/api/v1/", "http:")).toBe("/api/v1");
  });

  it("falls back when the configured value is not a valid URL", () => {
    expect(resolveApiUrl("not a url", "https:")).toBe("/api/v1");
  });

  it("trims trailing slashes from absolute URLs", () => {
    expect(resolveApiUrl("https://api.example.com/api/v1/", "https:")).toBe(
      "https://api.example.com/api/v1",
    );
  });
});

describe("resolveMediaOrigin", () => {
  it("returns an empty string (same origin) for the relative /api/v1 base", () => {
    expect(resolveMediaOrigin("/api/v1")).toBe("");
  });

  it("returns the API host for an absolute API URL", () => {
    expect(resolveMediaOrigin("https://api.example.com/api/v1")).toBe(
      "https://api.example.com",
    );
  });

  it("returns the local API host in development", () => {
    expect(resolveMediaOrigin("http://localhost:8000/api/v1")).toBe(
      "http://localhost:8000",
    );
  });

  it("uses the page origin when the API URL is not under /api/v1", () => {
    expect(resolveMediaOrigin("https://api.example.com", "https://farmconnect.example")).toBe(
      "https://api.example.com",
    );
  });
});