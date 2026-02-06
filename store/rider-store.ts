import { RiderProps } from "@/types/user-types";
import { create } from "zustand";

interface RiderState {
  previousRiders: RiderProps[]; // Old list for comparison
  setPreviousRiders: (riders: RiderProps[]) => void;
  newRiderCount: number;
  setNewRiderCount: (count: number) => void;
  clearNewRiders: () => void;
}

export const useRiderStore = create<RiderState>((set) => ({
  previousRiders: [],
  setPreviousRiders: (riders) => set({ previousRiders: riders }),
  newRiderCount: 0,
  setNewRiderCount: (count) => set({ newRiderCount: count }),
  clearNewRiders: () => set({ newRiderCount: 0, previousRiders: [] }),
}));
