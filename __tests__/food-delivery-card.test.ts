import { readFileSync } from "fs";
import { join } from "path";

import { shouldShowDeliveryCard } from "@/lib/food-delivery-card";
import { DeliveryDetails } from "@/types/order-types";

const base: DeliveryDetails = {
  id: "33333333-3333-3333-3333-333333333333",
  order_id: "44444444-4444-4444-4444-444444444444",
  rider_id: "55555555-5555-5555-5555-555555555555",
  dispatch_id: "66666666-6666-6666-6666-666666666666",
  delivery_status: "ASSIGNED",
  delivery_fee: 1000,
  pickup_location: "Mama Put",
  destination: "12 Marina Lagos",
  origin: "Mama Put",
  distance: 5,
  duration: "15 min",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/** The shape the courier branch of `get_order_details` returns: no food fields. */
const courierPayload: DeliveryDetails = { ...base };

const foodPayload: DeliveryDetails = {
  ...base,
  food_order_id: base.order_id,
  tx_ref: "DELIVERY-FOOD-44444444-4444-4444-4444-444444444444",
  rider_name: "Ada Rider",
  rider_phone: "+2348000000000",
  dispatch_business_name: "Bolt Dispatch",
  pickup_coordinates: [6.5244, 3.3792],
  dropoff_coordinates: [6.4489, 3.3919],
  last_known_rider_coordinates: [6.5, 3.38],
};

describe("shouldShowDeliveryCard (AC-25)", () => {
  it("shows the card for a food order that has a delivery row", () => {
    expect(shouldShowDeliveryCard("FOOD", foodPayload)).toBe(true);
  });

  it("hides it when the food order has no delivery row", () => {
    // Pickup and vendor-delivered food orders come back with `delivery: null`.
    expect(shouldShowDeliveryCard("FOOD", null)).toBe(false);
    expect(shouldShowDeliveryCard("FOOD", undefined)).toBe(false);
  });

  it("hides it for laundry, even though laundry rides the same route", () => {
    // app/receipt/[id].tsx serves both orderTypes; laundry has its own card
    // on a different route and must not gain this one.
    expect(shouldShowDeliveryCard("LAUNDRY", courierPayload)).toBe(false);
    expect(shouldShowDeliveryCard("LAUNDRY", foodPayload)).toBe(false);
    expect(shouldShowDeliveryCard("LAUNDRY", null)).toBe(false);
  });

  it("hides it when no order type was passed", () => {
    expect(shouldShowDeliveryCard(undefined, foodPayload)).toBe(false);
    expect(shouldShowDeliveryCard(undefined, null)).toBe(false);
  });

  it("accepts a delivery payload that has no food-specific fields yet", () => {
    // A row exists even before rider name or coordinates are filled in, so
    // the card is drawn and shows its "Finding a rider..." state instead.
    expect(shouldShowDeliveryCard("FOOD", courierPayload)).toBe(true);
  });
});

describe("the receipt routes both the card and the map through that rule (T32)", () => {
  const receipt = readFileSync(
    join(__dirname, "../app/receipt/[id].tsx"),
    "utf8",
  );

  it("gates the delivery card on shouldShowDeliveryCard", () => {
    expect(receipt).toContain("shouldShowDeliveryCard(orderType, delivery)");
  });

  it("never embeds the map itself", () => {
    // Map lives only in FoodDeliveryCard, which is behind the rule — so a
    // receipt without a delivery payload cannot draw a map either.
    expect(receipt).not.toContain("<Map");
    expect(receipt).not.toContain("react-native-maps");
  });

  it("renders the card only once", () => {
    const occurrences = receipt.split("<FoodDeliveryCard").length - 1;
    expect(occurrences).toBe(1);
  });
});
