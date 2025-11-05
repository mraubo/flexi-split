/**
 * Shared formatting functions
 * Centralized formatters for common patterns across the application
 */

import type { AmountCents } from "@/types";

/**
 * Formats amount in cents to display string
 * Input: 2500 (cents)
 * Output: "25,00" (PLN display format)
 *
 * @param cents - Amount in cents
 * @returns Formatted amount string without currency symbol
 */
export const formatCentsToAmount = (cents?: number): string => {
  if (!cents && cents !== 0) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
};

/**
 * Parses amount string to cents
 * Input: "25,50" or "25.50" (user input)
 * Output: 2550 (cents)
 *
 * Handles both comma and dot as decimal separator for Polish users
 *
 * @param value - Amount string from input
 * @returns Amount in cents or undefined if invalid
 */
export const parseAmountToCents = (value: string): number | undefined => {
  if (!value.trim()) return undefined;

  // Replace comma with dot for decimal separator
  const normalizedValue = value.replace(",", ".");
  const parsed = parseFloat(normalizedValue);

  if (isNaN(parsed)) return undefined;

  // Convert to cents and round to avoid floating point issues
  return Math.round(parsed * 100);
};

/**
 * Formats amount in cents to currency string
 * Input: 2500 (cents)
 * Output: "25,00 zł" (full formatted currency)
 *
 * @param amountCents - Amount in cents
 * @param currency - Currency code (default: PLN)
 * @returns Formatted currency string
 */
export const formatCurrency = (amountCents: number, currency = "PLN"): string => {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amount);
};

/**
 * Formats a date to display format
 * Input: Date object
 * Output: "5 lis 2025" (Polish locale)
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Formats a date and time to display format
 * Input: Date object
 * Output: "5 lis 2025, 10:54" (Polish locale)
 *
 * @param date - Date to format
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: Date): string => {
  return date.toLocaleString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formats ISO date string to display format
 * Input: "2025-11-05"
 * Output: "5 lis 2025"
 *
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string
 */
export const formatISODate = (dateString: string): string => {
  try {
    const date = new Date(`${dateString}T00:00:00Z`);
    return formatDate(date);
  } catch {
    return dateString;
  }
};

/**
 * Formats date for input field (HTML date input)
 * Input: Date object or ISO string
 * Output: "2025-11-05"
 *
 * @param date - Date object or ISO string
 * @returns ISO date string suitable for date input
 */
export const formatDateForInput = (date: Date | string): string => {
  let dateObj: Date;

  if (typeof date === "string") {
    dateObj = new Date(`${date}T00:00:00Z`);
  } else {
    dateObj = date;
  }

  // Format as YYYY-MM-DD
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Calculates share info for an expense
 * Returns per-person amount and share count
 *
 * @param amountCents - Total amount in cents
 * @param selectedCount - Number of people splitting
 * @returns Share count and per-person amount in cents
 */
export const calculateShareInfo = (
  amountCents?: number,
  selectedCount?: number
): { shareCount: number; perPersonAmount: AmountCents } => {
  if (!amountCents || !selectedCount || selectedCount === 0) {
    return { shareCount: 0, perPersonAmount: 0 };
  }

  const shareCount = selectedCount;
  const totalAmount = amountCents;
  const perPersonAmount = Math.floor(totalAmount / shareCount);

  return { shareCount, perPersonAmount };
};

/**
 * Truncates text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

/**
 * Formats participant count
 * Input: 5
 * Output: "5 uczestników"
 *
 * @param count - Number of participants
 * @returns Formatted participant count
 */
export const formatParticipantCount = (count: number): string => {
  if (count === 1) return "1 uczestnik";
  if (count % 10 >= 2 && count % 10 <= 4 && (count < 10 || count >= 20)) {
    return `${count} uczestników`;
  }
  return `${count} uczestników`;
};

/**
 * Formats expense count
 * Input: 5
 * Output: "5 wydatków"
 *
 * @param count - Number of expenses
 * @returns Formatted expense count
 */
export const formatExpenseCount = (count: number): string => {
  if (count === 1) return "1 wydatek";
  if (count % 10 >= 2 && count % 10 <= 4 && (count < 10 || count >= 20)) {
    return `${count} wydatki`;
  }
  return `${count} wydatków`;
};

/**
 * Capitalizes first letter of a string
 *
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export const capitalize = (text: string): string => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Formats status to display format
 * Input: "open"
 * Output: "Otwarty"
 *
 * @param status - Status code
 * @returns Formatted status string
 */
export const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    open: "Otwarty",
    closed: "Zamknięty",
    pending: "Oczekujący",
    completed: "Ukończony",
  };

  return statusMap[status] || capitalize(status);
};
