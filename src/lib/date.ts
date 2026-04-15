const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(date: Date = new Date(), timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  const parsed = parseDateKey(value);
  return parsed !== null && toDateKey(parsed) === value;
}

export function parseDateKey(value: string): Date | null {
  if (!DATE_KEY_PATTERN.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function addDays(value: string, amount: number): string {
  const parsed = parseDateKey(value);
  if (!parsed) {
    throw new Error(`Invalid date key: ${value}`);
  }

  parsed.setDate(parsed.getDate() + amount);
  return toDateKey(parsed);
}

export function toFriendlyDate(value: string, locale = "en-US"): string {
  const parsed = parseDateKey(value);
  if (!parsed) {
    throw new Error(`Invalid date key: ${value}`);
  }

  return parsed.toLocaleDateString(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function isSameDateKey(left: string, right: string): boolean {
  return left === right;
}
