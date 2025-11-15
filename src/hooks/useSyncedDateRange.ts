import { useCallback, useEffect } from "react";

export interface DateRangeUpdate {
  startDate: string;
  endDate: string;
}

interface UseSyncedDateRangeOptions extends DateRangeUpdate {
  onDatesChange: (next: DateRangeUpdate) => void;
}

const alignEndDate = (startDate: string, endDate: string) => {
  if (!startDate) return endDate || "";
  if (!endDate || endDate < startDate) return startDate;
  return endDate;
};

const clampEndDate = (startDate: string, candidate: string) => {
  if (!candidate) return "";
  if (startDate && candidate < startDate) return startDate;
  return candidate;
};

export function useSyncedDateRange({
  startDate,
  endDate,
  onDatesChange,
}: UseSyncedDateRangeOptions) {
  useEffect(() => {
    if (!startDate) return;

    const nextEndDate = alignEndDate(startDate, endDate);
    if (nextEndDate !== endDate) {
      onDatesChange({ startDate, endDate: nextEndDate });
    }
  }, [startDate, endDate, onDatesChange]);

  const handleStartDateChange = useCallback(
    (value: string) => {
      onDatesChange({
        startDate: value,
        endDate: alignEndDate(value, endDate),
      });
    },
    [endDate, onDatesChange],
  );

  const handleEndDateChange = useCallback(
    (value: string) => {
      onDatesChange({
        startDate,
        endDate: clampEndDate(startDate, value),
      });
    },
    [onDatesChange, startDate],
  );

  return {
    handleStartDateChange,
    handleEndDateChange,
    endDateMin: startDate || undefined,
  };
}
