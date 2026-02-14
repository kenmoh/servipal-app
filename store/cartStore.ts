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

  // Food customization fields
  selected_side?: string;
  selected_size?: string;

  // Laundry fields
  images?: string[]; // laundry items have multiple images
  laundry_type?: string; // e.g. DRY_CLEAN, WASH_FOLD
};

type ItemDetails = {
  name: string;
  price: number;
  image?: string;
  selected_side?: string;
  selected_size?: string;
  images?: string[];
  laundry_type?: string;
};

type CartType = {
  order_items: CartItem[];
  delivery_option: RequireDelivery;
  additional_info: string;

  // Laundry-specific
  cart_type: "FOOD" | "LAUNDRY" | null;
  vendor_id: string | null;
  instructions: string;
  delivery_address: string;
};

type CartState = {
  cart: CartType;
  totalCost: number;

  addItem: (
    vendor_id: string,
    item_id: string,
    quantity: number,
    itemDetails: ItemDetails,
  ) => "VENDOR_MISMATCH" | "CART_TYPE_MISMATCH" | "OK";

  removeItem: (item_id: string) => void;
  updateItemQuantity: (item_id: string, quantity: number) => void;
  setDeliveryOption: (option: RequireDelivery) => void;
  setAdditionalInfo: (info: string) => void;

  // Laundry-specific setters
  setInstructions: (instructions: string) => void;
  setDeliveryAddress: (address: string) => void;

  clearCart: (resetLocationCallback?: () => void) => void;
  calculateTotal: () => void;

  // Separate prepare methods per order type
  prepareOrderForServer: (locationData: {
    origin: string;
    destination: string;
    originCoords: [number, number] | null;
    destinationCoords: [number, number] | null;
  }) => any;
  prepareLaundryOrderForServer: () => any;
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: {
    order_items: [],
    delivery_option: "PICKUP",
    additional_info: "",
    cart_type: null,
    vendor_id: null,
    instructions: "",
    delivery_address: "",
  },
  totalCost: 0,

  calculateTotal: () =>
    set((state) => ({
      totalCost: state.cart.order_items.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      ),
    })),

  addItem: (vendorId, itemId, quantity, itemDetails) => {
    const state = get();
    const cartType = itemDetails.images ? "LAUNDRY" : "FOOD";

    // Guard: prevent mixing cart types
    if (state.cart.cart_type && state.cart.cart_type !== cartType) {
      return "CART_TYPE_MISMATCH";
    }

    // Guard: laundry is single-vendor
    if (
      cartType === "LAUNDRY" &&
      state.cart.vendor_id &&
      state.cart.vendor_id !== vendorId
    ) {
      return "VENDOR_MISMATCH";
    }

    set((state) => {
      const existingItemIndex = state.cart.order_items.findIndex(
        (item) =>
          item.item_id === itemId &&
          item.vendor_id === vendorId &&
          item.selected_side === itemDetails.selected_side &&
          item.selected_size === itemDetails.selected_size,
      );

      let updatedItems;

      if (existingItemIndex !== -1) {
        updatedItems = [...state.cart.order_items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
        };
      } else {
        updatedItems = [
          ...state.cart.order_items,
          {
            vendor_id: vendorId,
            item_id: itemId,
            quantity,
            price: itemDetails.price,
            name: itemDetails.name,
            image: itemDetails.image,
            selected_side: itemDetails.selected_side,
            selected_size: itemDetails.selected_size,
            images: itemDetails.images,
            laundry_type: itemDetails.laundry_type,
          },
        ];
      }

      const newTotalCost = updatedItems.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      );

      return {
        cart: {
          ...state.cart,
          order_items: updatedItems,
          cart_type: cartType,
          vendor_id: vendorId,
        },
        totalCost: newTotalCost,
      };
    });

    return "OK";
  },

  removeItem: (item_id) =>
    set((state) => {
      const updatedItems = state.cart.order_items.filter(
        (item) => item.item_id !== item_id,
      );
      const newTotalCost = updatedItems.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      );
      return {
        cart: {
          ...state.cart,
          order_items: updatedItems,
          // Reset vendor lock if cart is now empty
          vendor_id: updatedItems.length === 0 ? null : state.cart.vendor_id,
          cart_type: updatedItems.length === 0 ? null : state.cart.cart_type,
        },
        totalCost: newTotalCost,
      };
    }),

  updateItemQuantity: (item_id, quantity) =>
    set((state) => {
      const updatedItems =
        quantity <= 0
          ? state.cart.order_items.filter((item) => item.item_id !== item_id)
          : state.cart.order_items.map((item) =>
              item.item_id === item_id ? { ...item, quantity } : item,
            );

      const newTotalCost = updatedItems.reduce(
        (acc, item) => acc + (item.price || 0) * item.quantity,
        0,
      );
      return {
        cart: { ...state.cart, order_items: updatedItems },
        totalCost: newTotalCost,
      };
    }),

  setDeliveryOption: (option) =>
    set((state) => ({ cart: { ...state.cart, delivery_option: option } })),

  setAdditionalInfo: (info) =>
    set((state) => ({ cart: { ...state.cart, additional_info: info } })),

  setInstructions: (instructions) =>
    set((state) => ({
      cart: { ...state.cart, instructions: instructions },
    })),

  setDeliveryAddress: (address) =>
    set((state) => ({ cart: { ...state.cart, delivery_address: address } })),

  clearCart: (resetLocationCallback?) => {
    if (resetLocationCallback) resetLocationCallback();
    set(() => ({
      cart: {
        order_items: [],
        delivery_option: "PICKUP",
        additional_info: "",
        cart_type: null,
        vendor_id: null,
        instructions: "",
        delivery_address: "",
      },
      totalCost: 0,
    }));
  },

  // Food order prepare
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
      delivery_option: state.cart.delivery_option,
      origin: locationData.origin,
      destination: locationData.destination,
      ...(state.cart.additional_info && {
        additional_info: state.cart.additional_info,
      }),
    };
  },

  // Laundry order prepare
  prepareLaundryOrderForServer: () => {
    const state = get();
    const { cart } = state;

    if (!cart.vendor_id) throw new Error("No vendor in cart");

    return {
      vendor_id: cart.vendor_id,
      delivery_option: cart.delivery_option,
      instructions: cart.instructions,
      delivery_address: cart.delivery_address,
      items: cart.order_items.map((item) => ({
        item_id: item.item_id,
        name: item.name ?? "",
        price: item.price ?? 0,
        quantity: item.quantity,
        images: item.images ?? (item.image ? [item.image] : []),
        sides: item.selected_side ?? "",
        sizes: item.selected_size ?? "",
      })),
    };
  },
}));

