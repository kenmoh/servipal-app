import { ProductResponse } from "@/types/product-types";
import { create } from "zustand";

export interface ProductImage {
  id: string;
  url: string;
  item_id: string;
}

export interface Product extends ProductResponse {}

export interface PurchaseData {
  quantity: number;
  sizes: string[];
  colors: string[];
  additional_info: string;
}

export interface PurchaseState {
  product: Product | null;
  purchase: PurchaseData;
  isLoading: boolean;
  error: string | null;
  totalPrice: number;
  isValidPurchase: boolean;
  setProduct: (product: Product) => void;
  clearProduct: () => void;
  setQuantity: (quantity: number) => void;
  incrementQuantity: () => void;
  decrementQuantity: () => void;
  toggleSize: (size: string) => void;
  toggleColor: (color: string) => void;
  setAdditionalInfo: (info: string) => void;
  resetPurchase: () => void;
  validatePurchase: () => { isValid: boolean; errors: string[] };
  getServerSizes: () => string;
  addSize: (size: string) => void;
  removeSize: (size: string) => void;
  addColor: (color: string) => void;
  removeColor: (color: string) => void;
  clearColors: () => void;
  setAllColors: () => void;
  clearSizes: () => void;
  setAllSizes: () => void;
}

const initialPurchaseData: PurchaseData = {
  quantity: 1,
  sizes: [],
  colors: [],
  additional_info: "",
};

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  product: null,
  purchase: initialPurchaseData,
  isLoading: false,
  error: null,

  get totalPrice() {
    const { product, purchase } = get();
    if (!product) return 0;

    const price =
      typeof product.price === "string"
        ? Number(product.price)
        : Number(product.price);

    return price * purchase.quantity;
  },

  get isValidPurchase() {
    const { product, purchase } = get();
    const availableSizes = product?.sizes || [];

    return !!(
      product &&
      product.in_stock &&
      purchase.quantity > 0 &&
      purchase.quantity <= product.stock &&
      (purchase.sizes.length > 0 || availableSizes.length === 0) &&
      (purchase.colors.length > 0 || product.colors.length === 0)
    );
  },

  setProduct: (product) =>
    set({
      product,
      purchase: initialPurchaseData,
      error: null,
    }),

  clearProduct: () =>
    set({
      product: null,
      purchase: initialPurchaseData,
      error: null,
    }),

  setQuantity: (quantity) => {
    const { product, purchase } = get();
    const maxQuantity = product?.stock || 0;
    const validQuantity = Math.max(1, Math.min(quantity, maxQuantity));

    // Maintain selection invariants: selections cannot exceed quantity
    const newSizes = purchase.sizes.slice(0, validQuantity);
    const newColors = purchase.colors.slice(0, validQuantity);

    set((state) => ({
      purchase: {
        ...state.purchase,
        quantity: validQuantity,
        sizes: newSizes,
        colors: newColors,
      },
      error:
        quantity > maxQuantity ? `Maximum quantity is ${maxQuantity}` : null,
    }));
  },

  incrementQuantity: () => {
    const { purchase } = get();
    get().setQuantity(purchase.quantity + 1);
  },

  decrementQuantity: () => {
    const { purchase } = get();
    get().setQuantity(purchase.quantity - 1);
  },

  toggleSize: (size) => {
    const product = get().product;
    const availableSizes = product?.sizes || [];

    if (!availableSizes.includes(size)) return;

    const { purchase } = get();
    const isSelected = purchase.sizes.includes(size);
    const newSizes = isSelected
      ? purchase.sizes.filter((s) => s !== size)
      : [...purchase.sizes, size];

    // Hierarchical rule: Sizes drive quantity
    const newQuantity = newSizes.length || 1;

    set((state) => ({
      purchase: {
        ...state.purchase,
        sizes: newSizes,
        quantity: newQuantity,
        // Ensure colors don't exceed the new quantity (driven by sizes)
        colors: state.purchase.colors.slice(0, newQuantity),
      },
    }));
  },

  addSize: (size) => {
    const product = get().product;
    const availableSizes = product?.sizes || [];

    if (!availableSizes.includes(size)) return;

    set((state) => {
      if (!state.purchase.sizes.includes(size)) {
        return {
          purchase: {
            ...state.purchase,
            sizes: [...state.purchase.sizes, size],
          },
        };
      }
      return state;
    });
  },

  removeSize: (size) => {
    set((state) => ({
      purchase: {
        ...state.purchase,
        sizes: state.purchase.sizes.filter((s) => s !== size),
      },
    }));
  },

  clearSizes: () =>
    set((state) => ({
      purchase: { ...state.purchase, sizes: [] },
    })),
  setAllSizes: () => {
    const product = get().product;
    const availableSizes = product?.sizes || [];

    set((state) => ({
      purchase: {
        ...state.purchase,
        sizes: availableSizes,
      },
    }));
  },

  toggleColor: (color) => {
    const { purchase, product } = get();
    if (!product?.colors.includes(color)) return;

    const isSelected = purchase.colors.includes(color);
    const availableSizesCount = (product?.sizes || []).length;
    const currentQuantity = purchase.quantity;

    // Rule: We can't have more colors than quantity (which is driven by sizes if they exist)
    if (
      !isSelected &&
      availableSizesCount > 0 &&
      purchase.colors.length >= currentQuantity
    ) {
      // Option: We could replace the last color or just block it. Let's block it for now as per "cannot have 1 size with 3 colors"
      return;
    }

    const newColors = isSelected
      ? purchase.colors.filter((c) => c !== color)
      : [...purchase.colors, color];

    set((state) => ({
      purchase: {
        ...state.purchase,
        colors: newColors,
        // If NO sizes exist, colors drive the quantity
        quantity:
          availableSizesCount > 0 ? currentQuantity : newColors.length || 1,
      },
    }));
  },

  addColor: (color) => {
    const { product, purchase } = get();
    if (!product?.colors.includes(color)) return;

    set((state) => {
      if (!state.purchase.colors.includes(color)) {
        return {
          purchase: {
            ...state.purchase,
            colors: [...state.purchase.colors, color],
          },
        };
      }
      return state;
    });
  },

  removeColor: (color) => {
    set((state) => ({
      purchase: {
        ...state.purchase,
        colors: state.purchase.colors.filter((c) => c !== color),
      },
    }));
  },

  clearColors: () =>
    set((state) => ({
      purchase: { ...state.purchase, colors: [] },
    })),

  setAllColors: () => {
    const { product } = get();
    if (!product) return;

    set(
      (state) => ({
        purchase: { ...state.purchase, colors: [...product.colors] },
      }),
      false,
    );
  },

  setAdditionalInfo: (info) =>
    set((state) => ({
      purchase: { ...state.purchase, additional_info: info },
    })),

  resetPurchase: () =>
    set({
      purchase: initialPurchaseData,
      error: null,
    }),

  validatePurchase: () => {
    const { product, purchase } = get();
    const errors: string[] = [];
    const availableSizes = product?.sizes || [];

    if (!product) {
      errors.push("No product selected");
    } else {
      if (!product.in_stock) errors.push("Product is out of stock");
      if (purchase.quantity <= 0)
        errors.push("Quantity must be greater than 0");
      if (purchase.quantity > product.stock)
        errors.push(`Quantity exceeds available stock (${product.stock})`);
      if (!purchase.additional_info) {
        errors.push(`Delivery information is required`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  getServerSizes: () => {
    const { purchase } = get();
    return purchase.sizes.join(", ");
  },
}));

export const usePurchaseSelectors = () => {
  const store = usePurchaseStore();
  const product = store.product;
  const availableSizes = product?.sizes || [];

  return {
    product,
    quantity: store.purchase.quantity,
    selectedSizes: store.purchase.sizes,
    selectedColors: store.purchase.colors,
    additionalInfo: store.purchase.additional_info,
    availableSizes,
    totalPrice: store.totalPrice,
    isValidPurchase: store.isValidPurchase,
    isLoading: store.isLoading,
    error: store.error,
    serverSizes: store.getServerSizes(),
  };
};

export const usePurchaseActions = () => {
  const store = usePurchaseStore();
  return {
    setProduct: store.setProduct,
    clearProduct: store.clearProduct,
    setQuantity: store.setQuantity,
    incrementQuantity: store.incrementQuantity,
    decrementQuantity: store.decrementQuantity,
    addSize: store.addSize,
    removeSize: store.removeSize,
    clearColors: store.clearColors,
    clearSizes: store.clearSizes,
    setAllColors: store.setAllColors,
    setAllSizes: store.setAllSizes,
    toggleSize: store.toggleSize,
    toggleColor: store.toggleColor,
    setAdditionalInfo: store.setAdditionalInfo,
    resetPurchase: store.resetPurchase,
    addColor: store.addColor,
    removeColor: store.removeColor,
    validatePurchase: store.validatePurchase,
    getServerSizes: store.getServerSizes,
  };
};
