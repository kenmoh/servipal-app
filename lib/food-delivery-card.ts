import type { DeliveryDetails } from "@/types/order-types";

/**
 * Should `app/receipt/[id].tsx` draw the delivery card and its map?
 *
 * The rule is deliberately one line, because it is an acceptance criterion
 * (AC-25/T32) rather than a rendering detail: a card appears only for a FOOD
 * order that actually has a `food_deliveries` row behind it. Pickup orders
 * and vendor-delivered orders come back with no `delivery` payload and must
 * render the receipt exactly as they did before this feature, and laundry
 * rides on a separate route with its own payload shape, so it never qualifies
 * here either.
 *
 * Extracted to a pure function so the presence rule can be asserted without
 * mounting the screen. It is a type predicate so the call site can hand
 * `delivery` straight to the card without a second null check.
 */
export function shouldShowDeliveryCard(
  orderType: "FOOD" | "LAUNDRY" | undefined,
  delivery: DeliveryDetails | null | undefined,
): delivery is DeliveryDetails {
  return orderType === "FOOD" && !!delivery;
}