// import { RequireDelivery } from "@/types/order-types";
// import { create } from "zustand";

// export type CartItem = {
//   vendor_id: string;
//   item_id: string;
//   quantity: number;

//   // Display-only fields
//   name?: string;
//   price?: number;
//   image?: string;

//   // Customization fields
//   selected_sides?: string[];
//   selected_size?: string;
// };

// type CartType = {
//   order_items: CartItem[];
//   distance: number;
//   delivery_option: RequireDelivery;
//   duration: string;
//   additional_info: string;
// };

// type CartState = {
//   cart: CartType;
//   totalCost: number;
//   addItem: (
//     vendor_id: string,
//     item_id: string,
//     quantity: number,
//     itemDetails: {
//       name: string;
//       price: number;
//       image: string;
//       selected_sides?: string[];
//       selected_size?: string;
//     },
//   ) => void;
//   removeItem: (item_id: string) => void;
//   updateItemQuantity: (item_id: string, quantity: number) => void;
//   setDeliveryOption: (option: RequireDelivery) => void;
//   updateDistance: (distance: number) => void;
//   updateDuration: (duration: string) => void;
//   setAdditionalInfo: (info: string) => void;

//   clearCart: (resetLocationCallback?: () => void) => void;
//   calculateTotal: () => void;
//   prepareOrderForServer: (locationData: {
//     origin: string;
//     destination: string;
//     originCoords: [number, number] | null;
//     destinationCoords: [number, number] | null;
//   }) => any;
// };

// export const useCartStore = create<CartState>((set, get) => ({
//   cart: {
//     order_items: [],
//     distance: 0,
//     delivery_option: "PICKUP",
//     duration: "",
//     additional_info: "",
//   },
//   totalCost: 0,

//   calculateTotal: () =>
//     set((state) => ({
//       totalCost: state.cart.order_items.reduce(
//         (acc, item) => acc + (item.price || 0) * item.quantity,
//         0,
//       ),
//     })),

//   addItem: (
//     vendorId: string,
//     itemId: string,
//     quantity: number,
//     itemDetails: { name: string; price: number; image: string },
//   ) =>
//     set((state) => {
//       const existingItemIndex = state.cart.order_items.findIndex(
//         (item) =>
//           item.item_id === itemId &&
//           item.vendor_id === vendorId &&
//           JSON.stringify(item.selected_sides) ===
//             JSON.stringify(itemDetails.selected_sides) &&
//           item.selected_size === itemDetails.selected_size,
//       );

