import { format } from "date-fns";

export function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date?.getTime?.())) return "-";
  return format(date, "PP");
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date?.getTime?.())) return "-";
  return format(date, "PPp");
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

export function downloadCSV(rows, filename) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(",")]
    .concat(
      rows.map((row) =>
        headers.map((field) => JSON.stringify(row[field] ?? "")).join(",")
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function compareStrings(a, b) {
  return String(a || "").localeCompare(String(b || ""));
}
