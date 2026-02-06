import { RequireDelivery } from "@/types/order-types";
import { create } from "zustand";

export type CartItem = {
  vendor_id: string;
  item_id: string;
  quantity: number;

  // Display-only fields
  name?: string;
  price?: number;
  image?: string;

  // Customization fields
  selected_sides?: string[];
  selected_size?: string;
};

type CartType = {
  order_items: CartItem[];
  // pickup_coordinates: [number | null, number | null];
  // dropoff_coordinates: [number | null, number | null];
  distance: number;
  require_delivery: RequireDelivery;
  duration: string;
  additional_info: string;
  is_one_way_delivery: boolean;
};

type CartState = {
  cart: CartType;
  totalCost: number;
  addItem: (
    vendor_id: string,
    item_id: string,
    quantity: number,
    itemDetails: {
      name: string;
      price: number;
      image: string;
      selected_sides?: string[];
      selected_size?: string;
    },
  ) => void;
  removeItem: (item_id: string) => void;
  updateItemQuantity: (item_id: string, quantity: number) => void;
  // setPickupCoordinates: (lat: number | null, lng: number | null) => void;
  // setDropOffCoordinates: (lat: number | null, lng: number | null) => void;
  setDeliveryOption: (option: RequireDelivery) => void;
  updateDistance: (distance: number) => void;
  updateDuration: (duration: string) => void;
  setAdditionalInfo: (info: string) => void;
  toggleOneWayDelivery: () => void;
  clearCart: (resetLocationCallback?: () => void) => void;
  calculateTotal: () => void;
  prepareOrderForServer: (locationData: {
    origin: string;
    destination: string;
    originCoords: [number, number] | null;
    destinationCoords: [number, number] | null;
  }) => any;
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: {
    order_items: [],
    // pickup_coordinates: [null, null],
    // dropoff_coordinates: [null, null],
    distance: 0,
    require_delivery: null,
    duration: "",
    additional_info: "",
    is_one_way_delivery: true,
  },
  totalCost: 0,

  calculateTotal: () =>
    set((state) => ({
      totalCost: state.cart.order_items.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      ),
    })),

  addItem: (
    vendorId: string,
    itemId: string,
    quantity: number,
    itemDetails: { name: string; price: number; image: string },
  ) =>
    set((state) => {
      const existingItemIndex = state.cart.order_items.findIndex(
        (item) =>
          item.item_id === itemId &&
          item.vendor_id === vendorId &&
          JSON.stringify(item.selected_sides) ===
            JSON.stringify(itemDetails.selected_sides) &&
          item.selected_size === itemDetails.selected_size,
      );

      let updatedCart;

      if (existingItemIndex !== -1) {
        const updatedItems = [...state.cart.order_items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
        };

        updatedCart = {
          ...state.cart,
          order_items: updatedItems,
        };
      } else {
        updatedCart = {
          ...state.cart,
          order_items: [
            ...state.cart.order_items,
            {
              vendor_id: vendorId,
              item_id: itemId,
              quantity,
              price: itemDetails.price,
              name: itemDetails.name,
              image: itemDetails.image,
              selected_sides: itemDetails.selected_sides,
              selected_size: itemDetails.selected_size,
            },
          ],
        };
      }

      // Calculate new total cost
      const newTotalCost = updatedCart.order_items.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      );

      return {
        cart: updatedCart,
        totalCost: newTotalCost,
      };
    }),

  removeItem: (item_id) =>
    set((state) => {
      const updatedCart = {
        ...state.cart,
        order_items: state.cart.order_items.filter(
          (item) => item.item_id !== item_id,
        ),
      };

      // Calculate new total cost
      const newTotalCost = updatedCart.order_items.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      );

      return {
        cart: updatedCart,
        totalCost: newTotalCost,
      };
    }),

  updateItemQuantity: (item_id, quantity) =>
    set((state) => {
      let updatedCart;

      // If quantity is 0 or less, remove the item
      if (quantity <= 0) {
        updatedCart = {
          ...state.cart,
          order_items: state.cart.order_items.filter(
            (item) => item.item_id !== item_id,
          ),
        };
      } else {
        // Otherwise update the quantity
        updatedCart = {
          ...state.cart,
          order_items: state.cart.order_items.map((item) =>
            item.item_id === item_id ? { ...item, quantity } : item,
          ),
        };
      }

      // Calculate new total cost
      const newTotalCost = updatedCart.order_items.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      );

      return {
        cart: updatedCart,
        totalCost: newTotalCost,
      };
    }),

  setDeliveryOption: (option) =>
    set((state) => ({
      cart: {
        ...state.cart,
        require_delivery: option,
      },
    })),

  updateDistance: (distance) =>
    set((state) => ({
      cart: {
        ...state.cart,
        distance,
      },
    })),

  updateDuration: (duration) =>
    set((state) => ({
      cart: {
        ...state.cart,
        duration,
      },
    })),

  setAdditionalInfo: (info) =>
    set((state) => ({
      cart: {
        ...state.cart,
        additional_info: info,
      },
    })),

  toggleOneWayDelivery: () =>
    set((state) => ({
      cart: {
        ...state.cart,
        is_one_way_delivery: !state.cart.is_one_way_delivery,
      },
    })),

  clearCart: (resetLocationCallback?: () => void) => {
    // Reset location store if callback provided
    if (resetLocationCallback) {
      resetLocationCallback();
    }

    // Reset cart store
    set(() => ({
      cart: {
        order_items: [],
        // pickup_coordinates: [null, null],
        // dropoff_coordinates: [null, null],
        distance: 0,
        require_delivery: null,
        duration: "",
        additional_info: "",
        is_one_way_delivery: true,
      },
      totalCost: 0,
    }));
  },

  prepareOrderForServer: (locationData) => {
    const state = get();

    return {
      order_items: state.cart.order_items.map((item) => ({
        vendor_id: item.vendor_id,
        item_id: item.item_id,
        quantity: item.quantity,
      })),
      pickup_coordinates: locationData.originCoords || [0, 0],
      dropoff_coordinates: locationData.destinationCoords || [0, 0],
      distance: state.cart.distance,
      require_delivery: state.cart.require_delivery,
      duration: state.cart.duration,
      origin: locationData.origin,
      destination: locationData.destination,
      ...(state.cart.additional_info && {
        additional_info: state.cart.additional_info,
      }),
    };
  },
}));
