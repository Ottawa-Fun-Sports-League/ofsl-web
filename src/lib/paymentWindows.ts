import type { League } from "./leagues";

type LeagueType = League["league_type"];

export const RELATIVE_PAYMENT_LEAGUE_TYPES: ReadonlySet<LeagueType> = new Set([
  "tournament",
  "skills_drills",
  "single_session",
]);

export const usesRelativePaymentWindow = (
  leagueType: LeagueType | null | undefined,
): boolean => !!leagueType && RELATIVE_PAYMENT_LEAGUE_TYPES.has(leagueType);

export const PAYMENT_WINDOW_OPTIONS = [24, 48, 72, 120, 168, 240, 336] as const;

export type PaymentWindowOption = (typeof PAYMENT_WINDOW_OPTIONS)[number];

const pluralize = (value: number, unit: string): string =>
  value === 1 ? `${value} ${unit}` : `${value} ${unit}s`;

export const formatPaymentWindowDuration = (hours: number): string => {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "";
  }

  if (hours % 24 === 0) {
    const days = hours / 24;
    if (days >= 7 && days % 7 === 0) {
      const weeks = days / 7;
      return pluralize(weeks, "week");
    }
    return pluralize(days, "day");
  }

  return pluralize(hours, "hour");
};

export const formatPaymentWindowOptionLabel = (hours: number): string => {
  const duration = formatPaymentWindowDuration(hours);
  return duration ? `${duration} (${hours} hours)` : `${hours} hours`;
};

export const computePaymentDeadline = (
  hours: number | null | undefined,
  registrationIso: string | Date | null | undefined,
): Date | null => {
  if (!hours || hours <= 0) return null;

  const base =
    registrationIso instanceof Date
      ? registrationIso
      : registrationIso
        ? new Date(registrationIso)
        : new Date();

  if (Number.isNaN(base.getTime())) {
    return null;
  }

  return new Date(base.getTime() + hours * 60 * 60 * 1000);
};

export const formatDeadlineForDisplay = (deadline: Date | null): string | null => {
  if (!deadline) return null;
  return deadline.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};
