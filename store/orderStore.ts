import { create } from "zustand";

interface OrderStore {
  deliveryId: string | null;
  setDeliveryId: (deliveryId: string | null) => void;
  hasPendingAssignment: boolean;
  pendingOrderId: string | null;
  setPendingAssignment: (orderId: string | null) => void;
  clearPendingAssignment: () => void;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  deliveryId: null,
  setDeliveryId: (deliveryId) => set({ deliveryId }),
  hasPendingAssignment: false,
  pendingOrderId: null,
  setPendingAssignment: (orderId) => 
    set({ hasPendingAssignment: !!orderId, pendingOrderId: orderId }),
  clearPendingAssignment: () => 
    set({ hasPendingAssignment: false, pendingOrderId: null }),
}));




