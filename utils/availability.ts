import { VendorAvailabilityInput } from "@/types/user-types";
import { DayConfig } from "@/store/availabilityStore";

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

/**
 * Generate time slots based on start time, end time, and interval
 */
export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  intervalMinutes: number,
): string[] => {
  const slots: string[] = [];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  let currentMinutes = startMinutes;
  while (currentMinutes < endMinutes) {
    slots.push(minutesToTime(currentMinutes));
    currentMinutes += intervalMinutes;
  }

  return slots;
};

/**
 * Generate VendorAvailabilityInput array for bulk creation (per-day configs)
 */
export const generateAvailabilityInputs = (
  vendorId: string,
  serviceType: "PICKUP" | "VENDOR_DELIVERY",
  selectedDays: number[],
  dayConfigs: Record<number, DayConfig>,
  isExpressEnabled: boolean,
  expressFee: number,
): VendorAvailabilityInput[] => {
  return selectedDays.map((dayOfWeek) => {
    const config = dayConfigs[dayOfWeek];
    return {
      vendor_id: vendorId,
      day_of_week: dayOfWeek,
      service_type: serviceType,
      start_time: `${config.startTime}:00`, // Convert HH:MM to HH:MM:SS
      end_time: `${config.endTime}:00`, // Convert HH:MM to HH:MM:SS
      slot_interval: config.slotInterval,
      capacity: config.capacity,
      is_express: isExpressEnabled,
      express_fee: isExpressEnabled ? expressFee : undefined,
    };
  });
};

/**
 * Validate availability form data (per-day configs)
 */
export const validateAvailabilityForm = (
  selectedDays: number[],
  dayConfigs: Record<number, DayConfig>,
  isExpressEnabled: boolean,
  expressFee: number,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate days
  if (selectedDays.length === 0) {
    errors.push("At least one day must be selected");
  }

  // Validate each day's config
  for (const day of selectedDays) {
    const config = dayConfigs[day];
    if (!config) {
      errors.push(`Configuration missing for ${getDayName(day)}`);
      continue;
    }

    const startMinutes = timeToMinutes(config.startTime);
    const endMinutes = timeToMinutes(config.endTime);

    if (endMinutes <= startMinutes) {
      errors.push(`${getDayName(day)}: End time must be later than start time`);
    }

    if (config.slotInterval <= 0) {
      errors.push(`${getDayName(day)}: Slot interval must be greater than 0`);
    }

    if (config.capacity < 1) {
      errors.push(`${getDayName(day)}: Capacity must be at least 1`);
    }
  }

  // Validate express fee
  if (isExpressEnabled && expressFee <= 0) {
    errors.push("Express fee must be greater than 0");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get day name from day number
 */
export const getDayName = (dayOfWeek: number): string => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayOfWeek] || "";
};

/**
 * Get short day name from day number
 */
export const getShortDayName = (dayOfWeek: number): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dayOfWeek] || "";
};
