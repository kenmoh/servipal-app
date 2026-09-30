export type DeliveryMethod = "PICKUP" | "VENDOR_DELIVERY" | "DISPATCH_DELIVERY";

export interface DeliveryMethodInput {
  canPickupAndDropoff: boolean;
  riderCount: number;
  dispatchCheckoutEnabled?: boolean;
}

/**
 * Which delivery methods a customer is offered at checkout.
 *
 * Three rules, in order:
 *  1. Vendor delivers itself -> Vendor Delivery. Never Dispatch.
 *  2. Kill switch off -> Dispatch withheld.
 *  3. Otherwise Dispatch is offered only when a rider is actually reachable.
 *
 * Pickup from Store is present in every outcome, so enabling a dispatch
 * connection can only ever add an option, never remove one.
 */
export function resolveDeliveryMethods({
  canPickupAndDropoff,
  riderCount,
  dispatchCheckoutEnabled = true,
}: DeliveryMethodInput): DeliveryMethod[] {
  if (canPickupAndDropoff) {
    return ["PICKUP", "VENDOR_DELIVERY"];
  }

  if (!dispatchCheckoutEnabled) {
    return ["PICKUP"];
  }

  if (riderCount > 0) {
    return ["PICKUP", "DISPATCH_DELIVERY"];
  }

  return ["PICKUP"];
}
