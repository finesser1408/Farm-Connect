// Shared formatting for order and order-item status badges.
//
// The backend stores lowercase values ("pending", "shipped", ...) while some UI
// code passes display words ("Accepted"), so everything is normalised before it
// is compared or rendered.

export type StatusTone = "success" | "info" | "warning" | "danger" | "neutral";

const LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  accepted: "Accepted",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const TONES: Record<string, StatusTone> = {
  pending: "warning",
  processing: "warning",
  paid: "info",
  accepted: "success",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  rejected: "danger",
};

/** "pending" | "Pending" | " PENDING " -> "pending" */
export const normalizeStatus = (raw?: string | null): string =>
  (raw ?? "").trim().toLowerCase();

/** Human readable label for any status spelling. */
export const statusLabel = (raw?: string | null): string => {
  const key = normalizeStatus(raw);
  if (!key) return "Unknown";
  return LABELS[key] ?? raw!.trim();
};

/** Which colour family a status belongs to. */
export const statusTone = (raw?: string | null): StatusTone =>
  TONES[normalizeStatus(raw)] ?? "neutral";

/** Ready-to-use tailwind classes for a status pill. */
export const statusChipClass = (raw?: string | null): string => {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  switch (statusTone(raw)) {
    case "success":
      return `${base} bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20`;
    case "info":
      return `${base} bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20`;
    case "warning":
      return `${base} bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20`;
    case "danger":
      return `${base} bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20`;
    default:
      return `${base} bg-muted text-muted-foreground ring-1 ring-inset ring-border`;
  }
};