//       let updatedCart;

//       if (existingItemIndex !== -1) {
//         const updatedItems = [...state.cart.order_items];
//         updatedItems[existingItemIndex] = {
//           ...updatedItems[existingItemIndex],
//           quantity: updatedItems[existingItemIndex].quantity + quantity,
//         };

//         updatedCart = {
//           ...state.cart,
//           order_items: updatedItems,
//         };
//       } else {
//         updatedCart = {
//           ...state.cart,
//           order_items: [
//             ...state.cart.order_items,
//             {
//               vendor_id: vendorId,
//               item_id: itemId,
//               quantity,
//               price: itemDetails.price,
//               name: itemDetails.name,
//               image: itemDetails.image,
//               selected_sides: itemDetails.selected_sides,
//               selected_size: itemDetails.selected_size,
//             },
//           ],
//         };
//       }

//       // Calculate new total cost
//       const newTotalCost = updatedCart.order_items.reduce(
//         (acc, item) => acc + (item.price || 0) * item.quantity,
//         0,
//       );

//       return {
//         cart: updatedCart,
//         totalCost: newTotalCost,
//       };
//     }),

//   removeItem: (item_id) =>
//     set((state) => {
//       const updatedCart = {
//         ...state.cart,
//         order_items: state.cart.order_items.filter(
//           (item) => item.item_id !== item_id,
//         ),
//       };

//       // Calculate new total cost
//       const newTotalCost = updatedCart.order_items.reduce(
//         (acc, item) => acc + (item.price || 0) * item.quantity,
//         0,
//       );

//       return {
//         cart: updatedCart,
//         totalCost: newTotalCost,
//       };
//     }),

//   updateItemQuantity: (item_id, quantity) =>
//     set((state) => {
//       let updatedCart;

//       // If quantity is 0 or less, remove the item
//       if (quantity <= 0) {
//         updatedCart = {
//           ...state.cart,
//           order_items: state.cart.order_items.filter(
//             (item) => item.item_id !== item_id,
//           ),
//         };
//       } else {
//         // Otherwise update the quantity
//         updatedCart = {
//           ...state.cart,
//           order_items: state.cart.order_items.map((item) =>
//             item.item_id === item_id ? { ...item, quantity } : item,
//           ),
//         };
//       }

//       // Calculate new total cost
//       const newTotalCost = updatedCart.order_items.reduce(
//         (acc, item) => acc + (item.price || 0) * item.quantity,
//         0,
//       );

//       return {
//         cart: updatedCart,
//         totalCost: newTotalCost,
//       };
//     }),

//   setDeliveryOption: (option) =>
//     set((state) => ({
//       cart: {
//         ...state.cart,
//         delivery_option: option,
//       },
//     })),

//   updateDistance: (distance) =>
//     set((state) => ({
//       cart: {
//         ...state.cart,
//         distance,
//       },
//     })),

//   updateDuration: (duration) =>
//     set((state) => ({
//       cart: {
//         ...state.cart,
//         duration,
//       },
//     })),

//   setAdditionalInfo: (info) =>
//     set((state) => ({
//       cart: {
//         ...state.cart,
//         additional_info: info,
//       },
//     })),

//   clearCart: (resetLocationCallback?: () => void) => {
//     // Reset location store if callback provided
//     if (resetLocationCallback) {
//       resetLocationCallback();
//     }

//     // Reset cart store
//     set(() => ({
//       cart: {
//         order_items: [],
//         distance: 0,
//         delivery_option: "PICKUP",
//         duration: "",
//         additional_info: "",
//       },
//       totalCost: 0,
//     }));
//   },

//   prepareOrderForServer: (locationData) => {
//     const state = get();

//     return {
//       order_items: state.cart.order_items.map((item) => ({
//         vendor_id: item.vendor_id,
//         item_id: item.item_id,
//         quantity: item.quantity,
//       })),
//       pickup_coordinates: locationData.originCoords || [0, 0],
//       dropoff_coordinates: locationData.destinationCoords || [0, 0],
//       distance: state.cart.distance,
//       delivery_option: state.cart.delivery_option,
//       duration: state.cart.duration,
//       origin: locationData.origin,
//       destination: locationData.destination,
//       ...(state.cart.additional_info && {
//         additional_info: state.cart.additional_info,
//       }),
//     };
//   },
// }));
