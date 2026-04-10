import { VendorAvailabilityInput } from "@/types/user-types";
import { create } from "zustand";

export interface DayConfig {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  slotInterval: number; // minutes
  capacity: number;
}

interface AvailabilityFormData {
  serviceType: "VENDOR_DELIVERY";
  selectedDays: number[]; // 0-6 for Sunday-Saturday
  dayConfigs: Record<number, DayConfig>; // per-day configuration
  isExpressEnabled: boolean;
  expressFee: number;
}

interface AvailabilityStore {
  formData: AvailabilityFormData;
  generatedSlots: VendorAvailabilityInput[];
  setFormData: (data: Partial<AvailabilityFormData>) => void;
  setDayConfig: (day: number, config: Partial<DayConfig>) => void;
  setGeneratedSlots: (slots: VendorAvailabilityInput[]) => void;
  resetFormData: () => void;
  getFormData: () => AvailabilityFormData;
}

export const DEFAULT_DAY_CONFIG: DayConfig = {
  startTime: "09:00",
  endTime: "17:00",
  slotInterval: 30,
  capacity: 5,
};

const defaultFormData: AvailabilityFormData = {
  serviceType: "VENDOR_DELIVERY",
  selectedDays: [],
  dayConfigs: {},
  isExpressEnabled: false,
  expressFee: 0,
};

export const useAvailabilityStore = create<AvailabilityStore>((set, get) => ({
  formData: defaultFormData,
  generatedSlots: [],

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),

  setDayConfig: (day, config) =>
    set((state) => ({
      formData: {
        ...state.formData,
        dayConfigs: {
          ...state.formData.dayConfigs,
          [day]: {
            ...(state.formData.dayConfigs[day] || DEFAULT_DAY_CONFIG),
            ...config,
          },
        },
      },
    })),

  setGeneratedSlots: (slots) => set({ generatedSlots: slots }),

  resetFormData: () => set({ formData: defaultFormData, generatedSlots: [] }),

  getFormData: () => get().formData,
}));
